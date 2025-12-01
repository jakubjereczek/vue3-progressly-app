<script setup lang="ts">
import type { LucideIcon } from 'lucide-vue-next';
import { ChevronRight } from 'lucide-vue-next';
import { RouterLink } from 'vue-router';

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from '@/components/ui/sidebar';

defineProps<{
  items: {
    title: string;
    url: string;
    icon?: LucideIcon;
    isActive?: boolean;
    items?: {
      title: string;
      url: string;
    }[];
  }[];
}>();
</script>

<template>
  <SidebarGroup>
    <SidebarGroupLabel>Platform</SidebarGroupLabel>
    <SidebarMenu>
      <Collapsible
        v-for="item in items"
        :key="item.title"
        as-child
        :default-open="item.isActive"
        class="group/collapsible"
      >
        <SidebarMenuItem>
          <template v-if="item.items && item.items.length > 0">
            <CollapsibleTrigger as-child>
              <SidebarMenuButton :tooltip="item.title">
                <component :is="item.icon" v-if="item.icon" />
                <span>{{ item.title }}</span>
                <ChevronRight
                  class="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90"
                />
              </SidebarMenuButton>
            </CollapsibleTrigger>
          </template>
          <template v-else>
            <RouterLink :to="item.url" custom v-slot="{ href, navigate }">
              <SidebarMenuButton :href="href" @click="navigate" :tooltip="item.title" :is-active="item.isActive">
                <component :is="item.icon" v-if="item.icon" />
                <span>{{ item.title }}</span>
              </SidebarMenuButton>
            </RouterLink>
          </template>

          <CollapsibleContent>
            <SidebarMenuSub>
              <SidebarMenuSubItem v-for="subItem in item.items" :key="subItem.title">
                <SidebarMenuSubButton as-child>
                  <RouterLink :to="subItem.url" v-slot="{ isActive }">
                    <span :class="{ 'font-semibold text-primary': isActive }">{{ subItem.title }}</span>
                  </RouterLink>
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            </SidebarMenuSub>
          </CollapsibleContent>
        </SidebarMenuItem>
      </Collapsible>
    </SidebarMenu>
  </SidebarGroup>
</template>
