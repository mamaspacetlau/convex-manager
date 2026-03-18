const fs = require('fs');
const path = require('path');
const net = require('net');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

const PROJECTS_DIR = process.env.PROJECTS_DIR || path.join(__dirname, '..', 'projects');

async function isPortAvailable(port) {
  try {
    // Check if any process is actively listening on this port
    // Cross-platform check using docker, since all our ports are mapped via docker
    const { stdout } = await execPromise(`docker ps --format "{{.Ports}}" | grep ":${port}->"`);
    if (stdout.trim()) {
      return false; // Port is mapped by a running container
    }
  } catch (e) {
    // grep returns exit code 1 if no match found, which means port is free in docker
  }

  // Also do a standard TCP bind check just in case
  return new Promise((resolve) => {
    const server = net.createServer();
    server.unref();
    server.on('error', () => resolve(false));
    server.listen({ port, host: '0.0.0.0' }, () => {
      server.close(() => resolve(true));
    });
  });
}

async function getNextAvailablePorts() {
  const BASE_BACKEND = 3210;
  const BASE_SITE = 3310;
  const BASE_DASHBOARD = 6791;
  
  const usedPorts = new Set();

  if (fs.existsSync(PROJECTS_DIR)) {
    const projects = fs.readdirSync(PROJECTS_DIR).filter(f => {
      try {
        return fs.statSync(path.join(PROJECTS_DIR, f)).isDirectory();
      } catch (e) {
        return false;
      }
    });
    
    for (const project of projects) {
      const configPath = path.join(PROJECTS_DIR, project, 'config.json');
      if (fs.existsSync(configPath)) {
        try {
          const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
          if (config.backendPort) usedPorts.add(config.backendPort);
          if (config.siteProxyPort) usedPorts.add(config.siteProxyPort);
          if (config.dashboardPort) usedPorts.add(config.dashboardPort);
        } catch (err) {
          console.error(`Error reading config for ${project}:`, err);
        }
      }
    }
  }

  let i = 0;
  while (true) {
    const backendPort = BASE_BACKEND + i;
    const siteProxyPort = BASE_SITE + i;
    const dashboardPort = BASE_DASHBOARD + i;

    // Check both if port is used by known projects AND if it's actually free on the host
    if (!usedPorts.has(backendPort) && 
        !usedPorts.has(siteProxyPort) && 
        !usedPorts.has(dashboardPort)) {
      
      const [backendAvailable, siteAvailable, dashboardAvailable] = await Promise.all([
        isPortAvailable(backendPort),
        isPortAvailable(siteProxyPort),
        isPortAvailable(dashboardPort)
      ]);

      if (backendAvailable && siteAvailable && dashboardAvailable) {
        console.log(`[Ports] Assigned ports - Backend: ${backendPort}, Site: ${siteProxyPort}, Dashboard: ${dashboardPort}`);
        return { backendPort, siteProxyPort, dashboardPort };
      }
    }
    i++;
  }
}

module.exports = { getNextAvailablePorts };