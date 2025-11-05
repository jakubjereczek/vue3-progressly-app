<script setup lang="ts">
import {  Clock } from 'lucide-vue-next';

import { SidebarMenu, SidebarMenuItem } from '@/components/ui/sidebar';
</script>

<template>
  <SidebarMenu>
    <SidebarMenuItem class="flex gap-2">
      <div
        class="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground"
      >
        <Clock class="size-4" />
      </div>
      <div class="grid flex-1 text-left text-sm leading-tight">
        <span class="truncate font-medium"> Progressly </span>
        <span class="truncate text-xs">Demo plan</span>
      </div>
    </SidebarMenuItem>
  </SidebarMenu>
</template>
