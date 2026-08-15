import { Router } from 'express';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import db from '../db/schema.js';
import { signToken, authRequired } from '../middleware/auth.js';

const router = Router();

const REGISTRATION_ENABLED = process.env.ALLOW_REGISTRATION !== 'false';

// httpOnly cookie options — token not readable by JS (XSS-safe).
// Container serves HTTPS directly (self-signed cert), so Secure cookies
// work end-to-end even behind a reverse proxy.
const COOKIE_NAME = 'signal_token';
const isProd = process.env.NODE_ENV === 'production';
const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: isProd,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: '/',
};

function setAuthCookie(res, token) {
  res.cookie(COOKIE_NAME, token, cookieOptions);
}

function clearAuthCookie(res) {
  res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: undefined });
}

// Rate limit auth endpoints to prevent brute-force / credential stuffing.
// Key by IP + username so one abuser behind a shared NAT can't lock out others.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts, please try again later' },
  keyGenerator: (req) => {
    const ip = req.ip || req.socket?.remoteAddress || 'unknown';
    const username = (req.body && typeof req.body.username === 'string' ? req.body.username : '').toLowerCase();
    return `${ip}:${username}`;
  },
});

// Username: 3-20 chars, alphanumeric + underscore/hyphen only
const USERNAME_RE = /^[a-zA-Z0-9_-]{3,20}$/;

// Password: >= 8 chars, at least one letter and one digit
const PASSWORD_RE = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

function validatePassword(password) {
  if (typeof password !== 'string' || !PASSWORD_RE.test(password)) {
    return 'Password must be at least 8 characters and contain both letters and numbers';
  }
  return null;
}

router.get('/config', (req, res) => {
  res.json({ registrationEnabled: REGISTRATION_ENABLED });
});

router.post('/register', authLimiter, async (req, res) => {
  if (!REGISTRATION_ENABLED) {
    return res.status(403).json({ error: 'Registration is disabled' });
  }
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }
  if (typeof username !== 'string' || !USERNAME_RE.test(username)) {
    return res.status(400).json({ error: 'Username must be 3-20 characters (letters, numbers, _ or -)' });
  }
  if (typeof password !== 'string' || password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }
  const pwErr = validatePassword(password);
  if (pwErr) {
    return res.status(400).json({ error: pwErr });
  }

  const clean = username;
  const exists = db.prepare('SELECT id FROM users WHERE username = ?').get(clean);
  if (exists) {
    return res.status(409).json({ error: 'Username already taken' });
  }

  const hash = await bcrypt.hash(password, 10);
  let info;
  try {
    info = db
      .prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)')
      .run(clean, hash);
  } catch (err) {
    // Concurrent identical usernames can violate the UNIQUE constraint even
    // though the pre-check passed — treat as a conflict, not a 500.
    if (String(err?.message || '').includes('UNIQUE')) {
      return res.status(409).json({ error: 'Username already taken' });
    }
    throw err;
  }
  // node:sqlite may return lastInsertRowid as BigInt — coerce to Number so
  // jwt.sign/JSON.stringify don't throw on BigInt serialization.
  const user = { id: Number(info.lastInsertRowid), username: clean, token_version: 0 };
  const token = signToken(user);
  setAuthCookie(res, token);
  res.status(201).json({ token, user });
});

router.post('/login', authLimiter, async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }
  const user = db
    .prepare('SELECT id, username, password_hash, token_version, must_change_password FROM users WHERE username = ?')
    .get(username.trim());
  // Always run bcrypt compare (even for missing users) to avoid timing-based
  // user enumeration. Compare against a dummy hash when user not found.
  const hash = user ? user.password_hash : '$2a$10$CwTycUXWue0Thq9StjUM0uJ8l1m0m0m0m0m0m0m0m0m0m0m0m0m0';
  const ok = await bcrypt.compare(password, hash);
  if (!user || !ok) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const payload = {
    id: user.id,
    username: user.username,
    token_version: user.token_version,
    mustChangePassword: !!user.must_change_password,
  };
  const token = signToken(payload);
  setAuthCookie(res, token);
  res.json({ token, user: payload });
});

// Logout — clear the httpOnly cookie
router.post('/logout', (req, res) => {
  clearAuthCookie(res);
  res.json({ ok: true });
});

// Return the current authenticated user (for session restore on refresh)
router.get('/me', authRequired, (req, res) => {
  const row = db
    .prepare('SELECT id, username, token_version, must_change_password FROM users WHERE id = ?')
    .get(req.user.id);
  if (!row) return res.status(401).json({ error: 'User not found' });
  res.json({
    user: {
      id: row.id,
      username: row.username,
      token_version: row.token_version,
      mustChangePassword: !!row.must_change_password,
    },
  });
});

// Change password for the authenticated user
router.post('/change-password', authLimiter, authRequired, async (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current and new password required' });
  }
  if (typeof newPassword !== 'string' || newPassword.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters' });
  }
  const pwErr = validatePassword(newPassword);
  if (pwErr) {
    return res.status(400).json({ error: pwErr });
  }
  const user = db
    .prepare('SELECT id, password_hash FROM users WHERE id = ?')
    .get(req.user.id);
  if (!user || !(await bcrypt.compare(currentPassword, user.password_hash))) {
    return res.status(401).json({ error: 'Current password is incorrect' });
  }
  const hash = await bcrypt.hash(newPassword, 10);
  // Bump token_version to invalidate all previously issued JWTs for this user,
  // and clear the must-change-password flag.
  db.prepare(
    'UPDATE users SET password_hash = ?, token_version = token_version + 1, must_change_password = 0 WHERE id = ?'
  ).run(hash, req.user.id);
  // Issue a fresh token+cookie with the new token_version so the session
  // survives the password change (old cookie's tv no longer matches).
  const updated = db
    .prepare('SELECT id, username, token_version, must_change_password FROM users WHERE id = ?')
    .get(req.user.id);
  const newPayload = {
    id: updated.id,
    username: updated.username,
    token_version: updated.token_version,
    mustChangePassword: !!updated.must_change_password,
  };
  const newToken = signToken(newPayload);
  setAuthCookie(res, newToken);
  res.json({ ok: true, user: newPayload });
});

export default router;
