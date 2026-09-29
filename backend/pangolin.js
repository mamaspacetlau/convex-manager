// Pangolin reverse proxy integration.
// Resources are described once here and published either as container labels (read by a Newt site
// with Docker socket access) or, when the Integration API is configured, applied as a blueprint via
// PUT /v1/org/{orgId}/blueprint. See https://docs.pangolin.net/manage/blueprints

function isTrue(value) {
  return value === 'true' || value === true;
}

function sanitizeDomain(value) {
  if (typeof value !== 'string') {
    return '';
  }

  return value
    .trim()
    .replace(/^`+|`+$/g, '')
    .replace(/^[a-z]+:\/\//i, '')
    .replace(/\/.*$/, '')
    .toLowerCase()
    .replace(/[^a-z0-9.-]/g, '');
}

// Every resource a project can own; `key` doubles as the Pangolin identifier (niceId).
function resourceSlots(name) {
  return [
    { kind: 'backend', key: `convex-${name}-backend`, service: `backend-${name}`, port: 3210, domainField: 'pangolin_backend_domain' },
    { kind: 'site', key: `convex-${name}-site`, service: `backend-${name}`, port: 3211, domainField: 'pangolin_site_domain' },
    { kind: 'dashboard', key: `convex-${name}-dashboard`, service: `dashboard-${name}`, port: 6791, domainField: 'pangolin_dashboard_domain' }
  ];
}

// Resources for the domains that are configured. Backend/site stay public (SDK clients and
// HTTP actions); the dashboard can sit behind Pangolin SSO.
function pangolinResources(name, overrides = {}) {
  if (!isTrue(overrides.pangolin_enabled)) {
    return [];
  }

  return resourceSlots(name)
    .map((slot) => ({ ...slot, domain: sanitizeDomain(overrides[slot.domainField]) }))
    .filter((slot) => slot.domain)
    .map((slot) => ({
      key: slot.key,
      service: slot.service,
      resource: {
        name: `${name} (Convex ${slot.kind})`,
        mode: 'http',
        'full-domain': slot.domain,
        auth: { 'sso-enabled': slot.kind === 'dashboard' && isTrue(overrides.pangolin_dashboard_sso) },
        targets: [{ method: 'http', hostname: slot.service, port: slot.port }]
      }
    }));
}

// Container label form. `site` is omitted: Newt assigns targets to its own site.
// See https://docs.pangolin.net/manage/blueprints#container-labels-format
function resourceLabels(key, resource) {
  const prefix = `pangolin.public-resources.${key}`;
  const target = resource.targets[0];
  return [
    `${prefix}.name=${resource.name}`,
    `${prefix}.mode=${resource.mode}`,
    `${prefix}.full-domain=${resource['full-domain']}`,
    `${prefix}.auth.sso-enabled=${resource.auth['sso-enabled']}`,
    `${prefix}.targets[0].method=${target.method}`,
    `${prefix}.targets[0].hostname=${target.hostname}`,
    `${prefix}.targets[0].port=${target.port}`
  ];
}

function apiConfig() {
  const url = (process.env.PANGOLIN_API_URL || '').trim().replace(/\/+$/, '').replace(/\/v1$/, '');
  const apiKey = (process.env.PANGOLIN_API_KEY || '').trim();
  const orgId = (process.env.PANGOLIN_ORG_ID || '').trim();
  const site = (process.env.PANGOLIN_SITE || '').trim();
  return { url, apiKey, orgId, site };
}

function isApiConfigured() {
  const { url, apiKey, orgId, site } = apiConfig();
  return Boolean(url && apiKey && orgId && site);
}

function buildBlueprint(name, overrides) {
  const { site } = apiConfig();
  const blueprint = { 'public-resources': {} };
  for (const { key, resource } of pangolinResources(name, overrides)) {
    blueprint['public-resources'][key] = {
      ...resource,
      targets: resource.targets.map((target) => ({ site, ...target }))
    };
  }
  return blueprint;
}

async function apiRequest(method, path, body) {
  const { url, apiKey } = apiConfig();
  const response = await fetch(`${url}/v1${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      ...(body ? { 'Content-Type': 'application/json' } : {})
    },
    ...(body ? { body: JSON.stringify(body) } : {})
  });

  const text = await response.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    // Non-JSON error page; fall through with the raw text
  }

  if (!response.ok) {
    const error = new Error(`Pangolin API ${method} ${path} failed (${response.status}): ${json?.message || text.slice(0, 200)}`);
    error.status = response.status;
    throw error;
  }
  return json;
}

async function deleteResource(key) {
  const { orgId } = apiConfig();
  let found;
  try {
    found = await apiRequest('GET', `/org/${encodeURIComponent(orgId)}/resource/${encodeURIComponent(key)}`);
  } catch (error) {
    if (error.status === 404) return false;
    throw error;
  }

  const resourceId = found?.data?.resourceId;
  if (!resourceId) return false;

  await apiRequest('DELETE', `/resource/${resourceId}`);
  return true;
}

// Make Pangolin match the project's overrides: apply configured resources, delete the rest.
// No-op (returns null) when the Integration API isn't configured.
async function syncProjectResources(name, overrides = {}) {
  if (!isApiConfigured()) {
    return null;
  }

  const { orgId } = apiConfig();
  const wanted = pangolinResources(name, overrides);
  const wantedKeys = new Set(wanted.map((r) => r.key));

  if (wanted.length) {
    const blueprint = buildBlueprint(name, overrides);
    await apiRequest('PUT', `/org/${encodeURIComponent(orgId)}/blueprint`, {
      blueprint: Buffer.from(JSON.stringify(blueprint)).toString('base64')
    });
  }

  const removed = [];
  for (const { key } of resourceSlots(name)) {
    if (!wantedKeys.has(key) && await deleteResource(key)) {
      removed.push(key);
    }
  }

  return { applied: [...wantedKeys], removed };
}

async function removeProjectResources(name) {
  return syncProjectResources(name, {});
}

module.exports = {
  isTrue,
  sanitizeDomain,
  pangolinResources,
  resourceLabels,
  buildBlueprint,
  isApiConfigured,
  syncProjectResources,
  removeProjectResources
};
