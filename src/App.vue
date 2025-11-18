<script setup lang="ts">
import { Toaster } from '@/components/ui/sonner';
import { useAuthListener } from './composables';
import 'vue-sonner/style.css';

useAuthListener();
</script>

<template>
  <Toaster />
  <router-view />
</template>
