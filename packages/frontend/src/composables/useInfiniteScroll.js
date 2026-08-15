import { onMounted, onUnmounted } from 'vue';

/**
 * Infinite scroll: calls `onReach` when the user scrolls near the bottom
 * of the page. Pass a function that reveals more items (e.g. showMore()).
 */
export function useInfiniteScroll(onReach) {
  function handleScroll() {
    const doc = document.documentElement;
    // Trigger when within 300px of the bottom
    if (doc.scrollTop + window.innerHeight >= doc.scrollHeight - 300) {
      onReach();
    }
  }

  onMounted(() => window.addEventListener('scroll', handleScroll, { passive: true }));
  onUnmounted(() => window.removeEventListener('scroll', handleScroll));
}
