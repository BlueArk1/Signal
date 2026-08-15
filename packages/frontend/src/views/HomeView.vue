<script setup>
import { onMounted, watch } from 'vue';
import FilterBar from '../components/FilterBar.vue';
import PostCard from '../components/PostCard.vue';
import { useFeedStore } from '../stores/useFeedStore.js';
import { useSettingsStore } from '../stores/useSettingsStore.js';

const feed = useFeedStore();
const settings = useSettingsStore();

async function load() {
  await feed.fetchHome(settings.subscriptions);
}

onMounted(load);
watch(
  () => feed.sort,
  () => {
    feed.resetShuffle();
    load();
  }
);
// Watch the subscriptions array deeply so reordering/swap also refires
watch(
  () => settings.subscriptions,
  () => {
    feed.resetShuffle();
    load();
  },
  { deep: true }
);
</script>

<template>
  <div>
    <FilterBar />
    <p v-if="feed.fromCache" class="text-xs text-gray-400 mb-2">Served from cache</p>
    <p v-if="feed.error" class="bg-red-100 text-red-700 border border-red-300 rounded p-3 mb-3 text-sm">
      {{ feed.error }}
    </p>

    <div v-if="feed.loading" class="space-y-3">
      <div v-for="i in 5" :key="i" class="bg-white dark:bg-[#1e1e1e] rounded border border-gray-300 dark:border-[#3a3a3a] p-4 animate-pulse">
        <div class="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-2"></div>
        <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
        <div class="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
      </div>
    </div>

    <div v-else-if="!feed.posts.length" class="bg-white dark:bg-[#1e1e1e] rounded border border-gray-300 dark:border-[#3a3a3a] p-8 text-center text-gray-500 dark:text-gray-400">
      Your feed is empty. Follow some subreddits to see their posts here.
    </div>

    <div v-else class="space-y-3">
      <PostCard v-for="post in feed.posts" :key="post.id" :post="post" :thumb-position="feed.thumbPosition" />
    </div>
  </div>
</template>
