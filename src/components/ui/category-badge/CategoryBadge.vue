<script setup lang="ts">
defineProps<{
  name: string;
  color: string;
}>();
</script>

<template>
  <span
    class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold border whitespace-nowrap leading-none"
    :style="{
      backgroundColor: color + '28',
      color: color,
      borderColor: color + '55',
    }"
  >
    <span class="w-1.5 h-1.5 rounded-full flex-shrink-0" :style="{ backgroundColor: color }" />
    {{ name }}
  </span>
</template>
