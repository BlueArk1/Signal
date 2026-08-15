import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { api } from '../api/client.js';

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null);
  const loading = ref(false);
  const error = ref('');
  const restored = ref(false);

  const isAuthenticated = computed(() => !!user.value);
  const mustChangePassword = computed(() => !!user.value?.mustChangePassword);

  // Restore promise — the router guard awaits this before checking auth so
  // it doesn't redirect to /login while the cookie check is still in flight.
  let _restoreResolve;
  const restorePromise = new Promise((r) => { _restoreResolve = r; });

  // Restore the session from the httpOnly cookie on app load.
  // If the cookie is stale (401), clear it so it doesn't keep failing.
  async function restore() {
    try {
      const data = await api.get('/auth/me');
      user.value = data.user;
    } catch (e) {
      user.value = null;
      if (e.status === 401) {
        try { await api.post('/auth/logout'); } catch { /* ignore */ }
      }
    } finally {
      restored.value = true;
      _restoreResolve();
    }
  }

  async function login(username, password) {
    loading.value = true;
    error.value = '';
    try {
      const data = await api.post('/auth/login', { username, password });
      user.value = data.user;
      return true;
    } catch (e) {
      error.value = e.message;
      return false;
    } finally {
      loading.value = false;
    }
  }

  async function register(username, password) {
    loading.value = true;
    error.value = '';
    try {
      const data = await api.post('/auth/register', { username, password });
      user.value = data.user;
      return true;
    } catch (e) {
      error.value = e.message;
      return false;
    } finally {
      loading.value = false;
    }
  }

  async function logout() {
    try {
      await api.post('/auth/logout');
    } catch {
      // ignore — clear locally regardless
    }
    user.value = null;
  }

  async function changePassword(currentPassword, newPassword) {
    loading.value = true;
    error.value = '';
    try {
      const data = await api.post('/auth/change-password', { currentPassword, newPassword });
      // Backend issues a fresh cookie + returns updated user payload
      if (data.user) user.value = data.user;
      return true;
    } catch (e) {
      error.value = e.message;
      return false;
    } finally {
      loading.value = false;
    }
  }

  return {
    user,
    loading,
    error,
    restored,
    restorePromise,
    isAuthenticated,
    mustChangePassword,
    restore,
    login,
    register,
    logout,
    changePassword,
  };
});
