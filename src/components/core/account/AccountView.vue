<script setup lang="ts">
import { useRouter } from 'vue-router';
import {
  CalendarDays,
  Clock,
  Hash,
  TrendingUp,
  Flame,
  Settings,
  LogOut,
  Zap,
  Tag,
  Activity,
  Crown,
  Trash2,
} from 'lucide-vue-next';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
import { useTranslation } from '@/composables';
import { useUserStore } from '@/stores';
import { useAccountData } from './useAccountData';
import defaultAvatar from '@/assets/default-avatar.svg';
import CommonHeader from '@/components/CommonHeader.vue';
import CommonLabel from '@/components/CommonLabel.vue';

const { t } = useTranslation();
const router = useRouter();
const userStore = useUserStore();

const {
  user,
  displayName,
  email,
  avatarInitials,
  memberSince,
  plan,
  isPremium,
  totalSessions,
  totalTimeFormatted,
  avgSessionFormatted,
  currentStreak,
  activePrivateCategories,
  todayActivitiesCount,
  categoryUsagePercent,
  dailyUsagePercent,
} = useAccountData();

const avatarUrl = user.value?.user_metadata?.avatar_url ?? defaultAvatar;

async function handleLogout() {
  await userStore.logout();
  router.push('/login');
}

async function handleDeleteAccount() {
  const { success } = await userStore.deleteAccount();
  if (success) {
    router.push('/login');
  }
}
</script>

