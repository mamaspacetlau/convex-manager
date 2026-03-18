import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { verifyInvite, acceptInvite } from '../api';

export function AcceptInvite() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [role, setRole] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const checkToken = async () => {
      if (!token) {
        setError('No invitation token provided.');
        setLoading(false);
        return;
      }

      try {
        const data = await verifyInvite(token);
        setEmail(data.email);
        setRole(data.role);
      } catch (err) {
        setError(err.message || 'Invalid or expired invitation.');
      } finally {
        setLoading(false);
      }
    };
    checkToken();
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      await acceptInvite(token, username, password);
      navigate('/login', { state: { message: 'Account created successfully! Please log in.' } });
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4 w-full overflow-x-hidden">
        <div className="w-8 h-8 border-4 border-borderGray border-t-convexOrange rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error && !email) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4 w-full overflow-x-hidden">
        <div className="bg-cardBg border border-borderGray rounded-xl p-6 sm:p-8 w-full max-w-md shadow-2xl text-center">
          <div className="text-red-500 mb-4 flex justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-heading font-semibold text-foreground mb-2">Invalid Invitation</h2>
          <p className="text-muted-foreground mb-6">{error}</p>
          <button 
            onClick={() => navigate('/login')} 
            className="w-full py-2.5 bg-borderGray hover:bg-gray-700 text-foreground font-medium rounded-md transition-colors"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 w-full overflow-x-hidden">
      <div className="bg-cardBg border border-borderGray rounded-xl p-6 sm:p-8 w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-center mb-6">
          <img src="/logo.svg" alt="Convex Manager Logo" className="w-20 h-20" />
        </div>
        <h2 className="text-2xl font-heading font-semibold text-center mb-2 text-foreground">Accept Invitation</h2>
        <p className="text-center text-muted-foreground mb-6 text-sm">
          You have been invited to join as <strong className="text-foreground">{role}</strong>.
        </p>

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-3 rounded-md mb-6 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">Email</label>
            <input
              type="email"
              value={email}
              disabled
              className="w-full bg-background border border-borderGray rounded-md px-4 py-2.5 text-muted-foreground opacity-70 cursor-not-allowed"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">Choose Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-background border border-borderGray rounded-md px-4 py-2.5 text-foreground placeholder-muted-foreground focus:outline-none focus:border-convexOrange focus:ring-1 focus:ring-convexOrange"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">Choose Password</label>
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
            disabled={submitting || !username || !password}
            className="w-full py-2.5 bg-convexOrange hover:bg-orange-600 text-white font-medium rounded-md transition-colors disabled:opacity-50 mt-4 flex items-center justify-center gap-2"
          >
            {submitting ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>
      </div>
    </div>
  );
}