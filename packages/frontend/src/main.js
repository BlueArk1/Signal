import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router/index.js';
import { useAuthStore } from './stores/useAuthStore.js';
import './style.css';

const app = createApp(App);
app.use(createPinia());
app.use(router);

// Restore the session from the httpOnly cookie before mounting so the
// router guard sees the correct auth state on first navigation.
async function init() {
  const auth = useAuthStore();
  await auth.restore();
  await router.isReady();
  app.mount('#app');
}

init();
