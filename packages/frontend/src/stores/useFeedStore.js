import { defineStore } from 'pinia';
import { ref } from 'vue';
import { api } from '../api/client.js';

export const useFeedStore = defineStore('feed', () => {
  const posts = ref([]);
  const sort = ref('hot');
  const loading = ref(false);
  const error = ref('');
  const fromCache = ref(false);
  // Only shuffle once per page load (resets on F5); keeps order during navigation
  let shuffled = false;
  // Track what the home feed was built from, to avoid refetching on back-nav
  let lastHomeSort = null;
  let lastHomeSubs = null;

  async function fetchSubreddit(subreddit, opts = {}) {
    loading.value = true;
    error.value = '';
    try {
      const data = await api.get(
        `/reddit/r/${subreddit}?sort=${opts.sort || sort.value}&limit=${opts.limit || 25}`
      );
      posts.value = data.posts;
      fromCache.value = data.fromCache;
      if (opts.sort) sort.value = opts.sort;
      return data;
    } catch (e) {
      error.value = e.message;
      posts.value = [];
      return null;
    } finally {
      loading.value = false;
    }
  }

  async function fetchHome(subreddits) {
    const list = subreddits && subreddits.length ? subreddits : [];
    // If nothing changed since last build (same sort + same subs), keep current
    // posts/order — e.g. when navigating back from a thread.
    if (
      lastHomeSort === sort.value &&
      lastHomeSubs &&
      lastHomeSubs.length === list.length &&
      lastHomeSubs.every((s, i) => s === list[i])
    ) {
      return posts.value;
    }

    loading.value = true;
    error.value = '';
    try {
      // Only show followed subreddits — no popular fallback
      if (!list.length) {
        posts.value = [];
        fromCache.value = false;
        lastHomeSort = sort.value;
        lastHomeSubs = [];
        return [];
      }
      const results = await Promise.all(
        list.map((sub) =>
          api.get(`/reddit/r/${sub}?sort=${sort.value}&limit=10`).catch(() => null)
        )
      );
      const merged = results
        .filter(Boolean)
        .flatMap((r) => r.posts)
        // Exclude pinned (stickied) threads from the home feed
        .filter((p) => !p.stickied);
      // Jumble the feed once per page load — no vote-count sorting.
      // On subsequent loads (sort/subscription changes) keep the existing order.
      if (!shuffled) {
        for (let i = merged.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [merged[i], merged[j]] = [merged[j], merged[i]];
        }
        shuffled = true;
      }
      posts.value = merged;
      fromCache.value = results.some((r) => r?.fromCache);
      lastHomeSort = sort.value;
      lastHomeSubs = [...list];
      return merged;
    } catch (e) {
      error.value = e.message;
      posts.value = [];
      return [];
    } finally {
      loading.value = false;
    }
  }

  function setSort(s) {
    sort.value = s;
  }

  // Reset the shuffle flag so the next home build reshuffles (e.g. on sub change)
  function resetShuffle() {
    shuffled = false;
    lastHomeSort = null;
    lastHomeSubs = null;
  }

  return {
    posts,
    sort,
    loading,
    error,
    fromCache,
    fetchSubreddit,
    fetchHome,
    setSort,
    resetShuffle,
  };
});
