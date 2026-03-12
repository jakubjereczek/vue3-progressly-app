<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import { ChevronLeft, ChevronRight, Crown, X, Clock, Layers, Pencil, Trash2 } from 'lucide-vue-next';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useActivitiesStore, useCategoriesStore } from '@/stores';
import { useTranslation, useLocale, useActivitySheet } from '@/composables';
import { useCalendarData, type CalendarDay } from './useCalendarData';
import { cn } from '@/lib/utils';
import LoadingSpinner from '@/components/ui/loading-spinner/LoadingSpinner.vue';

const { t } = useTranslation();
const { locale } = useLocale();
const { openView, openEdit, openDelete } = useActivitySheet();
const route = useRoute();
const router = useRouter();

const activitiesStore = useActivitiesStore();
const categoriesStore = useCategoriesStore();
const { loading, activities } = storeToRefs(activitiesStore);
const { categories } = storeToRefs(categoriesStore);

const today = new Date();

function parseUrlYear(): number {
  const year = Number(route.query.year);
  return isFinite(year) && year > 2000 ? year : today.getFullYear();
}
function parseUrlMonth(): number {
  const month = Number(route.query.month);
  return isFinite(month) && month >= 1 && month <= 12 ? month - 1 : today.getMonth();
}

const year = ref(parseUrlYear());
const month = ref(parseUrlMonth());

watch([year, month], ([y, m]) => {
  router.replace({ query: { ...route.query, year: y, month: m + 1 } });
});

const { weeks, formattedMonthTotal, monthTotalSeconds, bestDateStr, calendarRange } = useCalendarData(
  activities,
  categories,
  year,
  month,
);

watch(
  calendarRange,
  ({ from, to }) => {
    activitiesStore.getActivitiesInRange(from, to);
  },
  { immediate: true },
);

onMounted(() => categoriesStore.getCategories());

function prevMonth() {
  if (month.value === 0) {
    month.value = 11;
    year.value--;
  } else {
    month.value--;
  }
}

function nextMonth() {
  if (month.value === 11) {
    month.value = 0;
    year.value++;
  } else {
    month.value++;
  }
}

function goToToday() {
  year.value = today.getFullYear();
  month.value = today.getMonth();
}

const isCurrentMonth = computed(() => year.value === today.getFullYear() && month.value === today.getMonth());

const monthLabel = computed(() =>
  new Date(year.value, month.value, 1).toLocaleDateString(locale.value, { month: 'long', year: 'numeric' }),
);

const DAY_LABELS = computed(() => {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat(locale.value, { weekday: 'short' });

  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(now);
    const diff = now.getDate() - (now.getDay() || 7) + 1 + i;
    date.setDate(diff);
    return formatter.format(date);
  });
});

const selectedDateStr = ref<string | null>(null);

const selectedDay = computed<CalendarDay | null>(() => {
  if (!selectedDateStr.value) {
    return null;
  }
  for (const week of weeks.value) {
    for (const day of week.days) {
      if (day.dateStr === selectedDateStr.value) {
        return day;
      }
    }
  }
  return null;
});

function selectDay(day: CalendarDay) {
  if (day.isFuture) {
    return;
  }
  selectedDateStr.value = selectedDateStr.value === day.dateStr ? null : day.dateStr;
}

function closeDetail() {
  selectedDateStr.value = null;
}

