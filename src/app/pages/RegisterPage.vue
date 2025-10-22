<template>
  <div class="flex items-center justify-center min-h-screen bg-gray-50">
    <div class="bg-white p-10 rounded-2xl shadow-lg w-full max-w-sm">
      <h2 class="text-3xl font-semibold text-center mb-8 text-gray-900">Register</h2>

      <form @submit.prevent="handleRegister" class="space-y-6">
        <div class="relative">
          <input
            id="registerEmail"
            v-model="registerEmail"
            type="email"
            required
            placeholder="Email"
            class="peer w-full border-b-2 border-gray-300 placeholder-transparent focus:border-green-600 outline-none py-2 text-gray-900"
          />
          <label
            for="registerEmail"
            class="absolute left-0 -top-3.5 text-gray-500 text-sm transition-all peer-placeholder-shown:top-2 peer-placeholder-shown:text-gray-400 peer-placeholder-shown:text-base peer-focus:-top-3.5 peer-focus:text-gray-500 peer-focus:text-sm"
          >
            Email
          </label>
        </div>

        <div class="relative">
          <input
            id="registerPassword"
            v-model="registerPassword"
            type="password"
            required
            placeholder="Password"
            class="peer w-full border-b-2 border-gray-300 placeholder-transparent focus:border-green-600 outline-none py-2 text-gray-900"
          />
          <label
            for="registerPassword"
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
          {{ loading ? 'Registering...' : 'Register' }}
        </button>

        <div v-if="error" class="text-red-500 text-sm text-center mt-2">
          {{ error }}
        </div>
      </form>

      <p class="text-center text-sm text-gray-500 mt-6">
        Already have an account?
        <router-link to="/login" class="text-green-600 hover:underline">Login here</router-link>
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

const registerEmail = ref('');
const registerPassword = ref('');

const { register } = userStore;
const { loading, error } = storeToRefs(userStore);

async function handleRegister() {
  let success = true;
  try {
    await register(registerEmail.value, registerPassword.value);
  } catch {
    success = false;
  } finally {
    if (success) {
      router.push('/dashboard');
    }
  }
}
</script>
