import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router/index.js';
import { useAuthStore } from './stores/useAuthStore.js';
import './style.css';

const app = createApp(App);
app.use(createPinia());
app.use(router);

// Kick off session restore. The router guard awaits restorePromise before
// making auth decisions, so the app can mount immediately.
const auth = useAuthStore();
auth.restore();

app.mount('#app');
