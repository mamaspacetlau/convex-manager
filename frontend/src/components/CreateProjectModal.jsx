import React, { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';

export function CreateProjectModal({ isOpen, onClose, onCreate }) {
  const [name, setName] = useState('');
  const [overrides, setOverrides] = useState({
    convex_cloud_origin: '',
    convex_site_origin: '',
    dashboard_url: '',
    traefik_enabled: false,
    traefik_network: '',
    traefik_certresolver: '',
    traefik_backend_rule: '',
    traefik_site_rule: '',
    traefik_dashboard_rule: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [needsOverwriteConfirmation, setNeedsOverwriteConfirmation] = useState(false);
  const [logs, setLogs] = useState([]);
  const [isDeploying, setIsDeploying] = useState(false);
  
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setName('');
      setOverrides({
        convex_cloud_origin: '',
        convex_site_origin: '',
        dashboard_url: '',
        traefik_enabled: false,
        traefik_network: '',
        traefik_certresolver: '',
        traefik_backend_rule: '',
        traefik_site_rule: '',
        traefik_dashboard_rule: ''
      });
      setError('');
      setNeedsOverwriteConfirmation(false);
      setLogs([]);
      setIsSubmitting(false);
      setIsDeploying(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const validateUrl = (url) => {
    if (!url) return true; // empty is ok
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const extractHostFromRule = (rule) => {
    if (!rule) return '';
    // Support both raw domains and Traefik Host() rules for backward compatibility
    if (rule.startsWith('Host(')) {
      const match = rule.match(/Host\(['"`](.*?)['"`]\)/i);
      return match ? match[1] : '';
    }
    return rule.trim(); // Assume it's just a raw domain
  };

  const handleTraefikRuleChange = (field, value) => {
    const newOverrides = { ...overrides, [field]: value };
    
    // Auto-fill origin URLs if a valid Host is found
    const host = extractHostFromRule(value);
    if (host) {
      // Use https if certresolver is provided, otherwise http
      const protocol = newOverrides.traefik_certresolver ? 'https://' : 'http://';
      
      if (field === 'traefik_backend_rule') {
        newOverrides.convex_cloud_origin = `${protocol}${host}`;
      } else if (field === 'traefik_site_rule') {
        newOverrides.convex_site_origin = `${protocol}${host}`;
      } else if (field === 'traefik_dashboard_rule') {
        newOverrides.dashboard_url = `${protocol}${host}`;
      }
    }
    
    setOverrides(newOverrides);
  };

  const handleCertResolverChange = (value) => {
    const newOverrides = { ...overrides, traefik_certresolver: value };
    
    // If certresolver changes, update the protocol of auto-filled URLs
    const protocol = value ? 'https://' : 'http://';
    
    if (overrides.traefik_backend_rule) {
      const host = extractHostFromRule(overrides.traefik_backend_rule);
      if (host) newOverrides.convex_cloud_origin = `${protocol}${host}`;
    }
    if (overrides.traefik_site_rule) {
      const host = extractHostFromRule(overrides.traefik_site_rule);
      if (host) newOverrides.convex_site_origin = `${protocol}${host}`;
    }
    if (overrides.traefik_dashboard_rule) {
      const host = extractHostFromRule(overrides.traefik_dashboard_rule);
      if (host) newOverrides.dashboard_url = `${protocol}${host}`;
    }
    
    setOverrides(newOverrides);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

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
    setError('');
    setLogs([]);

    try {
      const cleanOverrides = Object.fromEntries(
        Object.entries(overrides).filter(([k, v]) => {
          if (typeof v === 'boolean') return true;
          return v && v.trim() !== '';
        })
      );
      // Ensure boolean is stringified for backend logic
      if (cleanOverrides.traefik_enabled !== undefined) {
        cleanOverrides.traefik_enabled = String(cleanOverrides.traefik_enabled);
      }
      
      await onCreate(name.trim(), cleanOverrides, needsOverwriteConfirmation);
      // On success, the App component will close the modal and refresh
    } catch (err) {
      if (err.requiresOverwriteConfirmation) {
        setNeedsOverwriteConfirmation(true);
        setError('A project with this name already exists. Do you want to overwrite it? All existing data will be lost.');
      } else {
        setError(err.message || 'Failed to create project');
      }
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <div className="bg-cardBg border border-borderGray rounded-xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-borderGray shrink-0">
          <h2 className="text-xl font-semibold text-foreground">New Project</h2>
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

          <div>
            <label htmlFor="projectName" className="block text-sm font-medium text-foreground mb-2">
              Project Name
            </label>
            <input
              ref={inputRef}
              id="projectName"
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'));
                setNeedsOverwriteConfirmation(false);
                setError('');
              }}
              disabled={isSubmitting}
              placeholder="e.g. my-awesome-app"
              className="w-full bg-background border border-borderGray rounded-md px-4 py-2.5 text-foreground placeholder-muted-foreground focus:outline-none focus:border-convexOrange focus:ring-1 focus:ring-convexOrange transition-all disabled:opacity-50"
              required
            />
            <p className="mt-2 text-xs text-muted-foreground">
              Only lowercase letters, numbers, and hyphens are allowed.
            </p>
          </div>

          <div className="border-t border-borderGray pt-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-foreground">Traefik Reverse Proxy</h3>
              <label className="flex items-center cursor-pointer">
                <div className="relative">
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={overrides.traefik_enabled}
                    onChange={(e) => setOverrides({...overrides, traefik_enabled: e.target.checked})}
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
                      Traefik Network (e.g. traefik_proxy)
                    </label>
                    <input
                      type="text"
                      value={overrides.traefik_network}
                      onChange={(e) => setOverrides({...overrides, traefik_network: e.target.value})}
                      disabled={isSubmitting}
                      placeholder="traefik_proxy"
                      className="w-full bg-background border border-borderGray rounded-md px-3 py-2 text-foreground placeholder-muted-foreground focus:outline-none focus:border-convexOrange text-sm disabled:opacity-50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">
                      CertResolver (e.g. myresolver)
                    </label>
                    <input
                      type="text"
                      value={overrides.traefik_certresolver}
                      onChange={(e) => handleCertResolverChange(e.target.value)}
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
                    value={overrides.traefik_backend_rule}
                    onChange={(e) => handleTraefikRuleChange('traefik_backend_rule', e.target.value)}
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
                    value={overrides.traefik_site_rule}
                    onChange={(e) => handleTraefikRuleChange('traefik_site_rule', e.target.value)}
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
                    value={overrides.traefik_dashboard_rule}
                    onChange={(e) => handleTraefikRuleChange('traefik_dashboard_rule', e.target.value)}
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
                  value={overrides.convex_cloud_origin}
                  onChange={(e) => setOverrides({...overrides, convex_cloud_origin: e.target.value})}
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
                  value={overrides.convex_site_origin}
                  onChange={(e) => setOverrides({...overrides, convex_site_origin: e.target.value})}
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
                  value={overrides.dashboard_url}
                  onChange={(e) => setOverrides({...overrides, dashboard_url: e.target.value})}
                  disabled={isSubmitting}
                  placeholder="http://dashboard.example.com"
                  className="w-full bg-background border border-borderGray rounded-md px-3 py-2 text-foreground placeholder-muted-foreground focus:outline-none focus:border-convexOrange text-sm disabled:opacity-50"
                />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-borderGray mt-6">
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
              disabled={isSubmitting || !name.trim()}
              className={`px-6 py-2 text-white text-sm font-medium rounded-md transition-colors disabled:opacity-50 flex items-center gap-2 ${
                needsOverwriteConfirmation 
                  ? 'bg-red-600 hover:bg-red-700' 
                  : 'bg-convexOrange hover:bg-orange-600'
              }`}
            >
              {isSubmitting ? (needsOverwriteConfirmation ? 'Overwriting...' : 'Creating...') : (needsOverwriteConfirmation ? 'Yes, Overwrite' : 'Create Project')}
            </button>
          </div>
        </form>
        </div>
      </div>
    </div>
  );
}
