import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, Navigate, Route, Routes } from 'react-router-dom';

import { apiGetTasks, apiMe, apiLogout } from './api';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Tasks from './pages/Tasks.jsx';

const AuthContext = React.createContext(null);

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshMe = useCallback(async () => {
    try {
      const me = await apiMe();
      setUser(me);
    } catch (_err) {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    refreshMe().finally(() => setLoading(false));
  }, [refreshMe]);

  const logout = useCallback(async () => {
    await apiLogout();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      refreshMe,
      logout,
    }),
    [user, loading, refreshMe, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export default function App() {
  useBootstrapTheme();
  return (
    <AuthProvider>
      <div className="app-shell">
        <Navbar />
        <Routes>
          <Route path="/" element={<RootRedirect />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/tasks" element={<Tasks />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </AuthProvider>
  );
}

function RootRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <div className="container py-4">Cargando...</div>;
  return user ? <Navigate to="/tasks" replace /> : <Navigate to="/login" replace />;
}

function useBootstrapTheme() {
  useEffect(() => {
    try {
      const saved = localStorage.getItem('theme');
      const theme = saved === 'light' || saved === 'dark' ? saved : 'dark';
      document.documentElement.setAttribute('data-bs-theme', theme);
    } catch (_e) {
      document.documentElement.setAttribute('data-bs-theme', 'dark');
    }
  }, []);
}

function Navbar() {
  const { user, loading, logout } = useAuth();
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem('theme') || 'dark';
    } catch (_e) {
      return 'dark';
    }
  });

  useEffect(() => {
    const t = theme === 'light' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-bs-theme', t);
    try {
      localStorage.setItem('theme', t);
    } catch (_e) {
      // ignore
    }
  }, [theme]);

  return (
    <nav className="navbar navbar-expand-lg bg-body-tertiary border-bottom">
      <div className="container">
        <Link className="navbar-brand fw-bold" to="/">
          To-Do App
        </Link>
        <div className="d-flex align-items-center gap-2">
          <button
            type="button"
            className="btn btn-outline-secondary btn-sm"
            onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
          >
            {theme === 'dark' ? 'Light' : 'Dark'}
          </button>
          {!loading && user ? (
            <>
              <span className="text-body-secondary small d-none d-md-inline">{user.email}</span>
              <button
                type="button"
                className="btn btn-outline-danger btn-sm"
                onClick={logout}
              >
                Cerrar sesión
              </button>
            </>
          ) : null}
        </div>
      </div>
    </nav>
  );
}

