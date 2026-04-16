const { DatabaseSync } = require('node:sqlite');
const fs = require('fs');
const path = require('path');

const SQLITE_PATH =
  process.env.SQLITE_PATH ||
  path.join(__dirname, '..', 'data', 'app.db');

// Ensure folder exists.
fs.mkdirSync(path.dirname(SQLITE_PATH), { recursive: true });

const db = new DatabaseSync(SQLITE_PATH);

function ensureTasksColumns() {
  // Lightweight migration for existing DBs.
  // Add due_at/remind_at if missing.
  try {
    const stmt = db.prepare('PRAGMA table_info(tasks);');
    const cols = stmt.all();
    const names = new Set(cols.map((c) => c.name));

    if (!names.has('due_at')) {
      db.exec('ALTER TABLE tasks ADD COLUMN due_at TEXT;');
    }
    if (!names.has('remind_at')) {
      db.exec('ALTER TABLE tasks ADD COLUMN remind_at TEXT;');
    }
  } catch (_err) {
    // ignore
  }
}

function initDb() {
  // WAL is friendlier for concurrent reads (frontend polls, etc).
  try {
    db.exec('PRAGMA journal_mode = WAL;');
  } catch (_err) {
    // Some environments may not support WAL; continue with defaults.
  }

  db.exec(`
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
  `);

  ensureTasksColumns();
}

module.exports = { db, initDb };

