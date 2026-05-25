<script setup lang="ts">
import {
  BadgeCheck,
  ChevronsUpDown,
  LogOut,
  Sparkles,
  Monitor,
  Sun,
  Moon,
} from "lucide-vue-next"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar'

import { computed } from "vue"
import { storeToRefs } from 'pinia'
import type { User } from "@supabase/supabase-js"
import defaultAvatar from '@/assets/default-avatar.svg'
import { useTranslation } from '@/composables/useTranslation'
import { useUserStore } from '@/stores'
import { useRouter } from "vue-router"
import { useTheme, type ThemeMode } from '@/composables/useTheme'

const { t } = useTranslation()
const userStore = useUserStore();
const router = useRouter();
const { theme, setTheme } = useTheme();

const themeIcons: Record<ThemeMode, unknown> = { system: Monitor, light: Sun, dark: Moon };

const props = defineProps<{
  user: User
}>()

const { isMobile } = useSidebar()
const { isPremium } = storeToRefs(userStore)

const avatarUrl = computed(() => props.user.user_metadata?.avatar_url ?? defaultAvatar)
const email = computed(() => props.user.email)
const displayName = computed(() => props.user.user_metadata?.full_name ?? "User")

async function onLogoutClick() {
  await userStore.logout();
  router.push('/login');
}

</script>

<template>
  <SidebarMenu>
    <SidebarMenuItem>
      <DropdownMenu>
        <DropdownMenuTrigger as-child>
          <SidebarMenuButton
            size="lg"
            class="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
          >
            <Avatar class="h-8 w-8 rounded-lg">
              <AvatarImage :src="avatarUrl" :alt="displayName" />
              <AvatarFallback class="rounded-lg">
                {{ email?.slice(0, 2).toUpperCase() }}
              </AvatarFallback>
            </Avatar>
            <div class="grid flex-1 text-left text-sm leading-tight">
              <span class="truncate font-medium">{{ t('app.core.common.logged_as') }}</span>
              <span class="truncate text-xs">{{ email }}</span>
            </div>
            <ChevronsUpDown class="ml-auto size-4" />
          </SidebarMenuButton>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          class="w-[--reka-dropdown-menu-trigger-width] min-w-56 rounded-lg"
          :side="isMobile ? 'bottom' : 'right'"
          align="end"
          :side-offset="4"
        >
          <!-- Label użytkownika -->
          <DropdownMenuLabel class="p-0 font-normal">
            <div class="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
              <Avatar class="h-8 w-8 rounded-lg">
                <AvatarImage :src="avatarUrl" :alt="displayName" />
                <AvatarFallback class="rounded-lg">
                  {{ email?.slice(0, 2).toUpperCase() }}
                </AvatarFallback>
              </Avatar>
              <div class="grid flex-1 text-left text-sm leading-tight">
                <span class="truncate font-semibold">{{ displayName }}</span>
                <span class="truncate text-xs">{{ email }}</span>
              </div>
            </div>
          </DropdownMenuLabel>

          <template v-if="!isPremium">
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem as-child>
                <RouterLink to="/dashboard/upgrade" class="flex items-center gap-2 w-full">
                  <Sparkles />
                  {{ t('app.core.common.upgrade') }}
                </RouterLink>
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </template>

          <DropdownMenuSeparator />

          <DropdownMenuGroup>
            <DropdownMenuItem as-child>
              <RouterLink to="/dashboard/account" class="flex items-center gap-2 w-full">
                <BadgeCheck />
                {{ t('app.core.common.account') }}
              </RouterLink>
            </DropdownMenuItem>
          </DropdownMenuGroup>

          <DropdownMenuSeparator />

          <DropdownMenuItem class="cursor-default focus:bg-transparent" @select.prevent>
            <div class="flex items-center justify-between w-full gap-3">
              <div class="flex items-center gap-2 text-sm">
                <component :is="themeIcons[theme]" class="w-4 h-4" />
                {{ t('app.module.settings.theme.label') }}
              </div>
              <div class="flex items-center gap-0.5 bg-muted/60 rounded-md p-0.5 border border-border/40">
                <button
                  v-for="opt in (['system', 'light', 'dark'] as ThemeMode[])"
                  :key="opt"
                  class="p-1 rounded transition-colors"
                  :class="theme === opt ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'"
                  :aria-label="opt"
                  @click.stop="setTheme(opt)"
                >
                  <Monitor v-if="opt === 'system'" class="w-3 h-3" />
                  <Sun v-else-if="opt === 'light'" class="w-3 h-3" />
                  <Moon v-else class="w-3 h-3" />
                </button>
              </div>
            </div>
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem @click="onLogoutClick">
            <LogOut />
            {{ t('app.core.common.logout') }}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  </SidebarMenu>
</template>
