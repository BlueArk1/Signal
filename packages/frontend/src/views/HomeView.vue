<script setup>
import { onMounted, watch } from 'vue';
import FilterBar from '../components/FilterBar.vue';
import PostCard from '../components/PostCard.vue';
import { useFeedStore } from '../stores/useFeedStore.js';
import { useSettingsStore } from '../stores/useSettingsStore.js';
import { useInfiniteScroll } from '../composables/useInfiniteScroll.js';

const feed = useFeedStore();
const settings = useSettingsStore();

useInfiniteScroll(() => feed.loadMore());

// Skip the first subscription-watch trigger: onMounted already loads, and
// settings.load() populating subscriptions on mount would cause a double fetch.
let initialLoadDone = false;

async function load() {
  if (settings.loading) {
    // Wait for settings to finish loading subscriptions if in flight
    await new Promise((resolve) => {
      const unwatch = watch(
        () => settings.loading,
        (isLoading) => {
          if (!isLoading) {
            unwatch();
            resolve();
          }
        },
        { immediate: !settings.loading }
      );
    });
  }
  await feed.fetchHome(settings.subscriptions);
  initialLoadDone = true;
}

onMounted(load);
watch(
  () => feed.sort,
  () => {
    feed.resetShuffle();
    load();
  }
);
// Watch the subscriptions array deeply so reordering/swap also refires.
watch(
  () => settings.subscriptions,
  () => {
    if (!initialLoadDone) return;
    feed.resetShuffle();
    load();
  },
  { deep: true }
);
// Reload when block rules change so newly blocked content disappears
watch(
  () => settings.blocks,
  () => load(),
  { deep: true }
);
</script>

<template>
  <div>
    <FilterBar />
    <p v-if="feed.error" class="bg-red-100 text-red-700 border border-red-300 rounded p-3 mb-3 text-sm">
      {{ feed.error }}
    </p>

    <div v-if="feed.loading" class="space-y-3">
      <div v-for="i in 5" :key="i" class="bg-white dark:bg-[#1e1e1e] rounded-lg shadow-sm p-4 animate-pulse">
        <div class="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-2"></div>
        <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
        <div class="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
      </div>
    </div>

    <div v-else-if="!feed.posts.length" class="bg-white dark:bg-[#1e1e1e] rounded-lg shadow-sm p-8 text-center text-gray-500 dark:text-gray-400">
      Your feed is empty. Follow some subreddits to see their posts here.
    </div>

    <div v-else class="space-y-3">
      <PostCard v-for="post in feed.posts" :key="post.id" :post="post" />
      <div v-if="feed.loadingMore" class="text-center text-xs text-gray-400 py-2">Loading more…</div>
      <p v-else-if="!feed.hasMore" class="text-center text-xs text-gray-400 py-2">You're all caught up</p>
    </div>
  </div>
</template>
