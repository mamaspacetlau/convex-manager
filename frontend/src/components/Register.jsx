import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { requestRegistrationCode, verifyRegistration, checkAuthStatus } from '../api';

export function Register() {
  const [step, setStep] = useState(1); // 1: Email, 2: Code & Details
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasUsers, setHasUsers] = useState(null);
  const [allowRegistration, setAllowRegistration] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const checkUsers = async () => {
      try {
        const status = await checkAuthStatus();
        setHasUsers(status.hasUsers);
        setAllowRegistration(status.allowRegistration);
      } catch (err) {
        console.error('Failed to check users:', err);
        setHasUsers(true);
        setAllowRegistration(false);
      }
    };
    checkUsers();
  }, []);

  const handleRequestCode = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await requestRegistrationCode(email);
      setStep(2);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAndRegister = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await verifyRegistration(email, code, username, password);
      navigate('/login', { state: { message: 'Registration successful! Please log in.' } });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Give a small moment before rendering the "Registration Closed" state 
  // to ensure we have actually fetched the status.
  if (hasUsers === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4 w-full overflow-x-hidden">
        <div className="w-8 h-8 border-4 border-borderGray border-t-convexOrange rounded-full animate-spin"></div>
      </div>
    );
  }

  // If users exist AND registration is not explicitly allowed, show closed
  if (hasUsers === true && !allowRegistration) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4 w-full overflow-x-hidden">
        <div className="bg-cardBg border border-borderGray rounded-xl p-6 sm:p-8 w-full max-w-md shadow-2xl text-center">
          <div className="flex items-center justify-center mb-8">
            <img src="/logo.svg" alt="Convex Manager Logo" className="w-12 h-12" />
          </div>
          <h2 className="text-2xl font-semibold text-center mb-2 text-foreground">Registration Closed</h2>
          <p className="text-center text-muted-foreground mb-6 text-sm">
            Public registration is disabled because users already exist in the system. 
            An administrator must create your account from the Global Settings page.
          </p>

          <button 
            onClick={() => navigate('/login')} 
            className="w-full py-2.5 bg-convexOrange hover:bg-orange-600 text-white font-medium rounded-md transition-colors"
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
        <div className="flex items-center justify-center mb-8">
          <img src="/logo.svg" alt="Convex Manager Logo" className="w-24 h-24" />
        </div>
        <h2 className="text-2xl font-heading font-semibold text-center mb-2 text-foreground">
          {hasUsers ? 'Create an Account' : 'Welcome to Convex Manager'}
        </h2>
        <p className="text-center text-muted-foreground mb-6 text-sm">
          {hasUsers ? 'Join the existing team.' : 'Create the initial admin account to get started.'}
        </p>
        
        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-3 rounded-md mb-6 text-sm">
            {error}
          </div>
        )}

        {step === 1 ? (
          <form onSubmit={handleRequestCode} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-background border border-borderGray rounded-md px-4 py-2.5 text-foreground placeholder-muted-foreground focus:outline-none focus:border-convexOrange focus:ring-1 focus:ring-convexOrange"
                placeholder="you@example.com"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading || !email}
              className="w-full py-2.5 bg-convexOrange hover:bg-orange-600 text-white font-medium rounded-md transition-colors disabled:opacity-50 mt-4"
            >
              {loading ? 'Sending Code...' : 'Send Verification Code'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyAndRegister} className="space-y-4">
            <div className="bg-muted/50 p-3 rounded-md text-sm text-center mb-4 text-muted-foreground border border-borderGray">
              Code sent to <strong className="text-foreground">{email}</strong>
              <button 
                type="button" 
                onClick={() => setStep(1)}
                className="ml-2 text-convexOrange hover:underline"
              >
                Change
              </button>
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Verification Code (6-digit)</label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full bg-background border border-borderGray rounded-md px-4 py-2.5 text-foreground placeholder-muted-foreground focus:outline-none focus:border-convexOrange focus:ring-1 focus:ring-convexOrange text-center tracking-widest font-mono text-lg"
                placeholder="------"
                maxLength={6}
                required
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
              disabled={loading || !code || !username || !password}
              className="w-full py-2.5 bg-convexOrange hover:bg-orange-600 text-white font-medium rounded-md transition-colors disabled:opacity-50 mt-4"
            >
              {loading ? 'Creating Account...' : 'Complete Registration'}
            </button>
          </form>
        )}
          
        <div className="text-center mt-6">
          <button 
            type="button"
            onClick={() => navigate('/login')}
            className="text-sm text-muted-foreground hover:text-foreground hover:underline"
          >
            Already have an account? Login
          </button>
        </div>
      </div>
    </div>
  );
}