function formatDetailDate(date: Date): string {
  return date.toLocaleDateString(locale.value, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function heatClass(level: 0 | 1 | 2 | 3 | 4): string {
  switch (level) {
    case 1:
      return 'bg-primary/5';
    case 2:
      return 'bg-primary/10';
    case 3:
      return 'bg-primary/16';
    case 4:
      return 'bg-primary/24';
    default:
      return '';
  }
}

function findRawActivity(id: string) {
  return activities.value.find((a) => a.id === id);
}

function handleView(id: string) {
  const activity = findRawActivity(id);
  if (activity) {
    openView(activity);
  }
}

function handleEdit(id: string) {
  const activity = findRawActivity(id);
  if (activity) {
    openEdit(activity);
  }
}

function handleDelete(id: string) {
  const activity = findRawActivity(id);
  if (activity) {
    openDelete(activity);
  }
}

const TIMELINE_TICKS = [0, 6, 12, 18, 24];
</script>

<template>
  <Card class="p-8 flex flex-col gap-6 rounded-2xl border border-border/40 h-full">
    <div class="flex items-center justify-between flex-shrink-0">
      <div>
        <h2 class="text-xl font-semibold">{{ t('app.module.calendar.title') }}</h2>
        <p v-if="monthTotalSeconds > 0" class="text-sm text-muted-foreground mt-0.5">
          {{ formattedMonthTotal }} {{ t('app.module.calendar.tracked_this_month') }}
        </p>
      </div>
      <div class="flex items-center gap-2">
        <span class="text-sm font-medium capitalize mr-1">{{ monthLabel }}</span>
        <Button variant="outline" size="icon" class="w-8 h-8" @click="prevMonth">
          <ChevronLeft class="w-4 h-4" />
        </Button>
        <Button v-if="!isCurrentMonth" variant="outline" size="sm" class="h-8 text-xs px-3" @click="goToToday">
          {{ t('app.module.calendar.today') }}
        </Button>
        <Button variant="outline" size="icon" class="w-8 h-8" @click="nextMonth">
          <ChevronRight class="w-4 h-4" />
        </Button>
      </div>
    </div>
    <div class="flex flex-1 overflow-hidden min-h-0 border border-border/40 rounded-xl">
      <div class="flex flex-col flex-1 overflow-hidden min-w-0">
        <div
          class="grid grid-cols-[2.5rem_1fr_1fr_1fr_1fr_1fr_1fr_1fr] border-b border-border/40 bg-muted/40 flex-shrink-0"
        >
          <div class="flex items-center justify-center py-2">
            <span class="text-[10px] font-medium text-muted-foreground/60 uppercase">
              {{ t('app.module.calendar.week_col') }}
            </span>
          </div>
          <div
            v-for="label in DAY_LABELS"
            :key="label"
            class="py-2 text-center text-xs font-medium text-muted-foreground"
          >
            {{ label }}
          </div>
        </div>
        <div class="flex-1 overflow-auto">
          <div v-if="loading" class="flex items-center justify-center py-16">
            <LoadingSpinner />
          </div>
          <div v-else class="grid h-full" style="grid-template-rows: repeat(6, minmax(0, 1fr))">
            <div
              v-for="week in weeks"
              :key="week.weekNum"
              class="grid grid-cols-[2.5rem_1fr_1fr_1fr_1fr_1fr_1fr_1fr] border-b border-border/30 last:border-b-0"
            >
              <div class="flex items-center justify-center border-r border-border/30">
                <span class="text-[10px] font-medium text-muted-foreground/50 tabular-nums">
                  {{ week.weekNum }}
                </span>
              </div>
              <div
                v-for="day in week.days"
                :key="day.dateStr"
                :class="
                  cn(
                    'relative flex flex-col p-1.5 border-r border-border/20 last:border-r-0 overflow-hidden transition-colors duration-100',
                    !day.isCurrentMonth && 'opacity-25',
                    day.isFuture && 'opacity-20 cursor-default',
                    !day.isFuture && 'cursor-pointer hover:bg-muted/50',
                    selectedDateStr === day.dateStr
                      ? 'ring-1 ring-inset ring-primary/60 bg-primary/10'
                      : heatClass(day.heatLevel),
                    day.isToday && selectedDateStr !== day.dateStr && 'ring-1 ring-inset ring-primary/30',
                  )
                "
                @click="selectDay(day)"
              >
                <div class="flex items-start justify-between gap-1">
                  <span
                    :class="
                      cn(
                        'text-xs font-semibold leading-none w-5 h-5 flex items-center justify-center rounded-full flex-shrink-0',
                        day.isToday ? 'bg-primary text-primary-foreground' : 'text-foreground',
                        day.isWeekend && !day.isToday && 'text-muted-foreground',
                      )
                    "
                  >
                    {{ day.dayNum }}
                  </span>
                  <Crown
                    v-if="day.dateStr === bestDateStr && day.isCurrentMonth"
                    class="w-3 h-3 text-warning flex-shrink-0 mt-0.5"
                  />
                </div>
                <div v-if="day.totalSeconds > 0" class="mt-auto">
                  <span class="text-[10px] font-medium text-foreground/60 leading-none tabular-nums">
                    {{ day.formattedTotal }}
                  </span>
                </div>
                <div v-if="day.categorySlices.length > 0" class="flex h-1 rounded-full overflow-hidden gap-px mt-1">
                  <div
                    v-for="slice in day.categorySlices"
                    :key="slice.categoryId ?? 'none'"
                    :style="{
                      width: slice.percentage + '%',
                      backgroundColor: slice.color ?? 'var(--color-muted-foreground)',
                    }"
                    class="min-w-[2px]"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <transition
        enter-active-class="transition-all duration-200 ease-out"
        enter-from-class="opacity-0 translate-x-3"
        enter-to-class="opacity-100 translate-x-0"
        leave-active-class="transition-all duration-150 ease-in"
        leave-from-class="opacity-100 translate-x-0"
        leave-to-class="opacity-0 translate-x-3"
      >
        <div
          v-if="selectedDay"
          class="w-[300px] xl:w-[340px] flex-shrink-0 border-l border-border/40 flex flex-col bg-card overflow-hidden"
        >
          <div class="flex items-start justify-between px-4 pt-4 pb-3 border-b border-border/40">
            <div class="min-w-0">
              <p class="text-[11px] text-muted-foreground capitalize leading-none mb-1">
                {{ formatDetailDate(selectedDay.date) }}
              </p>
              <p class="text-2xl font-bold leading-none">{{ selectedDay.formattedTotal || '—' }}</p>
              <div class="flex items-center gap-3 mt-2">
                <div class="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock class="w-3 h-3" />
                  <span>{{ selectedDay.sessionCount }} {{ t('app.module.calendar.sessions') }}</span>
                </div>
                <div
                  v-if="selectedDay.categorySlices.length > 0"
                  class="flex items-center gap-1 text-xs text-muted-foreground"
                >
                  <Layers class="w-3 h-3" />
                  <span>{{ selectedDay.categorySlices.length }} {{ t('app.module.calendar.categories') }}</span>
                </div>
              </div>
            </div>
            <button
              class="text-muted-foreground hover:text-foreground transition-colors p-1 rounded flex-shrink-0"
              @click="closeDetail"
            >
              <X class="w-4 h-4" />
            </button>
          </div>
          <div v-if="selectedDay.activities.length > 0" class="px-4 py-3 border-b border-border/40">
            <p class="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-2">
              {{ t('app.module.calendar.timeline') }}
            </p>
            <div class="relative">
              <div class="h-5 bg-muted/70 rounded-md overflow-hidden relative">
                <div
                  v-for="act in selectedDay.activities"
                  :key="act.id"
                  class="absolute top-0 h-full opacity-85 first:rounded-l-md last:rounded-r-md"
                  :style="{
                    left: act.timelineLeft + '%',
                    width: Math.max(act.timelineWidth, 0.5) + '%',
                    backgroundColor: act.categoryColor ?? 'var(--color-primary)',
                  }"
                />
              </div>
              <div class="flex justify-between mt-1 px-0">
                <span v-for="h in TIMELINE_TICKS" :key="h" class="text-[9px] text-muted-foreground/50 tabular-nums">
                  {{ String(h).padStart(2, '0') }}
                </span>
              </div>
            </div>
          </div>
          <div class="flex-1 overflow-y-auto min-h-0">
            <div
              v-if="selectedDay.activities.length === 0"
              class="flex flex-col items-center justify-center h-full gap-2 p-6 text-center"
            >
              <Clock class="w-7 h-7 text-muted-foreground/30" />
              <p class="text-sm text-muted-foreground">{{ t('app.module.calendar.no_activities') }}</p>
            </div>

            <div v-else class="divide-y divide-border/30">
              <div
                v-for="act in selectedDay.activities"
                :key="act.id"
                class="group flex items-start gap-3 px-4 py-3 hover:bg-muted/30 transition-colors cursor-pointer"
                @click="handleView(act.id)"
              >
                <div class="flex-shrink-0 mt-1.5">
                  <span
                    :class="
                      cn(
                        'inline-block w-2 h-2 rounded-full ring-1 ring-border/40',
                        act.isActive ? 'bg-chart-3' : 'bg-success',
                      )
                    "
                  />
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium leading-snug truncate">
                    {{ act.description || t('app.module.calendar.no_description') }}
                  </p>
                  <p class="text-xs text-muted-foreground mt-0.5">
                    {{ act.startTime }}–{{ act.endTime }}
                    <span v-if="act.categoryName" class="ml-1">
                      ·
                      <span
                        class="inline-block w-1.5 h-1.5 rounded-full align-middle mr-0.5"
                        :style="{ backgroundColor: act.categoryColor ?? undefined }"
                      />
                      {{ act.categoryName }}
                    </span>
                  </p>
                  <div v-if="act.tags.length > 0" class="flex flex-wrap gap-1 mt-1">
                    <span
                      v-for="tag in act.tags"
                      :key="tag"
                      class="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full"
                    >
                      {{ tag }}
                    </span>
                  </div>
                </div>
                <div class="flex-shrink-0 flex flex-col items-end gap-1.5">
                  <span class="text-xs font-medium text-muted-foreground tabular-nums">
                    {{ act.formattedDuration }}
                  </span>
                  <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      class="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                      @click.stop="handleEdit(act.id)"
                    >
                      <Pencil class="w-3 h-3" />
                    </button>
                    <button
                      class="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                      @click.stop="handleDelete(act.id)"
                    >
                      <Trash2 class="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div v-if="selectedDay.categorySlices.length > 0" class="border-t border-border/40 px-4 py-3 flex-shrink-0">
            <p class="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-2">
              {{ t('app.module.calendar.breakdown') }}
            </p>
            <div class="flex flex-col gap-2">
              <div
                v-for="slice in selectedDay.categorySlices"
                :key="slice.categoryId ?? 'none'"
                class="flex items-center gap-2"
              >
                <div
                  class="w-2 h-2 rounded-full flex-shrink-0 ring-1 ring-border/40"
                  :style="{ backgroundColor: slice.color ?? 'var(--color-muted-foreground)' }"
                />
                <span class="text-xs flex-1 truncate">
                  {{ slice.categoryName ?? t('app.module.calendar.uncategorized') }}
                </span>
                <div class="flex items-center gap-2 flex-shrink-0">
                  <div class="w-16 h-1 bg-muted rounded-full overflow-hidden">
                    <div
                      class="h-full rounded-full"
                      :style="{
                        width: slice.percentage + '%',
                        backgroundColor: slice.color ?? 'var(--color-primary)',
                      }"
                    />
                  </div>
                  <span class="text-xs text-muted-foreground tabular-nums w-8 text-right">
                    {{ Math.round(slice.percentage) }}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </transition>
    </div>
  </Card>
</template>
