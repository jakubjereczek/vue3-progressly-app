<script setup lang="ts">
import { useAuthListener } from './composables';

useAuthListener(); 
</script>

<template>
  <router-view />
</template>