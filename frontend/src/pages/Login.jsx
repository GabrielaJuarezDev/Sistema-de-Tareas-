import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { apiLogin } from '../api';
import { useAuth } from '../App.jsx';

export default function Login() {
  const navigate = useNavigate();
  const { refreshMe } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await apiLogin({ email, password });
      await refreshMe();
      navigate('/tasks');
    } catch (err) {
      setError(err?.message || 'Login error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container py-4">
      <div className="auth-card">
        <div className="card shadow-lg border-0">
          <div className="card-body p-4 p-md-5">
            <div className="mb-3">
              <h1 className="h3 mb-1">Iniciar sesión</h1>
              <div className="text-secondary">Accede para ver y gestionar tus tareas.</div>
            </div>

            <form onSubmit={onSubmit} className="vstack gap-3">
              <div>
                <label className="form-label">Email</label>
                <input
                  className="form-control"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  autoComplete="email"
                  required
                />
              </div>

              <div>
                <label className="form-label">Password</label>
                <input
                  className="form-control"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type="password"
                  autoComplete="current-password"
                  required
                />
              </div>

              {error ? <div className="alert alert-danger mb-0">{error}</div> : null}

              <button className="btn btn-primary" type="submit" disabled={busy}>
                {busy ? 'Entrando...' : 'Entrar'}
              </button>
            </form>

            <div className="mt-3 text-secondary">
              ¿No tienes cuenta? <Link to="/register">Regístrate</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

