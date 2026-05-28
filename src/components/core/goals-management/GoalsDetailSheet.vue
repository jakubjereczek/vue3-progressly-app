<script setup lang="ts">
import { computed } from 'vue';
import {
  Pencil,
  Archive,
  Trash2,
  ArchiveRestore,
  Target,
  Calendar,
  TrendingUp,
  Award,
  Clock,
  Layers,
} from 'lucide-vue-next';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetClose } from '@/components/ui/sheet';
import type { TableRow } from '@/api/supabase';
import { useTranslation } from '@/composables';
import { formatTotalDuration, formatDuration, formatDurationCompact, localDateToString } from '@/utils/time';
import { computeGoalCurrent, getGoalStatus, getGoalTarget, isGoalPeriodMet } from './useGoalProgress';
import { useGoalDetail, getGoalFirstPeriodKey, type GoalPeriodBar } from './useGoalDetail';
import { cn } from '@/lib/utils';

const props = defineProps<{
  open: boolean;
  goal: TableRow<'goals'> | null;
  activities: TableRow<'activities'>[];
  categories: TableRow<'categories'>[];
}>();

const emit = defineEmits<{
  'update:open': [value: boolean];
  edit: [];
  archive: [];
  unarchive: [];
  delete: [];
}>();

const { t } = useTranslation();

const category = computed(() =>
  props.goal?.category_id ? (props.categories.find((c) => c.id === props.goal!.category_id) ?? null) : null,
);

const status = computed(() => (props.goal ? getGoalStatus(props.goal) : 'active'));

const currentValue = computed(() => (props.goal ? computeGoalCurrent(props.goal, props.activities) : 0));

const percentage = computed(() => {
  if (!props.goal) return 0;
  const target = getGoalTarget(props.goal);
  return target > 0 ? Math.min(100, Math.round((currentValue.value / target) * 100)) : 0;
});

const progressColor = computed(() => {
  if (!props.goal) return 'var(--color-primary)';
  if (percentage.value >= 100) return 'var(--color-success)';
  if (percentage.value >= 60) return 'var(--color-chart-3)';
  return props.goal.color;
});

const detail = computed(() => (props.goal ? useGoalDetail(props.goal, props.activities) : null));

const CHART_H = 80;

function barHeight(value: number): number {
  if (!value || !detail.value) return 0;
  return Math.max(2, (value / detail.value.maxBarValue.value) * CHART_H);
}

function targetLineBottom(): number {
  if (!props.goal || !detail.value) return 0;
  const target = getGoalTarget(props.goal);
  return Math.min((target / detail.value.maxBarValue.value) * CHART_H, CHART_H);
}

const periodLabel = computed(() => {
  if (!props.goal) return '';
  if (props.goal.type === 'total') return t('app.module.goals.type.total');
  return t(`app.module.goals.period.${props.goal.period}`);
});

const dateRangeLabel = computed(() => {
  if (!props.goal) return '';
  if (!props.goal.ended_at) return `${t('app.module.goals.card.from')} ${props.goal.started_at}`;
  return `${props.goal.started_at} → ${props.goal.ended_at}`;
});

const isCountGoal = computed(() => props.goal?.metric === 'count');

function fmtBarVal(bar: GoalPeriodBar): string {
  if (!props.goal) return '';
  if (isCountGoal.value) return String(bar.count);
  return formatDurationCompact(bar.seconds);
}

const kpiItems = computed(() => {
  if (!props.goal || !detail.value) return [];
  const formatValue = (v: number) => (isCountGoal.value ? String(v) : formatTotalDuration(v));
  return [
    {
      icon: Award,
      label: t('app.module.goals.detail.best'),
      value: formatValue(detail.value.bestValue.value),
    },
    {
      icon: TrendingUp,
      label: t('app.module.goals.detail.avg'),
      value: formatValue(detail.value.avgValue.value),
    },
    {
      icon: Layers,
      label: t('app.module.goals.detail.sessions'),
      value: String(detail.value.totalSessions.value),
    },
    ...(detail.value.daysRemaining.value !== null
      ? [
          {
            icon: Calendar,
            label: t('app.module.goals.detail.days_remaining'),
            value: String(detail.value.daysRemaining.value),
          },
        ]
      : []),
  ];
});
</script>

