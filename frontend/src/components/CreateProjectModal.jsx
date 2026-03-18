import React, { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';

export function CreateProjectModal({ isOpen, onClose, onCreate }) {
  const [name, setName] = useState('');
  const [overrides, setOverrides] = useState({
    convex_cloud_origin: '',
    convex_site_origin: '',
    dashboard_url: ''
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
        dashboard_url: ''
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
        Object.entries(overrides).filter(([_, v]) => v.trim() !== '')
      );
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
            <h3 className="text-sm font-medium text-foreground mb-4">Optional Configurations</h3>
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
          </div>

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
