import db from '../db/schema.js';

/**
 * Load all block rules for a user directly from the DB.
 * @returns {{ keywords: string[], users: string[], subreddits: string[], flairs: string[] }}
 */
export function getBlockRules(userId) {
  const rows = db
    .prepare('SELECT type, value FROM blocked_rules WHERE user_id = ?')
    .all(userId);
  const rules = { keywords: [], users: [], subreddits: [], flairs: [] };
  const typeMap = { keyword: 'keywords', user: 'users', subreddit: 'subreddits', flair: 'flairs' };
  for (const row of rows) {
    const key = typeMap[row.type];
    if (key) rules[key].push(row.value.toLowerCase());
  }
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

  return posts.filter((post) => {
    const sub = (post.subreddit || '').toLowerCase();
    if (rules.subreddits.includes(sub)) return false;

    const author = (post.author || '').toLowerCase();
    if (rules.users.includes(author)) return false;

    const flair = (post.link_flair_text || '').toLowerCase();
    if (rules.flairs.includes(flair)) return false;

    const haystack = `${post.title || ''} ${post.selftext || ''}`.toLowerCase();
    if (rules.keywords.some((k) => haystack.includes(k))) return false;

    return true;
  });
}
