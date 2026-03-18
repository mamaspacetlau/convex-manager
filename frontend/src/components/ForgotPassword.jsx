import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { requestPasswordReset, resetPassword } from '../api';
import { ArrowLeft } from 'lucide-react';

export function ForgotPassword() {
  const [step, setStep] = useState(1); // 1: Request, 2: Reset
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleRequestReset = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      const res = await requestPasswordReset(email);
      setMessage(res.message);
      setStep(2);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await resetPassword(email, code, newPassword);
      navigate('/login', { state: { message: 'Password reset successfully! Please log in.' } });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 w-full overflow-x-hidden">
      <div className="bg-cardBg border border-borderGray rounded-xl p-6 sm:p-8 w-full max-w-md shadow-2xl relative">
        <button 
          onClick={() => navigate('/login')}
          className="absolute top-6 left-6 text-muted-foreground hover:text-foreground transition-colors"
          title="Back to login"
        >
          <ArrowLeft size={20} />
        </button>

        <div className="flex items-center justify-center mb-6 mt-4">
          <img src="/logo.svg" alt="Convex Manager Logo" className="w-16 h-16" />
        </div>
        
        <h2 className="text-2xl font-heading font-semibold text-center mb-2 text-foreground">
          Reset Password
        </h2>
        <p className="text-center text-muted-foreground mb-6 text-sm">
          {step === 1 ? "Enter your email to receive a reset code." : "Enter the code and your new password."}
        </p>

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-3 rounded-md mb-6 text-sm">
            {error}
          </div>
        )}

        {message && step === 2 && (
          <div className="bg-green-500/10 border border-green-500/50 text-green-500 p-3 rounded-md mb-6 text-sm text-center">
            {message}
          </div>
        )}

        {step === 1 ? (
          <form onSubmit={handleRequestReset} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-background border border-borderGray rounded-md px-4 py-2.5 text-foreground placeholder-muted-foreground focus:outline-none focus:border-convexOrange focus:ring-1 focus:ring-convexOrange"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading || !email}
              className="w-full py-2.5 bg-convexOrange hover:bg-orange-600 text-white font-medium rounded-md transition-colors disabled:opacity-50 mt-4"
            >
              {loading ? 'Sending...' : 'Send Reset Code'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Reset Code (6-digit)</label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full bg-background border border-borderGray rounded-md px-4 py-2.5 text-foreground placeholder-muted-foreground focus:outline-none focus:border-convexOrange focus:ring-1 focus:ring-convexOrange text-center tracking-widest font-mono text-lg"
                maxLength={6}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full bg-background border border-borderGray rounded-md px-4 py-2.5 text-foreground placeholder-muted-foreground focus:outline-none focus:border-convexOrange focus:ring-1 focus:ring-convexOrange"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading || !code || !newPassword}
              className="w-full py-2.5 bg-convexOrange hover:bg-orange-600 text-white font-medium rounded-md transition-colors disabled:opacity-50 mt-4"
            >
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}