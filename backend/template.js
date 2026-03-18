const yaml = require('js-yaml');

function generateTemplate(name, config) {
  const { backendPort, siteProxyPort, dashboardPort, overrides = {} } = config;
  
  const cloudOrigin = overrides.convex_cloud_origin || `http://127.0.0.1:${backendPort}`;
  const siteOrigin = overrides.convex_site_origin || `http://127.0.0.1:${siteProxyPort}`;
  const dashboardUrl = overrides.dashboard_url || `http://127.0.0.1:${backendPort}`;

  const template = {
    services: {
      [`backend-${name}`]: {
        image: 'ghcr.io/get-convex/convex-backend:latest',
        stop_grace_period: '10s',
        stop_signal: 'SIGINT',
        restart: 'unless-stopped',
        ports: [
          `${backendPort}:3210`,
          `${siteProxyPort}:3211`
        ],
        volumes: [
          `convex-data:/convex/data`
        ],
        environment: [
          `CONVEX_CLOUD_ORIGIN=${cloudOrigin}`,
          `CONVEX_SITE_ORIGIN=${siteOrigin}`,
          `INSTANCE_NAME=${name}`,
          `RUST_LOG=info`,
          `DISABLE_METRICS_ENDPOINT=true`,
          `DISABLE_BEACON=true`,
          `DOCUMENT_RETENTION_DELAY=172800`,
          `APPLICATION_MAX_CONCURRENT_MUTATIONS=16`,
          `APPLICATION_MAX_CONCURRENT_NODE_ACTIONS=16`,
          `APPLICATION_MAX_CONCURRENT_QUERIES=16`,
          `APPLICATION_MAX_CONCURRENT_V8_ACTIONS=16`
        ],
        healthcheck: {
          test: `curl -f http://127.0.0.1:3210/version || wget -q --spider http://127.0.0.1:3210/version || exit 1`,
          interval: '5s',
          start_period: '10s',
          retries: 5
        }
      },
      [`dashboard-${name}`]: {
        image: 'ghcr.io/get-convex/convex-dashboard:latest',
        stop_grace_period: '10s',
        stop_signal: 'SIGINT',
        restart: 'unless-stopped',
        ports: [
          `${dashboardPort}:6791`
        ],
        environment: [
          `NEXT_PUBLIC_DEPLOYMENT_URL=${cloudOrigin}`
        ],
        depends_on: [
          `backend-${name}`
        ]
      }
    },
    networks: {
      default: {
        name: 'convex-manager',
        external: true
      }
    },
    volumes: {
      'convex-data': {}
    }
  };

  return yaml.dump(template, { noRefs: true });
}

module.exports = { generateTemplate };