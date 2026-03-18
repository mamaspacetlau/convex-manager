import React from 'react';
import { Database } from 'lucide-react';

export function EmptyState({ onNewProject }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-24 h-24 bg-cardBg border border-borderGray rounded-full flex items-center justify-center mb-6">
        <Database size={40} className="text-gray-400" />
      </div>
      <h2 className="text-2xl font-semibold mb-2">No projects yet</h2>
      <p className="text-gray-400 max-w-md mb-8">
        Create your first Convex project to get started with a self-hosted backend, database, and real-time dashboard.
      </p>
      <button 
        onClick={onNewProject}
        className="bg-convexOrange hover:bg-orange-600 text-white font-medium px-6 py-2.5 rounded-md transition-colors"
      >
        Create your first project
      </button>
    </div>
  );
}
