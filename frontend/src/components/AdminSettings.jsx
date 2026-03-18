import React, { useState, useEffect } from 'react';
import { Navbar } from './Navbar';
import { useAuth } from '../contexts/AuthContext';
import { inviteUser, getUsers } from '../api';
import { User, Shield, ShieldAlert, Loader2, Mail, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import packageJson from '../../package.json';

export function AdminSettings() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('user');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  // Fetch users on mount
  useEffect(() => {
    if (user?.role === 'admin') {
      fetchUsers();
    }
  }, [user]);

  const fetchUsers = async () => {
    try {
      setLoadingUsers(true);
      const data = await getUsers();
      setUsers(data);
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleInviteUser = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      await inviteUser(email, role);
      setSuccess(`Invitation link sent to ${email}`);
      setEmail('');
      setRole('user');
    } catch (err) {
      setError(err.message || 'Failed to send invitation');
    } finally {
      setLoading(false);
    }
  };

  // Allow all users to see a basic settings page so they can log out
  if (!user) {
    return <Navigate to="/login" />;
  }

  // Non-admin view (just logout and basic info)
  if (user.role !== 'admin') {
    return (
      <div className="min-h-screen flex flex-col bg-background text-foreground font-sans w-full overflow-x-hidden">
        <Navbar />
        <main className="flex-grow max-w-4xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 box-border">
          <div className="flex flex-col gap-6 sm:gap-8 items-center w-full">
            <div className="w-full max-w-xl flex justify-between items-end mb-2 sm:mb-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-heading font-semibold text-foreground">Account Settings</h1>
                <p className="text-muted-foreground mt-1 text-sm sm:text-base">Manage your account.</p>
              </div>
            </div>

            <div className="bg-cardBg border border-borderGray rounded-xl p-4 sm:p-6 shadow-sm w-full max-w-xl">
              <h2 className="text-lg font-heading font-semibold mb-4 text-foreground">User Profile</h2>
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-secondary rounded-full text-secondary-foreground">
                  <User size={24} />
                </div>
                <div>
                  <p className="font-medium text-foreground">{user.username}</p>
                  <p className="text-sm text-muted-foreground capitalize">{user.role}</p>
                </div>
              </div>
              
              <div className="pt-4 border-t border-borderGray">
                <button
                  onClick={handleLogout}
                  className="flex items-center justify-center gap-2 w-full sm:w-auto py-2.5 px-6 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 rounded-md transition-colors font-medium"
                >
                  <LogOut size={18} />
                  Log Out
                </button>
              </div>
            </div>
          </div>
        </main>
        
        <footer className="w-full border-t border-borderGray bg-background/50 backdrop-blur-sm py-4 px-4 sm:px-6 mt-auto">
          <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <img src="/logo.svg" alt="Convex Manager Logo" className="h-4 w-4 opacity-70" />
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
                  className="h-4 opacity-50 group-hover:opacity-100 transition-opacity object-contain" 
                />
              </a>
            </div>
          </div>
        </footer>
      </div>
    );
  }

  // Admin view
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground font-sans w-full overflow-x-hidden">
      <Navbar />
      
      <main className="flex-grow max-w-4xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 box-border">
        <div className="flex flex-col gap-6 sm:gap-8 items-center w-full">
          <div className="w-full max-w-xl flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-2 sm:mb-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-heading font-semibold text-foreground">Global Settings</h1>
              <p className="text-muted-foreground mt-1 text-sm sm:text-base">Manage users and global configurations.</p>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 py-2 px-4 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 rounded-md transition-colors text-sm font-medium whitespace-nowrap w-full sm:w-auto justify-center"
            >
              <LogOut size={16} />
              Log Out
            </button>
          </div>

          {/* Invite User Section */}
          <div className="bg-cardBg border border-borderGray rounded-xl p-4 sm:p-6 shadow-sm w-full max-w-xl">
            <h2 className="text-xl font-heading font-semibold mb-6 border-b border-borderGray pb-4 text-foreground">Invite New User</h2>
            
            {error && (
              <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-3 rounded-md mb-6 text-sm">
                {error}
              </div>
            )}
            
            {success && (
              <div className="bg-green-500/10 border border-green-500/50 text-green-500 p-3 rounded-md mb-6 text-sm">
                {success}
              </div>
            )}

            <form onSubmit={handleInviteUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={18} />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-background border border-borderGray rounded-md pl-10 pr-4 py-2.5 text-foreground placeholder-muted-foreground focus:outline-none focus:border-convexOrange focus:ring-1 focus:ring-convexOrange"
                    placeholder="user@example.com"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full bg-background border border-borderGray rounded-md px-4 py-2.5 pr-8 text-foreground focus:outline-none focus:border-convexOrange focus:ring-1 focus:ring-convexOrange appearance-none"
                  style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: 'right 0.5rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.5em 1.5em' }}
                >
                  <option value="user">User (Read-only / Manage own keys)</option>
                  <option value="admin">Admin (Full Access)</option>
                </select>
              </div>
              <button
                type="submit"
                disabled={loading || !email}
                className="py-2.5 px-6 bg-convexOrange hover:bg-orange-600 text-white font-medium rounded-md transition-colors disabled:opacity-50 mt-4 flex items-center justify-center gap-2"
              >
                {loading && <Loader2 className="animate-spin" size={16} />}
                {loading ? 'Sending Invite...' : 'Send Invitation'}
              </button>
            </form>
          </div>

          {/* User List Section */}
          <div className="bg-cardBg border border-borderGray rounded-xl p-4 sm:p-6 shadow-sm w-full max-w-xl">
            <h2 className="text-xl font-heading font-semibold mb-6 border-b border-borderGray pb-4 text-foreground">Existing Users</h2>
            
            {loadingUsers ? (
              <div className="text-center py-8 text-muted-foreground">Loading users...</div>
            ) : users.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No users found.</div>
            ) : (
              <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
                <table className="w-full text-left border-collapse min-w-full">
                  <thead>
                    <tr className="border-b border-borderGray text-muted-foreground text-sm">
                      <th className="py-3 px-2 sm:px-4 font-medium">Username</th>
                      <th className="py-3 px-2 sm:px-4 font-medium w-24">Role</th>
                      <th className="py-3 px-4 font-medium hidden sm:table-cell">Created At</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-borderGray">
                    {users.map((u) => (
                      <tr key={u.id} className="hover:bg-muted/50 transition-colors">
                        <td className="py-3 px-2 sm:px-4 text-foreground">
                          <div className="flex items-center gap-2">
                            <div className="p-1 sm:p-1.5 bg-secondary rounded-full text-secondary-foreground shrink-0 hidden sm:block">
                              <User size={14} />
                            </div>
                            <span className="truncate max-w-[120px] sm:max-w-none text-sm sm:text-base">{u.username}</span>
                            {u.username === user.username && <span className="text-[10px] sm:text-xs bg-convexOrange/10 text-convexOrange px-1.5 sm:px-2 py-0.5 rounded-full ml-1 sm:ml-2 shrink-0">You</span>}
                          </div>
                        </td>
                        <td className="py-3 px-2 sm:px-4">
                          <span className={`inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-medium border ${
                            u.role === 'admin' 
                              ? 'bg-purple-500/10 text-purple-500 border-purple-500/20' 
                              : 'bg-blue-500/10 text-blue-500 border-blue-500/20'
                          }`}>
                            {u.role === 'admin' ? <Shield size={10} className="shrink-0" /> : <User size={10} className="shrink-0" />}
                            <span className="truncate">{u.role.charAt(0).toUpperCase() + u.role.slice(1)}</span>
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm text-muted-foreground hidden sm:table-cell">
                          {new Date(u.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>
      
      <footer className="w-full border-t border-borderGray bg-background/50 backdrop-blur-sm py-4 px-4 sm:px-6 mt-auto">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
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