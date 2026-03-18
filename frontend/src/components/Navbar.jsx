import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Settings } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';

export function Navbar() {
  const { user } = useAuth();
  const location = useLocation();

  return (
    <nav className="border-b border-borderGray bg-background px-4 sm:px-6 py-4 flex items-center justify-between w-full box-border">
      <div className="flex items-center gap-2 sm:gap-4">
        <Link to="/" className="flex items-center gap-2 sm:gap-4 hover:opacity-80 transition-opacity">
          <img src="/logo.svg" alt="Convex Manager Logo" className="w-10 h-10 sm:w-12 sm:h-12" />
          <span className="font-heading text-xl sm:text-2xl font-bold text-foreground">Convex Manager</span>
        </Link>
      </div>
      
      <div className="flex items-center gap-2 sm:gap-4">
        <ThemeToggle />
        {user && (
          <div className="flex items-center gap-2 sm:gap-4">
            <Link 
              to="/settings"
              className={`text-muted-foreground hover:text-foreground transition-colors p-2 rounded-md ${location.pathname === '/settings' ? 'bg-borderGray text-foreground' : ''}`}
              title="Account Settings"
            >
              <Settings size={20} />
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
}
