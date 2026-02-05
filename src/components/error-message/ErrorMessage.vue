<script setup lang="ts">
import { type LucideIcon } from 'lucide-vue-next';

interface Props {
  title: string;
  description?: string;
  icon?: LucideIcon;
}

defineProps<Props>();
</script>

<template>
  <div class="text-center py-12 bg-gray-50 rounded-lg border border-border/40">
    <component :is="icon" class="w-10 h-10 mx-auto mb-3 text-gray-400" />
    <p class="text-lg font-medium text-gray-600">
      {{ title }}
    </p>
    <p v-if="description" class="mt-1 text-sm text-gray-400">
      {{ description }}
    </p>
  </div>
</template>
