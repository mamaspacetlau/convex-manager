const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const { getNextAvailablePorts } = require('./ports');
const { generateTemplate } = require('./template');
const { initDB, ProjectConfig, VerificationCode, Invitation } = require('./db');
const {
  upProject,
  downProject,
  startProject,
  stopProject,
  getProjectStatus,
  streamLogs,
  generateAdminKey
} = require('./docker');
const { runMigration } = require('./migration');
const { findUserByUsername, findUserByEmail, findUserByIdentifier, createUser, hasAnyUsers } = require('./users');
const { generateToken, generateRefreshToken, verifyToken, authenticateToken, requireAdmin } = require('./auth');
const { sendVerificationCode, sendPasswordResetCode, sendInvitationLink } = require('./mailer');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:8080'], // Allow multiple ports for dev and prod
  credentials: true
}));
app.use(bodyParser.json());
app.use(cookieParser());

const PROJECTS_DIR = process.env.PROJECTS_DIR || path.join(__dirname, '..', 'projects');
if (!fs.existsSync(PROJECTS_DIR)) {
  fs.mkdirSync(PROJECTS_DIR, { recursive: true });
}

// Initialize Database
initDB();

// Sync projects from disk (to handle persistence if DB was wiped)
async function syncProjectsFromDisk() {
  console.log('Syncing projects from disk...');
  try {
    const entries = fs.readdirSync(PROJECTS_DIR, { withFileTypes: true });
    
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const name = entry.name;
        const configPath = path.join(PROJECTS_DIR, name, 'config.json');
        
        if (fs.existsSync(configPath)) {
          try {
            // Check if exists in DB
            let existing = await ProjectConfig.findOne({ where: { name } });
            
            if (!existing) {
              console.log(`Found orphaned project on disk: ${name}. Restoring to DB...`);
              const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
              
              // Validate config structure before inserting
              if (config.backendPort && config.dashboardPort) {
                existing = await ProjectConfig.create({
                  name: config.name || name,
                  backendPort: config.backendPort,
                  dashboardPort: config.dashboardPort,
                  siteProxyPort: config.siteProxyPort,
                  overrides: config.overrides || {},
                  adminKey: config.adminKey
                });
                console.log(`Restored ${name} to database.`);
              } else {
                console.warn(`Skipping ${name}: Invalid config.json`);
                continue;
              }
            } 
            
            // Now ensure DB is in sync with disk (whether it was just restored or already existed)
            const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            let needsUpdate = false;
            
            if (config.adminKey && existing.adminKey !== config.adminKey) {
              existing.adminKey = config.adminKey;
              needsUpdate = true;
            }
            
            if (config.overrides && JSON.stringify(existing.overrides) !== JSON.stringify(config.overrides)) {
              existing.overrides = config.overrides;
              needsUpdate = true;
            }

            // Update ports if they differ from disk (source of truth)
            if (config.backendPort && existing.backendPort !== config.backendPort) {
              existing.backendPort = config.backendPort;
              needsUpdate = true;
            }
            if (config.dashboardPort && existing.dashboardPort !== config.dashboardPort) {
              existing.dashboardPort = config.dashboardPort;
              needsUpdate = true;
            }
            if (config.siteProxyPort && existing.siteProxyPort !== config.siteProxyPort) {
              existing.siteProxyPort = config.siteProxyPort;
              needsUpdate = true;
            }
            
            if (needsUpdate) {
              await existing.save();
              console.log(`Updated existing project ${name} from disk config.`);
            }
          } catch (err) {
            console.error(`Error syncing project ${name}:`, err);
          }
        }
      }
    }
  } catch (e) {
    console.error('Error scanning projects directory:', e);
  }
}

// Run migration script for old project structures
runMigration();

// Run sync after a short delay to ensure DB is ready
setTimeout(syncProjectsFromDisk, 2000);

