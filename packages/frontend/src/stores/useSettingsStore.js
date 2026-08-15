import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { api } from '../api/client.js';
import { useAuthStore } from './useAuthStore.js';
import { useToastStore } from './useToastStore.js';

export const useSettingsStore = defineStore('settings', () => {
  const subscriptions = ref([]);
  const blocks = ref({ keywords: [], users: [], subreddits: [], flairs: [] });
  const loading = ref(false);

  const auth = useAuthStore();
  const toast = useToastStore();
  const isAuthenticated = computed(() => auth.isAuthenticated);

  // Map singular API type -> plural array key in blocks
  const typeMap = { keyword: 'keywords', user: 'users', subreddit: 'subreddits', flair: 'flairs' };

  async function load() {
    if (!auth.isAuthenticated) return;
    loading.value = true;
    try {
      const [subRes, blockRes] = await Promise.all([
        api.get('/user/subscriptions'),
        api.get('/user/blocks'),
      ]);
      subscriptions.value = subRes.subscriptions;
      const b = blockRes.blocks;
      blocks.value = {
        keywords: b.filter((x) => x.type === 'keyword').map((x) => x.value),
        users: b.filter((x) => x.type === 'user').map((x) => x.value),
        subreddits: b.filter((x) => x.type === 'subreddit').map((x) => x.value),
        flairs: b.filter((x) => x.type === 'flair').map((x) => x.value),
      };
    } catch {
      // ignore
    } finally {
      loading.value = false;
    }
  }

  async function subscribe(subreddit) {
    if (!auth.isAuthenticated) return false;
    const sub = subreddit.toLowerCase();
    if (subscriptions.value.includes(sub)) return true;
    await api.post('/user/subscriptions', { subreddit: sub });
    subscriptions.value.push(sub);
    toast.push(`Subscribed to r/${sub}`);
    return true;
  }

  async function unsubscribe(subreddit) {
    if (!auth.isAuthenticated) return;
    await api.del(`/user/subscriptions/${subreddit}`);
    subscriptions.value = subscriptions.value.filter((s) => s !== subreddit);
    toast.push(`Unsubscribed from r/${subreddit}`);
  }

  async function addBlock(type, value) {
    if (!auth.isAuthenticated) return false;
    const clean = value.trim().toLowerCase();
    if (!clean) return false;
    await api.post('/user/blocks', { type, value: clean });
    blocks.value[typeMap[type]].push(clean);
    toast.push(`Blocked ${clean}`);
    return true;
  }

  async function removeBlock(type, value) {
    if (!auth.isAuthenticated) return;
    await api.del(`/user/blocks/${type}/${value}`);
    blocks.value[typeMap[type]] = blocks.value[typeMap[type]].filter((v) => v !== value);
    toast.push(`Removed block: ${value}`);
  }

  return {
    subscriptions,
    blocks,
    loading,
    isAuthenticated,
    load,
    subscribe,
    unsubscribe,
    addBlock,
    removeBlock,
  };
});
