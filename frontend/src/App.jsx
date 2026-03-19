import React, { useState, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout             from './components/Layout';
import DashboardPage      from './pages/DashboardPage';
import ConfigureDashboard from './pages/ConfigureDashboard';
import OrdersPage         from './pages/OrdersPage';
import LoginPage          from './pages/LoginPage';

// ── In-memory user store — persisted in localStorage ─────────
const STORAGE_KEY = 'of_users';
const DEFAULT_USERS = [
  { email: 'admin@orderflow.com', password: 'ad_12@34', name: 'Admin' },
];

function loadUsers() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : DEFAULT_USERS;
  } catch { return DEFAULT_USERS; }
}

function saveUsers(users) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
}

// ── Session hook ───────────────────────────────────────────────
function useSession() {
  // Read logged-in email from localStorage on mount
  const [email, setEmail] = useState(() => {
    // Clean up old session keys from previous versions
    const old = localStorage.getItem('user_email') || sessionStorage.getItem('user_email');
    if (old) {
      localStorage.removeItem('user_email');
      sessionStorage.removeItem('user_email');
      // Don't restore old session — force re-login for security
    }
    return localStorage.getItem('of_session') || '';
  });

  const login = useCallback((emailVal) => {
    localStorage.setItem('of_session', emailVal);
    setEmail(emailVal);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('of_session');
    setEmail('');
  }, []);

  const register = useCallback((emailVal, password, name) => {
    const users = loadUsers();
    const exists = users.some(u => u.email.toLowerCase() === emailVal.toLowerCase());
    if (exists) throw new Error('Email already registered');
    const updated = [...users, { email: emailVal.toLowerCase(), password, name }];
    saveUsers(updated);
    localStorage.setItem('of_session', emailVal.toLowerCase());
    setEmail(emailVal.toLowerCase());
  }, []);

  const checkCredentials = useCallback((emailVal, password) => {
    const users = loadUsers();
    const user = users.find(
      u => u.email.toLowerCase() === emailVal.toLowerCase() && u.password === password
    );
    if (!user) throw new Error('Invalid email or password');
    return user;
  }, []);

  return { email, login, logout, register, checkCredentials };
}

export const SessionContext = React.createContext(null);

// ── Route guards ───────────────────────────────────────────────
function RequireAuth({ children }) {
  // Read directly from localStorage — this is the session token
  const stored = localStorage.getItem('of_session') || '';
  if (!stored) return <Navigate to="/login" replace />;
  return children;
}

function RedirectIfAuthed({ children }) {
  const stored = localStorage.getItem('of_session') || '';
  if (stored) return <Navigate to="/dashboard" replace />;
  return children;
}

export default function App() {
  const session = useSession();
  return (
    <SessionContext.Provider value={session}>
      <BrowserRouter>
        <Routes>
          {/* Root → login always */}
          <Route index element={<Navigate to="/login" replace />} />

          {/* Public — redirects to dashboard if already logged in */}
          <Route path="/login" element={
            <RedirectIfAuthed><LoginPage /></RedirectIfAuthed>
          } />

          {/* Protected — redirects to login if not logged in */}
          <Route path="/" element={<RequireAuth><Layout /></RequireAuth>}>
            <Route path="dashboard"           element={<DashboardPage />} />
            <Route path="dashboard/configure" element={<ConfigureDashboard />} />
            <Route path="orders"              element={<OrdersPage />} />
          </Route>

          {/* Anything else → login */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </SessionContext.Provider>
  );
}
