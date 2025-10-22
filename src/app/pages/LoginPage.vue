<template>
  <div class="flex items-center justify-center min-h-screen bg-gray-50">
    <div class="bg-white p-10 rounded-2xl shadow-lg w-full max-w-sm">
      <h2 class="text-3xl font-semibold text-center mb-8 text-gray-900">Log In</h2>

      <form @submit.prevent="handleLogin" class="space-y-6">
        <div class="relative">
          <input
            id="loginEmail"
            v-model="loginEmail"
            type="email"
            required
            placeholder="Email"
            class="peer w-full border-b-2 border-gray-300 placeholder-transparent focus:border-green-600 outline-none py-2 text-gray-900"
          />
          <label
            for="loginEmail"
            class="absolute left-0 -top-3.5 text-gray-500 text-sm transition-all peer-placeholder-shown:top-2 peer-placeholder-shown:text-gray-400 peer-placeholder-shown:text-base peer-focus:-top-3.5 peer-focus:text-gray-500 peer-focus:text-sm"
          >
            Email
          </label>
        </div>

        <div class="relative">
          <input
            id="loginPassword"
            v-model="loginPassword"
            type="password"
            required
            placeholder="Password"
            class="peer w-full border-b-2 border-gray-300 placeholder-transparent focus:border-green-600 outline-none py-2 text-gray-900"
          />
          <label
            for="loginPassword"
            class="absolute left-0 -top-3.5 text-gray-500 text-sm transition-all peer-placeholder-shown:top-2 peer-placeholder-shown:text-gray-400 peer-placeholder-shown:text-base peer-focus:-top-3.5 peer-focus:text-gray-500 peer-focus:text-sm"
          >
            Password
          </label>
        </div>

        <button
          type="submit"
          :disabled="loading"
          class="w-full py-3 bg-green-600 text-white font-medium rounded-xl shadow-md hover:bg-green-700 disabled:bg-green-300 transition-colors"
        >
          {{ loading ? 'Logging in...' : 'Log In' }}
        </button>

        <div v-if="error" class="text-red-500 text-sm text-center mt-2">
          {{ error }}
        </div>
      </form>

      <p class="text-center text-sm text-gray-500 mt-6">
        Don't have an account?
        <router-link to="/register" class="text-green-600 hover:underline">Register</router-link>
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { storeToRefs } from 'pinia';
import { useRouter } from 'vue-router';
import { useUserStore } from '../../stores';

const userStore = useUserStore();
const router = useRouter();

const loginEmail = ref('');
const loginPassword = ref('');

const { login } = userStore;
const { loading, error } = storeToRefs(userStore);

async function handleLogin() {
  let success = true;
  try {
    await login(loginEmail.value, loginPassword.value);
  } catch {
    success = false;
  } finally {
    if (success) {
      router.push('/dashboard');
    }
  }
}
</script>
