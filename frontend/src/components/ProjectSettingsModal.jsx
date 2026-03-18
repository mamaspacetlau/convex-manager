import React, { useState } from 'react';
import { X } from 'lucide-react';

export function ProjectSettingsModal({ isOpen, onClose, project, onSave }) {
  const [overrides, setOverrides] = useState({
    convex_cloud_origin: project?.overrides?.convex_cloud_origin || '',
    convex_site_origin: project?.overrides?.convex_site_origin || '',
    dashboard_url: project?.overrides?.dashboard_url || ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen || !project) return null;

  const handleChange = (e) => {
    setOverrides({ ...overrides, [e.target.name]: e.target.value });
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
      // Send all overrides, backend will handle removing empty ones
      await onSave(project.name, overrides);
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
      dashboard_url: ''
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
                placeholder="https://dashboard.example.com"
                className="w-full bg-background border border-borderGray rounded-md px-3 py-2 text-foreground placeholder-muted-foreground focus:outline-none focus:border-convexOrange text-sm disabled:opacity-50"
              />
            </div>
          </div>

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