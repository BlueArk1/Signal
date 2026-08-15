import { Router } from 'express';
import {
  getSubredditPosts,
  getPostComments,
  searchSubreddits,
  redditLimiter,
} from '../services/redditService.js';
import { diskCacheStats } from '../services/diskCache.js';
import { filterPosts } from '../services/filterService.js';
import { authRequired } from '../middleware/auth.js';
import { isValidSubreddit, isValidPostId } from '../utils/validate.js';

const router = Router();

const SORTS = ['hot', 'new', 'top', 'controversial'];

// GET /api/reddit/cache/stats
router.get('/cache/stats', (req, res) => {
  res.json(diskCacheStats());
});

// GET /api/reddit/r/:subreddit?sort=hot&limit=25&after=t3_xxx
router.get('/r/:subreddit', authRequired, redditLimiter, async (req, res) => {
  const { subreddit } = req.params;
  if (!isValidSubreddit(subreddit)) {
    return res.status(400).json({ error: 'Invalid subreddit' });
  }
  const sort = SORTS.includes(req.query.sort) ? req.query.sort : 'hot';
  const limit = Math.min(parseInt(req.query.limit, 10) || 25, 100);
  const after = typeof req.query.after === 'string' ? req.query.after : null;

  try {
    const { posts, after: nextAfter } = await getSubredditPosts(subreddit, sort, limit, after);
    const filtered = filterPosts(posts, req.user.id);
    res.json({ subreddit, sort, posts: filtered, after: nextAfter });
  } catch (err) {
    const status = err.status || 502;
    res.status(status).json({ error: err.message || 'Failed to fetch subreddit' });
  }
});

// GET /api/reddit/search/subreddits?q=...
router.get('/search/subreddits', redditLimiter, async (req, res) => {
  const q = (req.query.q || '').trim();
  if (!q) return res.json({ subreddits: [] });
  try {
    const subreddits = await searchSubreddits(q);
    res.json({ subreddits });
  } catch (err) {
    res.status(err.status || 502).json({ error: err.message || 'Search failed' });
  }
});

// GET /api/reddit/comments/:subreddit/:postId
router.get('/comments/:subreddit/:postId', redditLimiter, async (req, res) => {
  const { subreddit, postId } = req.params;
  if (!isValidSubreddit(subreddit) || !isValidPostId(postId)) {
    return res.status(400).json({ error: 'Invalid subreddit or post id' });
  }
  try {
    const { post, comments } = await getPostComments(subreddit, postId);
    res.json({ post, comments });
  } catch (err) {
    res.status(err.status || 502).json({ error: err.message || 'Failed to fetch comments' });
  }
});

// GET /api/reddit/image?url=... — proxy Reddit images to bypass hotlink protection
const ALLOWED_IMAGE_HOSTS = new Set([
  'i.redd.it',
  'preview.redd.it',
  'external-preview.redd.it',
  'i.reddit.com',
  'styles.redditmedia.com',
  'b.thumbs.redditmedia.com',
  'a.thumbs.redditmedia.com',
]);

router.get('/image', async (req, res) => {
  let url = req.query.url;
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'url query param required' });
  }
  // Decode HTML entities (e.g. &amp; -> &) that appear in Reddit thumbnail URLs
  url = url
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

  // Validate the parsed URL hostname explicitly (SSRF protection)
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return res.status(400).json({ error: 'Invalid image URL' });
  }
  if (parsed.protocol !== 'https:' || !ALLOWED_IMAGE_HOSTS.has(parsed.hostname)) {
    return res.status(400).json({ error: 'Invalid image host' });
  }

  try {
    const upstream = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36',
        Referer: 'https://www.reddit.com/',
      },
    });
    if (!upstream.ok) {
      return res.status(upstream.status).json({ error: `Upstream ${upstream.status}` });
    }
    const contentType = upstream.headers.get('content-type') || 'image/jpeg';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    // Stream the response body instead of buffering the whole file in memory
    const reader = upstream.body.getReader();
    res.on('close', () => reader.cancel().catch(() => {}));
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(value);
    }
    res.end();
  } catch (err) {
    if (!res.headersSent) {
      res.status(502).json({ error: 'Failed to fetch image' });
    } else {
      res.end();
    }
  }
});

export default router;
