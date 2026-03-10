<script setup lang="ts">
import { Loader2 } from 'lucide-vue-next';
import { cn } from '@/lib/utils';

const props = withDefaults(
  defineProps<{
    size?: 'sm' | 'md' | 'lg';
    class?: string;
  }>(),
  { size: 'md' },
);

const sizeClass = {
  sm: 'w-4 h-4',
  md: 'w-8 h-8',
  lg: 'w-12 h-12',
};
</script>

<template>
  <Loader2 :class="cn('animate-spin text-primary', sizeClass[props.size], props.class)" />
</template>
