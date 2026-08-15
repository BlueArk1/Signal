<script setup>
import { useFeedStore } from '../stores/useFeedStore.js';

const feed = useFeedStore();
const sorts = ['hot', 'new', 'top', 'controversial'];
</script>

<template>
  <div class="flex items-center gap-1 bg-white dark:bg-[#1e1e1e] rounded border border-gray-300 dark:border-[#3a3a3a] p-1 mb-4 overflow-x-auto">
    <button
      v-for="s in sorts"
      :key="s"
      class="px-3 py-1.5 rounded text-sm font-medium capitalize whitespace-nowrap"
      :class="feed.sort === s ? 'bg-[#0d6efd] text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'"
      @click="feed.setSort(s)"
    >
      {{ s }}
    </button>

    <div class="ml-auto flex items-center gap-1 border-l border-gray-200 dark:border-gray-700 pl-2">
      <button
        class="px-2 py-1.5 rounded text-sm font-medium"
        :class="feed.thumbPosition === 'left' ? 'bg-[#0d6efd] text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'"
        title="Thumbnail on left"
        @click="feed.setThumbPosition('left')"
      >
        ◀
      </button>
      <button
        class="px-2 py-1.5 rounded text-sm font-medium"
        :class="feed.thumbPosition === 'right' ? 'bg-[#0d6efd] text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'"
        title="Thumbnail on right"
        @click="feed.setThumbPosition('right')"
      >
        ▶
      </button>
    </div>
  </div>
</template>
