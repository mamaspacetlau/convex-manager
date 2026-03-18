import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { EmptyState } from './components/EmptyState';
import { ProjectCard } from './components/ProjectCard';
import { CreateProjectModal } from './components/CreateProjectModal';
import { Login } from './components/Login';
import { Register } from './components/Register';
import { AcceptInvite } from './components/AcceptInvite';
import { ForgotPassword } from './components/ForgotPassword';
import { AdminSettings } from './components/AdminSettings';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { fetchProjects, createProject, deleteProject, startProject, stopProject, updateProjectConfig, generateAdminKey } from './api';
import { Plus } from 'lucide-react';

import packageJson from '../package.json';

function Dashboard() {
  const [projects, setProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState(null);
  const { logout, user } = useAuth();

  const loadProjects = async () => {
    try {
      const data = await fetchProjects();
      setProjects(data);
      setError(null);
    } catch (err) {
      console.error(err);
      if (err.message === 'Unauthorized') {
        logout();
      } else {
        setError('Failed to connect to backend.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
    const interval = setInterval(loadProjects, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleUpdateConfig = async (name, overrides) => {
    try {
      await updateProjectConfig(name, overrides);
      await loadProjects();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleGenerateKey = async (name) => {
    try {
      await generateAdminKey(name);
      await loadProjects();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleCreate = async (name, overrides, overwrite = false) => {
    try {
      await createProject(name, overrides, overwrite);
      setIsModalOpen(false);
      await loadProjects();
    } catch (err) {
      throw err; // throw so modal can catch and display error
    }
  };

  const handleStart = async (name) => {
    setProjects(projects.map(p => p.name === name ? { ...p, status: 'starting' } : p));
    try {
      await startProject(name);
      await loadProjects();
    } catch (err) {
      alert(err.message);
      await loadProjects();
    }
  };

  const handleStop = async (name) => {
    setProjects(projects.map(p => p.name === name ? { ...p, status: 'stopped' } : p));
    try {
      await stopProject(name);
      await loadProjects();
    } catch (err) {
      alert(err.message);
      await loadProjects();
    }
  };

  const handleDelete = async (name) => {
    setProjects(projects.filter(p => p.name !== name));
    try {
      await deleteProject(name);
      await loadProjects();
    } catch (err) {
      alert(err.message);
      await loadProjects();
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-white font-sans w-full overflow-x-hidden">
      <Navbar />
      
      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 box-border">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-heading font-semibold text-foreground">Projects</h1>
          {user?.role === 'admin' && (
            <button 
              onClick={() => setIsModalOpen(true)}
              className="flex items-center justify-center gap-2 bg-convexOrange hover:bg-orange-600 text-white px-4 py-2 rounded-md font-medium transition-colors w-full sm:w-auto"
            >
              <Plus size={20} /> New Project
            </button>
          )}
        </div>

        {isLoading ? (
          <div className="text-center text-muted-foreground py-12">Loading projects...</div>
        ) : error ? (
          <div className="text-center text-red-400 py-12 bg-red-500/10 rounded-lg border border-red-500/20">
            {error}
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-12 bg-cardBg border border-borderGray rounded-xl">
            <h2 className="text-2xl font-semibold mb-2 text-foreground">No projects yet</h2>
            <p className="text-muted-foreground mb-6">Create your first Convex project to get started.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map(project => (
              <ProjectCard 
                key={project.name} 
                project={project} 
                onStart={handleStart}
                onStop={handleStop}
                onDelete={handleDelete}
                onUpdateConfig={handleUpdateConfig}
                onGenerateKey={handleGenerateKey}
              />
            ))}
          </div>
        )}
      </main>

      <CreateProjectModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        onCreate={handleCreate}
      />
      
      <footer className="w-full border-t border-borderGray bg-background/50 backdrop-blur-sm py-4 px-4 sm:px-6 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <img src="/logo.svg" alt="Convex Manager Logo" className="h-5 w-5 opacity-70" />
            <span className="font-medium text-foreground">Convex Manager</span>
            <span>v{packageJson.version}</span>
          </div>
          <div className="flex items-center gap-2">
            <span>Powered by</span>
            <a 
              href="https://motion.ninja" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center group transition-opacity"
            >
              <img 
                src="/workmark.png" 
                alt="MOTION.NINJA" 
                className="h-3 opacity-50 transition-all object-contain [filter:invert(58%)_sepia(1%)_saturate(0%)_hue-rotate(345deg)_brightness(94%)_contrast(90%)] dark:[filter:none] group-hover:opacity-100 group-hover:[filter:invert(46%)_sepia(87%)_saturate(1677%)_hue-rotate(0deg)_brightness(94%)_contrast(102%)] dark:group-hover:[filter:invert(46%)_sepia(87%)_saturate(1677%)_hue-rotate(0deg)_brightness(94%)_contrast(102%)]" 
              />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background w-full overflow-x-hidden">
        <div className="w-8 h-8 border-4 border-borderGray border-t-convexOrange rounded-full animate-spin"></div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/invite" element={<AcceptInvite />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <AdminSettings />
              </ProtectedRoute>
            }
          />
          <Route 
            path="/" 
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } 
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
