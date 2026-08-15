<script setup>
import { ref, onMounted } from 'vue';
import { api } from '../api/client.js';
import CommentNode from '../components/CommentNode.vue';
import PostCard from '../components/PostCard.vue';

const props = defineProps({ subreddit: { type: String, required: true }, postId: { type: String, required: true } });

const post = ref(null);
const comments = ref([]);
const loading = ref(true);
const error = ref('');

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
</script>

<template>
  <div>
    <p v-if="error" class="bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-700 rounded p-3 mb-3 text-sm">{{ error }}</p>

    <div v-if="loading" class="space-y-3">
      <div v-for="i in 3" :key="i" class="bg-white dark:bg-[#1e1e1e] rounded-lg shadow-sm p-4 animate-pulse">
        <div class="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-2"></div>
        <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
        <div class="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
      </div>
    </div>

    <template v-else-if="post">
      <div class="space-y-3">
        <PostCard :post="post" />

        <div class="bg-white dark:bg-[#1e1e1e] rounded-lg shadow-sm p-4">
          <h2 class="font-semibold mb-3">Comments</h2>
          <p v-if="!comments.length" class="text-sm text-gray-500 dark:text-gray-400">No comments yet.</p>
          <CommentNode v-for="c in comments" :key="c.id" :comment="c" :depth="0" />
        </div>
      </div>
    </template>
  </div>
</template>
