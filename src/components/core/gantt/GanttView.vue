<script setup lang="ts">
import { onMounted, onUnmounted, watch, computed, ref } from 'vue';
import { storeToRefs } from 'pinia';
import { useTranslation, useLocale } from '@/composables';
import { useActivitiesStore, useCategoriesStore } from '@/stores';
import { Clock, Pencil, Trash2, X, Layers, Plus } from 'lucide-vue-next';
import { Card } from '@/components/ui/card';
import LoadingSpinner from '@/components/ui/loading-spinner/LoadingSpinner.vue';
import ErrorMessage from '@/components/error-message/ErrorMessage.vue';
import { useWeekNavigation } from './useWeekNavigation';
import { useMonthNavigation } from './useMonthNavigation';
import { useGanttData, type GanttBar } from './useGanttData';
import { useTimeIndicator } from './useTimeIndicator';
import { useGanttScroll } from './useGanttScroll';
import GanttViewHeader, { type GanttMode } from './GanttViewHeader.vue';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useActivitySheet, useScrollShadow } from '@/composables';
import ManualEntryDialog from '@/components/core/manual-entry/ManualEntryDialog.vue';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatISOTime } from '@/utils/time';
import { startOfDay, endOfDay } from '@/utils/date';

const { t } = useTranslation();
const { locale } = useLocale();

const activitiesStore = useActivitiesStore();
const categoriesStore = useCategoriesStore();
const { loading, activities, error } = storeToRefs(activitiesStore);
const { categories } = storeToRefs(categoriesStore);

// ── Mode ──────────────────────────────────────────────────────────────────
const mode = ref<GanttMode>('week');

// ── Week navigation ───────────────────────────────────────────────────────
const { weekDays, changeWeek } = useWeekNavigation();

// ── Month navigation ──────────────────────────────────────────────────────
const { monthDays, monthLabel, changeMonth, isCurrentMonth } = useMonthNavigation();

// ── Range labels ──────────────────────────────────────────────────────────
const weekRangeLabel = computed(() => {
  const start = weekDays.value[0]!;
  const end = weekDays.value[6]!;
  const fmt = (d: Date) => d.toLocaleDateString(locale.value, { day: 'numeric', month: 'short' });
  return `${fmt(start)} – ${fmt(end)}, ${start.getFullYear()}`;
});

const rangeLabel = computed(() => (mode.value === 'month' ? monthLabel.value : weekRangeLabel.value));

const canGoNext = computed(() => (mode.value === 'month' ? !isCurrentMonth.value : true));

function handleNavigate(direction: 'prev' | 'next') {
  if (mode.value === 'month') changeMonth(direction);
  else changeWeek(direction);
}

watch(mode, () => {
  selectedActivityId.value = null;
});

// ── Data fetch ────────────────────────────────────────────────────────────
const activeRange = computed(() => {
  const days = mode.value === 'month' ? monthDays.value : weekDays.value;
  const fromRaw = new Date(days[0]!);
  if (mode.value === 'week') fromRaw.setDate(fromRaw.getDate() - 1);
  const from = startOfDay(fromRaw);
  const to = endOfDay(new Date(days[days.length - 1]!));
  return { from, to };
});

watch(
  activeRange,
  ({ from, to }) => {
    activitiesStore.getActivitiesInRange(from, to);
  },
  { immediate: true },
);

onMounted(() => {
  categoriesStore.getCategories();
});

// ── Timeline data ─────────────────────────────────────────────────────────
const timelineDays = computed(() => (mode.value === 'month' ? monthDays.value : weekDays.value));
const { ganttRows } = useGanttData(activities, timelineDays, categories);

// ── Activity sheet ────────────────────────────────────────────────────────
const { openEdit, openDelete } = useActivitySheet();

function findActivity(activityId: string) {
  return activities.value.find((a) => a.id === activityId);
}

function handleBarEdit(activityId: string) {
  const activity = findActivity(activityId);
  if (activity) openEdit(activity);
}

function handleBarDelete(activityId: string) {
  const activity = findActivity(activityId);
  if (activity) openDelete(activity);
}

// ── Detail panel ──────────────────────────────────────────────────────────
const selectedActivityId = ref<string | null>(null);

