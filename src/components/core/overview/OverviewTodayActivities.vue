<script setup lang="ts">
import { computed, ref } from 'vue';
import { RotateCcw, Clock, Timer, Trash2, AlertTriangle, CheckCircle2, Loader2, Calendar } from 'lucide-vue-next';
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
import CommonHeader from '@/components/CommonHeader.vue';
import CommonLabel from '@/components/CommonLabel.vue';

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

function formatStartTime(activity: TableRow<'activities'>): string {
  return formatISOTime(activity.started_at);
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
  <Card class="p-6 rounded-2xl border border-border/40 flex flex-col gap-4 shadow-none h-full bg-card">
    <div class="flex items-center justify-between flex-shrink-0">
      <CommonHeader :title="t('app.module.overview.week_activities.title')" :desc="rangeSubtitle" />

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
        class="flex flex-col items-center justify-center py-6 gap-2 text-center"
      >
        <Clock class="w-6 h-6 text-muted-foreground/25" />
        <p class="text-xs text-muted-foreground">{{ rangeEmpty }}</p>
      </div>

      <div v-else class="flex flex-col overflow-y-auto h-full pr-1">
        <ul class="flex flex-col">
          <template v-for="(group, groupIdx) in groupedByDay" :key="group.dateStr">
            <li
              class="relative flex items-center justify-between py-3 min-h-[3rem] before:absolute before:left-[4.75rem] before:w-[1px] before:bg-border/60"
              :class="[groupIdx === 0 ? 'before:top-1/2 before:bottom-0' : 'before:top-0 before:bottom-0']"
            >
              <div class="flex items-center gap-4 min-w-0 flex-1">
                <div class="w-12 shrink-0 flex justify-end pr-1 text-muted-foreground/40">
                  <Calendar class="w-4 h-4" />
                </div>

                <div class="relative z-10 flex items-center justify-center w-6 h-6 shrink-0">
                  <div
                    class="w-2.5 h-2.5 rounded-full border-2 bg-card transition-colors"
                    :class="
                      group.dateStr === todayString
                        ? 'border-primary bg-primary scale-110'
                        : 'border-muted-foreground/30 bg-muted'
                    "
                  />
                </div>

                <div class="flex items-center gap-3 min-w-0 flex-1">
                  <CommonLabel
                    :label="group.label"
                    class="mb-0"
                    :class="{ 'text-primary font-extrabold': group.dateStr === todayString }"
                  />
                  <span
                    class="text-[10px] font-mono font-medium text-muted-foreground/50 bg-muted/50 px-1.5 py-0.5 rounded border border-border/40"
                  >
                    {{ formatTotalDuration(group.totalSeconds) }}
                  </span>
                </div>
              </div>
            </li>

            <li
              v-for="(activity, actIdx) in group.activities"
              :key="activity.id"
              class="group/row relative flex items-start justify-between pt-3 pb-4 min-h-[4.5rem] before:absolute before:left-[4.75rem] before:top-0 before:w-[1px] before:bg-border/60"
              :class="[
                groupIdx === groupedByDay.length - 1 && actIdx === group.activities.length - 1
                  ? 'before:bottom-auto before:h-4'
                  : 'before:bottom-0',
              ]"
            >
              <div class="flex items-start gap-4 min-w-0 flex-1">
                <span class="text-sm font-medium text-foreground/80 w-12 pt-0.5 shrink-0 tabular-nums text-right pr-1">
                  {{ formatStartTime(activity) }}
                </span>

                <div class="relative z-10 flex items-center justify-center w-6 h-6 shrink-0">
                  <div v-if="!activity.finished_at" class="text-emerald-500 bg-card rounded-full p-0.5">
                    <Loader2 class="w-5 h-5 animate-spin" />
                  </div>

                  <div
                    v-else-if="
                      activity.description?.toLowerCase().includes('abort') ||
                      activity.description?.toLowerCase().includes('incident')
                    "
                    class="text-amber-500 bg-card rounded-full p-0.5"
                  >
                    <AlertTriangle class="w-5 h-5" />
                  </div>

                  <div
                    v-else
                    class="text-muted-foreground/30 bg-card rounded-full transition-colors group-hover/row:text-foreground p-0.5"
                    :style="{ color: getCategory(activity.category_id)?.color }"
                  >
                    <CheckCircle2 class="w-5 h-5" />
                  </div>
                </div>

                <div class="flex flex-col min-w-0 pt-0.5 pl-0.5">
                  <span class="text-sm font-semibold tracking-tight text-foreground leading-tight mb-1 break-words">
                    {{ activity.description || t('app.module.activities_history.no_description') }}
                  </span>

                  <div class="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground/60">
                    <span
                      v-if="getCategory(activity.category_id)"
                      class="font-medium"
                      :style="{ color: getCategory(activity.category_id)!.color }"
                    >
                      {{ getCategory(activity.category_id)!.name }}
                    </span>
                    <span v-if="getCategory(activity.category_id)" class="text-muted-foreground/30">·</span>

                    <span v-if="activity.finished_at" class="font-mono text-muted-foreground/50">
                      {{ formatTotalDuration(getDurationSeconds(activity)) }}
                    </span>
                    <span v-else class="text-emerald-500 font-medium flex items-center gap-1">
                      <Timer class="w-3 h-3" /> {{ t('app.module.overview.week_activities.status.running') }}
                    </span>
                  </div>
                </div>
              </div>

              <div
                class="flex items-center gap-1.5 shrink-0 pl-4 pt-0.5 opacity-0 group-hover/row:opacity-100 transition-opacity duration-150"
              >
                <button
                  v-if="activity.finished_at"
                  class="rounded-md p-1.5 hover:bg-muted border border-transparent hover:border-border/60 transition-all text-muted-foreground hover:text-foreground"
                  :aria-label="t('app.module.overview.today_activities.restart')"
                  @click="handleRestart(activity)"
                >
                  <RotateCcw class="w-3.5 h-3.5" />
                </button>
                <button
                  class="rounded-md p-1.5 hover:bg-destructive/10 border border-transparent hover:border-destructive/20 transition-all text-destructive/60 hover:text-destructive"
                  :aria-label="t('app.module.overview.today_activities.delete')"
                  @click="pendingDeleteActivity = activity"
                >
                  <Trash2 class="w-3.5 h-3.5" />
                </button>
              </div>
            </li>
          </template>
        </ul>
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
