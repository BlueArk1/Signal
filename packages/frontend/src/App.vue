<script setup>
import { ref, onMounted, watch, computed } from 'vue';
import { useRoute } from 'vue-router';
import Navbar from './components/Navbar.vue';
import Sidebar from './components/Sidebar.vue';
import ToastContainer from './components/ToastContainer.vue';
import { useAuthStore } from './stores/useAuthStore.js';
import { useSettingsStore } from './stores/useSettingsStore.js';
import { usePostStore } from './stores/usePostStore.js';

const route = useRoute();
const auth = useAuthStore();
const settings = useSettingsStore();
const postStore = usePostStore();
const drawerOpen = ref(false);

// Public routes (e.g. login) render standalone without the app chrome
const isPublic = computed(() => !!route.meta.public);

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
      settings.clear();
      postStore.clear();
    }
  }
);
</script>

<template>
  <div class="min-h-screen flex flex-col">
    <a href="#main" class="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:bg-white focus:px-3 focus:py-2 focus:rounded focus:shadow">
      Skip to content
    </a>
    <template v-if="!isPublic">
      <Navbar @toggle-drawer="drawerOpen = !drawerOpen" />
      <div class="flex flex-1 max-w-[1600px] w-full mx-auto">
        <Sidebar :open="drawerOpen" @close="drawerOpen = false" />
        <main id="main" class="flex-1 min-w-0 px-2 sm:px-4 py-4">
          <router-view />
        </main>
      </div>
    </template>
    <main v-else id="main" class="flex-1 flex flex-col">
      <router-view />
    </main>
    <ToastContainer />
  </div>
</template>