// Utility to get all projects
async function getAllProjects() {
  const projects = [];
  const dbProjects = await ProjectConfig.findAll();

  for (const dbProject of dbProjects) {
    const name = dbProject.name;
    const projectDir = path.join(PROJECTS_DIR, name);
    const configPath = path.join(projectDir, 'config.json');
    
    // If directory exists but no config.json, skip
    if (!fs.existsSync(configPath)) {
      // If DB has it but disk doesn't, we should probably clean up the DB
      // But for now, we just skip it to avoid crashing
      continue;
    }

    try {
      // Read latest config from disk as source of truth for ports
      const diskConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      const status = await getProjectStatus(name);

      projects.push({
        name,
        status,
        backendPort: diskConfig.backendPort || dbProject.backendPort,
        dashboardPort: diskConfig.dashboardPort || dbProject.dashboardPort,
        siteProxyPort: diskConfig.siteProxyPort || dbProject.siteProxyPort,
        overrides: dbProject.overrides || {},
        adminKey: dbProject.adminKey || null,
        uptime: status === 'running' ? 'Running' : 'Stopped'
      });
    } catch (e) {
      console.error('Error reading project', name, e);
    }
  }

  return projects;
}

// --- Auth Routes ---
app.post('/api/auth/login', async (req, res) => {
  const { identifier, password } = req.body;
  if (!identifier || !password) return res.status(400).json({ error: 'Username/Email and password required' });

  const user = await findUserByIdentifier(identifier);
  if (!user || !user.password || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = generateToken(user);
  const refreshToken = generateRefreshToken(user);

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });

  res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
});

app.get('/api/auth/status', async (req, res) => {
  res.json({ 
    hasUsers: await hasAnyUsers(),
    allowRegistration: process.env.ALLOW_REGISTRATION === 'true'
  });
});

