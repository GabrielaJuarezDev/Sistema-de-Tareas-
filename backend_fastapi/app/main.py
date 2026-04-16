import os
from datetime import datetime
from typing import Optional

from fastapi import Depends, FastAPI, HTTPException, Response, status
from fastapi.middleware.cors import CORSMiddleware

from .auth import COOKIE_NAME, create_token, hash_password, require_user, verify_password
from .db import connect, init_db
from .schemas import LoginIn, RegisterIn, TaskCreateIn, TaskUpdateIn


app = FastAPI(title="To-Do API", version="1.0.0")


def _cors_origins() -> list[str]:
    raw = os.getenv("CORS_ORIGINS") or "http://localhost:5173,http://127.0.0.1:5173"
    return [x.strip() for x in raw.split(",") if x.strip()]


app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def _startup() -> None:
    init_db()


@app.get("/api/health")
def health() -> dict:
    return {"ok": True}


@app.post("/api/auth/register", status_code=201)
def register(payload: RegisterIn) -> dict:
    email = payload.email.strip().lower()
    password_hash = hash_password(payload.password)

    conn = connect()
    try:
        cur = conn.cursor()
        cur.execute("SELECT id FROM users WHERE email = ?", (email,))
        if cur.fetchone():
            raise HTTPException(status_code=409, detail="Email already registered")
        cur.execute(
            "INSERT INTO users (email, password_hash) VALUES (?, ?)",
            (email, password_hash),
        )
        conn.commit()
        return {"ok": True, "id": cur.lastrowid}
    finally:
        conn.close()


@app.post("/api/auth/login")
def login(payload: LoginIn, response: Response) -> dict:
    email = payload.email.strip().lower()
    conn = connect()
    try:
        cur = conn.cursor()
        cur.execute("SELECT id, email, password_hash FROM users WHERE email = ?", (email,))
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=401, detail="Invalid credentials")
        if not verify_password(payload.password, row["password_hash"]):
            raise HTTPException(status_code=401, detail="Invalid credentials")

        token = create_token(int(row["id"]), row["email"])
        response.set_cookie(
            key=COOKIE_NAME,
            value=token,
            httponly=True,
            samesite="lax",
            secure=False,
            max_age=60 * 60 * 24 * 7,
        )
        return {"ok": True}
    finally:
        conn.close()


@app.post("/api/auth/logout")
def logout(response: Response) -> dict:
    response.delete_cookie(key=COOKIE_NAME, samesite="lax")
    return {"ok": True}


@app.get("/api/auth/me")
def me(user: dict = Depends(require_user)) -> dict:
    return {"id": user["id"], "email": user["email"]}


@app.get("/api/tasks")
def list_tasks(user: dict = Depends(require_user)) -> list[dict]:
    conn = connect()
    try:
        cur = conn.cursor()
        cur.execute(
            """
            SELECT id, title, description, completed, due_at, remind_at, created_at
            FROM tasks
            WHERE user_id = ?
            ORDER BY datetime(created_at) DESC, id DESC
            """,
            (user["id"],),
        )
        rows = cur.fetchall()
        return [
            {
                "id": r["id"],
                "title": r["title"],
                "description": r["description"],
                "completed": bool(r["completed"]),
                "due_at": r["due_at"],
                "remind_at": r["remind_at"],
                "created_at": r["created_at"],
            }
            for r in rows
        ]
    finally:
        conn.close()


@app.post("/api/tasks", status_code=201)
def create_task(payload: TaskCreateIn, user: dict = Depends(require_user)) -> dict:
    title = payload.title.strip()
    if not title:
        raise HTTPException(status_code=400, detail="title is required")

    conn = connect()
    try:
        cur = conn.cursor()
        cur.execute(
            """
            INSERT INTO tasks (user_id, title, description, due_at, remind_at)
            VALUES (?, ?, ?, ?, ?)
            """,
            (
                user["id"],
                title,
                payload.description,
                payload.due_at,
                payload.remind_at,
            ),
        )
        task_id = cur.lastrowid
        conn.commit()
        cur.execute(
            """
            SELECT id, title, description, completed, due_at, remind_at, created_at
            FROM tasks
            WHERE id = ? AND user_id = ?
            """,
            (task_id, user["id"]),
        )
        r = cur.fetchone()
        return {
            "id": r["id"],
            "title": r["title"],
            "description": r["description"],
            "completed": bool(r["completed"]),
            "due_at": r["due_at"],
            "remind_at": r["remind_at"],
            "created_at": r["created_at"],
        }
    finally:
        conn.close()


@app.patch("/api/tasks/{task_id}")
def update_task(
    task_id: int, payload: TaskUpdateIn, user: dict = Depends(require_user)
) -> dict:
    sets: list[str] = []
    vals: list[object] = []

    if payload.completed is not None:
        sets.append("completed = ?")
        vals.append(1 if payload.completed else 0)
    if payload.due_at is not None:
        sets.append("due_at = ?")
        vals.append(payload.due_at)
    if payload.remind_at is not None:
        sets.append("remind_at = ?")
        vals.append(payload.remind_at)

    if not sets:
        raise HTTPException(status_code=400, detail="Nothing to update")

    conn = connect()
    try:
        cur = conn.cursor()
        cur.execute(
            f"UPDATE tasks SET {', '.join(sets)} WHERE id = ? AND user_id = ?",
            (*vals, task_id, user["id"]),
        )
        if cur.rowcount == 0:
            raise HTTPException(status_code=404, detail="Task not found")
        conn.commit()
        cur.execute(
            """
            SELECT id, title, description, completed, due_at, remind_at, created_at
            FROM tasks
            WHERE id = ? AND user_id = ?
            """,
            (task_id, user["id"]),
        )
        r = cur.fetchone()
        return {
            "id": r["id"],
            "title": r["title"],
            "description": r["description"],
            "completed": bool(r["completed"]),
            "due_at": r["due_at"],
            "remind_at": r["remind_at"],
            "created_at": r["created_at"],
        }
    finally:
        conn.close()


@app.delete("/api/tasks/{task_id}")
def delete_task(task_id: int, user: dict = Depends(require_user)) -> dict:
    conn = connect()
    try:
        cur = conn.cursor()
        cur.execute("DELETE FROM tasks WHERE id = ? AND user_id = ?", (task_id, user["id"]))
        if cur.rowcount == 0:
            raise HTTPException(status_code=404, detail="Task not found")
        conn.commit()
        return {"ok": True}
    finally:
        conn.close()

