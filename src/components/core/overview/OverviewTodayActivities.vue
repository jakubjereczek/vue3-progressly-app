<script setup lang="ts">
import { computed, ref } from 'vue';
import { RotateCcw, Clock, Timer, Trash2 } from 'lucide-vue-next';
import { RouterLink } from 'vue-router';
import { Card } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useTranslation } from '@/composables';
import { useRestartActivity } from '@/composables/useRestartActivity';
import { useOverviewData } from './useOverviewData';
import { useActivitiesStore } from '@/stores';
import { formatTotalDuration, getDuration, localDateToString, formatISOTime } from '@/utils/time';
import { addDays } from '@/utils/date';
import type { TableRow } from '@/api/supabase';

const { t } = useTranslation();
const { rangeActivities, categories, loading, todayString, selectedRange } = useOverviewData();
const { requestRestart } = useRestartActivity();
const activitiesStore = useActivitiesStore();

interface DayGroup {
  dateStr: string;
  label: string;
  totalSeconds: number;
  activities: TableRow<'activities'>[];
}

const rangeSubtitle = computed(() => {
  if (selectedRange.value === 'today') return t('app.module.overview.week_activities.subtitle_today');
  if (selectedRange.value === 'month') return t('app.module.overview.week_activities.subtitle_month');
  return t('app.module.overview.week_activities.subtitle');
});

const rangeEmpty = computed(() => {
  if (selectedRange.value === 'today') return t('app.module.overview.week_activities.empty_today');
  if (selectedRange.value === 'month') return t('app.module.overview.week_activities.empty_month');
  return t('app.module.overview.week_activities.empty');
});

const groupedByDay = computed<DayGroup[]>(() => {
  const groups = new Map<string, TableRow<'activities'>[]>();
  for (const a of rangeActivities.value) {
    const dateStr = localDateToString(new Date(a.started_at));
    if (!groups.has(dateStr)) groups.set(dateStr, []);
    groups.get(dateStr)!.push(a);
  }

  const today = todayString.value;
  const yesterday = localDateToString(addDays(new Date(), -1));

  return Array.from(groups.entries())
    .map(([dateStr, acts]) => {
      let label: string;
      if (dateStr === today) {
        label = t('app.module.overview.week_activities.day.today');
      } else if (dateStr === yesterday) {
        label = t('app.module.overview.week_activities.day.yesterday');
      } else {
        label = new Date(dateStr + 'T12:00:00').toLocaleDateString(undefined, {
          weekday: 'long',
          day: 'numeric',
          month: 'short',
        });
      }
      const totalSeconds = acts.reduce((sum, a) => sum + getDuration(a.started_at, a.finished_at) / 1000, 0);
      return { dateStr, label, totalSeconds, activities: acts };
    })
    .sort((a, b) => b.dateStr.localeCompare(a.dateStr));
});

function formatTimeRange(activity: TableRow<'activities'>): string {
  const start = formatISOTime(activity.started_at);
  if (!activity.finished_at) return start;
  return `${start} – ${formatISOTime(activity.finished_at)}`;
}

function getCategory(categoryId: string | null): { name: string; color: string } | null {
  if (!categoryId) return null;
  return categories.value.find((c) => c.id === categoryId) ?? null;
}

function getDurationSeconds(activity: TableRow<'activities'>): number {
  return getDuration(activity.started_at, activity.finished_at) / 1000;
}

const pendingDeleteActivity = ref<TableRow<'activities'> | null>(null);
const isDeleteRunning = computed(
  () => pendingDeleteActivity.value !== null && !pendingDeleteActivity.value.finished_at,
);

function handleRestart(activity: TableRow<'activities'>) {
  requestRestart({
    description: activity.description || '',
    category_id: activity.category_id,
    tags: (activity.tags as string[]) ?? [],
  });
}

function confirmDelete() {
  if (!pendingDeleteActivity.value) return;
  activitiesStore.deleteActivityById(pendingDeleteActivity.value.id);
  pendingDeleteActivity.value = null;
}
</script>

