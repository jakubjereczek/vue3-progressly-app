<script setup lang="ts">
import { Toaster } from '@/components/ui/sonner';
import { useAuthListener } from './composables';
import { useTheme, applyThemeClass } from './composables/useTheme';
import 'vue-sonner/style.css';

useAuthListener();

const { theme } = useTheme();
applyThemeClass(theme.value);
</script>

<template>
  <Toaster />
  <router-view />
</template>
