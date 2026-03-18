const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const yaml = require('js-yaml');

const PROJECTS_DIR = process.env.PROJECTS_DIR || path.join(__dirname, '..', 'projects');

function kebabCase(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
}

function runMigration() {
  if (!fs.existsSync(PROJECTS_DIR)) return;

  const files = fs.readdirSync(PROJECTS_DIR);
  const composeFiles = files.filter(f => f.startsWith('docker-compose.') && f.endsWith('.yml'));

  for (const file of composeFiles) {
    const oldName = file.replace('docker-compose.', '').replace('.yml', '');
    const newName = kebabCase(oldName);
    
    const projectDir = path.join(PROJECTS_DIR, newName);
    if (!fs.existsSync(projectDir)) {
      fs.mkdirSync(projectDir, { recursive: true });
    }

    const dataDir = path.join(projectDir, 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    const oldComposePath = path.join(PROJECTS_DIR, file);

    try {
      const content = fs.readFileSync(oldComposePath, 'utf8');
      const parsed = yaml.load(content);
      
      // Stop the old project if running
      try {
        console.log(`Stopping old project ${oldName}...`);
        execSync(`docker compose -p ${oldName} -f ${oldComposePath} down`, { cwd: PROJECTS_DIR, stdio: 'ignore' });
      } catch (e) {
        // ignore
      }

      // We need to copy data from the named volume to the new bind mount.
      // The old volume name was likely `projects_data-${oldName}` or `data-${oldName}`
      const volumeName = `projects_data-${oldName}`;
      try {
        console.log(`Migrating data for ${oldName}...`);
        // We need to make sure alpine image is pulled or just use an existing one. We will use alpine
        execSync(`docker run --rm -v ${volumeName}:/from -v ${dataDir}:/to alpine sh -c "cp -a /from/. /to/"`, { stdio: 'ignore' });
      } catch (e) {
        console.error(`Could not copy data for ${oldName}. Volume might not exist or already migrated.`);
      }

      let backendPort = 3210;
      let siteProxyPort = 3211;
      let dashboardPort = 6791;

      if (parsed.services[`backend-${oldName}`] && parsed.services[`backend-${oldName}`].ports) {
        backendPort = parseInt(parsed.services[`backend-${oldName}`].ports[0].split(':')[0], 10);
        if (parsed.services[`backend-${oldName}`].ports[1]) {
          siteProxyPort = parseInt(parsed.services[`backend-${oldName}`].ports[1].split(':')[0], 10);
        }
      }
      if (parsed.services[`dashboard-${oldName}`] && parsed.services[`dashboard-${oldName}`].ports) {
        dashboardPort = parseInt(parsed.services[`dashboard-${oldName}`].ports[0].split(':')[0], 10);
      }

      const config = {
        name: newName,
        backendPort,
        siteProxyPort,
        dashboardPort,
        overrides: {}
      };
      fs.writeFileSync(path.join(projectDir, 'config.json'), JSON.stringify(config, null, 2));

      fs.unlinkSync(oldComposePath);
      
      console.log(`Successfully migrated project ${oldName} to directory ${newName}`);
    } catch (e) {
      console.error(`Error migrating ${oldName}:`, e);
    }
  }
}

module.exports = { runMigration };
