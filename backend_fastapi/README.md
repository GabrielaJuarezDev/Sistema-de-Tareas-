# Backend FastAPI (SQLite)

## Requisitos

- Python 3.10+

## Ejecutar

```bash
cd backend_fastapi
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt

# opcional
copy .env.example .env

uvicorn app.main:app --reload --port 8000
```

API base: `http://localhost:8000/api`

## Endpoints

- `GET /api/health`
- Auth:
  - `POST /api/auth/register`
  - `POST /api/auth/login` (cookie `auth_token`)
  - `POST /api/auth/logout`
  - `GET /api/auth/me`
- Tasks (requiere cookie):
  - `GET /api/tasks`
  - `POST /api/tasks` (title, description, due_at, remind_at)
  - `PATCH /api/tasks/{id}` (completed, due_at, remind_at)
  - `DELETE /api/tasks/{id}`

