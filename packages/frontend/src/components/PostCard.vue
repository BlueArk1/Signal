<script setup>
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { usePostStore } from '../stores/usePostStore.js';
import { useAuthStore } from '../stores/useAuthStore.js';
import { useToastStore } from '../stores/useToastStore.js';
import { proxyImage } from '../api/client.js';
import { timeAgo } from '../composables/useTimeAgo.js';
import { useBlockActions } from '../composables/useBlockActions.js';

const props = defineProps({
  post: { type: Object, required: true },
  hideImages: { type: Boolean, default: false },
  hideAuthor: { type: Boolean, default: false },
});

const router = useRouter();
const postStore = usePostStore();
const auth = useAuthStore();
const toast = useToastStore();

const {
  confirmBlock,
  confirmFlair,
  menuOpen,
  toggleMenu,
  openBlockUser,
  openBlockFlair,
  blockUser,
  blockFlair,
} = useBlockActions(props.post);

const saved = computed(() => postStore.isSaved(props.post.id));
const isImage = computed(() => {
  const url = props.post.url || '';
  return /\.(png|jpe?g|gif|webp)(\?.*)?$/i.test(url);
});
const hasThumb = computed(() => {
  const t = props.post.thumbnail;
  return t && !['self', 'default', 'nsfw', 'spoiler', 'image'].includes(t);
});
// Pick the highest-resolution image available:
// 1. preview source (full-res) 2. direct image URL 3. thumbnail (fallback)
const imageSrc = computed(() => {
  const preview = props.post.preview?.images?.[0]?.source?.url;
  if (preview) return preview;
  if (isImage.value) return props.post.url;
  if (hasThumb.value) return props.post.thumbnail;
  return '';
});
// Show domain in brackets for link posts (self posts have no external domain)
const domain = computed(() => {
  const d = props.post.domain;
  if (!d || d === 'self.' + props.post.subreddit || d === 'self') return '';
  return d;
});

function openThread() {
  router.push(`/r/${props.post.subreddit}/comments/${props.post.id}`);
}

async function toggleSave() {
  if (!auth.isAuthenticated) return;
  if (saved.value) {
    await postStore.unsavePost(props.post.id);
    toast.push('Post unsaved');
  } else {
    await postStore.savePost(props.post);
    toast.push('Post saved');
  }
}
</script>

<template>
  <article
    class="bg-white dark:bg-[#1e1e1e] rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer sm:flex"
    @click="openThread"
  >
    <!-- Image: full-width on mobile, left column on desktop -->
    <a
      v-if="!hideImages && imageSrc"
      :href="post.url"
      target="_blank"
      rel="noopener"
      class="block sm:shrink-0 sm:w-48 sm:self-stretch"
      @click.stop
    >
      <img
        :src="proxyImage(imageSrc)"
        :alt="post.title"
        class="w-full max-h-64 sm:max-h-none sm:h-full sm:object-cover rounded"
        loading="lazy"
      />
    </a>

    <!-- Content -->
    <div class="p-3 flex-1 min-w-0">
      <!-- Row 1: subreddit + time -->
      <div class="flex items-center gap-1 text-xs text-gray-500 flex-wrap">
        <span
          v-if="post.stickied"
          class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 font-semibold"
        >
          📌 Pinned
        </span>
        <router-link
          :to="`/r/${post.subreddit}`"
          class="font-semibold text-gray-700 dark:text-gray-300 hover:underline"
          @click.stop
        >
          r/{{ post.subreddit }}
        </router-link>
        <span>·</span>
        <span>{{ timeAgo(post.created_utc) }}</span>
        <span
          v-if="post.link_flair_text"
          class="ml-auto px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-xs"
        >
          {{ post.link_flair_text }}
        </span>
      </div>

      <!-- Row 2: username of poster -->
      <div v-if="!hideAuthor" class="mt-1 text-xs text-gray-500">
        u/{{ post.author }}
      </div>

      <!-- Row 3: title -->
      <button class="block text-left mt-2 text-base font-medium hover:underline wrap-break-word" @click.stop="openThread">
        {{ post.title }}
        <span v-if="domain" class="text-xs font-normal text-gray-400 dark:text-gray-500"> ({{ domain }})</span>
      </button>

      <p v-if="post.selftext" class="mt-1 text-[15px] text-gray-700 dark:text-gray-300 line-clamp-2 wrap-break-word">{{ post.selftext }}</p>

      <!-- Row 4: karma, comments, save, block -->
      <div class="mt-2 flex items-center gap-3 text-xs text-gray-500 flex-wrap">
        <span v-if="post.score !== undefined" class="flex items-center gap-1">
          ▲ {{ post.score?.toLocaleString() }}
        </span>
        <button class="flex items-center gap-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded px-2 py-1" @click.stop="openThread">
           {{ post.num_comments?.toLocaleString() }} Comments
        </button>
        <button
          class="flex items-center gap-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded px-2 py-1"
          :class="saved ? 'text-[#0d6efd]' : ''"
          @click.stop="toggleSave"
        >
          {{ saved ? 'Saved' : 'Save' }}
        </button>
        <div
          v-if="auth.isAuthenticated && !confirmBlock"
          class="relative"
          @click.stop
        >
          <button
            class="flex items-center gap-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded px-2 py-1"
            @click.stop="toggleMenu"
            aria-label="More options"
          >
            ⋯
          </button>
          <div
            v-if="menuOpen"
            class="absolute left-0 top-full z-50 mt-1 w-44 rounded-md bg-white dark:bg-[#2a2a2a] shadow-lg ring-1 ring-black/5 py-1 text-white"
          >
            <button
              class="block w-full text-left px-3 py-1.5 text-xs text-white hover:bg-gray-100 dark:hover:bg-gray-700"
              @click.stop="openBlockUser"
            >
              Block user
            </button>
            <button
              v-if="post.link_flair_text"
              class="block w-full text-left px-3 py-1.5 text-xs text-white hover:bg-gray-100 dark:hover:bg-gray-700"
              @click.stop="openBlockFlair"
            >
              Block flair
            </button>
          </div>
        </div>
        <span
          v-if="auth.isAuthenticated && confirmBlock"
          class="flex items-center gap-1 text-xs"
        >
          <span class="text-gray-500 dark:text-gray-400">Block u/{{ post.author }}?</span>
          <button
            class="px-2 py-1 rounded bg-red-600 text-white hover:bg-red-700"
            @click.stop="blockUser"
          >
            Confirm
          </button>
          <button
            class="px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
            @click.stop="confirmBlock = false"
          >
            Cancel
          </button>
        </span>
        <span
          v-if="auth.isAuthenticated && confirmFlair"
          class="flex items-center gap-1 text-xs"
        >
          <span class="text-gray-500 dark:text-gray-400">Block flair "{{ post.link_flair_text }}" on r/{{ post.subreddit }}?</span>
          <button
            class="px-2 py-1 rounded bg-red-600 text-white hover:bg-red-700"
            @click.stop="blockFlair"
          >
            Confirm
          </button>
          <button
            class="px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
            @click.stop="confirmFlair = false"
          >
            Cancel
          </button>
        </span>
      </div>
    </div>
  </article>
</template>
