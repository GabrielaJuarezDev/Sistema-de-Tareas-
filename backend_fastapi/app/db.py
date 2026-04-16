import os
import sqlite3
from pathlib import Path


def _sqlite_path() -> Path:
    raw = os.getenv("SQLITE_PATH") or "./data/app.db"
    p = Path(raw)
    # If relative, resolve from backend_fastapi/ working dir.
    return p


def connect() -> sqlite3.Connection:
    p = _sqlite_path()
    p.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(p), check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    conn = connect()
    try:
        cur = conn.cursor()
        cur.execute("PRAGMA foreign_keys = ON;")
        cur.executescript(
            """
            CREATE TABLE IF NOT EXISTS users (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              email TEXT NOT NULL UNIQUE,
              password_hash TEXT NOT NULL,
              created_at TEXT NOT NULL DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS tasks (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              user_id INTEGER NOT NULL,
              title TEXT NOT NULL,
              description TEXT,
              completed INTEGER NOT NULL DEFAULT 0,
              due_at TEXT,
              remind_at TEXT,
              created_at TEXT NOT NULL DEFAULT (datetime('now')),
              FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
            );
            """
        )

        # Lightweight migration if DB existed before new columns.
        cur.execute("PRAGMA table_info(tasks);")
        cols = {row["name"] for row in cur.fetchall()}
        if "due_at" not in cols:
            cur.execute("ALTER TABLE tasks ADD COLUMN due_at TEXT;")
        if "remind_at" not in cols:
            cur.execute("ALTER TABLE tasks ADD COLUMN remind_at TEXT;")

        conn.commit()
    finally:
        conn.close()

