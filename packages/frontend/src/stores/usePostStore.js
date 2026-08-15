import { defineStore } from 'pinia';
import { ref } from 'vue';
import { api } from '../api/client.js';
import { useAuthStore } from './useAuthStore.js';

export const usePostStore = defineStore('post', () => {
  const saved = ref([]);
  const loading = ref(false);
  const auth = useAuthStore();

  async function loadSaved() {
    if (!auth.isAuthenticated) return;
    loading.value = true;
    try {
      const data = await api.get('/user/saved-posts');
      saved.value = data.savedPosts;
    } catch {
      // ignore
    } finally {
      loading.value = false;
    }
  }

  function isSaved(postId) {
    return saved.value.some((p) => p.post_id === postId);
  }

  async function savePost(post) {
    if (!auth.isAuthenticated) return false;
    if (isSaved(post.id)) return true;
    const entry = {
      post_id: post.id,
      subreddit: post.subreddit,
      title: post.title,
    };
    await api.post('/user/saved-posts', entry);
    // Push locally instead of refetching all saved posts
    saved.value.unshift(entry);
    return true;
  }

  async function unsavePost(postId) {
    if (!auth.isAuthenticated) return;
    await api.del(`/user/saved-posts/${postId}`);
    saved.value = saved.value.filter((p) => p.post_id !== postId);
  }

  function clear() {
    saved.value = [];
  }

  return { saved, loading, loadSaved, isSaved, savePost, unsavePost, clear };
});
