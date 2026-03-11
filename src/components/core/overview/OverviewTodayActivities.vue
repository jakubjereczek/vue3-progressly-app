<script setup lang="ts">
import { computed } from 'vue';
import { RotateCcw, Clock } from 'lucide-vue-next';
import { RouterLink } from 'vue-router';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/composables';
import { useRestartActivity } from '@/composables/useRestartActivity';
import { useOverviewData } from './useOverviewData';
import { formatTotalDuration, getDuration } from '@/utils/time';
import type { TableRow } from '@/api/supabase';

const { t } = useTranslation();
const { weekActivities, categories, loading, todayString } = useOverviewData();
const { requestRestart } = useRestartActivity();

interface DayGroup {
  dateStr: string;
  label: string;
  totalSeconds: number;
  activities: TableRow<'activities'>[];
}

function localDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

const groupedByDay = computed<DayGroup[]>(() => {
  const groups = new Map<string, TableRow<'activities'>[]>();
  for (const a of weekActivities.value) {
    const dateStr = localDateStr(new Date(a.started_at));
    if (!groups.has(dateStr)) {
      groups.set(dateStr, []);
    }
    groups.get(dateStr)!.push(a);
  }

  const today = todayString.value;
  const yesterday = localDateStr(new Date(new Date().setDate(new Date().getDate() - 1)));

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

function formatTime(dateString: string): string {
  return new Date(dateString).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

function formatTimeRange(activity: TableRow<'activities'>): string {
  const start = formatTime(activity.started_at);
  if (!activity.finished_at) {return start;}
  return `${start} – ${formatTime(activity.finished_at)}`;
}

function getCategory(categoryId: string | null): { name: string; color: string } | null {
  if (!categoryId) {return null;}
  return categories.value.find((c) => c.id === categoryId) ?? null;
}

function getDurationSeconds(activity: TableRow<'activities'>): number {
  return getDuration(activity.started_at, activity.finished_at) / 1000;
}

function handleRestart(activity: TableRow<'activities'>) {
  requestRestart({
    description: activity.description || '',
    category_id: activity.category_id,
    tags: (activity.tags as string[]) ?? [],
  });
}
</script>

<template>
  <Card class="p-8 rounded-2xl border border-border/40 flex flex-col gap-6 shadow-none h-full">
    <div class="flex items-center justify-between flex-shrink-0">
      <div>
        <h2 class="text-xl font-semibold">{{ t('app.module.overview.week_activities.title') }}</h2>
        <p class="text-sm text-muted-foreground mt-0.5">{{ t('app.module.overview.week_activities.subtitle') }}</p>
      </div>
      <RouterLink
        to="/dashboard/timesheet"
        class="text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        {{ t('app.module.overview.today_activities.view_all') }} →
      </RouterLink>
    </div>
    <div
      class="flex-1 min-h-0 border border-border/40 rounded-xl overflow-hidden transition-opacity duration-200"
      :class="{ 'opacity-50 pointer-events-none': loading }"
    >
      <div
        v-if="groupedByDay.length === 0 && !loading"
        class="flex flex-col items-center justify-center h-full gap-2 text-center"
      >
        <Clock class="w-8 h-8 text-muted-foreground/25" />
        <p class="text-sm text-muted-foreground">{{ t('app.module.overview.week_activities.empty') }}</p>
      </div>
      <div v-else class="flex flex-col overflow-y-auto h-full p-4 gap-4">
        <div v-for="group in groupedByDay" :key="group.dateStr" class="flex flex-col gap-1">
          <div class="flex items-center justify-between mb-1">
            <span
              class="text-[11px] font-semibold uppercase tracking-widest"
              :class="group.dateStr === todayString ? 'text-primary' : 'text-muted-foreground'"
            >
              {{ group.label }}
            </span>
            <span class="text-[11px] font-mono tabular-nums text-muted-foreground/60">
              {{ formatTotalDuration(group.totalSeconds) }}
            </span>
          </div>
          <ul class="flex flex-col">
            <li v-for="activity in group.activities" :key="activity.id" class="flex items-start gap-3 py-2.5 group/row">
              <span
                class="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-[5px]"
                :class="activity.finished_at ? 'bg-success' : 'bg-chart-3 animate-pulse'"
              />
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium truncate leading-snug">
                  {{ activity.description || t('app.module.activities_history.no_description') }}
                </p>
                <div class="flex items-center gap-1.5 mt-0.5">
                  <span
                    v-if="getCategory(activity.category_id)"
                    class="inline-flex items-center px-1.5 py-px rounded text-[11px] font-medium leading-tight"
                    :style="{
                      backgroundColor: getCategory(activity.category_id)!.color + '20',
                      color: getCategory(activity.category_id)!.color,
                    }"
                  >
                    {{ getCategory(activity.category_id)!.name }}
                  </span>
                  <span class="text-[11px] text-muted-foreground/50 tabular-nums">
                    {{ formatTimeRange(activity) }}
                  </span>
                </div>
              </div>
              <div class="flex items-center gap-1 flex-shrink-0 mt-0.5">
                <span
                  class="text-xs font-mono tabular-nums font-semibold"
                  :class="activity.finished_at ? 'text-muted-foreground' : 'text-chart-3'"
                >
                  {{ formatTotalDuration(getDurationSeconds(activity)) }}
                </span>
                <Button
                  v-if="activity.finished_at"
                  variant="ghost"
                  size="sm"
                  class="h-6 w-6 p-0 opacity-0 group-hover/row:opacity-100 transition-opacity flex-shrink-0 ml-0.5"
                  :title="t('app.module.overview.today_activities.restart')"
                  @click="handleRestart(activity)"
                >
                  <RotateCcw class="w-3 h-3" />
                </Button>
                <div v-else class="w-6 ml-0.5 flex-shrink-0" />
              </div>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </Card>
</template>
