import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { apiRegister, apiLogin } from '../api';
import { useAuth } from '../App.jsx';

export default function Register() {
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
      await apiRegister({ email, password });
      // Auto-login for better UX.
      await apiLogin({ email, password });
      await refreshMe();
      navigate('/tasks');
    } catch (err) {
      setError(err?.message || 'Register error');
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
              <h1 className="h3 mb-1">Crear cuenta</h1>
              <div className="text-secondary">Regístrate para empezar a crear tareas.</div>
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
                  autoComplete="new-password"
                  required
                />
                <div className="form-text text-secondary">
                  Mínimo 6 caracteres.
                </div>
              </div>

              {error ? <div className="alert alert-danger mb-0">{error}</div> : null}

              <button className="btn btn-primary" type="submit" disabled={busy}>
                {busy ? 'Creando...' : 'Crear cuenta'}
              </button>
            </form>

            <div className="mt-3 text-secondary">
              ¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