const barMap = computed<Map<string, GanttBar>>(() => {
  const map = new Map<string, GanttBar>();
  for (const row of ganttRows.value) {
    for (const bar of row.bars) {
      map.set(bar.activityId, bar);
    }
  }
  return map;
});

const selectedBar = computed<GanttBar | null>(() =>
  selectedActivityId.value ? (barMap.value.get(selectedActivityId.value) ?? null) : null,
);

function selectBar(activityId: string) {
  selectedActivityId.value = selectedActivityId.value === activityId ? null : activityId;
}

function closeDetail() {
  selectedActivityId.value = null;
}

// Clear selection when the selected activity is deleted from the store
watch(activities, (newActivities) => {
  if (selectedActivityId.value !== null && !newActivities.some((a) => a.id === selectedActivityId.value)) {
    selectedActivityId.value = null;
  }
});

// ── Manual entry ──────────────────────────────────────────────────────────
const manualEntryOpen = ref(false);

// ── Zoom ──────────────────────────────────────────────────────────────────
const zoom = ref(100);
// BASE_HOUR_WIDTH_PX: pixels per hour at 100% zoom
const BASE_HOUR_WIDTH_PX = 240;
const HOUR_WIDTH = computed(() => Math.round((BASE_HOUR_WIDTH_PX * zoom.value) / 100));

// ── Time indicator ────────────────────────────────────────────────────────
const { timeLinePercentage } = useTimeIndicator();

// ── Scroll ────────────────────────────────────────────────────────────────
const { scrollContainer, scrollToNow } = useGanttScroll(() => HOUR_WIDTH.value);

watch(zoom, () => scrollToNow());
watch(loading, (val) => {
  if (!val) scrollToNow();
});
const { canScrollStart: canScrollLeft, canScrollEnd: canScrollRight } = useScrollShadow(scrollContainer, 'horizontal');

// ── Keyboard navigation ───────────────────────────────────────────────────
const allBars = computed<GanttBar[]>(() => ganttRows.value.flatMap((r) => r.bars));

function handleKeydown(e: KeyboardEvent) {
  const target = e.target as HTMLElement;
  if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;

  if (!selectedBar.value) return;

  if (e.key === 'Escape') {
    closeDetail();
  } else if (e.key === 'e' || e.key === 'E') {
    handleBarEdit(selectedBar.value.activityId);
  } else if (e.key === 'Delete' || e.key === 'Backspace') {
    handleBarDelete(selectedBar.value.activityId);
  } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
    e.preventDefault();
    const idx = allBars.value.findIndex((b) => b.activityId === selectedActivityId.value);
    if (idx > 0) selectBar(allBars.value[idx - 1]!.activityId);
  } else if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
    e.preventDefault();
    const idx = allBars.value.findIndex((b) => b.activityId === selectedActivityId.value);
    if (idx < allBars.value.length - 1) selectBar(allBars.value[idx + 1]!.activityId);
  }
}

onMounted(() => window.addEventListener('keydown', handleKeydown));
onUnmounted(() => window.removeEventListener('keydown', handleKeydown));

// ── Helpers ───────────────────────────────────────────────────────────────
function isToday(date: Date): boolean {
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
}

function formatDayName(date: Date): string {
  return date.toLocaleDateString(locale.value, {
    weekday: mode.value === 'month' ? 'short' : 'long',
  });
}

function formatDayDate(date: Date): string {
  return date.toLocaleDateString(locale.value, { day: 'numeric', month: 'short' });
}

const formatTime = (iso: string | null) => formatISOTime(iso, locale.value);

const isMonthMode = computed(() => mode.value === 'month');
</script>

