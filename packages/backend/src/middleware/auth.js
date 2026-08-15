import jwt from 'jsonwebtoken';
import db from '../db/schema.js';

const JWT_SECRET = process.env.JWT_SECRET;

// Fail fast: never run with a default/empty secret in production
if (!JWT_SECRET || JWT_SECRET === 'dev-secret' || JWT_SECRET === 'change-me-to-a-long-random-secret') {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET must be set to a strong secret in production');
  }
  console.warn('[auth] WARNING: using insecure default JWT secret. Set JWT_SECRET in .env');
}

const ACTIVE_SECRET = JWT_SECRET || 'dev-secret';
const JWT_ALGORITHM = 'HS256';

// Short-TTL memoization of token_version lookups to avoid a DB query on every
// authenticated request. Invalidated by the 5s TTL (password changes bump
// token_version and are rare).
const tvCache = new Map(); // userId -> { tv, expiresAt }
const TV_TTL_MS = 5000;

function getTokenVersion(userId) {
  const cached = tvCache.get(userId);
  if (cached && Date.now() < cached.expiresAt) return cached.tv;
  const row = db.prepare('SELECT token_version FROM users WHERE id = ?').get(userId);
  const tv = row ? row.token_version : null;
  tvCache.set(userId, { tv, expiresAt: Date.now() + TV_TTL_MS });
  return tv;
}

export function signToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, tv: user.token_version ?? 0 },
    ACTIVE_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d', algorithm: JWT_ALGORITHM }
  );
}

// Verify token signature + check token_version matches current DB value.
// Returns the verified payload or null.
function verifyToken(token) {
  try {
    const payload = jwt.verify(token, ACTIVE_SECRET, { algorithms: [JWT_ALGORITHM] });
    if (typeof payload.tv !== 'number') {
      console.log('[auth] verify: tv not a number', payload.tv);
      return null;
    }
    const tv = getTokenVersion(payload.id);
    console.log('[auth] verify: payload.tv=', payload.tv, 'db.tv=', tv, 'id=', payload.id);
    if (tv === null || tv !== payload.tv) return null;
    return payload;
  } catch (e) {
    console.log('[auth] verify ERROR:', e.message);
    return null;
  }
}

export function authRequired(req, res, next) {
  // Accept token from Authorization header (legacy) or httpOnly cookie
  const header = req.headers.authorization || '';
  const bearer = header.startsWith('Bearer ') ? header.slice(7) : null;
  const token = bearer || req.cookies?.signal_token || null;
  // TEMP DIAGNOSTIC
  console.log('[auth] cookies:', JSON.stringify(req.cookies));
  console.log('[auth] hasToken:', !!token, 'bearer:', !!bearer);
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  try {
    req.user = verifyToken(token);
    if (!req.user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}
