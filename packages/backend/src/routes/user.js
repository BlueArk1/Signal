import { Router } from 'express';
import db from '../db/schema.js';
import { authRequired } from '../middleware/auth.js';

const router = Router();
router.use(authRequired);

// ---- Subscriptions ----
router.get('/subscriptions', (req, res) => {
  const rows = db
    .prepare('SELECT subreddit FROM user_subscriptions WHERE user_id = ? ORDER BY subreddit')
    .all(req.user.id);
  res.json({ subscriptions: rows.map((r) => r.subreddit) });
});

router.post('/subscriptions', (req, res) => {
  const sub = (req.body?.subreddit || '').trim().toLowerCase();
  if (!sub) return res.status(400).json({ error: 'Subreddit required' });
  if (sub.length > 100) return res.status(400).json({ error: 'Subreddit name too long' });
  db.prepare('INSERT OR IGNORE INTO user_subscriptions (user_id, subreddit) VALUES (?, ?)').run(
    req.user.id,
    sub
  );
  res.status(201).json({ subreddit: sub });
});

router.delete('/subscriptions/:subreddit', (req, res) => {
  db.prepare('DELETE FROM user_subscriptions WHERE user_id = ? AND subreddit = ?').run(
    req.user.id,
    req.params.subreddit.toLowerCase()
  );
  res.json({ ok: true });
});

// ---- Saved posts ----
router.get('/saved-posts', (req, res) => {
  const rows = db
    .prepare('SELECT * FROM saved_posts WHERE user_id = ? ORDER BY saved_at DESC')
    .all(req.user.id);
  res.json({ savedPosts: rows });
});

router.post('/saved-posts', (req, res) => {
  const p = req.body || {};
  if (!p.post_id || !p.subreddit || !p.title) {
    return res.status(400).json({ error: 'post_id, subreddit, title required' });
  }
  if (typeof p.title !== 'string' || p.title.length > 500) {
    return res.status(400).json({ error: 'Title too long' });
  }
  if (typeof p.subreddit !== 'string' || p.subreddit.length > 100) {
    return res.status(400).json({ error: 'Subreddit too long' });
  }
  if (typeof p.post_id !== 'string' || p.post_id.length > 50) {
    return res.status(400).json({ error: 'Invalid post id' });
  }
  db.prepare(
    `INSERT OR IGNORE INTO saved_posts (user_id, post_id, subreddit, title)
     VALUES (?, ?, ?, ?)`
  ).run(req.user.id, p.post_id, p.subreddit, p.title);
  res.status(201).json({ ok: true });
});

router.delete('/saved-posts/:postId', (req, res) => {
  db.prepare('DELETE FROM saved_posts WHERE user_id = ? AND post_id = ?').run(
    req.user.id,
    req.params.postId
  );
  res.json({ ok: true });
});

// ---- Block rules ----
router.get('/blocks', (req, res) => {
  const rows = db
    .prepare('SELECT type, value FROM blocked_rules WHERE user_id = ? ORDER BY type, value')
    .all(req.user.id);
  res.json({ blocks: rows });
});

router.post('/blocks', (req, res) => {
  const { type, value } = req.body || {};
  if (!['keyword', 'user', 'subreddit'].includes(type)) {
    return res.status(400).json({ error: 'Invalid block type' });
  }
  const clean = (value || '').trim().toLowerCase();
  if (!clean) return res.status(400).json({ error: 'Value required' });
  if (clean.length > 100) return res.status(400).json({ error: 'Block value too long' });
  db.prepare('INSERT OR IGNORE INTO blocked_rules (user_id, type, value) VALUES (?, ?, ?)').run(
    req.user.id,
    type,
    clean
  );
  res.status(201).json({ type, value: clean });
});

router.delete('/blocks/:type/:value', (req, res) => {
  const { type, value } = req.params;
  if (!['keyword', 'user', 'subreddit'].includes(type)) {
    return res.status(400).json({ error: 'Invalid block type' });
  }
  db.prepare('DELETE FROM blocked_rules WHERE user_id = ? AND type = ? AND value = ?').run(
    req.user.id,
    type,
    value.toLowerCase()
  );
  res.json({ ok: true });
});

export default router;
