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

export function signToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, tv: user.token_version ?? 0 },
    ACTIVE_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

// Verify token signature + check token_version matches current DB value.
// Returns the verified payload or null.
function verifyToken(token) {
  const payload = jwt.verify(token, ACTIVE_SECRET);
  if (typeof payload.tv !== 'number') return null;
  const row = db.prepare('SELECT token_version FROM users WHERE id = ?').get(payload.id);
  if (!row || row.token_version !== payload.tv) return null;
  return payload;
}

export function authRequired(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
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
