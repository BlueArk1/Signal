import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { api, setToken, getToken } from '../api/client.js';

export const useAuthStore = defineStore('auth', () => {
  const token = ref(getToken());
  const user = ref(null);
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
