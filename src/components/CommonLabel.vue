<template>
  <div class="flex items-center gap-2 text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-widest">
    <slot name="before" />

    <span>{{ label }}</span>

    <slot name="after" />
  </div>
</template>

<script setup lang="ts">
type Props = {
  label: string
}

defineProps<Props>()
</script>