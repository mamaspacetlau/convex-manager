const { test, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const yaml = require('js-yaml');
const { syncProjectResources, removeProjectResources, isApiConfigured } = require('./pangolin');
const { generateTemplate } = require('./template');

const ENV = {
  PANGOLIN_API_URL: 'https://api.example.com/v1/',
  PANGOLIN_API_KEY: 'key-id.key-secret',
  PANGOLIN_ORG_ID: 'my-org',
  PANGOLIN_SITE: 'odyssey'
};

const OVERRIDES = {
  pangolin_enabled: 'true',
  pangolin_backend_domain: 'morphea-api.example.com',
  pangolin_dashboard_domain: 'morphea-dash.example.com',
  pangolin_dashboard_sso: 'true'
};

let saved;
let calls;
let existing; // niceId -> resourceId for resources that "exist" in Pangolin

beforeEach(() => {
  saved = { env: { ...process.env }, fetch: global.fetch };
  Object.assign(process.env, ENV);
  calls = [];
  existing = {};
  global.fetch = async (url, options = {}) => {
    calls.push({ url, method: options.method, headers: options.headers, body: options.body && JSON.parse(options.body) });
    const lookup = url.match(/\/org\/my-org\/resource\/(.+)$/);
    if (lookup && options.method === 'GET') {
      const id = existing[decodeURIComponent(lookup[1])];
      return id
        ? new Response(JSON.stringify({ data: { resourceId: id }, success: true }), { status: 200 })
        : new Response(JSON.stringify({ message: 'Resource not found' }), { status: 404 });
    }
    return new Response(JSON.stringify({ data: null, success: true, message: 'ok' }), { status: 200 });
  };
});

afterEach(() => {
  process.env = saved.env;
  global.fetch = saved.fetch;
});

function decodeBlueprint(call) {
  return JSON.parse(Buffer.from(call.body.blueprint, 'base64').toString('utf8'));
}

test('api: not configured -> no requests, null result', async () => {
  delete process.env.PANGOLIN_API_KEY;
  assert.equal(isApiConfigured(), false);
  assert.equal(await syncProjectResources('morphea', OVERRIDES), null);
  assert.equal(calls.length, 0);
});

test('api: applies a base64 JSON blueprint with bearer auth', async () => {
  const result = await syncProjectResources('morphea', OVERRIDES);

  const put = calls.find((c) => c.method === 'PUT');
  assert.equal(put.url, 'https://api.example.com/v1/org/my-org/blueprint');
  assert.equal(put.headers.Authorization, 'Bearer key-id.key-secret');

  assert.deepEqual(decodeBlueprint(put), {
    'public-resources': {
      'convex-morphea-backend': {
        name: 'morphea (Convex backend)',
        mode: 'http',
        'full-domain': 'morphea-api.example.com',
        auth: { 'sso-enabled': false },
        targets: [{ site: 'odyssey', method: 'http', hostname: 'backend-morphea', port: 3210 }]
      },
      'convex-morphea-dashboard': {
        name: 'morphea (Convex dashboard)',
        mode: 'http',
        'full-domain': 'morphea-dash.example.com',
        auth: { 'sso-enabled': true },
        targets: [{ site: 'odyssey', method: 'http', hostname: 'dashboard-morphea', port: 6791 }]
      }
    }
  });
  assert.deepEqual(result.applied, ['convex-morphea-backend', 'convex-morphea-dashboard']);
});

test('api: removes resources whose domain was cleared', async () => {
  existing['convex-morphea-site'] = 42;
  const result = await syncProjectResources('morphea', OVERRIDES);

  assert.ok(calls.some((c) => c.method === 'DELETE' && c.url === 'https://api.example.com/v1/resource/42'));
  assert.deepEqual(result.removed, ['convex-morphea-site']);
});

test('api: missing resources are skipped when removing', async () => {
  const result = await removeProjectResources('morphea');
  assert.equal(calls.filter((c) => c.method === 'PUT').length, 0);
  assert.equal(calls.filter((c) => c.method === 'DELETE').length, 0);
  assert.deepEqual(result.removed, []);
});

test('api: removeProjectResources deletes every existing resource', async () => {
  existing = { 'convex-morphea-backend': 1, 'convex-morphea-site': 2, 'convex-morphea-dashboard': 3 };
  const result = await removeProjectResources('morphea');
  assert.deepEqual(calls.filter((c) => c.method === 'DELETE').map((c) => c.url), [
    'https://api.example.com/v1/resource/1',
    'https://api.example.com/v1/resource/2',
    'https://api.example.com/v1/resource/3'
  ]);
  assert.equal(result.removed.length, 3);
});

test('api: surfaces API errors', async () => {
  global.fetch = async () => new Response(JSON.stringify({ message: 'Invalid API key' }), { status: 401 });
  await assert.rejects(syncProjectResources('morphea', OVERRIDES), /401.*Invalid API key/);
});

test('api configured: template skips labels (blueprint is applied instead)', () => {
  const t = yaml.load(generateTemplate('morphea', { backendPort: 3210, siteProxyPort: 3310, dashboardPort: 6791, overrides: OVERRIDES }));
  assert.equal(t.services['backend-morphea'].labels, undefined);
  assert.equal(t.services['dashboard-morphea'].labels, undefined);
  assert.equal(t.services['backend-morphea'].ports, undefined);
});
