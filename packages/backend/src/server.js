import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import https from 'node:https';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import './db/schema.js';
import authRoutes from './routes/auth.js';
import redditRoutes from './routes/reddit.js';
import userRoutes from './routes/user.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;
const isProd = process.env.NODE_ENV === 'production';

app.set('trust proxy', 1);

// Security headers (HSTS, X-Content-Type-Options, frame-ancestors, etc.)
app.use(
  helmet({
    contentSecurityPolicy: isProd ? undefined : false,
  })
);

// Restrict CORS to known frontend origins
const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5173,http://localhost:5174')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);
app.use(
  cors({
    origin(origin, callback) {
      // Allow requests with no origin (curl, same-origin, server-to-server)
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      // Reject disallowed origins with 403 (not a 500)
      const err = new Error('Not allowed by CORS');
      err.status = 403;
      return callback(err);
    },
    credentials: true,
  })
);
// Parse cookies (for httpOnly auth token)
app.use(cookieParser());
// Explicit body size limit
app.use(express.json({ limit: '16kb' }));

app.get('/api/health', (req, res) => res.json({ ok: true, ts: Date.now() }));

app.use('/api/auth', authRoutes);
app.use('/api/reddit', redditRoutes);
app.use('/api/user', userRoutes);

// Serve the built frontend (single-container deployment)
const frontendDist = path.join(__dirname, '..', '..', 'frontend', 'dist');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  // SPA fallback — serve index.html for non-API routes
  app.get(/^\/(?!api\/).*/, (req, res) => {
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

// 404 + error handler
app.use((req, res) => res.status(404).json({ error: 'Not found' }));
app.use((err, req, res, next) => {
  if (isProd) {
    console.error('[error]', err.message);
  } else {
    console.error(err);
  }
  // Respect explicit status codes (e.g. CORS 403) instead of always 500
  const status = err.status || 500;
  res.status(status).json({ error: err.message || 'Internal server error' });
});

// Use HTTPS when TLS certs are available (generated at build time in Docker),
// falling back to HTTP for local dev without certs.
const TLS_KEY = process.env.TLS_KEY || '/app/certs/key.pem';
const TLS_CERT = process.env.TLS_CERT || '/app/certs/cert.pem';
const hasTls = fs.existsSync(TLS_KEY) && fs.existsSync(TLS_CERT);

const server = hasTls
  ? https.createServer({ key: fs.readFileSync(TLS_KEY), cert: fs.readFileSync(TLS_CERT) }, app)
  : app;

const listener = (hasTls ? server : app).listen(PORT, () => {
  const proto = hasTls ? 'https' : 'http';
  console.log(`[backend] listening on ${proto}://localhost:${PORT}`);
});

// Graceful shutdown — close SQLite WAL cleanly
async function shutdown(signal) {
  console.log(`[backend] ${signal} received, shutting down...`);
  listener.close(async () => {
    try {
      const { default: db } = await import('./db/schema.js');
      db.close();
    } catch {
      // ignore
    }
    process.exit(0);
  });
  // Force exit if close hangs
  setTimeout(() => process.exit(1), 5000).unref();
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
