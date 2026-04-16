const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3001/api';

async function handleJson(res) {
  const contentType = res.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');
  const data = isJson ? await res.json().catch(() => ({})) : {};
  if (!res.ok) {
    const message = data?.error || data?.message || `Request failed (${res.status})`;
    throw new Error(message);
  }
  return data;
}

export async function apiMe() {
  const res = await fetch(`${API_BASE}/auth/me`, {
    method: 'GET',
    credentials: 'include',
  });
  return handleJson(res);
}

export async function apiLogin({ email, password }) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ email, password }),
  });
  return handleJson(res);
}

export async function apiRegister({ email, password }) {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ email, password }),
  });
  return handleJson(res);
}

export async function apiLogout() {
  const res = await fetch(`${API_BASE}/auth/logout`, {
    method: 'POST',
    credentials: 'include',
  });
  return handleJson(res);
}

export async function apiGetTasks() {
  const res = await fetch(`${API_BASE}/tasks`, {
    method: 'GET',
    credentials: 'include',
  });
  return handleJson(res);
}

export async function apiCreateTask({ title, description, due_at, remind_at }) {
  const res = await fetch(`${API_BASE}/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ title, description, due_at, remind_at }),
  });
  return handleJson(res);
}

export async function apiMarkTaskCompleted({ id, completed }) {
  const res = await fetch(`${API_BASE}/tasks/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ completed }),
  });
  return handleJson(res);
}

export async function apiUpdateTask({ id, completed, due_at, remind_at }) {
  const res = await fetch(`${API_BASE}/tasks/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ completed, due_at, remind_at }),
  });
  return handleJson(res);
}

export async function apiDeleteTask({ id }) {
  const res = await fetch(`${API_BASE}/tasks/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  return handleJson(res);
}