<template>
  <Card class="p-6 flex flex-col gap-6 rounded-2xl border border-border/40 h-full overflow-y-auto">
    <CommonHeader :title="t('app.module.account.title')" :desc="t('app.module.account.description')" />
      <div class="flex items-center gap-4">
        <Avatar class="h-20 w-20 rounded-2xl ring-2 ring-border/50 flex-shrink-0">
          <AvatarImage :src="avatarUrl" :alt="displayName" />
          <AvatarFallback class="rounded-2xl text-2xl font-bold bg-primary/10 text-primary">
            {{ avatarInitials }}
          </AvatarFallback>
        </Avatar>

        <div class="flex flex-col gap-1 min-w-0">
          <div class="flex items-center gap-2 flex-wrap">
            <span class="text-base font-semibold truncate">
              {{ displayName || t('app.core.common.label') }}
            </span>
            <Badge v-if="plan" :variant="isPremium ? 'default' : 'secondary'" class="gap-1 text-xs">
              <Crown v-if="isPremium" class="w-3 h-3" />
              {{ plan.name }}
            </Badge>
          </div>
          <span class="text-sm text-muted-foreground truncate">{{ email }}</span>
          <div class="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
            <CalendarDays class="w-3.5 h-3.5 flex-shrink-0" />
            {{ t('app.module.account.member_since') }} {{ memberSince }}
          </div>
        </div>
      </div>

      <Separator />

      <div class="flex flex-col gap-4">
        <div class="flex items-center justify-between gap-3">
          <CommonLabel :label="t('app.module.account.plan.title')" />
        </div>

        <div v-if="plan" class="flex flex-col gap-3">
          <div class="flex flex-col gap-1.5">
            <div class="flex items-center justify-between text-sm">
              <div class="flex items-center gap-2 text-muted-foreground">
                <Tag class="w-3.5 h-3.5" />
                {{ t('app.module.account.plan.categories') }}
              </div>
              <span class="text-xs font-medium tabular-nums">
                <template v-if="plan.categoryLimit !== null">
                  {{ activePrivateCategories.length }} / {{ plan.categoryLimit }}
                </template>
                <span v-else class="text-success">{{ t('app.module.account.plan.unlimited') }}</span>
              </span>
            </div>
            <div v-if="plan.categoryLimit !== null" class="w-full h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                class="h-full rounded-full transition-all duration-700"
                role="progressbar"
                :aria-valuenow="Math.min(categoryUsagePercent, 100)"
                aria-valuemin="0"
                aria-valuemax="100"
                :class="
                  categoryUsagePercent >= 100
                    ? 'bg-destructive'
                    : categoryUsagePercent >= 80
                      ? 'bg-warning'
                      : 'bg-primary'
                "
                :style="{ width: categoryUsagePercent + '%' }"
              />
            </div>
          </div>

          <div class="flex flex-col gap-1.5">
            <div class="flex items-center justify-between text-sm">
              <div class="flex items-center gap-2 text-muted-foreground">
                <Activity class="w-3.5 h-3.5" />
                {{ t('app.module.account.plan.daily_activities') }}
              </div>
              <span class="text-xs font-medium tabular-nums">
                <template v-if="plan.dailyActivitiesLimit !== null">
                  {{ todayActivitiesCount }} / {{ plan.dailyActivitiesLimit }} {{ t('app.module.account.plan.today') }}
                </template>
                <span v-else class="text-success">{{ t('app.module.account.plan.unlimited') }}</span>
              </span>
            </div>
            <div v-if="plan.dailyActivitiesLimit !== null" class="w-full h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                class="h-full rounded-full transition-all duration-700"
                role="progressbar"
                :aria-valuenow="Math.min(dailyUsagePercent, 100)"
                aria-valuemin="0"
                aria-valuemax="100"
                :class="
                  dailyUsagePercent >= 100 ? 'bg-destructive' : dailyUsagePercent >= 80 ? 'bg-warning' : 'bg-primary'
                "
                :style="{ width: dailyUsagePercent + '%' }"
              />
            </div>
          </div>

          <div
            v-if="!isPremium"
            class="mt-1 flex items-center justify-between gap-4 px-4 py-3 rounded-xl bg-primary/5 border border-primary/20"
          >
            <div class="flex items-center gap-2 text-sm">
              <Zap class="w-4 h-4 text-primary flex-shrink-0" />
              <span class="text-foreground font-medium">{{ t('app.module.account.plan.upgrade_hint') }}</span>
            </div>
            <RouterLink to="/dashboard/upgrade">
              <Button size="sm" class="gap-1.5 flex-shrink-0">
                {{ t('app.module.account.plan.upgrade') }}
              </Button>
            </RouterLink>
          </div>
        </div>
      </div>

      <Separator />

      <div class="flex flex-col gap-4">
        <CommonLabel :label="t('app.module.account.stats.title')" />  

        <div class="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          <div class="flex flex-col gap-2 rounded-xl border border-border/50 bg-card p-4">
            <div class="flex items-center gap-2">
              <Hash class="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <span class="text-xs text-muted-foreground">{{ t('app.module.account.stats.sessions') }}</span>
            </div>
            <span class="text-2xl font-semibold tabular-nums text-foreground leading-none">
              {{ totalSessions }}
            </span>
          </div>

          <div class="flex flex-col gap-2 rounded-xl border border-border/50 bg-card p-4">
            <div class="flex items-center gap-2">
              <Clock class="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <span class="text-xs text-muted-foreground">{{ t('app.module.account.stats.total_time') }}</span>
            </div>
            <span class="text-2xl font-semibold font-mono tabular-nums text-foreground leading-none">
              {{ totalTimeFormatted }}
            </span>
          </div>

          <div class="flex flex-col gap-2 rounded-xl border border-border/50 bg-card p-4">
            <div class="flex items-center gap-2">
              <TrendingUp class="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <span class="text-xs text-muted-foreground">{{ t('app.module.account.stats.avg_session') }}</span>
            </div>
            <span class="text-2xl font-semibold font-mono tabular-nums text-foreground leading-none">
              {{ avgSessionFormatted }}
            </span>
          </div>

          <div class="flex flex-col gap-2 rounded-xl border border-border/50 bg-card p-4">
            <div class="flex items-center gap-2">
              <Flame class="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <span class="text-xs text-muted-foreground">{{ t('app.module.account.stats.streak') }}</span>
            </div>
            <div class="flex items-baseline gap-1.5 leading-none">
              <span class="text-2xl font-semibold tabular-nums text-foreground">{{ currentStreak }}</span>
              <span class="text-sm text-muted-foreground">{{ t('app.module.account.stats.days') }}</span>
            </div>
          </div>
        </div>
      </div>

      <Separator />

      <div class="flex flex-col gap-3">
        <CommonLabel :label="t('app.module.account.actions.title')" /> 
        <div class="flex items-center gap-3 flex-wrap">
          <RouterLink to="/dashboard/settings">
            <Button variant="outline" class="gap-2">
              <Settings class="w-4 h-4" />
              {{ t('app.module.account.actions.settings') }}
            </Button>
          </RouterLink>
          <Button
            variant="ghost"
            class="gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
            @click="handleLogout"
          >
            <LogOut class="w-4 h-4" />
            {{ t('app.module.account.actions.logout') }}
          </Button>
        </div>
      </div>

      <Separator />

      <div class="flex flex-col gap-3">
        <AlertDialog>
          <AlertDialogTrigger as-child>
            <Button variant="ghost" class="gap-2 text-destructive hover:text-destructive hover:bg-destructive/10 w-fit">
              <Trash2 class="w-4 h-4" />
              {{ t('app.module.account.actions.delete_account') }}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{{ t('app.module.account.delete_dialog.title') }}</AlertDialogTitle>
              <AlertDialogDescription>
                {{ t('app.module.account.delete_dialog.description') }}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{{ t('app.module.account.delete_dialog.cancel') }}</AlertDialogCancel>
              <AlertDialogAction
                class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                @click="handleDeleteAccount"
              >
                {{ t('app.module.account.delete_dialog.confirm') }}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
  </Card>
</template>
