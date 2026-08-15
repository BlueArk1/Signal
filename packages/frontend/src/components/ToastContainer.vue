<script setup>
import { useToastStore } from '../stores/useToastStore.js';

const toast = useToastStore();

const typeStyles = {
  success: 'bg-green-600 text-white',
  error: 'bg-red-600 text-white',
  info: 'bg-[#0d6efd] text-white',
};
</script>

<template>
  <div class="fixed bottom-4 right-4 z-100 flex flex-col gap-2" aria-live="polite" role="status">
    <transition-group name="toast">
      <div
        v-for="t in toast.toasts"
        :key="t.id"
        class="px-4 py-3 rounded-lg shadow-lg text-sm font-medium flex items-center gap-3"
        :class="typeStyles[t.type] || typeStyles.info"
      >
        <span>{{ t.message }}</span>
        <button
          v-if="t.action"
          class="font-semibold underline opacity-90 hover:opacity-100"
          @click="t.action.run(); toast.remove(t.id)"
        >
          {{ t.action.label }}
        </button>
        <button
          class="opacity-70 hover:opacity-100 text-base leading-none"
          aria-label="Dismiss notification"
          @click="toast.remove(t.id)"
        >×</button>
      </div>
    </transition-group>
  </div>
</template>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}
.toast-enter-from {
  opacity: 0;
  transform: translateY(10px);
}
.toast-leave-to {
  opacity: 0;
  transform: translateY(10px);
}
</style>