app.post('/api/auth/register/request-code', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });

  try {
    const hasUsers = await hasAnyUsers();
    if (hasUsers && process.env.ALLOW_REGISTRATION !== 'true') {
      return res.status(403).json({ error: 'Public registration is disabled' });
    }

    const existingUser = await findUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Generate 6 digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Save to DB
    await VerificationCode.destroy({ where: { email, type: 'registration' } }); // clear old
    await VerificationCode.create({
      email,
      code,
      type: 'registration',
      expiresAt: new Date(Date.now() + 15 * 60 * 1000) // 15 mins
    });

    await sendVerificationCode(email, code);
    res.json({ message: 'Verification code sent' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/register/verify', async (req, res) => {
  const { email, code, username, password } = req.body;
  if (!email || !code || !username || !password) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  try {
    const hasUsers = await hasAnyUsers();
    if (hasUsers && process.env.ALLOW_REGISTRATION !== 'true') {
      return res.status(403).json({ error: 'Public registration is disabled' });
    }

    const record = await VerificationCode.findOne({ 
      where: { email, code, type: 'registration' } 
    });

    if (!record || record.expiresAt < new Date()) {
      return res.status(400).json({ error: 'Invalid or expired code' });
    }

    const user = await createUser(username, email, password, hasUsers ? 'user' : 'admin');
    await VerificationCode.destroy({ where: { email, type: 'registration' } });

    res.json({ message: 'User registered successfully', user });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/auth/invite', authenticateToken, requireAdmin, async (req, res) => {
  const { email, role } = req.body;
  if (!email || !role) return res.status(400).json({ error: 'Email and role required' });

  try {
    const existingUser = await findUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    
    await Invitation.destroy({ where: { email } }); // clear old
    await Invitation.create({
      email,
      role,
      token,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    });

    await sendInvitationLink(email, role, token);
    res.json({ message: 'Invitation sent successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/auth/invite/verify/:token', async (req, res) => {
  try {
    const invitation = await Invitation.findOne({ where: { token: req.params.token, used: false } });
    if (!invitation || invitation.expiresAt < new Date()) {
      return res.status(400).json({ error: 'Invalid or expired invitation' });
    }
    res.json({ email: invitation.email, role: invitation.role });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/invite/accept', async (req, res) => {
  const { token, username, password } = req.body;
  if (!token || !username || !password) return res.status(400).json({ error: 'All fields required' });

  try {
    const invitation = await Invitation.findOne({ where: { token, used: false } });
    if (!invitation || invitation.expiresAt < new Date()) {
      return res.status(400).json({ error: 'Invalid or expired invitation' });
    }

    const user = await createUser(username, invitation.email, password, invitation.role);
    invitation.used = true;
    await invitation.save();

    res.json({ message: 'Account created successfully', user });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/auth/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });

  try {
    const user = await findUserByEmail(email);
    if (!user) {
      // Don't reveal if email exists or not for security
      return res.json({ message: 'If that email is registered, a reset code has been sent.' });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    
    await VerificationCode.destroy({ where: { email, type: 'reset' } });
    await VerificationCode.create({
      email,
      code,
      type: 'reset',
      expiresAt: new Date(Date.now() + 15 * 60 * 1000)
    });

    await sendPasswordResetCode(email, code);
    res.json({ message: 'If that email is registered, a reset code has been sent.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/reset-password', async (req, res) => {
  const { email, code, newPassword } = req.body;
  if (!email || !code || !newPassword) return res.status(400).json({ error: 'All fields required' });

  try {
    const record = await VerificationCode.findOne({ 
      where: { email, code, type: 'reset' } 
    });

    if (!record || record.expiresAt < new Date()) {
      return res.status(400).json({ error: 'Invalid or expired code' });
    }

    const user = await findUserByEmail(email);
    if (!user) return res.status(400).json({ error: 'User not found' });

    user.password = bcrypt.hashSync(newPassword, 10);
    await user.save();
    
    await VerificationCode.destroy({ where: { email, type: 'reset' } });

    res.json({ message: 'Password reset successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('refreshToken');
  res.json({ message: 'Logged out successfully' });
});

app.post('/api/auth/refresh', async (req, res) => {
  const refreshToken = req.cookies.refreshToken;
  if (!refreshToken) return res.status(401).json({ error: 'No refresh token' });

  const decoded = verifyToken(refreshToken);
  if (!decoded) return res.status(403).json({ error: 'Invalid refresh token' });

  const { findUserById } = require('./users');
  const user = await findUserById(decoded.id);

  if (!user) return res.status(403).json({ error: 'User no longer exists' });

  const newToken = generateToken(user);
  res.json({ token: newToken, user: { id: user.id, username: user.username, role: user.role } });
});

// --- User Management Routes ---
app.get('/api/auth/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { getUsers } = require('./users');
    const users = await getUsers();
    // Return users without sensitive data like passwords
    const safeUsers = users.map(u => ({
      id: u.id,
      username: u.username,
      role: u.role,
      createdAt: u.createdAt
    }));
    res.json(safeUsers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- Protected API Routes ---
app.use('/api/projects', authenticateToken);

app.get('/api/projects', async (req, res) => {
  try {
    const projects = await getAllProjects();
    res.json(projects);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/projects', requireAdmin, async (req, res) => {
  const { name, overrides, overwrite } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });

  // Slugify name (kebab-case)
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
  const projectDir = path.join(PROJECTS_DIR, slug);
  const composeFile = path.join(projectDir, 'docker-compose.yml');
  const configPath = path.join(projectDir, 'config.json');

  const existingDbProject = await ProjectConfig.findOne({ where: { name: slug } });
  
  if (existingDbProject || fs.existsSync(projectDir)) {
    if (!overwrite) {
      return res.status(409).json({ 
        error: 'Project already exists', 
        requiresOverwriteConfirmation: true 
      });
    } else {
      // If overwrite is confirmed, clean up existing files/db
      if (fs.existsSync(projectDir)) {
        try {
          try {
            await downProject(slug);
          } catch (e) {
            console.warn(`Warning: Failed to stop project ${slug} during overwrite: ${e.message}`);
            // Continue to try deleting files anyway
          }
          
          // Give Docker a moment to release file locks
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Retry deletion a few times for Windows reliability
          let retries = 3;
          while (retries > 0) {
            try {
              fs.rmSync(projectDir, { recursive: true, force: true });
              break;
            } catch (err) {
              retries--;
              if (retries === 0) throw err;
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          }
        } catch (e) {
          console.error(`Error cleaning up existing directory for ${slug}:`, e);
          // If we can't clean up, we can't overwrite.
          return res.status(500).json({ error: `Failed to clean up existing project: ${e.message}` });
        }
      }
      if (existingDbProject) {
        await ProjectConfig.destroy({ where: { name: slug } });
      }
    }
  }

  try {
    fs.mkdirSync(projectDir, { recursive: true });

    // Generate ports
    const ports = await getNextAvailablePorts();
    
    // Clean up empty overrides
    const cleanOverrides = overrides ? Object.fromEntries(
      Object.entries(overrides).filter(([_, v]) => v && v.trim() !== '')
    ) : {};

    const config = {
      name: slug,
      ...ports,
      overrides: cleanOverrides
    };

    // Save to PostgreSQL
    await ProjectConfig.create(config);

    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

    const yamlContent = generateTemplate(slug, config);
    fs.writeFileSync(composeFile, yamlContent);

    // Run docker compose up
    await upProject(slug);

    res.json({ message: 'Project created successfully', project: config });
  } catch (error) {
    console.error(`Failed to create project ${slug}:`, error);
    // Cleanup if failed
    if (fs.existsSync(projectDir)) {
      try {
        console.log(`Cleaning up failed project ${slug}...`);
        // Attempt to stop/remove containers using the compose file before deleting it
        await downProject(slug);
      } catch (cleanupErr) {
        console.error(`Error during cleanup of ${slug}:`, cleanupErr);
      }
      
      try {
        fs.rmSync(projectDir, { recursive: true, force: true });
      } catch (rmErr) {
        console.error(`Error removing directory for ${slug}:`, rmErr);
      }
    }
    
    try {
      await ProjectConfig.destroy({ where: { name: slug } });
    } catch (dbErr) {
      console.error(`Error cleaning up DB for ${slug}:`, dbErr);
    }

    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/projects/:name', requireAdmin, async (req, res) => {
  const { name } = req.params;
  try {
    await downProject(name);
    const projectDir = path.join(PROJECTS_DIR, name);
    if (fs.existsSync(projectDir)) {
      fs.rmSync(projectDir, { recursive: true, force: true });
    }
    
    await ProjectConfig.destroy({ where: { name } });
    
    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.patch('/api/projects/:name/config', requireAdmin, async (req, res) => {
  const { name } = req.params;
  const { overrides } = req.body;
  
  const projectDir = path.join(PROJECTS_DIR, name);
  const configPath = path.join(projectDir, 'config.json');
  const composeFile = path.join(projectDir, 'docker-compose.yml');

  const dbProject = await ProjectConfig.findOne({ where: { name } });
  if (!dbProject) {
    return res.status(404).json({ error: 'Project not found' });
  }

  try {
    let config = { overrides: {} };
    if (fs.existsSync(configPath)) {
      config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    }
    
    // Explicitly handle empty overrides to mean "remove this override"
    const newOverrides = { ...config.overrides, ...dbProject.overrides };
    
    if (overrides) {
      for (const [key, value] of Object.entries(overrides)) {
        if (value === '' || value === null || value === undefined) {
          delete newOverrides[key];
        } else {
          newOverrides[key] = value;
        }
      }
    }
    
    config.overrides = newOverrides;
    
    // Update DB
    dbProject.overrides = newOverrides;
    await dbProject.save();
    
    // Update JSON
    if (fs.existsSync(projectDir)) {
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

      // Regenerate docker-compose.yml
      const yamlContent = generateTemplate(name, {
        name,
        backendPort: dbProject.backendPort,
        siteProxyPort: dbProject.siteProxyPort,
        dashboardPort: dbProject.dashboardPort,
        overrides: newOverrides
      });
      fs.writeFileSync(composeFile, yamlContent);

      // If project is running, restart it to apply changes
      const status = await getProjectStatus(name);
      if (status === 'running') {
        await downProject(name);
        await upProject(name);
      }
    }

    res.json({ message: 'Configuration updated', project: dbProject });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/projects/:name/admin-key', requireAdmin, async (req, res) => {
  const { name } = req.params;
  try {
    const key = await generateAdminKey(name);
    
    // Save to DB
    const dbProject = await ProjectConfig.findOne({ where: { name } });
    if (dbProject) {
      dbProject.adminKey = key;
      await dbProject.save();
    }
    
    // Save the key to config.json so it persists
    const projectDir = path.join(PROJECTS_DIR, name);
    const configPath = path.join(projectDir, 'config.json');
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      config.adminKey = key;
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    }

    res.json({ message: 'Admin key generated', key });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/projects/:name/start', requireAdmin, async (req, res) => {
  const { name } = req.params;
  try {
    await startProject(name);
    res.json({ message: 'Project started' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/projects/:name/stop', requireAdmin, async (req, res) => {
  const { name } = req.params;
  try {
    await stopProject(name);
    res.json({ message: 'Project stopped' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/projects/:name/logs', (req, res) => {
  const { name } = req.params;
  
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  streamLogs(name, res);
});

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