<template>
  <Card data-tour="gantt" class="p-6 flex flex-col gap-6 rounded-2xl border border-border/40 h-full">
    <div class="w-full flex-shrink-0 flex items-start gap-4">
      <div class="flex-1 min-w-0">
        <GanttViewHeader
          :mode="mode"
          :range-label="rangeLabel"
          :can-go-next="canGoNext"
          :zoom="zoom"
          @change-mode="(m) => (mode = m)"
          @navigate="handleNavigate"
          @change-zoom="(z) => (zoom = z)"
        />
      </div>
      <Button variant="outline" class="gap-2 flex-shrink-0 mt-0.5" @click="manualEntryOpen = true">
        <Plus class="w-3.5 h-3.5" />{{ t('app.module.gantt.log_activity') }}
      </Button>
    </div>
    <ManualEntryDialog :open="manualEntryOpen" @update:open="manualEntryOpen = $event" />

    <div class="flex-1 min-h-0 relative">
      <div v-if="error" class="flex justify-center items-center h-full p-6">
        <ErrorMessage :title="t(error)" />
      </div>

      <div v-else-if="loading" class="flex justify-center items-center h-full">
        <LoadingSpinner />
      </div>

      <div v-else class="flex h-full border border-border/40 rounded-xl overflow-hidden bg-card">
        <div class="flex-1 relative min-w-0">
          <!-- Scroll shadows -->
          <div
            class="absolute inset-y-0 w-16 z-50 pointer-events-none transition-opacity duration-200"
            :class="canScrollLeft ? 'opacity-100' : 'opacity-0'"
            style="left: 140px; background: linear-gradient(to right, var(--color-card), transparent)"
          />
          <div
            class="absolute inset-y-0 w-16 z-50 pointer-events-none transition-opacity duration-200"
            :class="canScrollRight ? 'opacity-100' : 'opacity-0'"
            style="right: 100px; background: linear-gradient(to left, var(--color-card), transparent)"
          />
          <div
            ref="scrollContainer"
            class="h-full overflow-x-auto overflow-y-auto custom-scrollbar scroll-smooth touch-pan-x"
          >
            <div :style="{ width: 24 * HOUR_WIDTH + 'px' }" class="flex flex-col relative min-h-full">
              <!-- Hour grid background -->
              <div class="absolute inset-0 flex pointer-events-none">
                <div
                  v-for="h in 24"
                  :key="h"
                  class="h-full border-r border-border/10 flex items-start px-2 py-1"
                  :style="{ width: HOUR_WIDTH + 'px' }"
                >
                  <span class="text-2xs text-muted-foreground/50 font-mono">{{ h - 1 }}:00</span>
                </div>
              </div>

              <div
                v-for="row in ganttRows"
                :key="row.dateStr"
                class="border-b border-border/40 last:border-b-0 relative flex items-center group transition-colors"
                :class="[
                  isMonthMode ? 'flex-shrink-0 h-[60px]' : 'flex-shrink-0 h-[90px]',
                  isToday(row.date) ? 'bg-accent/30' : '',
                ]"
              >
                <div
                  class="sticky left-0 z-40 w-[140px] h-full flex-shrink-0 border-r border-border/40 px-4 flex flex-col justify-center backdrop-blur-sm transition-colors"
                  :class="isToday(row.date) ? 'bg-accent/60' : 'bg-muted/60'"
                >
                  <p class="text-xs text-muted-foreground capitalize">{{ formatDayName(row.date) }}</p>
                  <p class="text-sm font-medium" :class="isToday(row.date) ? 'text-primary' : 'text-foreground'">
                    {{ formatDayDate(row.date) }}
                  </p>
                </div>

                <div class="flex-1 h-full relative mx-2">
                  <div
                    v-if="isToday(row.date)"
                    class="absolute top-0 bottom-0 z-30 pointer-events-none border-l-2 border-destructive/80 transition-all duration-700 ease-in-out"
                    :style="{ left: timeLinePercentage + '%' }"
                  >
                    <div
                      class="absolute -top-1 -left-[10px] bg-destructive text-destructive-foreground rounded-full p-0.5 shadow-lg"
                    >
                      <Clock class="w-4 h-4" />
                    </div>
                  </div>

                  <div v-if="row.isEmpty" class="h-full flex items-center px-4">
                    <span class="text-xs text-muted-foreground italic">{{ t('app.module.gantt.no_activities') }}</span>
                  </div>

                  <template v-else>
                    <div
                      v-for="bar in row.bars"
                      :key="bar.id"
                      class="absolute top-1/2 -translate-y-1/2 h-[78%] pointer-events-none"
                      :style="{ width: bar.percentage + '%', left: bar.leftPercentage + '%' }"
                    >
                      <TooltipProvider :delay-duration="500">
                        <Tooltip>
                          <TooltipTrigger as-child>
                            <div
                              @click="selectBar(bar.activityId)"
                              :style="{
                                borderLeftColor: bar.isActive
                                  ? 'var(--color-chart-3)'
                                  : (bar.categoryColor ?? 'var(--color-border)'),
                                backgroundColor: bar.isActive
                                  ? 'color-mix(in oklab, var(--color-chart-3) 14%, var(--color-card))'
                                  : bar.categoryColor
                                    ? `color-mix(in oklab, ${bar.categoryColor} 16%, var(--color-card))`
                                    : 'var(--color-card)',
                              }"
                              :class="[
                                'absolute inset-0 flex flex-col justify-center overflow-hidden',
                                'border border-border/30 border-l-[3px]',
                                'cursor-pointer pointer-events-auto transition-all duration-150',
                                bar.percentage < 1 ? 'rounded px-1' : 'rounded-md pl-2.5 pr-2',
                                selectedActivityId === bar.activityId
                                  ? 'shadow-lg ring-2 ring-primary/50 z-20'
                                  : bar.isActive
                                    ? 'shadow-md ring-1 ring-chart-3/50 z-10'
                                    : 'hover:shadow-lg hover:z-20 hover:border-border/60',
                              ]"
                            >
                              <!-- Tiny bar: just an active dot -->
                              <template v-if="bar.percentage < 1">
                                <div class="flex items-center justify-center h-full">
                                  <span v-if="bar.isActive" class="relative flex h-1.5 w-1.5 flex-shrink-0">
                                    <span class="absolute inset-0 rounded-full bg-chart-3/60 animate-ping" />
                                    <span class="absolute inset-[1px] rounded-full bg-chart-3" />
                                  </span>
                                </div>
                              </template>

                              <!-- Narrow bar: title only -->
                              <template v-else-if="bar.percentage < 3">
                                <div class="flex items-center gap-1 min-w-0 h-full">
                                  <span v-if="bar.isActive" class="relative flex-shrink-0 flex h-2 w-2">
                                    <span class="absolute inset-0 rounded-full bg-chart-3/40 animate-ping" />
                                    <span class="absolute inset-[2px] rounded-full bg-chart-3" />
                                  </span>
                                  <span class="text-2xs text-foreground font-medium truncate leading-tight">{{
                                    bar.description || '—'
                                  }}</span>
                                </div>
                              </template>

                              <!-- Medium bar: title + time -->
                              <template v-else-if="bar.percentage < 6">
                                <div class="flex items-center gap-1.5 min-w-0">
                                  <span v-if="bar.isActive" class="relative flex-shrink-0 flex h-2 w-2">
                                    <span class="absolute inset-0 rounded-full bg-chart-3/40 animate-ping" />
                                    <span class="absolute inset-[2px] rounded-full bg-chart-3" />
                                  </span>
                                  <span class="text-2xs text-foreground font-medium truncate leading-tight">{{
                                    bar.description || '—'
                                  }}</span>
                                </div>
                                <span class="text-2xs text-muted-foreground/80 font-mono truncate leading-none mt-0.5">
                                  {{ formatTime(bar.startedAt)
                                  }}{{ bar.isActive ? ' →' : ` – ${formatTime(bar.finishedAt)}` }}
                                </span>
                              </template>

                              <!-- Wide bar: title + time (clean, no inner badge) -->
                              <template v-else>
                                <div class="flex items-center gap-1.5 min-w-0">
                                  <span v-if="bar.isActive" class="relative flex-shrink-0 flex h-2 w-2">
                                    <span class="absolute inset-0 rounded-full bg-chart-3/40 animate-ping" />
                                    <span class="absolute inset-[2px] rounded-full bg-chart-3" />
                                  </span>
                                  <span class="text-xs text-foreground font-medium truncate leading-tight">{{
                                    bar.description || '—'
                                  }}</span>
                                </div>
                                <span class="text-2xs text-muted-foreground/70 font-mono truncate leading-none mt-0.5">
                                  {{ formatTime(bar.startedAt) }}<span class="mx-0.5 opacity-50">–</span
                                  >{{ bar.isActive ? '…' : formatTime(bar.finishedAt) }}
                                </span>
                              </template>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent
                            side="top"
                            :side-offset="10"
                            hide-arrow
                            class="bg-popover text-popover-foreground border border-border/50 shadow-xl rounded-xl p-3 w-56 z-50"
                          >
                            <div class="flex items-center gap-2">
                              <span
                                class="w-2 h-2 rounded-full flex-shrink-0"
                                :style="
                                  bar.categoryColor
                                    ? { backgroundColor: bar.categoryColor }
                                    : { backgroundColor: 'var(--color-muted-foreground)' }
                                "
                              />
                              <span class="text-xs font-semibold text-foreground truncate flex-1 leading-tight">{{
                                bar.description || t('app.module.activities_history.no_description')
                              }}</span>
                              <span class="text-xs font-mono tabular-nums text-muted-foreground flex-shrink-0">{{
                                bar.formattedDuration
                              }}</span>
                            </div>
                            <div class="flex items-center mt-1.5 gap-2 min-w-0">
                              <span
                                v-if="bar.categoryName"
                                class="text-2xs font-medium px-1.5 py-px rounded-full border leading-none min-w-0 truncate"
                                :style="
                                  bar.categoryColor
                                    ? {
                                        backgroundColor: `color-mix(in oklab, ${bar.categoryColor} 14%, transparent)`,
                                        color: bar.categoryColor,
                                        borderColor: `color-mix(in oklab, ${bar.categoryColor} 35%, transparent)`,
                                      }
                                    : {}
                                "
                                >{{ bar.categoryName }}</span
                              >
                              <span class="text-2xs font-mono tabular-nums text-muted-foreground flex-shrink-0 ml-auto">
                                {{ formatTime(bar.startedAt) }}<span class="text-muted-foreground/50 mx-0.5">→</span
                                ><span :class="bar.isActive ? 'text-primary' : ''">{{
                                  bar.isActive ? '…' : formatTime(bar.finishedAt)
                                }}</span>
                              </span>
                            </div>
                            <div v-if="bar.tags.length > 0" class="flex flex-wrap gap-1 mt-1.5">
                              <span
                                v-for="tag in bar.tags"
                                :key="tag"
                                class="text-2xs px-1.5 py-px rounded-full bg-muted text-muted-foreground border border-border/40 leading-none"
                                >{{ tag }}</span
                              >
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </template>
                </div>

                <div
                  class="sticky right-0 z-40 w-[100px] h-full flex-shrink-0 border-l border-border/40 px-3 flex flex-col items-end justify-center gap-1.5 shadow-card backdrop-blur-sm transition-colors"
                  :class="isToday(row.date) ? 'bg-accent/60' : 'bg-muted/60'"
                >
                  <span
                    class="text-sm tabular-nums font-mono"
                    :class="
                      row.isEmpty
                        ? 'text-muted-foreground'
                        : isToday(row.date)
                          ? 'text-primary font-medium'
                          : 'text-foreground'
                    "
                  >
                    {{ row.isEmpty ? '—' : row.formattedTotal }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Detail panel -->
        <transition
          enter-active-class="transition-all duration-200 ease-out"
          enter-from-class="opacity-0 translate-x-3"
          enter-to-class="opacity-100 translate-x-0"
          leave-active-class="transition-all duration-150 ease-in"
          leave-from-class="opacity-100 translate-x-0"
          leave-to-class="opacity-0 translate-x-3"
        >
          <div
            v-if="selectedBar"
            class="hidden sm:flex w-[280px] flex-shrink-0 border-l border-border/40 flex-col bg-card overflow-hidden"
          >
            <div class="flex items-start justify-between px-4 pt-4 pb-3 border-b border-border/40">
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-2 mb-1">
                  <span
                    :class="
                      cn(
                        'inline-block w-2 h-2 rounded-full ring-1 ring-border/40 flex-shrink-0',
                        selectedBar.isActive ? 'bg-chart-3' : 'bg-success',
                      )
                    "
                  />
                  <span class="text-2xs text-muted-foreground">{{
                    selectedBar.isActive
                      ? t('app.module.gantt.detail.in_progress')
                      : t('app.module.gantt.detail.finished')
                  }}</span>
                </div>
                <p class="text-sm font-semibold leading-snug">
                  {{ selectedBar.description || t('app.module.calendar.no_description') }}
                </p>
              </div>
              <button
                class="text-muted-foreground hover:text-foreground transition-colors p-1 rounded flex-shrink-0 ml-2"
                @click="closeDetail"
                :aria-label="t('app.action.close')"
              >
                <X class="w-4 h-4" />
              </button>
            </div>
            <div class="px-4 py-3 border-b border-border/40 flex flex-col gap-2">
              <div class="flex items-center justify-between text-xs">
                <span class="text-muted-foreground">{{ t('app.module.gantt.detail.start') }}</span>
                <span class="font-mono tabular-nums">{{ formatTime(selectedBar.startedAt) }}</span>
              </div>
              <div class="flex items-center justify-between text-xs">
                <span class="text-muted-foreground">{{ t('app.module.gantt.detail.end') }}</span>
                <span class="font-mono tabular-nums" :class="selectedBar.isActive ? 'text-chart-3' : ''">{{
                  selectedBar.isActive ? '…' : formatTime(selectedBar.finishedAt)
                }}</span>
              </div>
              <div class="flex items-center justify-between text-xs">
                <span class="text-muted-foreground">{{ t('app.module.gantt.detail.duration') }}</span>
                <span class="font-mono tabular-nums font-medium">{{ selectedBar.formattedDuration }}</span>
              </div>
            </div>
            <div v-if="selectedBar.categoryName" class="px-4 py-3 border-b border-border/40">
              <p class="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2">
                {{ t('app.module.gantt.detail.category') }}
              </p>
              <div class="flex items-center gap-2">
                <span
                  class="w-3 h-3 rounded-full flex-shrink-0 ring-1 ring-border/40"
                  :style="{ backgroundColor: selectedBar.categoryColor ?? 'var(--color-muted-foreground)' }"
                />
                <span class="text-sm font-medium">{{ selectedBar.categoryName }}</span>
              </div>
            </div>
            <div v-if="selectedBar.tags.length > 0" class="px-4 py-3 border-b border-border/40">
              <p class="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2">
                <Layers class="w-3 h-3 inline mr-1" />{{ t('app.module.gantt.detail.tags') }}
              </p>
              <div class="flex flex-wrap gap-1.5">
                <span
                  v-for="tag in selectedBar.tags"
                  :key="tag"
                  class="text-2xs bg-muted text-muted-foreground px-2 py-1 rounded-full border border-border/40"
                  >{{ tag }}</span
                >
              </div>
            </div>
            <div class="px-4 py-3 mt-auto flex flex-col gap-2">
              <button
                class="flex items-center justify-center gap-2 w-full py-2 rounded-lg border border-border/50 text-sm text-foreground hover:bg-muted transition-colors"
                @click="handleBarEdit(selectedBar.activityId)"
              >
                <Pencil class="w-3.5 h-3.5" />{{ t('app.module.gantt.detail.edit') }}
              </button>
              <button
                class="flex items-center justify-center gap-2 w-full py-2 rounded-lg border border-destructive/30 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                @click="handleBarDelete(selectedBar.activityId)"
              >
                <Trash2 class="w-3.5 h-3.5" />{{ t('app.module.gantt.detail.delete') }}
              </button>
            </div>
          </div>
        </transition>
      </div>
    </div>
  </Card>

  <!-- Mobile detail panel — fixed bottom sheet (< sm only) -->
  <template v-if="selectedBar">
    <div class="sm:hidden fixed inset-0 z-40 bg-overlay backdrop-blur-sm" @click="closeDetail" />
    <Transition
      enter-active-class="transition-transform duration-300 ease-out"
      enter-from-class="translate-y-full"
      enter-to-class="translate-y-0"
      leave-active-class="transition-transform duration-200 ease-in"
      leave-from-class="translate-y-0"
      leave-to-class="translate-y-full"
    >
      <div
        class="sm:hidden fixed inset-x-0 bottom-0 z-50 flex flex-col bg-card border-t border-border/40 rounded-t-2xl shadow-hero overflow-hidden max-h-[85svh]"
      >
        <!-- Handle bar -->
        <div class="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div class="w-10 h-1 rounded-full bg-muted-foreground/20" />
        </div>

        <!-- Header -->
        <div class="flex items-start justify-between px-4 pt-2 pb-3 border-b border-border/40 flex-shrink-0">
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2 mb-1">
              <span
                :class="
                  cn(
                    'inline-block w-2 h-2 rounded-full ring-1 ring-border/40 flex-shrink-0',
                    selectedBar.isActive ? 'bg-chart-3' : 'bg-success',
                  )
                "
              />
              <span class="text-2xs text-muted-foreground">{{
                selectedBar.isActive ? t('app.module.gantt.detail.in_progress') : t('app.module.gantt.detail.finished')
              }}</span>
            </div>
            <p class="text-sm font-semibold leading-snug">
              {{ selectedBar.description || t('app.module.calendar.no_description') }}
            </p>
          </div>
          <button
            class="text-muted-foreground hover:text-foreground transition-colors p-1 rounded flex-shrink-0 ml-2"
            @click="closeDetail"
            :aria-label="t('app.action.close')"
          >
            <X class="w-4 h-4" />
          </button>
        </div>

        <!-- Time info -->
        <div class="px-4 py-3 border-b border-border/40 flex flex-col gap-2 flex-shrink-0">
          <div class="flex items-center justify-between text-xs">
            <span class="text-muted-foreground">{{ t('app.module.gantt.detail.start') }}</span>
            <span class="font-mono tabular-nums">{{ formatTime(selectedBar.startedAt) }}</span>
          </div>
          <div class="flex items-center justify-between text-xs">
            <span class="text-muted-foreground">{{ t('app.module.gantt.detail.end') }}</span>
            <span class="font-mono tabular-nums" :class="selectedBar.isActive ? 'text-chart-3' : ''">{{
              selectedBar.isActive ? '…' : formatTime(selectedBar.finishedAt)
            }}</span>
          </div>
          <div class="flex items-center justify-between text-xs">
            <span class="text-muted-foreground">{{ t('app.module.gantt.detail.duration') }}</span>
            <span class="font-mono tabular-nums font-medium">{{ selectedBar.formattedDuration }}</span>
          </div>
        </div>

        <!-- Category -->
        <div v-if="selectedBar.categoryName" class="px-4 py-3 border-b border-border/40 flex-shrink-0">
          <p class="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2">
            {{ t('app.module.gantt.detail.category') }}
          </p>
          <div class="flex items-center gap-2">
            <span
              class="w-3 h-3 rounded-full flex-shrink-0 ring-1 ring-border/40"
              :style="{ backgroundColor: selectedBar.categoryColor ?? 'var(--color-muted-foreground)' }"
            />
            <span class="text-sm font-medium">{{ selectedBar.categoryName }}</span>
          </div>
        </div>

        <!-- Tags -->
        <div v-if="selectedBar.tags.length > 0" class="px-4 py-3 border-b border-border/40 flex-shrink-0">
          <p class="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2">
            <Layers class="w-3 h-3 inline mr-1" />{{ t('app.module.gantt.detail.tags') }}
          </p>
          <div class="flex flex-wrap gap-1.5">
            <span
              v-for="tag in selectedBar.tags"
              :key="tag"
              class="text-2xs bg-muted text-muted-foreground px-2 py-1 rounded-full border border-border/40"
              >{{ tag }}</span
            >
          </div>
        </div>

        <!-- Actions -->
        <div class="px-4 py-3 flex flex-col gap-2 flex-shrink-0">
          <button
            class="flex items-center justify-center gap-2 w-full py-2 rounded-lg border border-border/50 text-sm text-foreground hover:bg-muted transition-colors"
            @click="handleBarEdit(selectedBar.activityId)"
          >
            <Pencil class="w-3.5 h-3.5" />{{ t('app.module.gantt.detail.edit') }}
          </button>
          <button
            class="flex items-center justify-center gap-2 w-full py-2 rounded-lg border border-destructive/30 text-sm text-destructive hover:bg-destructive/10 transition-colors"
            @click="handleBarDelete(selectedBar.activityId)"
          >
            <Trash2 class="w-3.5 h-3.5" />{{ t('app.module.gantt.detail.delete') }}
          </button>
        </div>
      </div>
    </Transition>
  </template>
</template>
