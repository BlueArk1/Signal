<script setup>
import { useRouter } from 'vue-router';
import AuthForm from '../components/AuthForm.vue';

const router = useRouter();

function onSuccess() {
  router.push('/');
}
</script>

<template>
  <div class="flex-1 flex items-center justify-center p-4">
    <div class="w-full max-w-sm">
      <div class="flex items-center justify-center gap-2 mb-6">
        <span class="text-3xl"></span>
        <span class="text-2xl font-bold text-[#0d6efd]">Signal</span>
      </div>
      <div class="bg-white dark:bg-[#1e1e1e] rounded-lg shadow-xl p-6">
        <h1 class="text-xl font-bold mb-4">Log in</h1>
        <AuthForm mode="login" @success="onSuccess" />
      </div>
    </div>
  </div>
</template>
