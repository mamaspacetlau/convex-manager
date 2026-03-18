import React, { useState } from 'react';
import { Play, Square, Trash2, ExternalLink, Settings, Key, Copy, Check } from 'lucide-react';
import { StatusBadge } from './StatusBadge';
import { ProjectSettingsModal } from './ProjectSettingsModal';
import { useAuth } from '../contexts/AuthContext';

export function ProjectCard({ project, onStart, onStop, onDelete, onUpdateConfig, onGenerateKey }) {
  const { name, status, backendPort, dashboardPort, uptime, adminKey } = project;
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { user } = useAuth();

  const handleOpenDashboardInPlace = () => {
    if (status === 'running') {
      const url = project.overrides?.dashboard_url || `http://localhost:${dashboardPort || 6791}`;
      window.location.href = url; // Open in place
    }
  };

  const handleOpenDashboardNewTab = () => {
    if (status === 'running') {
      const url = project.overrides?.dashboard_url || `http://localhost:${dashboardPort || 6791}`;
      window.open(url, '_blank'); // Open in new tab
    }
  };

  const handleCopyKey = () => {
    if (adminKey) {
      navigator.clipboard.writeText(adminKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleGenerateKey = async () => {
    setIsGenerating(true);
    try {
      await onGenerateKey(name);
    } catch (err) {
      alert(err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <>
      <div 
        className={`bg-cardBg border border-borderGray rounded-xl p-4 sm:p-6 hover:border-convexOrange/50 hover:bg-muted/50 transition-all flex flex-col h-full shadow-lg ${status === 'running' ? 'cursor-pointer' : ''}`}
        onClick={(e) => {
          // Don't trigger if they clicked a button inside the card
          if (e.target.closest('button')) return;
          handleOpenDashboardInPlace();
        }}
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 
              className={`text-xl font-semibold mb-1 text-card-foreground ${status === 'running' ? 'hover:text-convexOrange transition-colors' : ''}`}
            >
              {name}
            </h3>
            <StatusBadge status={status} />
          </div>
          
          <div className="flex gap-2">
            {user?.role === 'admin' && (
              <button 
                onClick={() => setIsSettingsOpen(true)}
                className="text-muted-foreground hover:text-convexOrange p-2 rounded-md hover:bg-convexOrange/10 transition-colors"
                title="Project Settings"
              >
                <Settings size={18} />
              </button>
            )}
            {status === 'running' && (
              <button 
                onClick={handleOpenDashboardNewTab}
                className="text-muted-foreground hover:text-convexOrange p-2 rounded-md hover:bg-convexOrange/10 transition-colors"
                title="Open Dashboard in New Tab"
              >
                <ExternalLink size={18} />
              </button>
            )}
          </div>
        </div>

        <div className="flex-grow space-y-3 mb-6 text-sm text-muted-foreground">
          <div className="flex justify-between">
            <span>Backend Port</span>
            <span className="text-foreground font-mono">{backendPort || '-'}</span>
          </div>
          <div className="flex justify-between">
            <span>Dashboard Port</span>
            <span className="text-foreground font-mono">{dashboardPort || '-'}</span>
          </div>
          <div className="flex justify-between">
            <span>Uptime</span>
            <span className="text-foreground">{uptime}</span>
          </div>
          <div className="flex items-center justify-between border-t border-borderGray pt-3 mt-3">
            <span>Admin Key</span>
            <div className="flex items-center gap-2">
              {adminKey ? (
                <>
                  <span className="text-muted-foreground font-mono text-xs max-w-[120px] truncate" title={adminKey}>
                    {adminKey.substring(0, 15)}...
                  </span>
                  <button 
                    onClick={handleCopyKey}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    title="Copy Admin Key"
                  >
                    {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                  </button>
                </>
              ) : (
                user?.role === 'admin' ? (
                  <button 
                    onClick={handleGenerateKey}
                    disabled={isGenerating || status !== 'running'}
                    className="flex items-center gap-1 text-xs bg-transparent border border-borderGray hover:border-convexOrange/50 hover:bg-convexOrange/10 hover:text-convexOrange text-foreground px-2 py-1 rounded transition-colors disabled:opacity-50"
                  >
                    <Key size={12} /> {isGenerating ? 'Generating...' : 'Generate'}
                  </button>
                ) : (
                  <span className="text-xs text-muted-foreground">Not generated</span>
                )
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-4 border-t border-borderGray mt-auto">
          {user?.role === 'admin' && (
            <>
              {status === 'running' ? (
                <button 
                  onClick={() => onStop(name)}
                  className="flex-1 flex items-center justify-center gap-2 py-2 rounded-md bg-transparent border border-borderGray hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-500 text-foreground text-sm font-medium transition-colors"
                >
                  <Square size={14} /> Stop
                </button>
              ) : (
                <button 
                  onClick={() => onStart(name)}
                  className="flex-1 flex items-center justify-center gap-2 py-2 rounded-md bg-transparent border border-borderGray hover:border-green-500/50 hover:bg-green-500/10 hover:text-green-500 text-foreground text-sm font-medium transition-colors"
                >
                  <Play size={14} /> Start
                </button>
              )}
              
              {isDeleting ? (
                <div className="flex gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                  <button 
                    onClick={() => {
                      onDelete(name);
                      setIsDeleting(false);
                    }}
                    className="flex-1 sm:flex-none px-3 py-2 rounded-md bg-red-500/20 text-red-500 border border-red-500/50 hover:bg-red-500/30 text-sm font-medium transition-colors"
                  >
                    Confirm
                  </button>
                  <button 
                    onClick={() => setIsDeleting(false)}
                    className="flex-1 sm:flex-none px-3 py-2 rounded-md bg-borderGray hover:bg-gray-700 text-foreground hover:text-white text-sm font-medium transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button 
                  onClick={() => setIsDeleting(true)}
                  className="p-2 rounded-md border border-borderGray text-muted-foreground hover:text-red-500 hover:border-red-500/50 hover:bg-red-500/10 transition-colors ml-auto sm:ml-0"
                  title="Delete Project"
                >
                  <Trash2 size={18} />
                </button>
              )}
            </>
          )}
        </div>
      </div>

      <ProjectSettingsModal 
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        project={project}
        onSave={onUpdateConfig}
      />
    </>
  );
}
