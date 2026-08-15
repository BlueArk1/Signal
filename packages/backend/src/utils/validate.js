// Validation helpers for Reddit path params to prevent URL injection.
// Subreddit names: 2-21 chars, alphanumeric + underscore.
// Post IDs: Reddit base36 IDs (e.g. t3_abc123 or abc123).

const SUBREDDIT_RE = /^[A-Za-z0-9_]{2,21}$/;
const POST_ID_RE = /^[A-Za-z0-9_]{1,20}$/;

export function isValidSubreddit(value) {
  return typeof value === 'string' && SUBREDDIT_RE.test(value);
}

export function isValidPostId(value) {
  return typeof value === 'string' && POST_ID_RE.test(value);
}
