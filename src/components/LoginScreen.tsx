import React, { useState } from 'react';
import { UserAccount, OrgSettings } from '../types';
import { db, doc, getDoc, ensureAuth } from '../firebase';
import { Shield, KeyRound, User, Loader2, ArrowRight } from 'lucide-react';

interface LoginScreenProps {
  settings: OrgSettings;
  onLoginSuccess: (user: UserAccount) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  settings,
  onLoginSuccess
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Please enter username and password');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await ensureAuth();
      const userRef = doc(db, 'users', username.trim());
      const snap = await getDoc(userRef);

      if (snap.exists()) {
        const data = snap.data();
        if (String(data.password) === String(password)) {
          const userAccount: UserAccount = {
            Username: snap.id,
            Name: data.name || snap.id,
            Role: (data.role as 'Admin' | 'Operator') || 'Operator'
          };
          onLoginSuccess(userAccount);
          return;
        } else {
          setError('Incorrect password! Please try again.');
        }
      } else {
        // Fallback for default admin
        if (username.trim() === 'admin' && password === 'admin') {
          const defaultAdmin: UserAccount = {
            Username: 'admin',
            Name: 'Chief Administrator',
            Role: 'Admin'
          };
          onLoginSuccess(defaultAdmin);
          return;
        }
        setError('Username not found');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      if (username.trim() === 'admin' && password === 'admin') {
        onLoginSuccess({
          Username: 'admin',
          Name: 'Chief Administrator',
          Role: 'Admin'
        });
        return;
      }
      setError('Login failed: ' + (err?.message || 'Server connection issue'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-100 via-teal-50/40 to-slate-200 p-4 font-sans">
      {/* Background Decorative Rings */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-teal-400/10 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-blue-400/10 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white/95 p-8 shadow-2xl backdrop-blur-xl border border-white/60">
        {/* Header Emblem */}
        <div className="flex flex-col items-center text-center">
          <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-600 to-teal-800 text-white shadow-xl shadow-teal-700/25">
            {settings.logoUrl ? (
              <img
                src={settings.logoUrl}
                alt="Logo"
                className="h-full w-full rounded-2xl object-cover p-1"
              />
            ) : (
              <Shield className="h-8 w-8 text-teal-100" />
            )}
          </div>
          <h1 className="text-xl font-extrabold tracking-tight text-slate-900 uppercase">
            {settings.orgName || 'SHOPTODASH SOHOJATRA'}
          </h1>
          <p className="mt-1 text-xs font-semibold text-teal-700 tracking-wide uppercase">
            {settings.orgSub || 'Savings & Credit Co-operative Society'}
          </p>
          <p className="mt-2 text-xs text-slate-500">
            Sign in to access the management portal
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="mt-7 space-y-4">
          {error && (
            <div className="rounded-xl bg-rose-50 p-3 text-center text-xs font-semibold text-rose-700 border border-rose-100">
              {error}
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">Username</label>
            <div className="relative">
              <User className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                className="w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-10 pr-4 py-2.5 text-sm font-medium text-slate-900 transition focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">Password</label>
            <div className="relative">
              <KeyRound className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-10 pr-4 py-2.5 text-sm font-medium text-slate-900 transition focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-teal-600 to-teal-700 py-3 text-sm font-bold text-white shadow-lg shadow-teal-600/30 transition hover:from-teal-700 hover:to-teal-800 disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                Sign In
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center text-[11px] text-slate-400">
          Secure Cloud Database • All Records Protected
        </div>
      </div>
    </div>
  );
};
