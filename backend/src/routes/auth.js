const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const { db } = require('../db');
const { requireAuth, COOKIE_NAME } = require('../middleware/auth');

const router = express.Router();

const cookieOptions = () => {
  // In local development we don't require HTTPS.
  const isProd = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProd,
  };
};

router.post('/register', async (req, res) => {
  const { email, password } = req.body || {};
  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

  if (!normalizedEmail || typeof password !== 'string' || password.length < 6) {
    return res.status(400).json({
      error: 'Invalid input. Provide a valid email and a password (min 6 chars).',
    });
  }

  const existing = db
    .prepare('SELECT id FROM users WHERE email = ?')
    .get(normalizedEmail);

  if (existing) {
    return res.status(409).json({ error: 'Email already registered' });
  }

  const password_hash = await bcrypt.hash(password, 10);
  const info = db
    .prepare('INSERT INTO users (email, password_hash) VALUES (?, ?)')
    .run(normalizedEmail, password_hash);

  return res.status(201).json({ ok: true, id: info.lastInsertRowid });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

  if (!normalizedEmail || typeof password !== 'string') {
    return res.status(400).json({ error: 'Invalid input' });
  }

  const user = db
    .prepare('SELECT id, email, password_hash FROM users WHERE email = ?')
    .get(normalizedEmail);

  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const secret = process.env.JWT_SECRET || 'dev_secret_change_me';
  const maxAgeMs = 7 * 24 * 60 * 60 * 1000;
  const token = jwt.sign(
    { email: user.email },
    secret,
    {
      subject: String(user.id),
      expiresIn: '7d',
    }
  );

  res.cookie(COOKIE_NAME, token, {
    ...cookieOptions(),
    maxAge: maxAgeMs,
  });

  return res.json({ ok: true });
});

router.post('/logout', (_req, res) => {
  res.clearCookie(COOKIE_NAME, cookieOptions());
  return res.json({ ok: true });
});

router.get('/me', requireAuth, (req, res) => {
  return res.json({
    id: req.user.id,
    email: req.user.email,
  });
});

module.exports = router;