<template>
  <Card class="p-5 rounded-2xl border border-border/40 flex flex-col gap-4 shadow-none h-full bg-card">
    <div class="flex items-center justify-between flex-shrink-0 border-b border-border/40 pb-3">
      <div>
        <h3 class="text-sm font-semibold tracking-tight text-foreground">
          {{ t('app.module.overview.week_activities.title') }}
        </h3>
        <p class="text-xs text-muted-foreground/70 mt-0.5">{{ rangeSubtitle }}</p>
      </div>
      <RouterLink
        to="/dashboard/timesheet"
        class="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors duration-150"
      >
        {{ t('app.module.overview.today_activities.view_all') }} →
      </RouterLink>
    </div>

    <div
      class="flex-1 min-h-0 overflow-hidden transition-opacity duration-200"
      :class="{ 'opacity-50 pointer-events-none': loading }"
    >
      <div
        v-if="groupedByDay.length === 0 && !loading"
        class="flex flex-col items-center justify-center h-full gap-2 text-center"
      >
        <Clock class="w-6 h-6 text-muted-foreground/25" />
        <p class="text-xs text-muted-foreground">{{ rangeEmpty }}</p>
      </div>

      <div v-else class="flex flex-col overflow-y-auto h-full pr-1 space-y-4">
        <div v-for="group in groupedByDay" :key="group.dateStr" class="flex flex-col">
          <div
            class="sticky top-0 z-10 flex items-center justify-between gap-3 py-2 bg-card/95 backdrop-blur-sm border-b border-border/10 mb-2"
          >
            <span
              class="text-xs font-bold uppercase tracking-wider"
              :class="group.dateStr === todayString ? 'text-primary' : 'text-muted-foreground/70'"
            >
              {{ group.label }}
            </span>
            <span
              class="text-xs font-mono font-medium text-muted-foreground/50 bg-muted/40 px-2 py-0.5 rounded-md border border-border/30"
            >
              {{ formatTotalDuration(group.totalSeconds) }}
            </span>
          </div>

          <ul class="flex flex-col gap-1">
            <li
              v-for="activity in group.activities"
              :key="activity.id"
              class="group/row flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-150 hover:bg-muted/50"
            >
              <div class="flex items-center gap-3 min-w-0 flex-1">
                <div
                  class="w-1 h-8 rounded-full shrink-0"
                  :style="{ backgroundColor: getCategory(activity.category_id)?.color ?? 'var(--border)' }"
                />

                <div class="flex flex-col min-w-0">
                  <span class="text-sm font-semibold tracking-tight text-foreground truncate leading-none mb-1">
                    {{ activity.description || t('app.module.activities_history.no_description') }}
                  </span>
                  <div class="flex items-center gap-1.5 text-xs text-muted-foreground/80 truncate">
                    <span
                      v-if="getCategory(activity.category_id)"
                      class="font-medium"
                      :style="{ color: getCategory(activity.category_id)!.color }"
                    >
                      {{ getCategory(activity.category_id)!.name }}
                    </span>
                    <span v-if="getCategory(activity.category_id)" class="text-muted-foreground/30">·</span>
                    <span class="font-mono text-muted-foreground/60">{{ formatTimeRange(activity) }}</span>
                  </div>
                </div>
              </div>

              <div class="flex items-center gap-4 shrink-0 pl-4">
                <div class="text-right flex flex-col justify-center">
                  <span class="text-sm font-bold font-mono tabular-nums text-foreground">
                    {{ formatTotalDuration(getDurationSeconds(activity)) }}
                  </span>
                </div>

                <div class="w-20 flex justify-end items-center">
                  <span
                    v-if="!activity.finished_at"
                    class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-medium bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 animate-pulse"
                  >
                    <Timer class="w-2.5 h-2.5" />
                    {{ t('app.module.overview.week_activities.status.running') }}
                  </span>

                  <div
                    v-else
                    class="flex items-center gap-0.5 opacity-0 group-hover/row:opacity-100 transition-opacity duration-150"
                  >
                    <button
                      class="rounded-md p-1 hover:bg-muted border border-transparent hover:border-border/60 transition-all text-muted-foreground hover:text-foreground"
                      :aria-label="t('app.module.overview.today_activities.restart')"
                      @click="handleRestart(activity)"
                    >
                      <RotateCcw class="w-3.5 h-3.5" />
                    </button>
                    <button
                      class="rounded-md p-1 hover:bg-destructive/10 border border-transparent hover:border-destructive/20 transition-all text-destructive/60 hover:text-destructive"
                      :aria-label="t('app.module.overview.today_activities.delete')"
                      @click="pendingDeleteActivity = activity"
                    >
                      <Trash2 class="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </Card>

  <AlertDialog
    :open="pendingDeleteActivity !== null"
    @update:open="
      (v) => {
        if (!v) pendingDeleteActivity = null;
      }
    "
  >
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>{{ t('app.module.activities_history.delete_dialog.title') }}</AlertDialogTitle>
        <AlertDialogDescription>
          <span v-if="isDeleteRunning" class="text-warning font-medium">
            {{ t('app.module.overview.today_activities.delete_running_description') }}
          </span>
          <span v-else>{{ t('app.module.activities_history.delete_dialog.description') }}</span>
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>{{ t('app.action.cancel') }}</AlertDialogCancel>
        <AlertDialogAction
          class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          @click="confirmDelete"
        >
          {{ t('app.action.delete') }}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
