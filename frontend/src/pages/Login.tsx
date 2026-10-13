import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Lock, Mail, AlertCircle, ArrowRight, CheckCircle2 } from 'lucide-react';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [resetEmail, setResetEmail] = useState('');
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { loginWithEmail, loginDemoUser, resetPassword, isFirebaseActive } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await loginWithEmail(email, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Failed to sign in. Please verify your email and password.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = () => {
    loginDemoUser();
    navigate('/dashboard');
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await resetPassword(resetEmail);
      setResetSent(true);
    } catch (err: any) {
      setError(err.message || 'Failed to send password reset email.');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4 font-sans">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl border border-slate-200">
        {/* Brand Header */}
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-navy-900 shadow-md">
            <img src="/logo.svg" alt="EnergiSense AI" className="h-9 w-9" />
          </div>
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-navy-900">EnergiSense AI</h1>
          <p className="mt-1 text-xs font-medium text-slate-500">
            Regime-Aware Explainable Smart Building Framework
          </p>
        </div>

        {error && (
          <div className="mt-6 flex items-start gap-3 rounded-lg bg-rose-50 p-3.5 text-xs text-rose-800 border border-rose-200">
            <AlertCircle className="h-4 w-4 flex-shrink-0 text-rose-600 mt-0.5" />
            <div>{error}</div>
          </div>
        )}

        {/* Email Password Form */}
        <form onSubmit={handleLogin} className="mt-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700">Email Address</label>
            <div className="relative mt-1">
              <Mail className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="analyst@building.org"
                className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-slate-700">Password</label>
              <button
                type="button"
                onClick={() => setShowResetModal(true)}
                className="text-xs font-medium text-blue-600 hover:underline"
              >
                Forgot password?
              </button>
            </div>
            <div className="relative mt-1">
              <Lock className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-navy-900 py-2.5 text-sm font-semibold text-white shadow hover:bg-navy-800 transition disabled:opacity-50"
          >
            {loading ? 'Authenticating...' : 'Sign In with Firebase'}
          </button>
        </form>

        {/* Demo Fallback Option */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-2 text-slate-400 font-semibold">Or Instant Demo Access</span>
          </div>
        </div>

        <button
          onClick={handleDemoLogin}
          type="button"
          className="w-full flex items-center justify-center gap-2 rounded-lg border border-blue-200 bg-blue-50 py-2.5 text-sm font-semibold text-blue-800 hover:bg-blue-100 transition shadow-sm"
        >
          <span>Continue as Guest Demo Analyst</span>
          <ArrowRight className="h-4 w-4" />
        </button>

        <p className="mt-6 text-center text-xs text-slate-500">
          Don't have an account?{' '}
          <Link to="/register" className="font-semibold text-blue-600 hover:underline">
            Register here
          </Link>
        </p>

        {!isFirebaseActive && (
          <div className="mt-4 rounded-lg bg-amber-50 p-2.5 text-center text-[11px] text-amber-800 border border-amber-200">
            Note: Firebase credentials not yet set in frontend .env. Guest Demo Access is enabled for immediate testing.
          </div>
        )}
      </div>

      {/* Password Reset Modal */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-2xl border border-slate-200">
            <h3 className="text-base font-bold text-navy-900">Reset Password</h3>
            <p className="mt-1 text-xs text-slate-500">
              Enter your registered email address to receive a secure Firebase reset link.
            </p>

            {resetSent ? (
              <div className="mt-4 rounded-lg bg-emerald-50 p-3 text-xs text-emerald-800 border border-emerald-200 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                <span>Password reset email sent! Check your inbox.</span>
              </div>
            ) : (
              <form onSubmit={handleResetPassword} className="mt-4 space-y-3">
                <input
                  type="email"
                  required
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="analyst@building.org"
                  className="w-full rounded-lg border border-slate-300 p-2 text-sm focus:border-blue-600 focus:outline-none"
                />
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="flex-1 rounded-lg bg-blue-600 py-2 text-xs font-semibold text-white hover:bg-blue-700"
                  >
                    Send Link
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowResetModal(false); setResetSent(false); }}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Close
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
