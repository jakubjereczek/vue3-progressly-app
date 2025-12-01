<script lang="ts" setup>
import type { HTMLAttributes } from "vue"
import { RouterLink, type RouteLocationRaw } from 'vue-router'
import { cn } from "@/lib/utils"

const props = defineProps<{
  to: RouteLocationRaw,
  class?: HTMLAttributes["class"]
}>()

</script>

<template>
  <RouterLink
    data-slot="breadcrumb-link"
    :to="props.to"
    :class="cn('hover:text-foreground transition-colors', props.class)"
  >
    <slot />
  </RouterLink>
</template>