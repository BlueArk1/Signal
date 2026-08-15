<script setup>
import { ref, computed, onMounted } from 'vue';
import { usePostStore } from '../stores/usePostStore.js';
import { useAuthStore } from '../stores/useAuthStore.js';
import { useToastStore } from '../stores/useToastStore.js';

const postStore = usePostStore();
const auth = useAuthStore();
const toast = useToastStore();
const search = ref('');

onMounted(() => postStore.loadSaved());

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase();
  if (!q) return postStore.saved;
  return postStore.saved.filter(
    (p) => p.title.toLowerCase().includes(q) || p.subreddit.toLowerCase().includes(q)
  );
});

async function unsave(postId) {
  await postStore.unsavePost(postId);
  toast.push('Post unsaved');
}
</script>

<template>
  <div class="max-w-3xl mx-auto">
    <h1 class="text-2xl font-bold mb-4">Saved posts</h1>

    <p v-if="!auth.isAuthenticated" class="bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 border border-yellow-300 dark:border-yellow-700 rounded p-3 text-sm mb-4">
      Log in to view your saved posts.
    </p>

    <input
      v-model="search"
      type="text"
      placeholder="Search saved posts..."
      class="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm mb-4 bg-white dark:bg-gray-800 dark:text-gray-100"
    />

    <div v-if="!postStore.saved.length" class="bg-white dark:bg-[#1e1e1e] rounded-lg shadow-sm p-8 text-center text-gray-500 dark:text-gray-400">
      No saved posts yet. Save posts from your feed to see them here.
    </div>

    <div v-else class="space-y-3">
      <article
        v-for="p in filtered"
        :key="p.post_id"
        class="bg-white dark:bg-[#1e1e1e] rounded-lg shadow-sm p-4"
      >
        <div class="text-xs text-gray-500 mb-1">
          <router-link :to="`/r/${p.subreddit}`" class="font-semibold text-gray-700 dark:text-gray-300 hover:underline">
            r/{{ p.subreddit }}
          </router-link>
        </div>
        <router-link
          :to="`/r/${p.subreddit}/comments/${p.post_id}`"
          class="font-medium hover:underline block"
        >
          {{ p.title }}
        </router-link>
        <div class="mt-2 flex items-center gap-3 text-xs text-gray-500">
          <button class="text-red-500 hover:underline" @click="unsave(p.post_id)">
            Unsave
          </button>
        </div>
      </article>
    </div>
  </div>
</template>
