import { Router } from 'express';
import db from '../db/schema.js';
import { authRequired } from '../middleware/auth.js';
import { getSubredditPosts } from '../services/redditService.js';
import { invalidateBlockRules } from '../services/filterService.js';
import { isValidSubreddit } from '../utils/validate.js';

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
  const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);
  const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);
  // Select explicit columns (never leak user_id) with pagination
  const rows = db
    .prepare(
      'SELECT post_id, subreddit, title, saved_at FROM saved_posts WHERE user_id = ? ORDER BY saved_at DESC LIMIT ? OFFSET ?'
    )
    .all(req.user.id, limit, offset);
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
    .prepare('SELECT type, subreddit, value FROM blocked_rules WHERE user_id = ? ORDER BY type, value')
    .all(req.user.id);
  res.json({ blocks: rows });
});

// Validate that a flair actually exists in the given subreddit by fetching
// its listing and checking the link_flair_text values.
async function flairExists(subreddit, flair) {
  const { posts } = await getSubredditPosts(subreddit, 'hot', 100);
  return posts.some(
    (p) => (p.link_flair_text || '').toLowerCase() === flair
  );
}

router.post('/blocks', async (req, res) => {
  const { type, value, subreddit } = req.body || {};
  if (!['keyword', 'user', 'subreddit', 'flair'].includes(type)) {
    return res.status(400).json({ error: 'Invalid block type' });
  }
  const clean = (value || '').trim().toLowerCase();
  if (!clean) return res.status(400).json({ error: 'Value required' });
  if (clean.length > 100) return res.status(400).json({ error: 'Block value too long' });

  let sub = null;
  if (type === 'flair') {
    sub = (subreddit || '').trim().toLowerCase();
    if (!isValidSubreddit(sub)) {
      return res.status(400).json({ error: 'Invalid subreddit' });
    }
    let valid;
    try {
      valid = await flairExists(sub, clean);
    } catch (err) {
      // Network/upstream failure — don't mask as "flair not found"
      return res.status(err.status || 502).json({ error: err.message || 'Failed to validate flair' });
    }
    if (!valid) return res.status(400).json({ error: `Flair "${clean}" not found in r/${sub}` });
  }

  db.prepare(
    'INSERT OR IGNORE INTO blocked_rules (user_id, type, subreddit, value) VALUES (?, ?, ?, ?)'
  ).run(req.user.id, type, sub, clean);
  invalidateBlockRules(req.user.id);
  res.status(201).json({ type, subreddit: sub, value: clean });
});

router.delete('/blocks/:type/:value', (req, res) => {
  const { type, value } = req.params;
  if (!['keyword', 'user', 'subreddit', 'flair'].includes(type)) {
    return res.status(400).json({ error: 'Invalid block type' });
  }
  const sub = type === 'flair' ? (req.query.subreddit || '').toLowerCase() : null;
  db.prepare(
    'DELETE FROM blocked_rules WHERE user_id = ? AND type = ? AND subreddit IS ? AND value = ?'
  ).run(req.user.id, type, sub, value.toLowerCase());
  invalidateBlockRules(req.user.id);
  res.json({ ok: true });
});

export default router;
