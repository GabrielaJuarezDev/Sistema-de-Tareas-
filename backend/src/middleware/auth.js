const jwt = require('jsonwebtoken');

const COOKIE_NAME = 'auth_token';

function requireAuth(req, res, next) {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const payload = jwt.verify(
      token,
      process.env.JWT_SECRET || 'dev_secret_change_me'
    );
    req.user = {
      id: Number(payload.sub),
      email: payload.email,
    };
    return next();
  } catch (_err) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
}

module.exports = { requireAuth, COOKIE_NAME };

