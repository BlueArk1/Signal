<script setup>
import { ref, computed } from 'vue';
import { timeAgo } from '../composables/useTimeAgo.js';

const props = defineProps({
  comment: { type: Object, required: true },
  depth: { type: Number, default: 0 },
});

const MAX_DEPTH = 8;

const collapsed = ref(false);
const repliesHidden = ref(false);

const hasReplies = computed(() => {
  const replies = props.comment.replies;
  return Array.isArray(replies) && replies.length > 0;
});

const replies = computed(() => {
  const r = props.comment.replies;
  return Array.isArray(r) ? r : [];
});

const atDepthLimit = computed(() => props.depth >= MAX_DEPTH);
</script>

<template>
  <div class="py-3" :class="collapsed ? 'pb-4' : ''">
    <!-- Header row (click to collapse/expand) -->
    <div
      class="flex items-center gap-2 text-xs text-gray-500 cursor-pointer select-none"
      @click="collapsed = !collapsed"
    >
      <span class="text-gray-400 dark:text-gray-500 w-3 shrink-0">{{ collapsed ? '▸' : '▾' }}</span>
      <span class="font-semibold text-gray-700 dark:text-gray-300">u/{{ comment.author }}</span>
      <span class="text-gray-300 dark:text-gray-600">·</span>
      <span>{{ timeAgo(comment.created_utc) }}</span>
      <span v-if="comment.score !== undefined" class="ml-1">{{ comment.score?.toLocaleString() }} points</span>
    </div>

    <!-- Body -->
    <p
      v-if="!collapsed"
      class="text-[15px] text-gray-800 dark:text-gray-200 mt-1.5 leading-relaxed whitespace-pre-wrap"
    >
      {{ comment.body }}
    </p>

    <!-- Replies toggle -->
    <div v-if="!collapsed && hasReplies" class="mt-2">
      <button
        v-if="repliesHidden"
        class="text-xs text-[#0d6efd] hover:underline"
        @click="repliesHidden = false"
      >
        View {{ replies.length }} {{ replies.length === 1 ? 'reply' : 'replies' }}
      </button>
      <div v-else-if="atDepthLimit" class="mt-1 text-xs text-gray-500">
        <a
          :href="`https://www.reddit.com${comment.permalink || ''}`"
          target="_blank"
          rel="noopener"
          class="text-[#0d6efd] hover:underline"
        >
          Continue thread on Reddit ({{ replies.length }} more replies)
        </a>
      </div>
      <div v-else class="mt-1 ml-1 border-l-2 border-gray-200 dark:border-gray-700 pl-4">
        <CommentNode
          v-for="reply in replies"
          :key="reply.id"
          :comment="reply"
          :depth="depth + 1"
        />
      </div>
    </div>
  </div>
</template>
