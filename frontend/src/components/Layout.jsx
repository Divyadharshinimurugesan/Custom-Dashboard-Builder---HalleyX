import React, { useContext, useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { SessionContext } from '../App';

export default function Layout() {
  const { email, logout } = useContext(SessionContext);
  const navigate = useNavigate();
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navLinkClass = ({ isActive }) =>
    `px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
      isActive
        ? 'bg-blue-600 text-white'
        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
    }`;

  return (
    <div className="min-h-screen bg-gray-50" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      {/* ── Top Navbar ── */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-screen-xl mx-auto px-6 h-14 flex items-center justify-between gap-6">
          {/* Brand */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="w-7 h-7 bg-blue-600 rounded-md flex items-center justify-center">
              <svg width="14" height="14" fill="white" viewBox="0 0 24 24">
                <path d="M3 3h8v8H3zm10 0h8v8h-8zM3 13h8v8H3zm10 0h8v8h-8z"/>
              </svg>
            </div>
            <span className="font-semibold text-gray-900 text-[15px] tracking-tight">Custom Dashboard Builder</span>
          </div>

          {/* Nav links */}
          <nav className="flex items-center gap-1">
            <NavLink to="/dashboard" end className={navLinkClass}>Dashboard</NavLink>
            <NavLink to="/orders"       className={navLinkClass}>Customer Orders</NavLink>
          </nav>

          {/* Right — user email */}
          <div className="relative shrink-0">
            <button
              onClick={() => setUserMenuOpen(o => !o)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-semibold">
                {email.charAt(0).toUpperCase()}
              </div>
              <span className="text-sm text-gray-600 hidden sm:block max-w-48 truncate">{email}</span>
              <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="text-gray-400">
                <path d="M19 9l-7 7-7-7"/>
              </svg>
            </button>

            {userMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                <div className="absolute right-0 top-full mt-1 w-44 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-100">
                    <p className="text-xs text-gray-400">Signed in as</p>
                    <p className="text-xs font-medium text-gray-700 truncate mt-0.5">{email}</p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors"
                  >
                    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
                    </svg>
                    Sign out
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ── Page Content ── */}
      <main className="max-w-screen-xl mx-auto px-6 py-6">
        <Outlet />
      </main>
    </div>
  );
}
