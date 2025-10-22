<template>
  <div class="flex min-h-screen bg-gray-50">
    <aside class="w-64 bg-white shadow-md p-6 flex flex-col">
      <h1 class="text-2xl font-semibold mb-8 text-green-700">Dashboard</h1>
      <nav class="flex flex-col space-y-4">
        <router-link
          to="/dashboard"
          class="text-gray-700 hover:text-green-600 font-medium"
        >
          Home
        </router-link>
        <router-link
          to="/dashboard/profile"
          class="text-gray-700 hover:text-green-600 font-medium"
        >
          Profile
        </router-link>
        <router-link
          to="/dashboard/settings"
          class="text-gray-700 hover:text-green-600 font-medium"
        >
          Settings
        </router-link>
        <button
          @click="logoutUser"
          class="mt-auto py-2 px-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          Logout
        </button>
      </nav>
    </aside>
    <main class="flex-1 p-8">
      <div class="bg-white rounded-2xl shadow-md p-8 min-h-[80vh]">
        <h2 class="text-3xl font-semibold text-gray-900 mb-6">Welcome, {{ userName }}</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          Hello world.
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { useUserStore } from '../../stores';
import { useRouter } from 'vue-router';
import { computed } from 'vue';

const userStore = useUserStore();
const { user } = storeToRefs(userStore);
const router = useRouter();

const userName = computed(() => user.value?.email);

function logoutUser() {
  userStore.logout().then(() => {
    router.push('/login');
  });
}
</script>