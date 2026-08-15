import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../stores/useAuthStore.js';
import HomeView from '../views/HomeView.vue';
import LoginView from '../views/LoginView.vue';
import SubredditView from '../views/SubredditView.vue';
import ThreadView from '../views/ThreadView.vue';
import SettingsView from '../views/SettingsView.vue';
import SavedPostsView from '../views/SavedPostsView.vue';

const routes = [
  { path: '/login', name: 'login', component: LoginView, meta: { public: true, title: 'Log in' } },
  { path: '/', name: 'home', component: HomeView, meta: { title: 'Home' } },
  { path: '/r/:subreddit', name: 'subreddit', component: SubredditView, props: true, meta: { title: 'r/:subreddit' } },
  { path: '/r/:subreddit/comments/:postId', name: 'thread', component: ThreadView, props: true, meta: { title: 'Thread' } },
  { path: '/settings', name: 'settings', component: SettingsView, meta: { title: 'Settings' } },
  { path: '/saved', name: 'saved', component: SavedPostsView, meta: { title: 'Saved' } },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

// Require authentication for all routes except public ones (login)
router.beforeEach((to) => {
  const auth = useAuthStore();
  if (!to.meta.public && !auth.isAuthenticated) {
    return { name: 'login' };
  }
  if (to.name === 'login' && auth.isAuthenticated) {
    return { name: 'home' };
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
