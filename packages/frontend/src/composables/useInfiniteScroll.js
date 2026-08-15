import { onMounted, onUnmounted } from 'vue';

/**
 * Infinite scroll: calls `onReach` when the user scrolls near the bottom
 * of the page. Pass a function that reveals more items (e.g. showMore()).
 * Throttled with requestAnimationFrame so it fires at most once per frame.
 */
export function useInfiniteScroll(onReach) {
  let ticking = false;

  function handleScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      const doc = document.documentElement;
      // Trigger when within 300px of the bottom
      if (doc.scrollTop + window.innerHeight >= doc.scrollHeight - 300) {
        onReach();
      }
    });
  }

  onMounted(() => window.addEventListener('scroll', handleScroll, { passive: true }));
  onUnmounted(() => window.removeEventListener('scroll', handleScroll));
}
