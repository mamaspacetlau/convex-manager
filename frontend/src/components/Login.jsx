import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { checkAuthStatus } from '../api';

export function Login() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const message = location.state?.message;

  useEffect(() => {
    const checkUsers = async () => {
      try {
        const status = await checkAuthStatus();
        if (!status.hasUsers) {
          navigate('/register');
        }
      } catch (err) {
        console.error('Failed to check users:', err);
      }
    };
    checkUsers();
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(identifier, password);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 w-full overflow-x-hidden">
      <div className="bg-cardBg border border-borderGray rounded-xl p-6 sm:p-8 w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-center mb-8">
          <img src="/logo.svg" alt="Convex Manager Logo" className="w-24 h-24" />
        </div>
        <h2 className="text-2xl font-heading font-semibold text-center mb-6 text-foreground">Convex Manager Login</h2>
        
        {message && (
          <div className="bg-green-500/10 border border-green-500/50 text-green-500 p-3 rounded-md mb-6 text-sm text-center">
            {message}
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-3 rounded-md mb-6 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">Username or Email</label>
            <input
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className="w-full bg-background border border-borderGray rounded-md px-4 py-2.5 text-foreground placeholder-muted-foreground focus:outline-none focus:border-convexOrange focus:ring-1 focus:ring-convexOrange"
              required
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-muted-foreground">Password</label>
              <button
                type="button"
                onClick={() => navigate('/forgot-password')}
                className="text-xs text-convexOrange hover:text-orange-500 hover:underline focus:outline-none"
              >
                Forgot password?
              </button>
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-background border border-borderGray rounded-md px-4 py-2.5 text-foreground placeholder-muted-foreground focus:outline-none focus:border-convexOrange focus:ring-1 focus:ring-convexOrange"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-convexOrange hover:bg-orange-600 text-white font-medium rounded-md transition-colors disabled:opacity-50 mt-4"
          >
            {loading ? 'Logging in...' : 'Log In'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-muted-foreground">
          Need an account?{' '}
          <button 
            onClick={() => navigate('/register')} 
            className="text-convexOrange hover:text-orange-500 hover:underline focus:outline-none font-medium"
          >
            Register
          </button>
        </div>
      </div>
    </div>
  );
}