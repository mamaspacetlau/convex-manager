import React from 'react';

export const PANGOLIN_DEFAULTS = {
  pangolin_enabled: false,
  pangolin_backend_domain: '',
  pangolin_site_domain: '',
  pangolin_dashboard_domain: '',
  pangolin_dashboard_sso: false
};

const ORIGIN_FIELDS = {
  pangolin_backend_domain: 'convex_cloud_origin',
  pangolin_site_domain: 'convex_site_origin',
  pangolin_dashboard_domain: 'dashboard_url'
};

const BOOLEAN_FIELDS = ['traefik_enabled', 'pangolin_enabled', 'pangolin_dashboard_sso'];

export function stringifyProxyBooleans(overrides) {
  const result = { ...overrides };
  for (const field of BOOLEAN_FIELDS) {
    if (result[field] !== undefined) {
      result[field] = String(result[field]);
    }
  }
  return result;
}

function cleanDomain(value) {
  return value.trim().replace(/^[a-z]+:\/\//i, '').replace(/\/.*$/, '');
}

const inputClass = 'w-full bg-background border border-borderGray rounded-md px-3 py-2 text-foreground placeholder-muted-foreground focus:outline-none focus:border-convexOrange text-sm disabled:opacity-50 font-mono';

function Toggle({ checked, onChange, disabled }) {
  return (
    <label className="flex items-center cursor-pointer">
      <div className="relative">
        <input
          type="checkbox"
          className="sr-only"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
        />
        <div className={`block w-10 h-6 rounded-full transition-colors ${checked ? 'bg-convexOrange' : 'bg-borderGray'}`}></div>
        <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${checked ? 'transform translate-x-4' : ''}`}></div>
      </div>
      <span className="ml-3 text-sm font-medium text-muted-foreground">
        Enable
      </span>
    </label>
  );
}

export function PangolinSettings({ overrides, onChange, disabled }) {
  const handleToggle = (checked) => {
    // Only one reverse proxy can own the project at a time
    onChange({ ...overrides, pangolin_enabled: checked, ...(checked ? { traefik_enabled: false } : {}) });
  };

  const handleDomainChange = (field, value) => {
    const next = { ...overrides, [field]: value };
    const domain = cleanDomain(value);
    // Pangolin always serves over https
    next[ORIGIN_FIELDS[field]] = domain ? `https://${domain}` : '';
    onChange(next);
  };

  return (
    <div className="border-t border-borderGray pt-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-foreground">Pangolin Reverse Proxy</h3>
        <Toggle checked={overrides.pangolin_enabled} onChange={handleToggle} disabled={disabled} />
      </div>

      {overrides.pangolin_enabled && (
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Resources are created by Newt from container labels. Newt must share the manager's project network and have Docker socket access. No host ports are published.
          </p>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Backend Domain
            </label>
            <input
              type="text"
              value={overrides.pangolin_backend_domain}
              onChange={(e) => handleDomainChange('pangolin_backend_domain', e.target.value)}
              disabled={disabled}
              placeholder="api.myproject.com"
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Site Domain
            </label>
            <input
              type="text"
              value={overrides.pangolin_site_domain}
              onChange={(e) => handleDomainChange('pangolin_site_domain', e.target.value)}
              disabled={disabled}
              placeholder="site.myproject.com"
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Dashboard Domain
            </label>
            <input
              type="text"
              value={overrides.pangolin_dashboard_domain}
              onChange={(e) => handleDomainChange('pangolin_dashboard_domain', e.target.value)}
              disabled={disabled}
              placeholder="dashboard.myproject.com"
              className={inputClass}
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={overrides.pangolin_dashboard_sso}
              onChange={(e) => onChange({ ...overrides, pangolin_dashboard_sso: e.target.checked })}
              disabled={disabled}
              className="accent-convexOrange"
            />
            Protect dashboard with Pangolin SSO
          </label>
        </div>
      )}
    </div>
  );
}
