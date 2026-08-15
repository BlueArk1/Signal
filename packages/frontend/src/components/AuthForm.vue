<script setup>
import { ref, onMounted } from 'vue';
import { api } from '../api/client.js';
import { useAuthStore } from '../stores/useAuthStore.js';

const props = defineProps({
  // 'login' | 'register' — initial mode
  mode: { type: String, default: 'login' },
  // Allow toggling between login/register (Navbar modal). LoginView keeps it fixed.
  allowToggle: { type: Boolean, default: false },
});

const emit = defineEmits(['success']);

const auth = useAuthStore();
const authMode = ref(props.mode);
const form = ref({ username: '', password: '' });
const error = ref('');
const registrationEnabled = ref(true);

async function checkRegistration() {
  try {
    const data = await api.get('/auth/config');
    registrationEnabled.value = data.registrationEnabled !== false;
  } catch {
    registrationEnabled.value = true;
  }
}

onMounted(checkRegistration);

async function submit() {
  error.value = '';
  const ok =
    authMode.value === 'login'
      ? await auth.login(form.value.username, form.value.password)
      : await auth.register(form.value.username, form.value.password);
  if (ok) {
    form.value = { username: '', password: '' };
    emit('success');
  } else {
    error.value = auth.error;
  }
}
</script>

<template>
  <form @submit.prevent="submit" class="space-y-3">
    <input
      v-model="form.username"
      type="text"
      placeholder="Username"
      autocomplete="username"
      class="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-gray-100"
    />
    <input
      v-model="form.password"
      type="password"
      placeholder="Password"
      autocomplete="current-password"
      class="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-gray-100"
    />
    <p v-if="error" class="text-sm text-red-600 dark:text-red-400">{{ error }}</p>
    <button
      type="submit"
      class="w-full bg-[#0d6efd] text-white rounded py-2 font-medium hover:bg-[#0b5ed7]"
      :disabled="auth.loading"
    >
      {{ authMode === 'login' ? (auth.loading ? 'Logging in...' : 'Log in') : 'Sign up' }}
    </button>
    <button
      v-if="allowToggle && registrationEnabled"
      type="button"
      class="w-full text-sm text-[#0d6efd] hover:underline"
      @click="authMode = authMode === 'login' ? 'register' : 'login'"
    >
      {{ authMode === 'login' ? 'Need an account? Sign up' : 'Have an account? Log in' }}
    </button>
  </form>
</template>
