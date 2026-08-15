import rateLimit from 'express-rate-limit';
import crypto from 'node:crypto';

// Redlib-style OAuth spoofing: impersonate the official Android app's
// anonymous installed_client flow. No username/password needed.
const ANDROID_CLIENT_ID = 'ohXpoqrZYub1kg';
const AUTH_ENDPOINT = 'https://www.reddit.com';
const BASE = 'https://oauth.reddit.com';

const USER_AGENT =
  process.env.REDDIT_USER_AGENT ||
  'android:com.reddit.frontpage:1.0.0 (by /u/redlib)';

// OAuth token state
let accessToken = null;
let tokenExpiresAt = 0;
let deviceId = null;

function getDeviceId() {
  if (!deviceId) {
    // 30-char lowercase alphanumeric device id, like the Android app
    deviceId = crypto.randomBytes(15).toString('hex').slice(0, 30);
  }
  return deviceId;
}

async function getAccessToken() {
  if (accessToken && Date.now() < tokenExpiresAt) return accessToken;

  const basic = Buffer.from(`${ANDROID_CLIENT_ID}:`).toString('base64');
  const body = new URLSearchParams({
    grant_type: 'https://oauth.reddit.com/grants/installed_client',
    device_id: getDeviceId(),
  });

  const res = await fetch(`${AUTH_ENDPOINT}/api/v1/access_token`, {
    method: 'POST',
    headers: {
      'User-Agent': USER_AGENT,
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });

  if (!res.ok) {
    const err = new Error(`Reddit OAuth failed (${res.status})`);
    err.status = res.status;
    throw err;
  }

  const data = await res.json();
  accessToken = data.access_token;
  // Refresh 60s before expiry (tokens last ~1h; Redlib refreshes every 24h)
  tokenExpiresAt = Date.now() + (data.expires_in - 60) * 1000;
  return accessToken;
}

async function fetchJson(url) {
  const token = await getAccessToken();
  const res = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) {
    const err = new Error(`Reddit responded ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

/**
 * Fetch a subreddit listing with caching.
 * @param {string} subreddit
 * @param {'hot'|'new'|'top'|'controversial'} sort
 * @param {number} limit
 * @returns {{ fromCache: boolean, posts: Array }}
 */
export async function getSubredditPosts(subreddit, sort = 'hot', limit = 25, after = null) {
  const params = new URLSearchParams({ limit });
  if (after) params.set('after', after);
  const data = await fetchJson(
    `${BASE}/r/${encodeURIComponent(subreddit)}/${sort}.json?${params}`
  );
  const posts = (data?.data?.children || [])
    .filter((c) => c.kind === 't3')
    .map((c) => c.data);
  return { posts, after: data?.data?.after || null };
}

/**
 * Recursively normalize a Reddit comment into a flat structure where
 * `replies` is a plain array of comment objects.
 */
function normalizeComment(comment) {
  const data = comment?.data || comment;
  let replies = [];
  const rawReplies = data.replies;
  if (rawReplies && typeof rawReplies === 'object') {
    const children = rawReplies.data?.children || [];
    replies = children
      .filter((c) => c.kind === 't1')
      .map((c) => normalizeComment(c));
  } else if (Array.isArray(rawReplies)) {
    replies = rawReplies
      .filter((c) => c.kind === 't1')
      .map((c) => normalizeComment(c));
  }
  return { ...data, replies };
}

/**
 * Fetch a single post's comments (not cached per spec).
 */
export async function getPostComments(subreddit, postId) {
  const data = await fetchJson(
    `${BASE}/r/${encodeURIComponent(subreddit)}/comments/${encodeURIComponent(postId)}.json`
  );
  const [postListing, commentListing] = data || [];
  const post = postListing?.data?.children?.[0]?.data || null;
  const comments = (commentListing?.data?.children || [])
    .filter((c) => c.kind === 't1')
    .map((c) => normalizeComment(c));
  return { post, comments };
}

/**
 * Search subreddits by name.
 */
export async function searchSubreddits(query, limit = 10) {
  const data = await fetchJson(
    `${BASE}/subreddits/search.json?q=${encodeURIComponent(query)}&limit=${limit}`
  );
  return (data?.data?.children || [])
    .filter((c) => c.kind === 't5')
    .map((c) => c.data);
}

// Rate limiter for Reddit-facing endpoints (protect backend + Reddit API)
export const redditLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please slow down' },
});
