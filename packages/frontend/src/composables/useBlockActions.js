import { ref, unref, onMounted, onUnmounted } from 'vue';
import { useAuthStore } from '../stores/useAuthStore.js';
import { useSettingsStore } from '../stores/useSettingsStore.js';

/**
 * Reusable block-user / block-flair actions with a three-dot menu and
 * inline confirm prompts. Pass the post object (or a ref to one) to bind
 * author/subreddit/flair.
 */
export function useBlockActions(post) {
  const auth = useAuthStore();
  const settings = useSettingsStore();

  const confirmBlock = ref(false);
  const confirmFlair = ref(false);
  const menuOpen = ref(false);

  function toggleMenu() {
    menuOpen.value = !menuOpen.value;
  }

  function closeMenu() {
    menuOpen.value = false;
  }

  function openBlockUser() {
    closeMenu();
    confirmBlock.value = true;
  }

  function openBlockFlair() {
    closeMenu();
    confirmFlair.value = true;
  }

  // Close the menu when clicking anywhere outside it
  function onDocClick(e) {
    if (menuOpen.value && !e.target.closest('[data-block-menu]')) {
      closeMenu();
    }
  }
  onMounted(() => document.addEventListener('click', onDocClick));
  onUnmounted(() => document.removeEventListener('click', onDocClick));

  async function blockUser() {
    if (!auth.isAuthenticated) return;
    const p = unref(post);
    await settings.addBlock('user', p.author);
    confirmBlock.value = false;
  }

  async function blockFlair() {
    if (!auth.isAuthenticated) return;
    const p = unref(post);
    if (!p?.link_flair_text) return;
    await settings.addBlock('flair', p.link_flair_text, p.subreddit);
    confirmFlair.value = false;
  }

  return {
    auth,
    confirmBlock,
    confirmFlair,
    menuOpen,
    toggleMenu,
    closeMenu,
    openBlockUser,
    openBlockFlair,
    blockUser,
    blockFlair,
  };
}
