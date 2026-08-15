import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { api, setToken, getToken } from '../api/client.js';

// Decode JWT payload (unverified — used only to restore display info on refresh)
function decodeToken(token) {
  try {
    const payload = token.split('.')[1];
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decodeURIComponent(escape(json)));
  } catch {
    return null;
  }
}

export const useAuthStore = defineStore('auth', () => {
  const token = ref(getToken());
  // Restore user info from the stored token so the username survives refresh
  const user = ref(token.value ? decodeToken(token.value) : null);
  const loading = ref(false);
  const error = ref('');

  const isAuthenticated = computed(() => !!token.value);

  async function login(username, password) {
    loading.value = true;
    error.value = '';
    try {
      const data = await api.post('/auth/login', { username, password });
      token.value = data.token;
      user.value = data.user;
      setToken(data.token);
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
      token.value = data.token;
      user.value = data.user;
      setToken(data.token);
      return true;
    } catch (e) {
      error.value = e.message;
      return false;
    } finally {
      loading.value = false;
    }
  }

  function logout() {
    token.value = null;
    user.value = null;
    setToken(null);
  }

  async function changePassword(currentPassword, newPassword) {
    loading.value = true;
    error.value = '';
    try {
      await api.post('/auth/change-password', { currentPassword, newPassword });
      return true;
    } catch (e) {
      error.value = e.message;
      return false;
    } finally {
      loading.value = false;
    }
  }

  return {
    token,
    user,
    loading,
    error,
    isAuthenticated,
    login,
    register,
    logout,
    changePassword,
  };
});
