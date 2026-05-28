import { computed, type Ref } from 'vue';
import type { TableRow } from '@/api/supabase';
import { formatTotalDuration, SECONDS_PER_DAY, localDateToString } from '@/utils/time';
import { buildCategoryMap } from '@/utils/activity';
import { startOfDay, endOfDay } from '@/utils/date';

export interface GanttBar {
  id: string;
  activityId: string;
  description: string | null;
  tags: string[];
  categoryName: string | null;
  categoryColor: string | null;
  startedAt: string;
  finishedAt: string | null;
  durationSeconds: number;
  formattedDuration: string;
  percentage: number;
  leftPercentage: number;
  isActive: boolean;
}

export interface GanttRow {
  date: Date;
  dateStr: string;
  bars: GanttBar[];
  totalSeconds: number;
  formattedTotal: string;
  isEmpty: boolean;
}

export function useGanttData(
  activities: Ref<TableRow<'activities'>[]>,
  weekDays: Ref<Date[]>,
  categories: Ref<TableRow<'categories'>[]>,
) {
  const categoryMap = computed(() => buildCategoryMap(categories.value));

  const ganttRows = computed<GanttRow[]>(() =>
    weekDays.value.map((day) => {
      const dateStr = localDateToString(day);
      const dayStart = startOfDay(day);
      const dayEnd = endOfDay(day);

      const nowMs = Date.now();
      const dayActivities = activities.value
        .filter((a) => {
          if (!a.started_at) {
            return false;
          }
          const start = new Date(a.started_at).getTime();
          const finish = a.finished_at ? new Date(a.finished_at).getTime() : nowMs;
          return start <= dayEnd.getTime() && finish >= dayStart.getTime();
        })
        .sort((a, b) => new Date(a.started_at!).getTime() - new Date(b.started_at!).getTime());

      const bars: GanttBar[] = dayActivities
        .map((a) => {
          const actStart = new Date(a.started_at!).getTime();
          const actFinish = a.finished_at ? new Date(a.finished_at).getTime() : nowMs;

          const overlapStart = Math.max(actStart, dayStart.getTime());
          const overlapEnd = Math.min(actFinish, dayEnd.getTime());
          const overlapDurationSeconds = Math.max(0, (overlapEnd - overlapStart) / 1000);

          const secondsFromMidnight = (overlapStart - dayStart.getTime()) / 1000;

          const cat = a.category_id ? (categoryMap.value.get(a.category_id) ?? null) : null;

          return {
            id: `${a.id}-${dateStr}`,
            activityId: a.id,
            description: a.description,
            tags: (a.tags as string[]) ?? [],
            categoryName: cat?.name ?? null,
            categoryColor: cat?.color ?? null,
            startedAt: a.started_at!,
            finishedAt: a.finished_at,
            durationSeconds: overlapDurationSeconds,
            formattedDuration: formatTotalDuration(overlapDurationSeconds),
            percentage: (overlapDurationSeconds / SECONDS_PER_DAY) * 100,
            leftPercentage: (secondsFromMidnight / SECONDS_PER_DAY) * 100,
            isActive: !a.finished_at,
          };
        })
        .filter((bar) => bar.durationSeconds > 0);

      const totalSeconds = bars.reduce((sum, b) => sum + b.durationSeconds, 0);

      return {
        date: day,
        dateStr,
        bars,
        totalSeconds,
        formattedTotal: formatTotalDuration(totalSeconds),
        isEmpty: bars.length === 0,
      };
    }),
  );

  return { ganttRows };
}