<template>
  <Sheet :open="open" @update:open="emit('update:open', $event)">
    <SheetContent side="right" class="w-full sm:max-w-[520px] overflow-y-auto p-0 flex flex-col">
      <template v-if="goal">
        <!-- Header -->
        <SheetHeader class="px-6 pt-6 pb-4 border-b border-border/40 flex-shrink-0">
          <div class="flex items-start justify-between gap-3">
            <div class="flex items-center gap-3 min-w-0">
              <div
                class="w-8 h-8 rounded-lg flex-shrink-0"
                :style="{ backgroundColor: goal.color + '30', border: `1.5px solid ${goal.color}50` }"
              >
                <Target class="w-full h-full p-1.5" :style="{ color: goal.color }" />
              </div>
              <div class="min-w-0">
                <SheetTitle class="text-base font-semibold leading-tight truncate">{{ goal.name }}</SheetTitle>
                <div class="flex items-center gap-1.5 mt-0.5 flex-wrap">
                  <span class="text-2xs text-muted-foreground/60">{{ periodLabel }}</span>
                  <span v-if="category" class="text-2xs text-muted-foreground/40">·</span>
                  <span
                    v-if="category"
                    class="inline-flex items-center gap-1 text-2xs"
                    :style="{ color: category.color }"
                  >
                    <span class="w-1.5 h-1.5 rounded-full" :style="{ backgroundColor: category.color }" />
                    {{ category.name }}
                  </span>
                  <span class="text-2xs text-muted-foreground/40">·</span>
                  <span class="text-2xs text-muted-foreground/60">{{ dateRangeLabel }}</span>
                </div>
              </div>
            </div>
            <SheetClose
              class="rounded-md opacity-70 hover:opacity-100 transition-opacity flex-shrink-0 mt-0.5"
              :aria-label="t('app.action.close')"
            />
          </div>

          <!-- Action buttons -->
          <div class="flex items-center gap-1.5 mt-3">
            <button
              v-if="status !== 'archived'"
              class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-border/50 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              @click="emit('edit')"
            >
              <Pencil class="w-3.5 h-3.5" />
              {{ t('app.action.edit') }}
            </button>
            <button
              v-if="status !== 'archived'"
              class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-border/50 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              @click="emit('archive')"
            >
              <Archive class="w-3.5 h-3.5" />
              {{ t('app.module.goals.action.archive') }}
            </button>
            <button
              v-else
              class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-border/50 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              @click="emit('unarchive')"
            >
              <ArchiveRestore class="w-3.5 h-3.5" />
              {{ t('app.module.goals.action.unarchive') }}
            </button>
            <button
              class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-destructive/30 text-destructive/70 hover:text-destructive hover:bg-destructive/10 transition-colors ml-auto"
              @click="emit('delete')"
            >
              <Trash2 class="w-3.5 h-3.5" />
              {{ t('app.action.delete') }}
            </button>
          </div>
        </SheetHeader>

        <div class="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-6">
          <!-- Current progress -->
          <div class="flex flex-col gap-2">
            <span class="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
              {{ t('app.module.goals.detail.current_progress') }}
            </span>
            <div class="bg-muted/30 rounded-xl border border-border/40 p-4 flex flex-col gap-3">
              <div class="flex items-end justify-between gap-4">
                <div>
                  <div class="text-3xl font-bold tabular-nums leading-none" :style="{ color: progressColor }">
                    {{ percentage }}%
                  </div>
                  <div class="text-sm text-muted-foreground mt-1">
                    <template v-if="isCountGoal"> {{ currentValue }} / {{ goal.target_count ?? 0 }} </template>
                    <template v-else>
                      {{ formatTotalDuration(currentValue) }}
                      <span class="text-muted-foreground/50 mx-1">/</span>
                      {{ formatTotalDuration(goal.target_seconds ?? 0) }}
                    </template>
                  </div>
                </div>
                <span
                  :class="
                    cn(
                      'text-2xs font-medium px-2.5 py-1 rounded-full border',
                      status === 'active' && 'bg-success/10 text-success border-success/20',
                      status === 'upcoming' && 'bg-warning/10 text-warning border-warning/20',
                      status === 'ended' && 'bg-muted text-muted-foreground border-border/40',
                      status === 'archived' && 'bg-muted text-muted-foreground border-border/40',
                    )
                  "
                >
                  {{ t(`app.module.goals.status.${status}`) }}
                </span>
              </div>
              <div
                class="h-2 rounded-full bg-muted overflow-hidden"
                role="progressbar"
                :aria-valuenow="percentage"
                aria-valuemin="0"
                aria-valuemax="100"
                :aria-label="t('app.module.goals.detail.current_progress')"
              >
                <div
                  class="h-full rounded-full transition-all duration-700 ease-out"
                  :style="{ width: `${percentage}%`, backgroundColor: progressColor }"
                />
              </div>
            </div>
          </div>

          <!-- KPI stats -->
          <div class="flex flex-col gap-2">
            <span class="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
              {{ t('app.module.goals.detail.stats') }}
            </span>
            <div class="grid grid-cols-2 gap-2 sm:grid-cols-4" :class="kpiItems.length === 3 ? 'sm:grid-cols-3' : ''">
              <div
                v-for="kpi in kpiItems"
                :key="kpi.label"
                class="bg-card border border-border/40 rounded-xl p-3 flex flex-col gap-2"
              >
                <div class="flex items-center justify-between">
                  <span class="text-2xs text-muted-foreground font-medium">{{ kpi.label }}</span>
                  <div class="w-6 h-6 rounded-md bg-muted flex items-center justify-center">
                    <component :is="kpi.icon" class="w-3 h-3 text-muted-foreground" />
                  </div>
                </div>
                <span class="text-base font-semibold tabular-nums text-foreground leading-none">{{ kpi.value }}</span>
              </div>
            </div>
          </div>

          <!-- History chart -->
          <div v-if="detail" class="flex flex-col gap-2">
            <span class="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
              {{ t('app.module.goals.detail.history') }}
            </span>
            <div
              v-if="detail.bars.value.length <= 1"
              class="bg-card border border-border/40 rounded-xl px-4 py-6 text-center"
            >
              <p class="text-xs text-muted-foreground/50">{{ t('app.module.goals.detail.no_history') }}</p>
            </div>
            <div v-else class="bg-card border border-border/40 rounded-xl px-4 pt-3 pb-2">
              <!-- Chart area -->
              <div class="relative" :style="{ height: CHART_H + 'px' }">
                <!-- Target line -->
                <div
                  v-if="detail.maxBarValue.value > 0"
                  class="absolute left-0 right-0 pointer-events-none z-10"
                  :style="{ bottom: targetLineBottom() + 'px' }"
                >
                  <div
                    class="w-full h-px opacity-50"
                    :style="{
                      background: `repeating-linear-gradient(90deg, ${goal.color} 0, ${goal.color} 4px, transparent 4px, transparent 8px)`,
                    }"
                  />
                </div>

                <!-- Bars -->
                <div
                  class="absolute bottom-0 left-0 right-0 flex gap-0.5 items-end"
                  :style="{ height: CHART_H + 'px' }"
                >
                  <div
                    v-for="bar in detail.bars.value"
                    :key="bar.key"
                    class="relative flex-1 min-w-0"
                    :style="{ height: CHART_H + 'px' }"
                  >
                    <!-- Value label above bar -->
                    <span
                      v-if="!bar.isFuture && (isCountGoal ? bar.count : bar.seconds) > 0"
                      class="absolute left-0 right-0 text-center text-2xs leading-none font-medium truncate pointer-events-none"
                      :style="{
                        bottom: barHeight(isCountGoal ? bar.count : bar.seconds) + 3 + 'px',
                        color: isGoalPeriodMet(
                          isCountGoal ? bar.count : bar.seconds,
                          isCountGoal ? (goal.target_count ?? 0) : (goal.target_seconds ?? 0),
                          isCountGoal,
                        )
                          ? 'var(--color-success)'
                          : goal.color + 'cc',
                      }"
                      >{{ fmtBarVal(bar) }}</span
                    >
                    <div
                      class="absolute bottom-0 left-0 right-0 rounded-t transition-all duration-500 ease-out"
                      :class="bar.isFuture ? 'opacity-20' : bar.isCurrentPeriod ? 'brightness-110' : ''"
                      :style="{
                        height: barHeight(isCountGoal ? bar.count : bar.seconds) + 'px',
                        backgroundColor: isGoalPeriodMet(
                          isCountGoal ? bar.count : bar.seconds,
                          isCountGoal ? (goal.target_count ?? 0) : (goal.target_seconds ?? 0),
                          isCountGoal,
                        )
                          ? 'var(--color-success)'
                          : bar.isCurrentPeriod
                            ? goal.color
                            : goal.color + 'aa',
                      }"
                    />
                    <div
                      v-if="bar.isCurrentPeriod"
                      class="absolute bottom-0 left-0 right-0 rounded-t ring-1 ring-primary/40 pointer-events-none"
                      :style="{ height: Math.max(barHeight(isCountGoal ? bar.count : bar.seconds), 2) + 'px' }"
                    />
                    <!-- First period start marker -->
                    <div
                      v-if="goal && bar.key === getGoalFirstPeriodKey(goal)"
                      class="absolute bottom-0 left-1/2 -translate-x-1/2 w-0.5 h-1.5 rounded-full pointer-events-none opacity-60"
                      :style="{ backgroundColor: goal.color }"
                    />
                  </div>
                </div>
              </div>

              <!-- X labels -->
              <div class="flex gap-0.5 mt-1.5">
                <div
                  v-for="bar in detail.bars.value"
                  :key="bar.key + '_lbl'"
                  class="flex-1 min-w-0 flex flex-col items-center"
                >
                  <span
                    class="block text-2xs leading-tight font-medium w-full text-center truncate"
                    :class="
                      bar.isCurrentPeriod
                        ? 'text-primary'
                        : bar.isFuture
                          ? 'text-muted-foreground/20'
                          : 'text-muted-foreground/50'
                    "
                  >
                    {{ bar.label }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- Recent activities -->
          <div v-if="detail && detail.recentActivities.value.length > 0" class="flex flex-col gap-2">
            <span class="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
              {{ t('app.module.goals.detail.recent_activities') }}
            </span>
            <div class="flex flex-col divide-y divide-border/30">
              <div
                v-for="activity in detail.recentActivities.value"
                :key="activity.id"
                class="flex items-center gap-3 py-3"
              >
                <div
                  class="w-2 h-2 rounded-full flex-shrink-0"
                  :style="{ backgroundColor: category?.color ?? goal.color }"
                />
                <div class="flex-1 min-w-0">
                  <p class="text-xs font-medium text-foreground truncate">{{ activity.description }}</p>
                  <p class="text-2xs text-muted-foreground/60 mt-0.5">
                    {{ localDateToString(new Date(activity.started_at)) }}
                  </p>
                </div>
                <div class="flex items-center gap-1 text-2xs text-muted-foreground tabular-nums flex-shrink-0">
                  <Clock class="w-3 h-3 opacity-50" />
                  {{ formatDuration(activity.started_at, activity.finished_at) }}
                </div>
              </div>
            </div>
          </div>

          <!-- No activities -->
          <div v-else-if="detail && detail.recentActivities.value.length === 0" class="text-center py-6">
            <p class="text-xs text-muted-foreground/50">{{ t('app.module.goals.detail.no_activities') }}</p>
          </div>
        </div>
      </template>
    </SheetContent>
  </Sheet>
</template>
