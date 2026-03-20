import React, { useState } from 'react';
import { X } from 'lucide-react';

export function ProjectSettingsModal({ isOpen, onClose, project, onSave }) {
  const [overrides, setOverrides] = useState({
    convex_cloud_origin: project?.overrides?.convex_cloud_origin || '',
    convex_site_origin: project?.overrides?.convex_site_origin || '',
    dashboard_url: project?.overrides?.dashboard_url || '',
    traefik_enabled: project?.overrides?.traefik_enabled === 'true' || project?.overrides?.traefik_enabled === true,
    traefik_network: project?.overrides?.traefik_network || '',
    traefik_certresolver: project?.overrides?.traefik_certresolver || '',
    traefik_backend_rule: project?.overrides?.traefik_backend_rule || '',
    traefik_site_rule: project?.overrides?.traefik_site_rule || '',
    traefik_dashboard_rule: project?.overrides?.traefik_dashboard_rule || ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen || !project) return null;

  const extractHostFromRule = (rule) => {
    if (!rule) return '';
    if (rule.startsWith('Host(')) {
      const match = rule.match(/Host\(['"`](.*?)['"`]\)/i);
      return match ? match[1] : '';
    }
    return rule.trim();
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    const newOverrides = { ...overrides, [name]: value };

    // Auto-fill logic when routing rules change
    if (name.startsWith('traefik_') && name.endsWith('_rule')) {
      const host = extractHostFromRule(value);
      if (host) {
        const protocol = newOverrides.traefik_certresolver ? 'https://' : 'http://';
        if (name === 'traefik_backend_rule') {
          newOverrides.convex_cloud_origin = `${protocol}${host}`;
        } else if (name === 'traefik_site_rule') {
          newOverrides.convex_site_origin = `${protocol}${host}`;
        } else if (name === 'traefik_dashboard_rule') {
          newOverrides.dashboard_url = `${protocol}${host}`;
        }
      }
    }

    // Auto-update protocol if certresolver changes
    if (name === 'traefik_certresolver') {
      const protocol = value ? 'https://' : 'http://';
      if (newOverrides.traefik_backend_rule) {
        const host = extractHostFromRule(newOverrides.traefik_backend_rule);
        if (host) newOverrides.convex_cloud_origin = `${protocol}${host}`;
      }
      if (newOverrides.traefik_site_rule) {
        const host = extractHostFromRule(newOverrides.traefik_site_rule);
        if (host) newOverrides.convex_site_origin = `${protocol}${host}`;
      }
      if (newOverrides.traefik_dashboard_rule) {
        const host = extractHostFromRule(newOverrides.traefik_dashboard_rule);
        if (host) newOverrides.dashboard_url = `${protocol}${host}`;
      }
    }

    setOverrides(newOverrides);
  };

  const handleToggleTraefik = (e) => {
    setOverrides({...overrides, traefik_enabled: e.target.checked});
  };

  const validateUrl = (url) => {
    if (!url) return true; // empty is fine, means use default
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (overrides.convex_cloud_origin && !validateUrl(overrides.convex_cloud_origin)) {
      return setError('Invalid Convex Cloud Origin URL');
    }
    if (overrides.convex_site_origin && !validateUrl(overrides.convex_site_origin)) {
      return setError('Invalid Convex Site Origin URL');
    }
    if (overrides.dashboard_url && !validateUrl(overrides.dashboard_url)) {
      return setError('Invalid Dashboard URL');
    }

    setIsSubmitting(true);
    try {
      // Clean and stringify boolean
      const cleanOverrides = { ...overrides };
      if (cleanOverrides.traefik_enabled !== undefined) {
        cleanOverrides.traefik_enabled = String(cleanOverrides.traefik_enabled);
      }
      
      // Send all overrides, backend will handle removing empty ones
      await onSave(project.name, cleanOverrides);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = async () => {
    const emptyOverrides = {
      convex_cloud_origin: '',
      convex_site_origin: '',
      dashboard_url: '',
      traefik_enabled: false,
      traefik_network: '',
      traefik_certresolver: '',
      traefik_backend_rule: '',
      traefik_site_rule: '',
      traefik_dashboard_rule: ''
    };
    setOverrides(emptyOverrides);
    
    setIsSubmitting(true);
    try {
      await onSave(project.name, emptyOverrides);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <div className="bg-cardBg border border-borderGray rounded-xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-borderGray shrink-0">
          <div>
            <h2 className="text-xl font-semibold text-foreground">Project Settings</h2>
            <p className="text-sm text-muted-foreground mt-1">Configure settings for {project.name}</p>
          </div>
          <button 
            onClick={onClose}
            disabled={isSubmitting}
            className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="overflow-y-auto p-4 sm:p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded-md text-sm">
              {error}
            </div>
          )}

          <div className="space-y-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-foreground">Traefik Reverse Proxy</h3>
              <label className="flex items-center cursor-pointer">
                <div className="relative">
                  <input
                    type="checkbox"
                    className="sr-only"
                    name="traefik_enabled"
                    checked={overrides.traefik_enabled}
                    onChange={handleToggleTraefik}
                    disabled={isSubmitting}
                  />
                  <div className={`block w-10 h-6 rounded-full transition-colors ${overrides.traefik_enabled ? 'bg-convexOrange' : 'bg-borderGray'}`}></div>
                  <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${overrides.traefik_enabled ? 'transform translate-x-4' : ''}`}></div>
                </div>
                <span className="ml-3 text-sm font-medium text-muted-foreground">
                  Enable
                </span>
              </label>
            </div>
            
            {overrides.traefik_enabled && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">
                      Traefik Network
                    </label>
                    <input
                      type="text"
                      name="traefik_network"
                      value={overrides.traefik_network}
                      onChange={handleChange}
                      disabled={isSubmitting}
                      placeholder="traefik_proxy"
                      className="w-full bg-background border border-borderGray rounded-md px-3 py-2 text-foreground placeholder-muted-foreground focus:outline-none focus:border-convexOrange text-sm disabled:opacity-50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">
                      CertResolver
                    </label>
                    <input
                      type="text"
                      name="traefik_certresolver"
                      value={overrides.traefik_certresolver}
                      onChange={handleChange}
                      disabled={isSubmitting}
                      placeholder="myresolver"
                      className="w-full bg-background border border-borderGray rounded-md px-3 py-2 text-foreground placeholder-muted-foreground focus:outline-none focus:border-convexOrange text-sm disabled:opacity-50"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    Backend Domain
                  </label>
                  <input
                    type="text"
                    name="traefik_backend_rule"
                    value={overrides.traefik_backend_rule}
                    onChange={handleChange}
                    disabled={isSubmitting}
                    placeholder="api.myproject.com"
                    className="w-full bg-background border border-borderGray rounded-md px-3 py-2 text-foreground placeholder-muted-foreground focus:outline-none focus:border-convexOrange text-sm disabled:opacity-50 font-mono"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    Site Domain
                  </label>
                  <input
                    type="text"
                    name="traefik_site_rule"
                    value={overrides.traefik_site_rule}
                    onChange={handleChange}
                    disabled={isSubmitting}
                    placeholder="site.myproject.com"
                    className="w-full bg-background border border-borderGray rounded-md px-3 py-2 text-foreground placeholder-muted-foreground focus:outline-none focus:border-convexOrange text-sm disabled:opacity-50 font-mono"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    Dashboard Domain
                  </label>
                  <input
                    type="text"
                    name="traefik_dashboard_rule"
                    value={overrides.traefik_dashboard_rule}
                    onChange={handleChange}
                    disabled={isSubmitting}
                    placeholder="dashboard.myproject.com"
                    className="w-full bg-background border border-borderGray rounded-md px-3 py-2 text-foreground placeholder-muted-foreground focus:outline-none focus:border-convexOrange text-sm disabled:opacity-50 font-mono"
                  />
                </div>
              </div>
            )}
          </div>

          {!overrides.traefik_enabled && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  Convex Cloud Origin
                </label>
                <input
                  type="url"
                  name="convex_cloud_origin"
                  value={overrides.convex_cloud_origin}
                  onChange={handleChange}
                  disabled={isSubmitting}
                  placeholder="https://cloud.example.com"
                  className="w-full bg-background border border-borderGray rounded-md px-3 py-2 text-foreground placeholder-muted-foreground focus:outline-none focus:border-convexOrange text-sm disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  Convex Site Origin
                </label>
                <input
                  type="url"
                  name="convex_site_origin"
                  value={overrides.convex_site_origin}
                  onChange={handleChange}
                  disabled={isSubmitting}
                  placeholder="https://site.example.com"
                  className="w-full bg-background border border-borderGray rounded-md px-3 py-2 text-foreground placeholder-muted-foreground focus:outline-none focus:border-convexOrange text-sm disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  Dashboard URL
                </label>
                <input
                  type="url"
                  name="dashboard_url"
                  value={overrides.dashboard_url}
                  onChange={handleChange}
                  disabled={isSubmitting}
                  placeholder="https://dashboard.example.com"
                  className="w-full bg-background border border-borderGray rounded-md px-3 py-2 text-foreground placeholder-muted-foreground focus:outline-none focus:border-convexOrange text-sm disabled:opacity-50"
                />
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-4 border-t border-borderGray mt-6">
            <button
              type="button"
              onClick={handleReset}
              disabled={isSubmitting}
              className="text-sm text-muted-foreground hover:text-foreground hover:underline disabled:opacity-50"
            >
              Reset to defaults
            </button>
            
            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2 bg-convexOrange hover:bg-orange-600 text-white font-medium rounded-md transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </form>
        </div>
      </div>
    </div>
  );
}