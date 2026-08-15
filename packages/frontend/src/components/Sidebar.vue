<script setup>
import { useSettingsStore } from '../stores/useSettingsStore.js';

defineProps({ open: Boolean });
defineEmits(['close']);

const settings = useSettingsStore();
</script>

<template>
  <!-- Mobile drawer overlay -->
  <div
    v-if="open"
    class="fixed inset-0 bg-black/40 z-30 lg:hidden"
    @click="$emit('close')"
  ></div>

  <aside
    :class="[
      'bg-white dark:bg-[#1e1e1e] border-r border-gray-300 dark:border-[#3a3a3a] w-64 shrink-0 overflow-y-auto',
      'fixed lg:sticky top-12 bottom-0 z-30 transition-transform lg:translate-x-0',
      open ? 'translate-x-0' : '-translate-x-full',
    ]"
  >
    <div class="p-3 space-y-1">
      <router-link
        to="/"
        class="flex items-center px-3 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 font-medium"
        @click="$emit('close')"
      >
        Home
      </router-link>
      <router-link
        to="/saved"
        class="flex items-center px-3 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 font-medium"
        @click="$emit('close')"
      >
        Saved
      </router-link>
      <router-link
        to="/settings"
        class="flex items-center px-3 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 font-medium"
        @click="$emit('close')"
      >
        Settings
      </router-link>

      <div class="pt-3 mt-3 border-t border-gray-200 dark:border-gray-700">
        <p class="px-3 pb-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          Your communities
        </p>
        <p v-if="!settings.subscriptions.length" class="px-3 text-sm text-gray-400 dark:text-gray-500">
          No subscriptions yet
        </p>
        <router-link
          v-for="sub in settings.subscriptions"
          :key="sub"
          :to="`/r/${sub}`"
          class="flex items-center px-3 py-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-sm"
          @click="$emit('close')"
        >
          <span class="text-[#0d6efd]">r/</span>{{ sub }}
        </router-link>
      </div>
    </div>
  </aside>
</template>
