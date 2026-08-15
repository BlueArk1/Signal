import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Data dir overridable via DATA_DIR (e.g. Docker volume mount)
const dataDir = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
fs.mkdirSync(dataDir, { recursive: true });

const db = new DatabaseSync(path.join(dataDir, 'signal.db'));
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    token_version INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS user_subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subreddit TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(user_id, subreddit)
  );

  CREATE TABLE IF NOT EXISTS saved_posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    post_id TEXT NOT NULL,
    subreddit TEXT NOT NULL,
    title TEXT NOT NULL,
    saved_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(user_id, post_id)
  );

  CREATE TABLE IF NOT EXISTS blocked_rules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('keyword', 'user', 'subreddit')),
    value TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(user_id, type, value)
  );
`);

// Seed a default user only if NO users exist at all.
// Generate a random password and print it to the console.
const DEFAULT_USER = process.env.DEFAULT_USERNAME || 'Ark';
const userCount = db.prepare('SELECT COUNT(*) AS c FROM users').get().c;
if (userCount === 0) {
  const password = process.env.DEFAULT_PASSWORD || crypto.randomBytes(16).toString('hex');
  const hash = bcrypt.hashSync(password, 10);
  db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)').run(DEFAULT_USER, hash);
  console.log('==============================================');
  console.log(`[db] Seeded initial user "${DEFAULT_USER}"`);
  console.log(`[db] Username: ${DEFAULT_USER}`);
  console.log(`[db] Password: ${password}`);
  console.log('[db] Change this password after first login!');
  console.log('==============================================');
}

// Remove the test user if present
db.prepare('DELETE FROM users WHERE username = ?').run('testuser');

export default db;
