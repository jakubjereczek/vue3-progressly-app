<template>
  <div>
    <p class="text-sm font-medium">
      {{ title }}
    </p>
    <p class="text-xs text-muted-foreground/80 mt-0.5">
      {{ desc }}
    </p>
  </div>
</template>

<script setup lang="ts">
type Props = {
  title: string
  desc: string
}

defineProps<Props>()
</script>