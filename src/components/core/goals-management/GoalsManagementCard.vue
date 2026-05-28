<script setup lang="ts">
import { computed } from 'vue';
import { Pencil, Archive, Trash2, ArchiveRestore } from 'lucide-vue-next';
import type { TableRow } from '@/api/supabase';
import { useTranslation } from '@/composables';
import { formatTotalDuration } from '@/utils/time';
import { parseLocalDate } from '@/utils/date';
import {
  computeGoalCurrentSeconds,
  computeGoalCurrentCount,
  getGoalStatus,
  getGoalTarget,
  getGoalExpectedPct,
} from './useGoalProgress';
import { cn } from '@/lib/utils';

const CIRC = +(2 * Math.PI * 22).toFixed(2);

const props = defineProps<{
  goal: TableRow<'goals'>;
  activities: TableRow<'activities'>[];
  categories: TableRow<'categories'>[];
}>();

const emit = defineEmits<{
  edit: [];
  archive: [];
  unarchive: [];
  delete: [];
}>();

const { t } = useTranslation();

const status = computed(() => getGoalStatus(props.goal));

const category = computed(() =>
  props.goal.category_id ? props.categories.find((c) => c.id === props.goal.category_id) : null,
);

const isCount = computed(() => props.goal.metric === 'count');

const currentSeconds = computed(() => computeGoalCurrentSeconds(props.goal, props.activities));

const currentCount = computed(() => computeGoalCurrentCount(props.goal, props.activities));

const percentage = computed(() => {
  const target = getGoalTarget(props.goal);
  if (target <= 0) return 0;
  const current = isCount.value ? currentCount.value : currentSeconds.value;
  return Math.min(100, Math.round((current / target) * 100));
});

const periodLabel = computed(() => {
  if (props.goal.type === 'total') return t('app.module.goals.type.total');
  return t(`app.module.goals.period.${props.goal.period}`);
});

const statusLabel = computed(() => t(`app.module.goals.status.${status.value}`));

