<script setup lang="ts">
import type { SidebarProps } from '@/components/ui/sidebar';

import { SquareTerminal, Settings, Search } from 'lucide-vue-next';
import NavMain from '@/components/NavMain.vue';
import NavUser from '@/components/NavUser.vue';
import NavHeader from '@/components/NavHeader.vue';

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar';
import { useUserStore } from '@/stores';
import { storeToRefs } from 'pinia';
import { computed } from 'vue';

const isMac =
  typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent);
const searchShortcut = isMac ? '⌘K' : 'Ctrl+K';
import { useTranslation } from '@/composables';
import { useGlobalSearch } from '@/components/core/global-search';

const props = withDefaults(defineProps<SidebarProps>(), {
  collapsible: 'icon',
});

const userStore = useUserStore();
const { user } = storeToRefs(userStore);
const { t } = useTranslation();
const { open: openSearch } = useGlobalSearch();

const data = computed(() => ({
  navMain: [
    {
      title: t('app.core.navbar.dashboard'),
      url: '/',
      icon: SquareTerminal,
      isActive: true,
      items: [
        {
          title: t('app.core.navbar.time_tracking'),
          url: '/dashboard/overview',
        },
        {
          title: t('app.core.navbar.timesheet'),
          url: '/dashboard/timesheet',
        },
        {
          title: t('app.core.navbar.gantt'),
          url: '/dashboard/gantt',
        },
        {
          title: t('app.core.navbar.calendar'),
          url: '/dashboard/calendar',
        },
        {
          title: t('app.core.navbar.categories'),
          url: '/dashboard/categories',
        },
        {
          title: t('app.core.navbar.stats'),
          url: '/dashboard/stats',
        },
        {
          title: t('app.core.navbar.analytics'),
          url: '/dashboard/analytics',
        },
        {
          title: t('app.core.navbar.goals'),
          url: '/dashboard/goals',
        },
        {
          title: t('app.core.navbar.export'),
          url: '/dashboard/export',
        },
      ],
    },
    {
      title: t('app.core.navbar.settings'),
      url: '/dashboard/settings',
      icon: Settings,
      items: [
        {
          title: t('app.core.navbar.settings'),
          url: '/dashboard/settings',
        },
      ],
    },
  ],
}));
</script>

<template>
  <Sidebar v-bind="props">
    <SidebarHeader>
      <NavHeader />
    </SidebarHeader>
    <SidebarContent>
      <SidebarMenu class="px-2 pt-1 pb-0">
        <SidebarMenuItem>
          <SidebarMenuButton
            class="w-full flex items-center gap-2.5 text-muted-foreground hover:text-foreground transition-colors"
            @click="openSearch"
          >
            <Search class="w-4 h-4 flex-shrink-0" />
            <span class="flex-1 text-sm truncate">{{ t('app.core.search.trigger_label') }}</span>
            <kbd
              class="hidden group-data-[collapsible=icon]:hidden text-2xs leading-none text-muted-foreground/50 bg-muted px-1.5 py-0.5 rounded border border-border/40 flex-shrink-0 font-sans"
            >
              {{ searchShortcut }}
            </kbd>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
      <NavMain :items="data.navMain" />
    </SidebarContent>
    <SidebarFooter v-if="user">
      <NavUser :user="user" />
    </SidebarFooter>
    <SidebarRail />
  </Sidebar>
</template>
