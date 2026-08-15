<script setup>
import { ref, onMounted } from 'vue';
import { useSettingsStore } from '../stores/useSettingsStore.js';
import { useAuthStore } from '../stores/useAuthStore.js';
import { useToastStore } from '../stores/useToastStore.js';

const settings = useSettingsStore();
const auth = useAuthStore();
const toast = useToastStore();

const newSub = ref('');
const newKeyword = ref('');
const newUser = ref('');
const newBlockedSub = ref('');
const pwForm = ref({ currentPassword: '', newPassword: '' });
const pwError = ref('');
const pwSuccess = ref('');

onMounted(() => settings.load());

async function addSubscription() {
  if (!newSub.value.trim()) return;
  await settings.subscribe(newSub.value);
  newSub.value = '';
}

async function addBlock(type, valueRef) {
  if (!valueRef.value.trim()) return;
  await settings.addBlock(type, valueRef.value);
  valueRef.value = '';
}

async function submitPassword() {
  pwError.value = '';
  pwSuccess.value = '';
  const ok = await auth.changePassword(pwForm.value.currentPassword, pwForm.value.newPassword);
  if (ok) {
    pwSuccess.value = 'Password updated';
    toast.push('Password updated');
    pwForm.value = { currentPassword: '', newPassword: '' };
  } else {
    pwError.value = auth.error;
    toast.push(auth.error, 'error');
  }
}
</script>