function formatDateShort(iso: string): string {
  return parseLocalDate(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

const dateRangeLabel = computed(() => {
  const start = formatDateShort(props.goal.started_at);
  if (!props.goal.ended_at) return `${t('app.module.goals.card.from')} ${start}`;
  return `${start} → ${formatDateShort(props.goal.ended_at)}`;
});

const expectedPct = computed(() => getGoalExpectedPct(props.goal));
const isOnTrack = computed(() => (status.value === 'active' ? percentage.value >= expectedPct.value : false));

const progressColor = computed(() => {
  if (percentage.value >= 100) return 'var(--color-success)';
  if (percentage.value >= 60) return 'var(--color-chart-3)';
  return props.goal.color;
});

function ringOffset(pct: number): number {
  return CIRC * (1 - pct / 100);
}
</script>

<template>
  <div
    :class="
      cn(
        'bg-card border border-border/40 rounded-xl overflow-hidden flex flex-col',
        'hover:border-border/70 hover:bg-card/80',
        'transition-all duration-150 cursor-pointer group',
        status === 'archived' && 'opacity-60',
        status === 'ended' && 'opacity-75',
      )
    "
  >
    <!-- Top color accent strip -->
    <div class="h-[3px] w-full flex-shrink-0" :style="{ backgroundColor: goal.color }" />

    <!-- Main content row -->
    <div class="px-4 pt-3.5 pb-3 flex items-start gap-3">
      <!-- Left: name, meta, status, current/target -->
      <div class="min-w-0 flex-1 pt-0.5">
        <div class="flex items-center gap-1.5">
          <span class="w-2 h-2 rounded-full flex-shrink-0" :style="{ backgroundColor: goal.color }" />
          <p class="font-semibold text-sm text-foreground leading-tight truncate">{{ goal.name }}</p>
        </div>

        <div class="flex items-center gap-1.5 mt-1 ml-3.5 flex-wrap">
          <span class="text-2xs text-muted-foreground">{{ periodLabel }}</span>
          <span class="text-muted-foreground/30 text-2xs">·</span>
          <span v-if="category" class="inline-flex items-center gap-1 text-2xs" :style="{ color: category.color }">
            <span class="w-1.5 h-1.5 rounded-full flex-shrink-0" :style="{ backgroundColor: category.color }" />
            <span>{{ category.name }}</span>
          </span>
          <span v-else class="text-2xs text-muted-foreground/50">{{ t('app.module.goals.card.all_categories') }}</span>
        </div>

        <!-- Status + on-track badges -->
        <div class="flex items-center gap-1.5 mt-2 ml-3.5 flex-wrap">
          <span
            :class="
              cn(
                'text-2xs font-semibold px-1.5 py-0.5 rounded-full border',
                status === 'active' && 'bg-success/10 text-success border-success/20',
                status === 'upcoming' && 'bg-warning/10 text-warning border-warning/20',
                (status === 'ended' || status === 'archived') && 'bg-muted text-muted-foreground border-border/40',
              )
            "
            >{{ statusLabel }}</span
          >
          <span
            v-if="status === 'active' && expectedPct > 0"
            class="text-2xs font-semibold px-1.5 py-0.5 rounded-full border"
            :style="
              isOnTrack
                ? {
                    color: 'var(--color-success)',
                    borderColor: 'color-mix(in oklab, var(--color-success) 30%, transparent)',
                    backgroundColor: 'color-mix(in oklab, var(--color-success) 8%, transparent)',
                  }
                : {
                    color: 'var(--color-destructive)',
                    borderColor: 'color-mix(in oklab, var(--color-destructive) 30%, transparent)',
                    backgroundColor: 'color-mix(in oklab, var(--color-destructive) 8%, transparent)',
                  }
            "
          >
            {{
              isOnTrack
                ? t('app.module.goals.analytics.status.on_track')
                : t('app.module.goals.analytics.status.behind')
            }}
          </span>
        </div>

        <!-- Current / target -->
        <p v-if="status !== 'upcoming'" class="text-2xs text-muted-foreground/60 mt-2 ml-3.5 tabular-nums">
          <template v-if="isCount">
            {{ currentCount }} <span class="opacity-50 mx-0.5">/</span> {{ goal.target_count }}
            {{ t('app.module.goals.card.activities') }}
          </template>
          <template v-else>
            {{ formatTotalDuration(currentSeconds) }}
            <span class="opacity-50 mx-0.5">/</span>
            {{ formatTotalDuration(goal.target_seconds ?? 0) }}
          </template>
        </p>
      </div>

      <!-- Right: ring + hover actions -->
      <div class="flex flex-col items-end gap-1.5 flex-shrink-0">
        <!-- Hover-only action buttons -->
        <div class="flex items-center gap-0.5 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity h-5">
          <button
            v-if="status !== 'archived'"
            class="p-1 rounded-md text-muted-foreground/40 hover:text-foreground hover:bg-muted transition-colors"
            :aria-label="t('app.action.edit')"
            @click.stop="emit('edit')"
          >
            <Pencil class="w-3.5 h-3.5" />
          </button>
          <button
            v-if="status !== 'archived'"
            class="p-1 rounded-md text-muted-foreground/40 hover:text-foreground hover:bg-muted transition-colors"
            :aria-label="t('app.module.goals.action.archive')"
            @click.stop="emit('archive')"
          >
            <Archive class="w-3.5 h-3.5" />
          </button>
          <button
            v-else
            class="p-1 rounded-md text-muted-foreground/40 hover:text-foreground hover:bg-muted transition-colors"
            :aria-label="t('app.module.goals.action.unarchive')"
            @click.stop="emit('unarchive')"
          >
            <ArchiveRestore class="w-3.5 h-3.5" />
          </button>
          <button
            class="p-1 rounded-md text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 transition-colors"
            :aria-label="t('app.action.delete')"
            @click.stop="emit('delete')"
          >
            <Trash2 class="w-3.5 h-3.5" />
          </button>
        </div>

        <!-- Circular ring -->
        <div class="relative" style="width: 56px; height: 56px">
          <svg width="56" height="56" viewBox="0 0 56 56">
            <!-- Track -->
            <circle cx="28" cy="28" r="22" fill="none" stroke="var(--color-muted)" stroke-width="4" />
            <!-- Progress -->
            <circle
              v-if="status !== 'upcoming'"
              cx="28"
              cy="28"
              r="22"
              fill="none"
              :stroke="progressColor"
              stroke-width="4"
              stroke-linecap="round"
              :stroke-dasharray="CIRC"
              :stroke-dashoffset="ringOffset(percentage)"
              transform="rotate(-90 28 28)"
              style="transition: stroke-dashoffset 0.7s ease-out"
            />
          </svg>
          <!-- Center text -->
          <div class="absolute inset-0 flex items-center justify-center">
            <span
              v-if="status !== 'upcoming'"
              class="text-2xs font-semibold tabular-nums leading-none"
              :style="{ color: progressColor }"
              >{{ percentage }}%</span
            >
            <span v-else class="text-2xs text-muted-foreground/30">—</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Glow progress bar -->
    <div v-if="status !== 'upcoming'" class="px-4 pb-3 flex flex-col gap-1">
      <div class="relative">
        <div class="h-1.5 bg-muted rounded-full">
          <div
            class="h-full rounded-full transition-all duration-700 ease-out"
            role="progressbar"
            :aria-valuenow="percentage"
            aria-valuemin="0"
            aria-valuemax="100"
            :style="{
              width: `${percentage}%`,
              backgroundColor: progressColor,
            }"
          />
        </div>
        <!-- Expected position marker -->
        <div
          v-if="status === 'active' && expectedPct > 0"
          class="absolute top-0 w-[2px] h-1.5 rounded-full bg-foreground/25"
          :style="{ left: `calc(${Math.min(expectedPct, 99)}% - 1px)` }"
        />
      </div>
      <!-- Period elapsed + pace label -->
      <p v-if="status === 'active' && expectedPct > 0" class="text-2xs text-muted-foreground/60 mt-1">
        {{ expectedPct }}%
        {{
          goal.type === 'total'
            ? t('app.module.goals.analytics.of_total_elapsed')
            : t('app.module.goals.analytics.of_period_elapsed')
        }}
        <span class="mx-1 opacity-30">·</span>
        <span class="font-medium" :style="{ color: isOnTrack ? 'var(--color-success)' : 'var(--color-destructive)' }">{{
          isOnTrack ? t('app.module.goals.analytics.pace.on_track') : t('app.module.goals.analytics.pace.behind')
        }}</span>
      </p>
    </div>

    <!-- Upcoming placeholder bar -->
    <div v-else class="px-4 pb-3">
      <div class="h-1.5 rounded-full bg-muted/40" />
    </div>

    <!-- Footer -->
    <div class="border-t border-border/20 px-4 py-2 mt-auto flex items-center justify-between gap-2">
      <span class="text-2xs text-muted-foreground/60">{{ dateRangeLabel }}</span>
      <span
        v-if="status === 'active' && goal.ended_at"
        class="text-2xs tabular-nums flex-shrink-0"
        :style="{ color: goal.color + 'bb' }"
      >
        {{ t('app.module.goals.card.ends_on', { date: formatDateShort(goal.ended_at) }) }}
      </span>
    </div>
  </div>
</template>
