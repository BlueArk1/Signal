import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../stores/useAuthStore.js';

// Lazy-load views for code-splitting (ThreadView pulls the heaviest tree)
const routes = [
  { path: '/login', name: 'login', component: () => import('../views/LoginView.vue'), meta: { public: true, title: 'Log in' } },
  { path: '/', name: 'home', component: () => import('../views/HomeView.vue'), meta: { title: 'Home' } },
  { path: '/r/:subreddit', name: 'subreddit', component: () => import('../views/SubredditView.vue'), props: true, meta: { title: 'r/:subreddit' } },
  { path: '/r/:subreddit/comments/:postId', name: 'thread', component: () => import('../views/ThreadView.vue'), props: true, meta: { title: 'Thread' } },
  { path: '/settings', name: 'settings', component: () => import('../views/SettingsView.vue'), meta: { title: 'Settings' } },
  { path: '/saved', name: 'saved', component: () => import('../views/SavedPostsView.vue'), meta: { title: 'Saved' } },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

// Require authentication for all routes except public ones (login).
// The guard awaits restorePromise so the initial navigation doesn't redirect
// to /login while the cookie session check is still in flight.
router.beforeEach(async (to) => {
  const auth = useAuthStore();
  if (!auth.restored) {
    await auth.restorePromise;
  }
  if (!to.meta.public && !auth.isAuthenticated) {
    return { name: 'login' };
  }
  if (to.name === 'login' && auth.isAuthenticated) {
    return { name: 'home' };
  }
  if (auth.isAuthenticated && auth.mustChangePassword && to.name !== 'settings') {
    return { name: 'settings' };
  }
});

// Set per-route document title
router.afterEach((to) => {
  let title = to.meta.title || 'Signal';
  if (to.params.subreddit) {
    title = title.replace(':subreddit', to.params.subreddit);
  }
  document.title = `${title} · Signal`;
});

export default router;
