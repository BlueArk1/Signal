import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { api } from '../api/client.js';

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null);
  const loading = ref(false);
  const error = ref('');

  const isAuthenticated = computed(() => !!user.value);
  const mustChangePassword = computed(() => !!user.value?.mustChangePassword);

  // Restore the session from the httpOnly cookie on app load
  async function restore() {
    try {
      const data = await api.get('/auth/me');
      user.value = data.user;
    } catch {
      user.value = null;
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
      await api.post('/auth/change-password', { currentPassword, newPassword });
      // Clear the forced-change flag locally after a successful change
      if (user.value) user.value.mustChangePassword = false;
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
    isAuthenticated,
    mustChangePassword,
    restore,
    login,
    register,
    logout,
    changePassword,
  };
});
