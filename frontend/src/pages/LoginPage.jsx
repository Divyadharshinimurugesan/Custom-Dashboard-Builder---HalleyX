import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { SessionContext } from '../App';

export default function LoginPage() {
  const { login, register, checkCredentials } = useContext(SessionContext);
  const navigate = useNavigate();

  const [tab,      setTab]      = useState('login'); // 'login' | 'signup'
  const [name,     setName]     = useState('');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [showPw,   setShowPw]   = useState(false);
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  const switchTab = (t) => {
    setTab(t);
    setError('');
    setName('');
    setEmail('');
    setPassword('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (tab === 'signup' && !name.trim()) { setError('Please fill the field'); return; }
    if (!email.trim())        { setError('Please fill the field'); return; }
    if (!email.includes('@')) { setError('Enter a valid email address'); return; }
    if (!password)            { setError('Please fill the field'); return; }
    if (password.length < 6)  { setError('Password must be at least 6 characters'); return; }

    setLoading(true);
    try {
      if (tab === 'login') {
        const user = checkCredentials(email.trim(), password);
        login(user.email);
      } else {
        register(email.trim().toLowerCase(), password, name.trim());
      }
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const ic = (val) =>
    `w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
      error && !val ? 'border-red-400 bg-red-50' : 'border-gray-200 hover:border-gray-300'
    }`;

  const EyeOpen = () => (
    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
    </svg>
  );
  const EyeOff = () => (
    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24M1 1l22 22"/>
    </svg>
  );

  return (
    <div className="min-h-screen flex items-center justify-center px-4"
      style={{ background: 'linear-gradient(135deg, #f0f4ff 0%, #fafafa 50%, #f0fdf4 100%)' }}>
      <div className="w-full max-w-sm">

        {/* Brand */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center shadow-sm">
            <svg width="18" height="18" fill="white" viewBox="0 0 24 24">
              <path d="M3 3h8v8H3zm10 0h8v8h-8zM3 13h8v8H3zm10 0h8v8h-8z"/>
            </svg>
          </div>
          <span className="text-xl font-semibold text-gray-900 tracking-tight">Custom Dashboard Builder</span>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">

          {/* Tabs */}
          <div className="flex border-b border-gray-100">
            {[['login','Sign In'], ['signup','Sign Up']].map(([t, label]) => (
              <button key={t} onClick={() => switchTab(t)}
                className={`flex-1 py-3.5 text-sm font-medium transition-colors ${
                  tab === t
                    ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/40'
                    : 'text-gray-400 hover:text-gray-600'
                }`}>
                {label}
              </button>
            ))}
          </div>

          <div className="px-8 py-7">
            <p className="text-sm text-gray-400 mb-5">
              {tab === 'login' ? 'Enter your credentials to continue' : 'Create a new account'}
            </p>

            {error && (
              <div className="bg-red-50 border border-red-100 rounded-lg px-3 py-2.5 text-sm text-red-600 mb-4 flex items-center gap-2">
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>
                </svg>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate className="space-y-4">

              {/* Name — signup only */}
              {tab === 'signup' && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Full name</label>
                  <input
                    value={name}
                    onChange={e => { setName(e.target.value); setError(''); }}
                    placeholder="Your name"
                    className={ic(name)}
                  />
                </div>
              )}

              {/* Email */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Email address</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setError(''); }}
                  placeholder="you@example.com"
                  autoComplete="email"
                  className={ic(email)}
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Password</label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    onChange={e => { setPassword(e.target.value); setError(''); }}
                    placeholder="Min. 6 characters"
                    autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
                    className={`${ic(password)} pr-10`}
                  />
                  <button type="button" tabIndex={-1}
                    onClick={() => setShowPw(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                    {showPw ? <EyeOff /> : <EyeOpen />}
                  </button>
                </div>
              </div>

              <button type="submit" disabled={loading}
                className="w-full bg-blue-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 active:scale-[0.99] disabled:opacity-60 transition-all flex items-center justify-center gap-2 mt-1 shadow-sm">
                {loading
                  ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>
                      {tab === 'login' ? 'Signing in…' : 'Creating account…'}
                    </>
                  : tab === 'login' ? 'Sign in →' : 'Create account →'
                }
              </button>
            </form>

            {/* Default account hint — only on login tab */}
            {tab === 'login' && (
              <div className="mt-5 pt-4 border-t border-gray-100">
                <p className="text-xs text-gray-400 text-center mb-2">Default account</p>
                <button
                  onClick={() => { setEmail('admin@orderflow.com'); setPassword('ad_12@34'); setError(''); }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-gray-50 hover:bg-blue-50 border border-gray-100 hover:border-blue-200 transition-colors">
                  <span className="text-xs font-medium text-gray-600">Admin</span>
                  <span className="text-xs text-gray-400 font-mono">admin@orderflow.com</span>
                </button>
              </div>
            )}
          </div>
        </div>

        <p className="text-xs text-gray-400 text-center mt-5">
          Custom Dashboard Builder · All rights reserved
        </p>
      </div>
    </div>
  );
}