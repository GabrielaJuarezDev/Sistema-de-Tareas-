import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Navigate } from 'react-router-dom';

import { apiCreateTask, apiDeleteTask, apiGetTasks, apiMarkTaskCompleted } from '../api';
import { useAuth } from '../App.jsx';
import TaskItem from '../components/TaskItem.jsx';
import TaskForm from '../components/TaskForm.jsx';

export default function Tasks() {
  const { user, loading, logout } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [reminderBanner, setReminderBanner] = useState(null);
  const notifiedRef = useRef(new Set());

  const notificationsSupported = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return 'Notification' in window;
  }, []);

  async function refresh() {
    const data = await apiGetTasks();
    setTasks(data);
  }

  useEffect(() => {
    if (!user) return;
    setError('');
    setBusy(true);
    refresh()
      .catch((err) => {
        setError(err?.message || 'Error cargando tareas');
      })
      .finally(() => setBusy(false));
  }, [user]);

  async function onCreate({ title, description, due_at, remind_at }) {
    setBusy(true);
    setError('');
    try {
      await apiCreateTask({ title, description, due_at, remind_at });
      await refresh();
    } catch (err) {
      setError(err?.message || 'Error creando tarea');
    } finally {
      setBusy(false);
    }
  }

  async function onToggleCompleted(task) {
    setBusy(true);
    setError('');
    try {
      await apiMarkTaskCompleted({ id: task.id, completed: !task.completed });
      await refresh();
    } catch (err) {
      setError(err?.message || 'Error actualizando tarea');
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(task) {
    const ok = window.confirm(`¿Eliminar "${task.title}"?`);
    if (!ok) return;

    setBusy(true);
    setError('');
    try {
      await apiDeleteTask({ id: task.id });
      await refresh();
    } catch (err) {
      setError(err?.message || 'Error eliminando tarea');
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <div className="container py-4">Cargando...</div>;
  if (!user) return <Navigate to="/login" replace />;

  // Reminder loop (only while app is open).
  useEffect(() => {
    if (!tasks.length) return undefined;

    let cancelled = false;

    async function maybeNotify(t) {
      const key = `${t.id}:${t.remind_at}`;
      if (notifiedRef.current.has(key)) return;
      notifiedRef.current.add(key);

      setReminderBanner({
        title: t.title,
        due_at: t.due_at,
      });

      if (notificationsSupported && Notification.permission === 'default') {
        // Best effort: request once when a reminder is about to fire.
        try {
          await Notification.requestPermission();
        } catch (_e) {
          // ignore
        }
      }

      if (notificationsSupported && Notification.permission === 'granted') {
        try {
          new Notification('Recordatorio de tarea', {
            body: t.due_at ? `${t.title} (vence: ${t.due_at})` : t.title,
          });
        } catch (_e) {
          // ignore
        }
      }
    }

    function tick() {
      if (cancelled) return;
      const now = Date.now();
      for (const t of tasks) {
        if (t.completed) continue;
        if (!t.remind_at) continue;
        const ts = Date.parse(t.remind_at);
        if (!Number.isFinite(ts)) continue;
        if (ts <= now) {
          maybeNotify(t);
        }
      }
    }

    tick();
    const id = setInterval(tick, 15000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [tasks, notificationsSupported]);

  return (
    <div className="container py-4">
      <div className="d-flex justify-content-between align-items-start gap-3 flex-wrap mb-3">
        <div>
          <h1 className="h3 mb-1">Tus tareas</h1>
          <div className="text-body-secondary small">{user.email}</div>
        </div>
        <button
          type="button"
          className="btn btn-outline-danger"
          onClick={logout}
          disabled={busy}
        >
          Cerrar sesión
        </button>
      </div>

      <div className="card shadow-lg border-0">
        <div className="card-body p-4">
          {reminderBanner ? (
            <div className="alert alert-warning d-flex justify-content-between align-items-center gap-2">
              <div>
                <div className="fw-semibold">Recordatorio</div>
                <div className="small">
                  {reminderBanner.title}
                  {reminderBanner.due_at ? ` · Vence: ${reminderBanner.due_at}` : ''}
                </div>
              </div>
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                onClick={() => setReminderBanner(null)}
              >
                Cerrar
              </button>
            </div>
          ) : null}

          <TaskForm onCreate={onCreate} disabled={busy} />
          {error ? <div className="alert alert-danger mt-3 mb-0">{error}</div> : null}
        </div>
      </div>

      <div className="card shadow-lg border-0 mt-3">
        <div className="card-body p-0">
          <div className="p-4 border-bottom">
            <div className="d-flex justify-content-between align-items-center">
              <div className="fw-semibold">Lista</div>
              {busy ? <span className="text-secondary small">Actualizando…</span> : null}
            </div>
            {!busy && tasks.length === 0 ? (
              <div className="text-secondary mt-2">No tienes tareas aún.</div>
            ) : null}
          </div>

          {tasks.length ? (
            <div className="table-responsive">
              <table className="table table-hover mb-0 align-middle">
                <thead>
                  <tr>
                    <th>Título</th>
                    <th>Estado</th>
                    <th>Creación</th>
                    <th>Vence</th>
                    <th className="text-end">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.map((t) => (
                    <TaskItem
                      key={t.id}
                      task={t}
                      onToggleCompleted={() => onToggleCompleted(t)}
                      onDelete={() => onDelete(t)}
                      disabled={busy}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

