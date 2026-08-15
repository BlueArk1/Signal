<script setup>
import { ref, onMounted, watch, computed } from 'vue';
import FilterBar from '../components/FilterBar.vue';
import PostCard from '../components/PostCard.vue';
import { useFeedStore } from '../stores/useFeedStore.js';
import { useSettingsStore } from '../stores/useSettingsStore.js';
import { useAuthStore } from '../stores/useAuthStore.js';
import { useInfiniteScroll } from '../composables/useInfiniteScroll.js';

const props = defineProps({ subreddit: { type: String, required: true } });

const feed = useFeedStore();
const settings = useSettingsStore();
const auth = useAuthStore();

useInfiniteScroll(() => feed.loadMore());

const subscribed = computed(() => settings.subscriptions.includes(props.subreddit.toLowerCase()));

async function load() {
  await feed.fetchSubreddit(props.subreddit);
}

onMounted(load);
watch(() => props.subreddit, load);
watch(() => feed.sort, load);
// Reload when block rules change so newly blocked content disappears
watch(() => settings.blocks, load, { deep: true });

async function toggleSubscribe() {
  if (subscribed.value) await settings.unsubscribe(props.subreddit);
  else await settings.subscribe(props.subreddit);
}
</script>

<template>
  <div>
    <div class="bg-white dark:bg-[#1e1e1e] rounded-lg shadow-sm p-4 mb-4 flex items-center justify-between">
      <div>
        <h1 class="text-xl font-bold">r/{{ subreddit }}</h1>
        <p class="text-sm text-gray-500 dark:text-gray-400">Browse posts from this community</p>
      </div>
      <button
        v-if="auth.isAuthenticated"
        class="px-4 py-2 rounded-full text-sm font-medium"
        :class="subscribed ? 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200' : 'bg-[#0d6efd] text-white hover:bg-[#0b5ed7]'"
        @click="toggleSubscribe"
      >
        {{ subscribed ? 'Joined' : 'Join' }}
      </button>
    </div>

    <FilterBar />
    <p v-if="feed.error" class="bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-700 rounded p-3 mb-3 text-sm">
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
      No posts found.
    </div>

    <div v-else class="space-y-3">
      <PostCard v-for="post in feed.posts" :key="post.id" :post="post" />
      <div v-if="feed.loadingMore" class="text-center text-xs text-gray-400 py-2">Loading more…</div>
      <p v-else-if="!feed.hasMore" class="text-center text-xs text-gray-400 py-2">You're all caught up</p>
    </div>
  </div>
</template>
