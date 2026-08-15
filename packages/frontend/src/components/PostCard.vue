<script setup>
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { usePostStore } from '../stores/usePostStore.js';
import { useAuthStore } from '../stores/useAuthStore.js';
import { useSettingsStore } from '../stores/useSettingsStore.js';
import { useToastStore } from '../stores/useToastStore.js';
import { proxyImage } from '../api/client.js';
import { timeAgo } from '../composables/useTimeAgo.js';

const props = defineProps({
  post: { type: Object, required: true },
  hideImages: { type: Boolean, default: false },
  hideAuthor: { type: Boolean, default: false },
  thumbPosition: { type: String, default: 'left' }, // 'left' | 'right'
});

const router = useRouter();
const postStore = usePostStore();
const auth = useAuthStore();
const settings = useSettingsStore();
const toast = useToastStore();

const confirmBlock = ref(false);

const saved = computed(() => postStore.isSaved(props.post.id));
const isImage = computed(() => {
  const url = props.post.url || '';
  return /\.(png|jpe?g|gif|webp)(\?.*)?$/i.test(url);
});
const hasThumb = computed(() => {
  const t = props.post.thumbnail;
  return t && !['self', 'default', 'nsfw', 'spoiler', 'image'].includes(t);
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

async function blockUser() {
  if (!auth.isAuthenticated) return;
  await settings.addBlock('user', props.post.author);
  confirmBlock.value = false;
  toast.push(`Blocked u/${props.post.author}`);
}
</script>

<template>
  <article
    class="bg-white dark:bg-[#1e1e1e] rounded border border-gray-300 dark:border-[#3a3a3a] hover:border-gray-400 dark:hover:border-gray-600 flex overflow-hidden cursor-pointer"
    @click="openThread"
  >
    <!-- Thumbnail (left or right based on thumbPosition) -->
    <a
      v-if="!hideImages && (isImage || hasThumb) && thumbPosition === 'left'"
      :href="post.url"
      target="_blank"
      rel="noopener"
      class="shrink-0 w-24 sm:w-32 self-center m-3"
      @click.stop
    >
      <img
        :src="proxyImage(isImage ? post.url : post.thumbnail)"
        :alt="post.title"
        class="w-full h-20 sm:h-24 object-cover rounded"
        loading="lazy"
      />
    </a>

    <!-- Content -->
    <div class="flex-1 min-w-0 p-3">
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
        <span v-if="!hideAuthor">Posted by u/{{ post.author }}</span>
        <span v-if="!hideAuthor">·</span>
        <span>{{ timeAgo(post.created_utc) }}</span>
        <span v-if="post.score !== undefined" class="ml-1">{{ post.score?.toLocaleString() }} points</span>
        <span v-if="post.link_flair_text" class="ml-1 px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-xs">
          {{ post.link_flair_text }}
        </span>
      </div>

      <button class="block text-left mt-1 text-base font-medium hover:underline" @click.stop="openThread">
        {{ post.title }}
        <span v-if="domain" class="text-xs font-normal text-gray-400 dark:text-gray-500"> ({{ domain }})</span>
      </button>

      <p v-if="post.selftext" class="mt-1 text-[15px] text-gray-700 dark:text-gray-300 line-clamp-2">{{ post.selftext }}</p>

      <div class="mt-2 flex items-center gap-3 text-xs text-gray-500">
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
        <button
          v-if="auth.isAuthenticated && !confirmBlock"
          class="flex items-center gap-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded px-2 py-1"
          @click.stop="confirmBlock = true"
        >
          Block user
        </button>
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
      </div>
    </div>

    <!-- Thumbnail on the right -->
    <a
      v-if="!hideImages && (isImage || hasThumb) && thumbPosition === 'right'"
      :href="post.url"
      target="_blank"
      rel="noopener"
      class="shrink-0 w-24 sm:w-32 self-center m-3"
      @click.stop
    >
      <img
        :src="proxyImage(isImage ? post.url : post.thumbnail)"
        :alt="post.title"
        class="w-full h-20 sm:h-24 object-cover rounded"
        loading="lazy"
      />
    </a>
  </article>
</template>
