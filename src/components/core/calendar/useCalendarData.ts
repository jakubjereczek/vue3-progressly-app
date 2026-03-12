import { computed, type Ref } from 'vue';
import type { TableRow } from '@/api/supabase';
import { formatTotalDuration, getDuration } from '@/utils/time';

export interface CalendarDayActivity {
  id: string;
  description: string | null;
  startedAt: string;
  finishedAt: string | null;
  isActive: boolean;
  categoryId: string | null;
  categoryName: string | null;
  categoryColor: string | null;
  tags: string[];
  durationSeconds: number;
  formattedDuration: string;
  startTime: string;
  endTime: string;
  /** 0–100 left offset in 24h timeline */
  timelineLeft: number;
  /** 0–100 width in 24h timeline */
  timelineWidth: number;
}

export interface CalendarCategorySlice {
  categoryId: string | null;
  categoryName: string | null;
  color: string | null;
  seconds: number;
  percentage: number;
}

export interface CalendarDay {
  date: Date;
  dateStr: string;
  dayNum: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isFuture: boolean;
  isWeekend: boolean;
  totalSeconds: number;
  sessionCount: number;
  activities: CalendarDayActivity[];
  categorySlices: CalendarCategorySlice[];
  formattedTotal: string;
  heatLevel: 0 | 1 | 2 | 3 | 4;
}

export interface CalendarWeek {
  weekNum: number;
  days: CalendarDay[];
  weekTotalSeconds: number;
  formattedWeekTotal: string;
}

const SECONDS_IN_DAY = 86400;

function localDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function useCalendarData(
  activities: Ref<TableRow<'activities'>[]>,
  categories: Ref<TableRow<'categories'>[]>,
  year: Ref<number>,
  month: Ref<number>, // 0-indexed
) {
  const categoryMap = computed(() => {
    const map = new Map<string, { name: string; color: string }>();
    for (const c of categories.value) map.set(c.id, { name: c.name, color: c.color });
    return map;
  });

  const activitiesByDate = computed(() => {
    const map = new Map<string, TableRow<'activities'>[]>();
    for (const activity of activities.value) {
      const dateStr = localDateStr(new Date(activity.started_at));
      if (!map.has(dateStr)) {
        map.set(dateStr, []);
      }
      map.get(dateStr)!.push(activity);
    }
    return map;
  });

  const todayStr = computed(() => localDateStr(new Date()));

  const monthMaxSeconds = computed(() => {
    const daysInMonth = new Date(year.value, month.value + 1, 0).getDate();
    let max = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const ds = `${year.value}-${String(month.value + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const total = (activitiesByDate.value.get(ds) ?? []).reduce(
        (s, a) => s + getDuration(a.started_at, a.finished_at) / 1000,
        0,
      );
      max = Math.max(max, total);
    }
    return max;
  });

  function buildDay(date: Date): CalendarDay {
    const dateStr = localDateStr(date);
    const dow = date.getDay(); // 0=Sun 6=Sat
    const isWeekend = dow === 0 || dow === 6;
    const isCurrentMonth = date.getMonth() === month.value;
    const isToday = dateStr === todayStr.value;
    const now = new Date();
    const isFuture = !isToday && date.getTime() > now.setHours(0, 0, 0, 0);

    const rawActs = activitiesByDate.value.get(dateStr) ?? [];

    const dayStartMs = new Date(date).setHours(0, 0, 0, 0);

    const acts = rawActs
      .map((a): CalendarDayActivity => {
        const cat = a.category_id ? (categoryMap.value.get(a.category_id) ?? null) : null;
        const durationSeconds = getDuration(a.started_at, a.finished_at) / 1000;
        const startMs = new Date(a.started_at).getTime();
        const endMs = a.finished_at ? new Date(a.finished_at).getTime() : Date.now();
        const secFromMidnight = (startMs - dayStartMs) / 1000;
        const durInDay = Math.min(endMs - dayStartMs, SECONDS_IN_DAY * 1000) / 1000 - Math.max(0, secFromMidnight);
        return {
          id: a.id,
          description: a.description,
          startedAt: a.started_at,
          finishedAt: a.finished_at,
          isActive: !a.finished_at,
          categoryId: a.category_id,
          categoryName: cat?.name ?? null,
          categoryColor: cat?.color ?? null,
          tags: (a.tags as string[]) ?? [],
          durationSeconds,
          formattedDuration: formatTotalDuration(durationSeconds),
          startTime: new Date(a.started_at).toLocaleTimeString(undefined, {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
          }),
          endTime: a.finished_at
            ? new Date(a.finished_at).toLocaleTimeString(undefined, {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
              })
            : '…',
          timelineLeft: Math.max(0, (Math.max(0, secFromMidnight) / SECONDS_IN_DAY) * 100),
          timelineWidth: Math.max(0.4, (Math.max(0, durInDay) / SECONDS_IN_DAY) * 100),
        };
      })
      .sort((a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime());

    const totalSeconds = acts.reduce((s, a) => s + a.durationSeconds, 0);

    const catMap = new Map<string | null, { color: string | null; name: string | null; seconds: number }>();
    for (const a of acts) {
      const key = a.categoryId;
      if (!catMap.has(key)) {
        catMap.set(key, { color: a.categoryColor, name: a.categoryName, seconds: 0 });
      }
      catMap.get(key)!.seconds += a.durationSeconds;
    }
    const categorySlices: CalendarCategorySlice[] = Array.from(catMap.entries())
      .sort((a, b) => b[1].seconds - a[1].seconds)
      .map(([catId, v]) => ({
        categoryId: catId,
        categoryName: v.name,
        color: v.color,
        seconds: v.seconds,
        percentage: totalSeconds > 0 ? (v.seconds / totalSeconds) * 100 : 0,
      }));

    let heatLevel: 0 | 1 | 2 | 3 | 4 = 0;
    if (totalSeconds > 0 && monthMaxSeconds.value > 0) {
      const pct = totalSeconds / monthMaxSeconds.value;
      if (pct < 0.25) heatLevel = 1;
      else if (pct < 0.5) heatLevel = 2;
      else if (pct < 0.75) heatLevel = 3;
      else heatLevel = 4;
    }

    return {
      date,
      dateStr,
      dayNum: date.getDate(),
      isCurrentMonth,
      isToday,
      isFuture,
      isWeekend,
      totalSeconds,
      sessionCount: acts.filter((a) => a.finishedAt !== null || a.isActive).length,
      activities: acts,
      categorySlices,
      formattedTotal: totalSeconds > 0 ? formatTotalDuration(totalSeconds) : '',
      heatLevel,
    };
  }

  const weeks = computed<CalendarWeek[]>(() => {
    const firstDay = new Date(year.value, month.value, 1);
    // ISO week: Mon=0 … Sun=6
    let dow = firstDay.getDay();
    if (dow === 0) {
      dow = 7;
    }
    dow -= 1;

    const calStart = new Date(firstDay);
    calStart.setDate(calStart.getDate() - dow);

    const result: CalendarWeek[] = [];
    const cur = new Date(calStart);

    for (let w = 0; w < 6; w++) {
      const days: CalendarDay[] = [];
      for (let d = 0; d < 7; d++) {
        days.push(buildDay(new Date(cur)));
        cur.setDate(cur.getDate() + 1);
      }
      const weekTotal = days.reduce((s, d) => s + d.totalSeconds, 0);
      // ISO week number
      const thursday = new Date(days[3]!.date);
      thursday.setDate(thursday.getDate() - ((thursday.getDay() + 6) % 7) + 3);
      const yearStart = new Date(thursday.getFullYear(), 0, 1);
      const weekNum = Math.ceil(((thursday.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
      result.push({ weekNum, days, weekTotalSeconds: weekTotal, formattedWeekTotal: formatTotalDuration(weekTotal) });
    }
    return result;
  });

  const monthTotalSeconds = computed(() =>
    weeks.value
      .flatMap((w) => w.days)
      .filter((d) => d.isCurrentMonth)
      .reduce((s, d) => s + d.totalSeconds, 0),
  );

  const bestDateStr = computed(() => {
    let best = '';
    let bestSec = 0;
    for (const w of weeks.value) {
      for (const d of w.days) {
        if (d.isCurrentMonth && d.totalSeconds > bestSec) {
          bestSec = d.totalSeconds;
          best = d.dateStr;
        }
      }
    }
    return best;
  });

  const calendarRange = computed(() => {
    const firstDay = new Date(year.value, month.value, 1);
    let dow = firstDay.getDay();
    if (dow === 0) dow = 7;
    dow -= 1; // Mon=0

    const from = new Date(firstDay);
    from.setDate(from.getDate() - dow);
    from.setHours(0, 0, 0, 0);

    const to = new Date(from);
    to.setDate(to.getDate() + 41); // 6 weeks = 42 days (index 0–41)
    to.setHours(23, 59, 59, 999);

    return { from, to };
  });

  return {
    weeks,
    monthTotalSeconds,
    formattedMonthTotal: computed(() => formatTotalDuration(monthTotalSeconds.value)),
    bestDateStr,
    calendarRange,
  };
}
