<script setup>
import { ref, onMounted, computed } from 'vue';
import { api, proxyImage } from '../api/client.js';
import CommentNode from '../components/CommentNode.vue';
import { usePostStore } from '../stores/usePostStore.js';
import { useAuthStore } from '../stores/useAuthStore.js';

const props = defineProps({ subreddit: { type: String, required: true }, postId: { type: String, required: true } });

const post = ref(null);
const comments = ref([]);
const loading = ref(true);
const error = ref('');

const postStore = usePostStore();
const auth = useAuthStore();

const saved = computed(() => (post.value ? postStore.isSaved(post.value.id) : false));

async function load() {
  loading.value = true;
  error.value = '';
  try {
    const data = await api.get(`/reddit/comments/${props.subreddit}/${props.postId}`);
    post.value = data.post;
    comments.value = data.comments;
  } catch (e) {
    error.value = e.message;
  } finally {
    loading.value = false;
  }
}

onMounted(load);

async function toggleSave() {
  if (!auth.isAuthenticated || !post.value) return;
  if (saved.value) await postStore.unsavePost(post.value.id);
  else await postStore.savePost(post.value);
}
</script>

<template>
  <div>
    <p v-if="error" class="bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-700 rounded p-3 mb-3 text-sm">{{ error }}</p>

    <div v-if="loading" class="bg-white dark:bg-[#1e1e1e] rounded border border-gray-300 dark:border-[#3a3a3a] p-4 animate-pulse">
      <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3 mb-2"></div>
      <div class="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
    </div>

    <template v-else-if="post">
      <article class="bg-white dark:bg-[#1e1e1e] rounded border border-gray-300 dark:border-[#3a3a3a] p-4 mb-4">
        <div class="flex items-center gap-1 text-xs text-gray-500">
          <span
            v-if="post.stickied"
            class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 font-semibold"
          >
            📌 Pinned
          </span>
          <router-link :to="`/r/${post.subreddit}`" class="font-semibold text-gray-700 dark:text-gray-300 hover:underline">
            r/{{ post.subreddit }}
          </router-link>
          <span>· Posted by u/{{ post.author }}</span>
        </div>
        <h1 class="text-2xl font-bold mt-2">{{ post.title }}</h1>
        <p v-if="post.selftext" class="mt-2 text-[15px] text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{{ post.selftext }}</p>
        <a
          v-if="post.url && (post.post_hint === 'image' || /\.(png|jpe?g|gif|webp)(\?.*)?$/i.test(post.url) || /preview\.redd\.it|i\.redd\.it|external-preview\.redd\.it/.test(post.url))"
          :href="post.url"
          target="_blank"
          rel="noopener"
          class="mt-3 block"
        >
          <img :src="proxyImage(post.url)" :alt="post.title" class="max-h-96 w-full object-contain rounded" />
        </a>
        <div class="mt-3 flex items-center gap-3 text-xs text-gray-500">
          <span>{{ post.score?.toLocaleString() }} points</span>
          <span>{{ post.num_comments?.toLocaleString() }} Comments</span>
          <button
            class="px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
            :class="saved ? 'text-[#0d6efd]' : ''"
            @click="toggleSave"
          >
            {{ saved ? '🔖 Saved' : '🔖 Save' }}
          </button>
        </div>
      </article>

      <div class="bg-white dark:bg-[#1e1e1e] rounded border border-gray-300 dark:border-[#3a3a3a] p-4">
        <h2 class="font-semibold mb-3">Comments</h2>
        <div v-if="loading" class="space-y-3">
          <div v-for="i in 3" :key="i" class="animate-pulse">
            <div class="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-2"></div>
            <div class="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
          </div>
        </div>
        <p v-else-if="!comments.length" class="text-sm text-gray-500 dark:text-gray-400">No comments yet.</p>
        <CommentNode v-for="c in comments" :key="c.id" :comment="c" :depth="0" />
      </div>
    </template>
  </div>
</template>
