<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { api } from '../api/client.js';
import { useAuthStore } from '../stores/useAuthStore.js';
import AuthForm from './AuthForm.vue';

defineEmits(['toggle-drawer']);

const router = useRouter();
const auth = useAuthStore();

const query = ref('');
const results = ref([]);
const showResults = ref(false);
const showSearch = ref(false);
const showAuth = ref(false);
const authMode = ref('login');
const registrationEnabled = ref(true);

let debounceTimer = null;

async function checkRegistration() {
  try {
    const data = await api.get('/auth/config');
    registrationEnabled.value = data.registrationEnabled !== false;
  } catch {
    registrationEnabled.value = true;
  }
}

onMounted(checkRegistration);

async function onSearch() {
  clearTimeout(debounceTimer);
  if (!query.value.trim()) {
    results.value = [];
    return;
  }
  debounceTimer = setTimeout(async () => {
    try {
      const data = await api.get(`/reddit/search/subreddits?q=${encodeURIComponent(query.value)}`);
      results.value = data.subreddits;
      showResults.value = true;
    } catch {
      results.value = [];
    }
  }, 300);
}

function goToSub(name) {
  showResults.value = false;
  query.value = '';
  showSearch.value = false;
  router.push(`/r/${name}`);
}

function openAuth(mode) {
  authMode.value = mode;
  showAuth.value = true;
}

function onAuthSuccess() {
  showAuth.value = false;
}

function logout() {
  auth.logout();
  router.push('/');
}
</script>

<template>
  <header class="bg-white dark:bg-[#1e1e1e] border-b border-gray-300 dark:border-[#3a3a3a] sticky top-0 z-40">
    <div class="max-w-[1600px] mx-auto flex items-center gap-2 sm:gap-4 px-2 sm:px-4 h-12">
      <button
        class="lg:hidden p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
        aria-label="Toggle menu"
        @click="$emit('toggle-drawer')"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      <router-link to="/" class="flex items-center gap-1 text-[#0d6efd] shrink-0">
        <span class="text-xl"></span>
        <span class="font-bold">Signal</span>
      </router-link>

      <!-- Desktop search -->
      <div class="relative flex-1 max-w-xl hidden sm:block">
        <input
          v-model="query"
          type="text"
          placeholder="Search subreddits"
          class="w-full bg-gray-100 dark:bg-gray-800 dark:text-gray-100 rounded-full px-4 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0d6efd]"
          @input="onSearch"
          @focus="showResults = true"
          @blur="setTimeout(() => (showResults = false), 150)"
        />
        <ul
          v-if="showResults && results.length"
          class="absolute top-full mt-1 w-full bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-[#3a3a3a] rounded-lg shadow-lg max-h-80 overflow-auto z-50"
        >
          <li v-for="r in results" :key="r.name">
            <button
              class="w-full text-left px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
              @mousedown.prevent="goToSub(r.display_name)"
            >
              <span class="text-[#0d6efd]">r/</span>
              <span class="font-medium">{{ r.display_name }}</span>
              <span class="ml-auto text-xs text-gray-400">{{ r.subscribers?.toLocaleString() }} subs</span>
            </button>
          </li>
        </ul>
      </div>

      <div class="ml-auto flex items-center gap-2">
        <!-- Mobile search button -->
        <button
          class="sm:hidden p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
          aria-label="Search"
          @click="showSearch = true"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-4.35-4.35M17 10a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </button>

        <template v-if="auth.isAuthenticated">
          <span class="text-sm text-gray-600 dark:text-gray-300 max-w-32 truncate">u/{{ auth.user?.username }}</span>
          <button
            class="text-sm px-3 py-1.5 rounded-full border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800"
            @click="logout"
          >
            Log out
          </button>
        </template>
        <template v-else>
          <button
            class="text-sm px-3 py-1.5 rounded-full border border-[#0d6efd] text-[#0d6efd] hover:bg-[#0d6efd]/10"
            @click="openAuth('login')"
          >
            Log In
          </button>
          <button
            v-if="registrationEnabled"
            class="hidden sm:inline text-sm px-3 py-1.5 rounded-full bg-[#0d6efd] text-white hover:bg-[#0b5ed7]"
            @click="openAuth('register')"
          >
            Sign Up
          </button>
        </template>
      </div>
    </div>
  </header>

  <!-- Mobile search modal -->
  <div
    v-if="showSearch"
    class="fixed inset-0 bg-black/50 z-50 p-4"
    @click.self="showSearch = false"
  >
    <div class="bg-white dark:bg-[#1e1e1e] rounded-lg w-full max-w-md mx-auto mt-16 p-4">
      <div class="flex items-center gap-2 mb-3">
        <input
          v-model="query"
          type="text"
          placeholder="Search subreddits"
          autofocus
          class="flex-1 bg-gray-100 dark:bg-gray-800 dark:text-gray-100 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0d6efd]"
          @input="onSearch"
        />
        <button class="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300" @click="showSearch = false">Close</button>
      </div>
      <ul v-if="results.length" class="max-h-80 overflow-auto">
        <li v-for="r in results" :key="r.name">
          <button
            class="w-full text-left px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 rounded"
            @click="goToSub(r.display_name)"
          >
            <span class="text-[#0d6efd]">r/</span>
            <span class="font-medium">{{ r.display_name }}</span>
            <span class="ml-auto text-xs text-gray-400">{{ r.subscribers?.toLocaleString() }} subs</span>
          </button>
        </li>
      </ul>
    </div>
  </div>

  <!-- Auth modal -->
  <div
    v-if="showAuth"
    class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
    @click.self="showAuth = false"
  >
    <div class="bg-white dark:bg-[#1e1e1e] rounded-lg w-full max-w-sm p-6">
      <h2 class="text-xl font-bold mb-4">
        {{ authMode === 'login' ? 'Log in' : 'Create account' }}
      </h2>
      <AuthForm :mode="authMode" allow-toggle @success="onAuthSuccess" />
    </div>
  </div>
</template>
