const { exec, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const PROJECTS_DIR = process.env.PROJECTS_DIR || path.join(__dirname, '..', 'projects');

function getProjectDir(name) {
  return path.join(PROJECTS_DIR, name);
}

function getComposeFile(name) {
  return path.join(getProjectDir(name), 'docker-compose.yml');
}

function execPromise(command, cwd) {
  return new Promise((resolve, reject) => {
    exec(command, { cwd }, (error, stdout, stderr) => {
      if (error) {
        reject({ error, stdout, stderr });
      } else {
        resolve({ stdout, stderr });
      }
    });
  });
}

async function upProject(name) {
  const composeFile = getComposeFile(name);
  if (!fs.existsSync(composeFile)) {
    throw new Error(`Compose file for ${name} not found`);
  }
  await execPromise(`docker compose -p ${name} -f ${composeFile} up -d`, getProjectDir(name));
}

async function downProject(name) {
  const composeFile = getComposeFile(name);
  if (!fs.existsSync(composeFile)) {
    throw new Error(`Compose file for ${name} not found`);
  }
  await execPromise(`docker compose -p ${name} -f ${composeFile} down`, getProjectDir(name));
}

async function startProject(name) {
  const composeFile = getComposeFile(name);
  if (!fs.existsSync(composeFile)) {
    throw new Error(`Compose file for ${name} not found`);
  }
  await execPromise(`docker compose -p ${name} -f ${composeFile} start`, getProjectDir(name));
}

async function stopProject(name) {
  const composeFile = getComposeFile(name);
  if (!fs.existsSync(composeFile)) {
    throw new Error(`Compose file for ${name} not found`);
  }
  await execPromise(`docker compose -p ${name} -f ${composeFile} stop`, getProjectDir(name));
}

async function getProjectStatus(name) {
  const composeFile = getComposeFile(name);
  if (!fs.existsSync(composeFile)) {
    return 'not_found';
  }
  try {
    const { stdout } = await execPromise(`docker compose -p ${name} -f ${composeFile} ps --format json`, getProjectDir(name));
    if (!stdout.trim()) return 'stopped';
    
    const lines = stdout.trim().split('\n');
    let containers = [];
    for (const line of lines) {
      if (line.trim().startsWith('[')) {
         containers = JSON.parse(line.trim());
         break;
      } else {
         containers.push(JSON.parse(line.trim()));
      }
    }
    
    const isRunning = containers.some(c => c.State === 'running');
    const isExited = containers.every(c => c.State === 'exited');
    
    if (isRunning) return 'running';
    if (isExited) return 'stopped';
    return 'error';
  } catch (err) {
    return 'error';
  }
}

function streamLogs(name, res) {
  const composeFile = getComposeFile(name);
  if (!fs.existsSync(composeFile)) {
    res.write(`data: ${JSON.stringify({ error: 'Project not found' })}\n\n`);
    res.end();
    return;
  }

  const child = spawn('docker', ['compose', '-p', name, '-f', composeFile, 'logs', '-f', '--tail', '100'], {
    cwd: getProjectDir(name)
  });

  child.stdout.on('data', (data) => {
    const lines = data.toString().split('\n').filter(Boolean);
    for (const line of lines) {
      res.write(`data: ${JSON.stringify({ log: line })}\n\n`);
    }
  });

  child.stderr.on('data', (data) => {
    const lines = data.toString().split('\n').filter(Boolean);
    for (const line of lines) {
      res.write(`data: ${JSON.stringify({ log: line, error: true })}\n\n`);
    }
  });

  child.on('close', () => {
    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  });

  res.on('close', () => {
    child.kill();
  });
}

async function generateAdminKey(name) {
  const composeFile = getComposeFile(name);
  if (!fs.existsSync(composeFile)) {
    throw new Error(`Compose file for ${name} not found`);
  }
  
  const status = await getProjectStatus(name);
  if (status !== 'running') {
    throw new Error('Project must be running to generate an admin key');
  }

  // Execute generate_admin_key.sh inside the backend container
  try {
    const { stdout } = await execPromise(`docker compose -p ${name} -f ${composeFile} exec backend-${name} ./generate_admin_key.sh`, getProjectDir(name));
    
    // The output usually contains the key, we need to extract it
    // Example output might be "Admin key: cx_admin_..."
    const match = stdout.match(/cx_admin_[a-zA-Z0-9_-]+/);
    if (match) {
      return match[0];
    } else {
      // Sometimes it's just name|hash format like test|01ad687...
      const lines = stdout.trim().split('\n');
      for (const line of lines) {
        const cleanLine = line.trim();
        if (cleanLine && !cleanLine.startsWith('Admin key:')) {
          return cleanLine;
        }
      }
      throw new Error('Could not parse admin key from output: ' + stdout);
    }
  } catch (error) {
    console.error('Error generating admin key:', error);
    throw new Error('Failed to generate admin key');
  }
}

module.exports = {
  upProject,
  downProject,
  startProject,
  stopProject,
  getProjectStatus,
  streamLogs,
  generateAdminKey
};