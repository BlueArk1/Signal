import db from '../db/schema.js';

// Per-user block rules cached with a short TTL to avoid a DB query on every
// feed fetch. Invalidated explicitly on block add/delete.
const rulesCache = new Map(); // userId -> { rules, expiresAt }
const RULES_TTL_MS = 5000;

export function invalidateBlockRules(userId) {
  rulesCache.delete(userId);
}

/**
 * Load all block rules for a user directly from the DB.
 * @returns {{ keywords: string[], users: string[], subreddits: string[], flairs: Array<{subreddit: string|null, value: string}> }}
 */
export function getBlockRules(userId) {
  const cached = rulesCache.get(userId);
  if (cached && Date.now() < cached.expiresAt) return cached.rules;

  const rows = db
    .prepare('SELECT type, subreddit, value FROM blocked_rules WHERE user_id = ?')
    .all(userId);
  const rules = { keywords: [], users: [], subreddits: [], flairs: [] };
  const typeMap = { keyword: 'keywords', user: 'users', subreddit: 'subreddits', flair: 'flairs' };
  for (const row of rows) {
    const key = typeMap[row.type];
    if (!key) continue;
    if (row.type === 'flair') {
      rules.flairs.push({
        subreddit: row.subreddit ? row.subreddit.toLowerCase() : null,
        value: row.value.toLowerCase(),
      });
    } else {
      rules[key].push(row.value.toLowerCase());
    }
  }
  rulesCache.set(userId, { rules, expiresAt: Date.now() + RULES_TTL_MS });
  return rules;
}

/**
 * Filter a list of posts against a user's block rules.
 * @param {Array} posts
 * @param {number|null} userId
 * @returns {Array} filtered posts
 */
export function filterPosts(posts, userId) {
  if (!userId || !posts.length) return posts;
  const rules = getBlockRules(userId);
  if (
    !rules.keywords.length &&
    !rules.users.length &&
    !rules.subreddits.length &&
    !rules.flairs.length
  ) {
    return posts;
  }

  // Use Sets for O(1) membership tests
  const subredditSet = new Set(rules.subreddits);
  const userSet = new Set(rules.users);
  const keywords = rules.keywords;

  return posts.filter((post) => {
    const sub = (post.subreddit || '').toLowerCase();
    if (subredditSet.has(sub)) return false;

    const author = (post.author || '').toLowerCase();
    if (userSet.has(author)) return false;

    const flair = (post.link_flair_text || '').toLowerCase();
    if (flair && rules.flairs.some((f) => f.value === flair && (f.subreddit === null || f.subreddit === sub))) {
      return false;
    }

    const haystack = `${post.title || ''} ${post.selftext || ''}`.toLowerCase();
    if (keywords.some((k) => haystack.includes(k))) return false;

    return true;
  });
}