<template>
  <div class="max-w-3xl mx-auto space-y-4">
    <h1 class="text-2xl font-bold">Settings</h1>

    <p v-if="!auth.isAuthenticated" class="bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 border border-yellow-300 dark:border-yellow-700 rounded p-3 text-sm">
      Log in to manage subscriptions and blocked content.
    </p>

    <!-- Change password -->
    <section v-if="auth.isAuthenticated" class="bg-white dark:bg-[#1e1e1e] rounded border border-gray-300 dark:border-[#3a3a3a] p-4">
      <h2 class="font-semibold mb-3">Change password</h2>
      <form @submit.prevent="submitPassword" class="space-y-3 max-w-sm">
        <input
          v-model="pwForm.currentPassword"
          type="password"
          placeholder="Current password"
          class="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-gray-100"
        />
        <input
          v-model="pwForm.newPassword"
          type="password"
          placeholder="New password"
          class="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-gray-100"
        />
        <p v-if="pwError" class="text-sm text-red-600 dark:text-red-400">{{ pwError }}</p>
        <p v-if="pwSuccess" class="text-sm text-green-600 dark:text-green-400">{{ pwSuccess }}</p>
        <button
          type="submit"
          class="bg-[#0d6efd] text-white rounded px-4 py-2 text-sm font-medium hover:bg-[#0b5ed7]"
          :disabled="auth.loading"
        >
          Update password
        </button>
      </form>
    </section>

    <!-- Subscriptions -->
    <section class="bg-white dark:bg-[#1e1e1e] rounded border border-gray-300 dark:border-[#3a3a3a] p-4">
      <h2 class="font-semibold mb-3">Subscriptions</h2>
      <div class="flex gap-2 mb-3">
        <input
          v-model="newSub"
          type="text"
          placeholder="r/ subreddit name"
          class="flex-1 border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-gray-100"
          @keyup.enter="addSubscription"
        />
        <button class="bg-[#0d6efd] text-white rounded px-4 py-2 text-sm hover:bg-[#0b5ed7]" @click="addSubscription">
          Add
        </button>
      </div>
      <div v-if="!settings.subscriptions.length" class="text-sm text-gray-400 dark:text-gray-500">No subscriptions.</div>
      <ul class="space-y-1">
        <li
          v-for="sub in settings.subscriptions"
          :key="sub"
          class="flex items-center justify-between text-sm"
        >
          <span class="text-[#0d6efd]">r/{{ sub }}</span>
          <button class="text-red-500 hover:underline" @click="settings.unsubscribe(sub)">Remove</button>
        </li>
      </ul>
    </section>

    <!-- Blocked keywords -->
    <section class="bg-white dark:bg-[#1e1e1e] rounded border border-gray-300 dark:border-[#3a3a3a] p-4">
      <h2 class="font-semibold mb-3">Blocked keywords</h2>
      <div class="flex gap-2 mb-3">
        <input
          v-model="newKeyword"
          type="text"
          placeholder="e.g. crypto"
          class="flex-1 border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-gray-100"
          @keyup.enter="addBlock('keyword', newKeyword)"
        />
        <button class="bg-[#0d6efd] text-white rounded px-4 py-2 text-sm hover:bg-[#0b5ed7]" @click="addBlock('keyword', newKeyword)">
          Add
        </button>
      </div>
      <div v-if="!settings.blocks.keywords.length" class="text-sm text-gray-400 dark:text-gray-500">No blocked keywords.</div>
      <div class="flex flex-wrap gap-2">
        <span
          v-for="k in settings.blocks.keywords"
          :key="k"
          class="inline-flex items-center gap-1 bg-gray-100 dark:bg-gray-700 rounded-full px-3 py-1 text-sm"
        >
          {{ k }}
          <button class="text-red-500" @click="settings.removeBlock('keyword', k)">×</button>
        </span>
      </div>
    </section>

    <!-- Blocked users -->
    <section class="bg-white dark:bg-[#1e1e1e] rounded border border-gray-300 dark:border-[#3a3a3a] p-4">
      <h2 class="font-semibold mb-3">Blocked users</h2>
      <div class="flex gap-2 mb-3">
        <input
          v-model="newUser"
          type="text"
          placeholder="username"
          class="flex-1 border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-gray-100"
          @keyup.enter="addBlock('user', newUser)"
        />
        <button class="bg-[#0d6efd] text-white rounded px-4 py-2 text-sm hover:bg-[#0b5ed7]" @click="addBlock('user', newUser)">
          Add
        </button>
      </div>
      <div v-if="!settings.blocks.users.length" class="text-sm text-gray-400 dark:text-gray-500">No blocked users.</div>
      <div class="flex flex-wrap gap-2">
        <span
          v-for="u in settings.blocks.users"
          :key="u"
          class="inline-flex items-center gap-1 bg-gray-100 dark:bg-gray-700 rounded-full px-3 py-1 text-sm"
        >
          u/{{ u }}
          <button class="text-red-500" @click="settings.removeBlock('user', u)">×</button>
        </span>
      </div>
    </section>

    <!-- Blocked subreddits -->
    <section class="bg-white dark:bg-[#1e1e1e] rounded border border-gray-300 dark:border-[#3a3a3a] p-4">
      <h2 class="font-semibold mb-3">Blocked subreddits</h2>
      <div class="flex gap-2 mb-3">
        <input
          v-model="newBlockedSub"
          type="text"
          placeholder="r/ subreddit name"
          class="flex-1 border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-gray-100"
          @keyup.enter="addBlock('subreddit', newBlockedSub)"
        />
        <button class="bg-[#0d6efd] text-white rounded px-4 py-2 text-sm hover:bg-[#0b5ed7]" @click="addBlock('subreddit', newBlockedSub)">
          Add
        </button>
      </div>
      <div v-if="!settings.blocks.subreddits.length" class="text-sm text-gray-400 dark:text-gray-500">No blocked subreddits.</div>
      <div class="flex flex-wrap gap-2">
        <span
          v-for="s in settings.blocks.subreddits"
          :key="s"
          class="inline-flex items-center gap-1 bg-gray-100 dark:bg-gray-700 rounded-full px-3 py-1 text-sm"
        >
          r/{{ s }}
          <button class="text-red-500" @click="settings.removeBlock('subreddit', s)">×</button>
        </span>
      </div>
    </section>
  </div>
</template>
