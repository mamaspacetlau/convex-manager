const { test } = require('node:test');
const assert = require('node:assert/strict');
const yaml = require('js-yaml');
const { generateTemplate } = require('./template');

const PORTS = { backendPort: 3210, siteProxyPort: 3310, dashboardPort: 6791 };

function render(name, overrides) {
  return yaml.load(generateTemplate(name, { ...PORTS, overrides }));
}

function labelMap(service) {
  return Object.fromEntries((service.labels || []).map((label) => {
    const i = label.indexOf('=');
    return [label.slice(0, i), label.slice(i + 1)];
  }));
}

const PANGOLIN = {
  pangolin_enabled: 'true',
  pangolin_backend_domain: 'api.morphea.example.com',
  pangolin_site_domain: 'site.morphea.example.com',
  pangolin_dashboard_domain: 'dash.morphea.example.com'
};

test('pangolin: publishes no host ports', () => {
  const t = render('morphea', PANGOLIN);
  assert.equal(t.services['backend-morphea'].ports, undefined);
  assert.equal(t.services['dashboard-morphea'].ports, undefined);
});

test('pangolin: backend and site resources target the backend container', () => {
  const labels = labelMap(render('morphea', PANGOLIN).services['backend-morphea']);
  const backend = 'pangolin.public-resources.convex-morphea-backend';
  const site = 'pangolin.public-resources.convex-morphea-site';

  assert.equal(labels[`${backend}.mode`], 'http');
  assert.equal(labels[`${backend}.full-domain`], 'api.morphea.example.com');
  assert.equal(labels[`${backend}.auth.sso-enabled`], 'false');
  assert.equal(labels[`${backend}.targets[0].method`], 'http');
  assert.equal(labels[`${backend}.targets[0].hostname`], 'backend-morphea');
  assert.equal(labels[`${backend}.targets[0].port`], '3210');

  assert.equal(labels[`${site}.full-domain`], 'site.morphea.example.com');
  assert.equal(labels[`${site}.auth.sso-enabled`], 'false');
  assert.equal(labels[`${site}.targets[0].hostname`], 'backend-morphea');
  assert.equal(labels[`${site}.targets[0].port`], '3211');
});

test('pangolin: dashboard resource targets the dashboard container, SSO off by default', () => {
  const labels = labelMap(render('morphea', PANGOLIN).services['dashboard-morphea']);
  const dash = 'pangolin.public-resources.convex-morphea-dashboard';

  assert.equal(labels[`${dash}.full-domain`], 'dash.morphea.example.com');
  assert.equal(labels[`${dash}.targets[0].hostname`], 'dashboard-morphea');
  assert.equal(labels[`${dash}.targets[0].port`], '6791');
  assert.equal(labels[`${dash}.auth.sso-enabled`], 'false');
});

test('pangolin: dashboard SSO can be enabled', () => {
  const labels = labelMap(render('morphea', { ...PANGOLIN, pangolin_dashboard_sso: 'true' }).services['dashboard-morphea']);
  assert.equal(labels['pangolin.public-resources.convex-morphea-dashboard.auth.sso-enabled'], 'true');
});

test('pangolin: origins default to https domains', () => {
  const t = render('morphea', PANGOLIN);
  const env = t.services['backend-morphea'].environment;
  assert.ok(env.includes('CONVEX_CLOUD_ORIGIN=https://api.morphea.example.com'));
  assert.ok(env.includes('CONVEX_SITE_ORIGIN=https://site.morphea.example.com'));
  assert.ok(t.services['dashboard-morphea'].environment.includes('NEXT_PUBLIC_DEPLOYMENT_URL=https://api.morphea.example.com'));
});

test('pangolin: explicit origin overrides win', () => {
  const t = render('morphea', { ...PANGOLIN, convex_cloud_origin: 'https://custom.example.com' });
  assert.ok(t.services['backend-morphea'].environment.includes('CONVEX_CLOUD_ORIGIN=https://custom.example.com'));
});

test('pangolin: domains are sanitized', () => {
  const t = render('morphea', { ...PANGOLIN, pangolin_backend_domain: ' https://API.Morphea.example.com/path ' });
  const labels = labelMap(t.services['backend-morphea']);
  assert.equal(labels['pangolin.public-resources.convex-morphea-backend.full-domain'], 'api.morphea.example.com');
});

test('pangolin: only configured domains produce resources', () => {
  const t = render('morphea', { pangolin_enabled: 'true', pangolin_backend_domain: 'api.morphea.example.com' });
  const labels = Object.keys(labelMap(t.services['backend-morphea']));
  assert.ok(labels.every((k) => k.startsWith('pangolin.public-resources.convex-morphea-backend.')));
  assert.equal(t.services['dashboard-morphea'].labels, undefined);
});

test('pangolin: domains are ignored when pangolin is disabled', () => {
  const t = render('morphea', { ...PANGOLIN, pangolin_enabled: 'false' });
  assert.equal(t.services['backend-morphea'].labels, undefined);
  assert.deepEqual(t.services['backend-morphea'].ports, ['3210:3210', '3310:3211']);
});

test('pangolin: projects join PROJECTS_NETWORK', () => {
  const previous = process.env.PROJECTS_NETWORK;
  process.env.PROJECTS_NETWORK = 'pangolin';
  try {
    assert.deepEqual(render('morphea', PANGOLIN).networks.default, { name: 'pangolin', external: true });
  } finally {
    if (previous === undefined) delete process.env.PROJECTS_NETWORK;
    else process.env.PROJECTS_NETWORK = previous;
  }
});

test('no proxy: unchanged defaults', () => {
  const t = render('plain', {});
  assert.deepEqual(t.services['backend-plain'].ports, ['3210:3210', '3310:3211']);
  assert.deepEqual(t.services['dashboard-plain'].ports, ['6791:6791']);
  assert.equal(t.networks.default.name, 'convex-manager');
});
