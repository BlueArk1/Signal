import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
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
      return callback(new Error('Not allowed by CORS'));
    },
  })
);
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
  res.status(500).json({ error: 'Internal server error' });
});

const server = app.listen(PORT, () => {
  console.log(`[backend] listening on http://localhost:${PORT}`);
});

// Graceful shutdown — close SQLite WAL cleanly
async function shutdown(signal) {
  console.log(`[backend] ${signal} received, shutting down...`);
  server.close(async () => {
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
