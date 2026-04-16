require('dotenv').config();

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const { initDb } = require('./db');
const authRoutes = require('./routes/auth');
const taskRoutes = require('./routes/tasks');

const PORT = process.env.PORT || 3001;
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';
const CORS_ALLOWLIST = String(CORS_ORIGIN)
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

// Initialize DB (and create tables if they don't exist).
initDb();

const app = express();

app.use(
  cors({
    origin(origin, cb) {
      // Allow non-browser clients (no Origin header).
      if (!origin) return cb(null, true);

      // Allow localhost/127.0.0.1 on any port for local dev.
      if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
        return cb(null, true);
      }

      // Allow explicit allowlist via env (comma-separated).
      if (CORS_ALLOWLIST.includes(origin)) {
        return cb(null, true);
      }

      return cb(new Error('Not allowed by CORS'));
    },
    credentials: true,
  })
);
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);

// Simple 404 handler.
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Backend listening on http://localhost:${PORT}`);
});

