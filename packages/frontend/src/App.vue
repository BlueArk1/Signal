<script setup>
import { ref, onMounted, watch } from 'vue';
import Navbar from './components/Navbar.vue';
import Sidebar from './components/Sidebar.vue';
import ToastContainer from './components/ToastContainer.vue';
import { useAuthStore } from './stores/useAuthStore.js';
import { useSettingsStore } from './stores/useSettingsStore.js';
import { usePostStore } from './stores/usePostStore.js';

const auth = useAuthStore();
const settings = useSettingsStore();
const postStore = usePostStore();
const drawerOpen = ref(false);

onMounted(() => {
  settings.load();
  postStore.loadSaved();
});

// Reload user data when auth state changes (login/logout)
watch(
  () => auth.isAuthenticated,
  (authed) => {
    if (authed) {
      settings.load();
      postStore.loadSaved();
    } else {
      settings.subscriptions = [];
      settings.blocks = { keywords: [], users: [], subreddits: [] };
      postStore.saved = [];
    }
  }
);
</script>

<template>
  <div class="min-h-screen flex flex-col">
    <Navbar @toggle-drawer="drawerOpen = !drawerOpen" />
    <div class="flex flex-1 max-w-[1600px] w-full mx-auto">
      <Sidebar :open="drawerOpen" @close="drawerOpen = false" />
      <main class="flex-1 min-w-0 px-2 sm:px-4 py-4">
        <router-view />
      </main>
    </div>
    <ToastContainer />
  </div>
</template>
