import { defineStore } from 'pinia';
import { ref } from 'vue';
import { api } from '../api/client.js';

export const useFeedStore = defineStore('feed', () => {
  const posts = ref([]);
  const sort = ref('hot');
  const loading = ref(false);
  const loadingMore = ref(false);
  const error = ref('');
  const hasMore = ref(false);

  // Server-side pagination cursors (Reddit 'after' tokens)
  let cursors = {}; // subreddit -> after token
  let currentSub = null; // single-subreddit mode
  let currentSubs = null; // home feed mode (list of subs)
  let lastHomeSort = null;
  let lastHomeSubs = null;
  let shuffled = false;

  const PAGE_SIZE = 25;

  function resetState() {
    posts.value = [];
    cursors = {};
    currentSub = null;
    currentSubs = null;
    hasMore.value = false;
  }

  async function fetchSubreddit(subreddit, opts = {}) {
    const s = opts.sort || sort.value;
    loading.value = true;
    error.value = '';
    try {
      const data = await api.get(
        `/reddit/r/${subreddit}?sort=${s}&limit=${opts.limit || PAGE_SIZE}`
      );
      posts.value = data.posts;
      cursors = { [subreddit]: data.after };
      currentSub = subreddit;
      currentSubs = null;
      hasMore.value = !!data.after;
      if (opts.sort) sort.value = opts.sort;
      return data;
    } catch (e) {
      error.value = e.message;
      posts.value = [];
      hasMore.value = false;
      return null;
    } finally {
      loading.value = false;
    }
  }

  async function fetchHome(subreddits) {
    const list = subreddits && subreddits.length ? subreddits : [];
    // Keep current posts/order on back-nav if nothing changed
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
      if (!list.length) {
        resetState();
        lastHomeSort = sort.value;
        lastHomeSubs = [];
        return [];
      }
      const results = await Promise.all(
        list.map((sub) =>
          api.get(`/reddit/r/${sub}?sort=${sort.value}&limit=${PAGE_SIZE}`).catch(() => null)
        )
      );
      const merged = results
        .filter(Boolean)
        .flatMap((r) => r.posts)
        .filter((p) => !p.stickied);
      // Track cursor per sub for "load more"
      cursors = {};
      results.filter(Boolean).forEach((r, i) => {
        cursors[list[i]] = r.after;
      });
      currentSubs = [...list];
      currentSub = null;
      hasMore.value = results.some((r) => r?.after);

      if (!shuffled) {
        for (let i = merged.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [merged[i], merged[j]] = [merged[j], merged[i]];
        }
        shuffled = true;
      }
      posts.value = merged;
      lastHomeSort = sort.value;
      lastHomeSubs = [...list];
      return merged;
    } catch (e) {
      error.value = e.message;
      posts.value = [];
      hasMore.value = false;
      return [];
    } finally {
      loading.value = false;
    }
  }

  // Load the next page. Single-sub mode: one request. Home mode: fetch the
  // next page from each sub and merge.
  async function loadMore() {
    if (loading.value || loadingMore.value || !hasMore.value) return;
    loadingMore.value = true;
    try {
      if (currentSub) {
        const data = await api.get(
          `/reddit/r/${currentSub}?sort=${sort.value}&limit=${PAGE_SIZE}&after=${encodeURIComponent(cursors[currentSub] || '')}`
        );
        posts.value = [...posts.value, ...data.posts];
        cursors[currentSub] = data.after;
        hasMore.value = !!data.after;
      } else if (currentSubs && currentSubs.length) {
        const results = await Promise.all(
          currentSubs.map((sub) =>
            api
              .get(
                `/reddit/r/${sub}?sort=${sort.value}&limit=${PAGE_SIZE}&after=${encodeURIComponent(cursors[sub] || '')}`
              )
              .catch(() => null)
          )
        );
        const merged = results
          .filter(Boolean)
          .flatMap((r) => r.posts)
          .filter((p) => !p.stickied);
        results.filter(Boolean).forEach((r, i) => {
          cursors[currentSubs[i]] = r.after;
        });
        hasMore.value = results.some((r) => r?.after);
        posts.value = [...posts.value, ...merged];
      }
    } catch (e) {
      error.value = e.message;
      // Stop retrying on failure — otherwise scroll keeps hammering the API
      hasMore.value = false;
    } finally {
      loadingMore.value = false;
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
    loadingMore,
    error,
    hasMore,
    fetchSubreddit,
    fetchHome,
    loadMore,
    setSort,
    resetShuffle,
  };
});
