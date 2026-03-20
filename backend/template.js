const yaml = require('js-yaml');

function generateTemplate(name, config) {
  const { backendPort, siteProxyPort, dashboardPort, overrides = {} } = config;
  
  const cloudOrigin = overrides.convex_cloud_origin || `http://127.0.0.1:${backendPort}`;
  const siteOrigin = overrides.convex_site_origin || `http://127.0.0.1:${siteProxyPort}`;
  const dashboardUrl = overrides.dashboard_url || `http://127.0.0.1:${backendPort}`;

  const traefikEnabled = overrides.traefik_enabled === 'true' || overrides.traefik_enabled === true;

  const template = {
    version: '3.8',
    services: {
      [`backend-${name}`]: {
        image: 'ghcr.io/get-convex/convex-backend:latest',
        stop_grace_period: '10s',
        stop_signal: 'SIGINT',
        restart: 'unless-stopped',
        ...(traefikEnabled ? {} : {
          ports: [
            `${backendPort}:3210`,
            `${siteProxyPort}:3211`
          ]
        }),
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
          `APPLICATION_MAX_CONCURRENT_V8_ACTIONS=16`,
          ...(overrides.auth_url ? [`JWKS_URL=${overrides.auth_url}`] : [])
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
        ...(traefikEnabled ? {} : {
          ports: [
            `${dashboardPort}:6791`
          ]
        }),
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

  if (traefikEnabled) {
    template.services[`backend-${name}`].labels = [];
    
    if (overrides.traefik_backend_rule) {
      const rule = overrides.traefik_backend_rule.startsWith('Host') 
        ? overrides.traefik_backend_rule 
        : `Host(\`${overrides.traefik_backend_rule}\`)`;
        
      template.services[`backend-${name}`].labels.push(
        `traefik.enable=true`,
        `traefik.http.routers.backend-${name}.rule=${rule}`,
        `traefik.http.routers.backend-${name}.entrypoints=websecure`,
        `traefik.http.routers.backend-${name}.service=backend-${name}`,
        `traefik.http.services.backend-${name}.loadbalancer.server.port=3210`,
        ...(overrides.traefik_network ? [`traefik.docker.network=${overrides.traefik_network}`] : []),
        ...(overrides.traefik_certresolver ? [
          `traefik.http.routers.backend-${name}.tls=true`,
          `traefik.http.routers.backend-${name}.tls.certresolver=${overrides.traefik_certresolver}`
        ] : [])
      );
    }

    if (overrides.traefik_site_rule) {
      const rule = overrides.traefik_site_rule.startsWith('Host') 
        ? overrides.traefik_site_rule 
        : `Host(\`${overrides.traefik_site_rule}\`)`;

      if (!overrides.traefik_backend_rule) {
        template.services[`backend-${name}`].labels.push(`traefik.enable=true`);
        if (overrides.traefik_network) {
            template.services[`backend-${name}`].labels.push(`traefik.docker.network=${overrides.traefik_network}`);
        }
      }
      template.services[`backend-${name}`].labels.push(
        `traefik.http.routers.site-${name}.rule=${rule}`,
        `traefik.http.routers.site-${name}.entrypoints=websecure`,
        `traefik.http.routers.site-${name}.service=site-${name}`,
        `traefik.http.services.site-${name}.loadbalancer.server.port=3211`,
        ...(overrides.traefik_certresolver ? [
          `traefik.http.routers.site-${name}.tls=true`,
          `traefik.http.routers.site-${name}.tls.certresolver=${overrides.traefik_certresolver}`
        ] : [])
      );
    }

    if (overrides.traefik_dashboard_rule) {
      const rule = overrides.traefik_dashboard_rule.startsWith('Host') 
        ? overrides.traefik_dashboard_rule 
        : `Host(\`${overrides.traefik_dashboard_rule}\`)`;

      template.services[`dashboard-${name}`].labels = [
        `traefik.enable=true`,
        `traefik.http.routers.dashboard-${name}.rule=${rule}`,
        `traefik.http.routers.dashboard-${name}.entrypoints=websecure`,
        `traefik.http.routers.dashboard-${name}.service=dashboard-${name}`,
        `traefik.http.services.dashboard-${name}.loadbalancer.server.port=6791`,
        ...(overrides.traefik_network ? [`traefik.docker.network=${overrides.traefik_network}`] : []),
        ...(overrides.traefik_certresolver ? [
          `traefik.http.routers.dashboard-${name}.tls=true`,
          `traefik.http.routers.dashboard-${name}.tls.certresolver=${overrides.traefik_certresolver}`
        ] : [])
      ];
    }
    
    if (overrides.traefik_network) {
      template.networks[overrides.traefik_network] = { external: true };
      template.services[`backend-${name}`].networks = ['default', overrides.traefik_network];
      template.services[`dashboard-${name}`].networks = ['default', overrides.traefik_network];
    }
  }

  return yaml.dump(template, { noRefs: true });
}

module.exports = { generateTemplate };