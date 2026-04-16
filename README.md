# To-Do App (MVP full-stack)

Aplicación básica de gestión de tareas con autenticación de usuarios.

## Stack usado (tal cual lo solicitado)

- Frontend: React + Vite + Bootstrap
- Backend: Python + FastAPI
- Base de datos: SQLite (archivo local)
- API: REST
- Auth: JWT en cookie `HttpOnly` (`auth_token`)

## Requisitos

- Python 3.10+
- Node.js + npm
- Navegador moderno

## Ejecutar en local

### Quickstart (FastAPI + Frontend)

#### 1) Backend (FastAPI)

```bash
cd backend_fastapi
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

El backend queda disponible en `http://localhost:8000/api`.

#### 2) Frontend

En `frontend/` crea un archivo `.env` basado en `frontend/.env.example`:

```bash
cd frontend
copy .env.example .env
npm install
npm run dev
```

Abrir: `http://localhost:5173`

## Variables de entorno

### Backend (FastAPI)

Copia `backend_fastapi/.env.example` a `backend_fastapi/.env` si quieres personalizar:

- `PORT` (default `8000`)
- `CORS_ORIGINS` (default `http://localhost:5173,http://127.0.0.1:5173`)
- `JWT_SECRET` (default `dev_secret_change_me`)
- `SQLITE_PATH` (default `./data/app.db`)

### Frontend

- `VITE_API_BASE` (por defecto `http://localhost:8000/api`)

## Endpoints REST (FastAPI)

### Auth

- `POST /api/auth/register` body `{ email, password }`
- `POST /api/auth/login` body `{ email, password }` (set cookie `auth_token`)
- `POST /api/auth/logout`
- `GET /api/auth/me` (requiere cookie)

### Tasks (requiere auth)

- `GET /api/tasks`
- `POST /api/tasks` body `{ title, description, due_at, remind_at }`
- `PATCH /api/tasks/{id}` body `{ completed?: boolean, due_at?: string|null, remind_at?: string|null }`
- `DELETE /api/tasks/{id}`

## Funcionalidades UI

- Login / Registro
- Lista de tareas
- Crear tarea (incluye calendario `datetime-local`)
- Marcar completada / reabrir
- Eliminar
- Recordatorios automáticos (banner en la app + notificación del navegador si se permite)

## Notas (recordatorios y micrófono)

- **Recordatorios**: funcionan mientras la app esté abierta. Para notificaciones del navegador, acepta el permiso cuando se solicite.
- **Micrófono**: el dictado depende del nivel de entrada configurado en Windows/Chrome. La UI incluye un medidor de nivel y diagnóstico para ayudar a configurarlo.

## Troubleshooting

### Python no reconocido / problemas con el entorno virtual

Si `python` no está disponible en la terminal:

- instala Python 3.10+ y marca la opción para agregarlo al `PATH`
- cierra y vuelve a abrir la terminal

Si el entorno virtual no activa correctamente:

```bash
cd backend_fastapi
python -m venv .venv
.\.venv\Scripts\activate
```

### "Failed to fetch" en el frontend

Verifica que:

- FastAPI esté corriendo en `http://localhost:8000`
- el frontend esté usando `VITE_API_BASE=http://localhost:8000/api`
- abras la app en `http://localhost:5173` o `http://127.0.0.1:5173`

Si cambias el origen del frontend, ajusta `CORS_ORIGINS` en `backend_fastapi/.env`.

### La sesión no se mantiene

Si el login funciona pero la app no conserva la sesión:

- revisa que el navegador no esté bloqueando cookies para `localhost`
- evita mezclar `localhost` y `127.0.0.1` entre frontend y backend
- recarga la página después de actualizar variables de entorno

### El micrófono no detecta voz

Si el medidor de nivel muestra valores muy bajos:

- en Windows ve a `Configuración > Sistema > Sonido > Entrada`
- selecciona el micrófono correcto
- sube el volumen de entrada
- en Chrome revisa `chrome://settings/content/microphone`

### No llegan recordatorios

Los recordatorios automáticos funcionan mientras la app esté abierta.

Verifica que:

- la tarea tenga `Fecha y hora`
- el recordatorio esté configurado
- la hora del sistema sea correcta
- el navegador tenga permiso para mostrar notificaciones

## Backend alterno (opcional)

Existe un backend alterno en `backend/` (Node/Express) con el mismo esquema y endpoints equivalentes. Solo se recomienda si no puedes ejecutar Python en tu entorno.

```bash
cd backend
npm install
npm run dev
```

## Estructura del proyecto

```
Prueba/
  backend_fastapi/
    app/
      main.py        # FastAPI: rutas /api/auth y /api/tasks
      db.py          # SQLite + inicialización/migración ligera
      auth.py        # JWT + cookies + hashing de passwords
      schemas.py     # Modelos Pydantic
    requirements.txt
    .env.example
    README.md
  frontend/
    src/
      pages/         # Login, Register, Tasks
      components/    # TaskForm, TaskItem (micrófono, calendario)
      api.js         # Cliente REST (fetch + credentials)
      App.jsx        # Router + AuthProvider + theme toggle
      main.jsx       # Bootstrap + render
    .env.example
  backend/           # Backend alterno (Node/Express)
  README.md
```

### Archivos clave (para explicar en sesión)

- Backend FastAPI:
  - `backend_fastapi/app/main.py`
  - `backend_fastapi/app/db.py`
  - `backend_fastapi/app/auth.py`
- Frontend:
  - `frontend/src/api.js`
  - `frontend/src/App.jsx`
  - `frontend/src/pages/Tasks.jsx`
  - `frontend/src/components/TaskForm.jsx`
