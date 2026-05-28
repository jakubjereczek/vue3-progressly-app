<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink } from 'vue-router';
import { TrendingUp, TrendingDown } from 'lucide-vue-next';
import { Card } from '@/components/ui/card';
import { useGoalsStore } from '@/stores/goalsStore';
import { useActivitiesStore, useCategoriesStore } from '@/stores';
import { storeToRefs } from 'pinia';
import { useTranslation } from '@/composables';
import { formatTotalDuration, getTodayDateString, MS_PER_DAY } from '@/utils/time';
import { parseLocalDate } from '@/utils/date';
import {
  computeGoalCurrentSeconds,
  computeGoalCurrentCount,
  getGoalTarget,
  getGoalExpectedPct,
} from './useGoalProgress';
import { cn } from '@/lib/utils';

const { t } = useTranslation();
const goalsStore = useGoalsStore();
const { activeGoals } = storeToRefs(goalsStore);
const { activities } = storeToRefs(useActivitiesStore());
const { categories } = storeToRefs(useCategoriesStore());

const MAX_DISPLAYED = 5;

const displayedGoals = computed(() => activeGoals.value.slice(0, MAX_DISPLAYED));

function getCategory(categoryId: string | null) {
  if (!categoryId) return null;
  return categories.value.find((c) => c.id === categoryId) ?? null;
}

function getProgress(goal: (typeof activeGoals.value)[0]) {
  const isCount = goal.metric === 'count';
  const current = isCount
    ? computeGoalCurrentCount(goal, activities.value)
    : computeGoalCurrentSeconds(goal, activities.value);
  const target = getGoalTarget(goal);
  const pct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
  return { current, pct, isCount, target };
}

function getDaysRemaining(goal: (typeof activeGoals.value)[0]): number | null {
  if (!goal.ended_at) return null;
  const today = getTodayDateString();
  if (goal.ended_at < today) return 0;
  return Math.ceil((parseLocalDate(goal.ended_at).getTime() - parseLocalDate(today).getTime()) / MS_PER_DAY);
}

function getPeriodLabel(goal: (typeof activeGoals.value)[0]): string {
  if (goal.type === 'total') return t('app.module.goals.type.total');
  return t(`app.module.goals.period.${goal.period}`);
}

function progressColor(pct: number, goalColor: string): string {
  if (pct >= 100) return 'var(--color-success)';
  if (pct >= 60) return 'var(--color-chart-3)';
  return goalColor;
}
</script>

<template>
  <Card class="p-5 rounded-2xl border border-border/40 flex flex-col gap-4 shadow-none h-full bg-card">
    <!-- Header -->
    <div class="flex items-center justify-between flex-shrink-0 border-b border-border/40 pb-3">
      <div>
        <h3 class="text-sm font-semibold tracking-tight text-foreground">{{ t('app.module.goals.widget.title') }}</h3>
        <p class="text-xs text-muted-foreground/70 mt-0.5">{{ t('app.module.goals.widget.subtitle') }}</p>
      </div>
      <RouterLink
        to="/dashboard/goals"
        class="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors duration-150"
      >
        {{ t('app.module.goals.widget.manage') }}
      </RouterLink>
    </div>

    <!-- Empty state -->
    <div v-if="displayedGoals.length === 0" class="py-6 text-center flex flex-col items-center justify-center gap-2">
      <p class="text-xs text-muted-foreground/60">{{ t('app.module.goals.widget.empty') }}</p>
      <RouterLink to="/dashboard/goals" class="text-xs font-semibold text-primary hover:underline mt-0.5 inline-block">
        {{ t('app.module.goals.widget.create_first') }}
      </RouterLink>
    </div>

    <!-- Goals list -->
    <div v-else class="flex-1 min-h-0 overflow-y-auto flex flex-col gap-1 pr-0.5">
      <div
        v-for="goal in displayedGoals"
        :key="goal.id"
        class="flex flex-col gap-2 px-3 py-3 rounded-xl transition-all duration-150 hover:bg-muted/50 group/row"
      >
        <!-- Top Row: Goal name & Category + Target Percentage and Trend Badge -->
        <div class="flex items-start justify-between gap-4">
          <div class="flex items-center gap-3 min-w-0 flex-1">
            <!-- Dynamic dynamic indicator color element -->
            <span
              class="w-1 h-7 rounded-full shrink-0 mt-0.5 border border-black/5 dark:border-white/10"
              :style="{ backgroundColor: goal.color }"
            />

            <div class="min-w-0 flex flex-col">
              <span class="text-sm font-semibold tracking-tight text-foreground truncate leading-none mb-1">
                {{ goal.name }}
              </span>
              <div class="flex items-center gap-1.5 text-xs text-muted-foreground/70 truncate">
                <span class="font-medium bg-muted/60 px-1.5 py-0.5 rounded text-2xs border border-border/30">
                  {{ getPeriodLabel(goal) }}
                </span>
                <template v-if="getCategory(goal.category_id)">
                  <span class="text-muted-foreground/30 text-2xs">·</span>
                  <span class="font-medium text-2xs" :style="{ color: getCategory(goal.category_id)!.color }">
                    {{ getCategory(goal.category_id)!.name }}
                  </span>
                </template>
              </div>
            </div>
          </div>

          <!-- Right side: Crypto-style Percentage & Expected Change Badge -->
          <div class="flex items-center gap-3 shrink-0 pl-2">
            <!-- Expected vs actual trend pill -->
            <span
              v-if="getGoalExpectedPct(goal) > 0"
              :class="
                cn(
                  'inline-flex items-center gap-0.5 text-2xs font-bold px-1.5 py-0.5 rounded-md border leading-none shrink-0',
                  getProgress(goal).pct >= getGoalExpectedPct(goal)
                    ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/10'
                    : 'bg-destructive/10 text-destructive border-destructive/10',
                )
              "
            >
              <TrendingUp v-if="getProgress(goal).pct >= getGoalExpectedPct(goal)" class="w-2.5 h-2.5 shrink-0" />
              <TrendingDown v-else class="w-2.5 h-2.5 shrink-0" />
            </span>

            <!-- Absolute Percentage Value -->
            <span
              class="text-sm font-bold font-mono tabular-nums min-w-[40px] text-right"
              :style="{ color: progressColor(getProgress(goal).pct, goal.color) }"
            >
              {{ getProgress(goal).pct }}%
            </span>
          </div>
        </div>

        <!-- Middle Row: Progress bar with target checkpoint marker -->
        <div class="relative my-1 px-0.5">
          <div class="h-1.5 rounded-full bg-muted overflow-hidden border border-border/10">
            <div
              class="h-full rounded-full transition-all duration-700 ease-out"
              :style="{
                width: `${getProgress(goal).pct}%`,
                backgroundColor: progressColor(getProgress(goal).pct, goal.color),
              }"
            />
          </div>
          <!-- Expected timeline target checkpoint -->
          <div
            v-if="getGoalExpectedPct(goal) > 0"
            class="absolute top-0 w-[2px] h-1.5 bg-foreground/30 shadow-[0_0_2px_rgba(0,0,0,0.2)]"
            :style="{ left: `calc(${Math.min(getGoalExpectedPct(goal), 99)}% - 1px)` }"
          />
        </div>

        <!-- Bottom Row: Numerical status tracking + remaining days countdown -->
        <div class="flex items-center justify-between gap-2 px-0.5">
          <span class="text-2xs font-mono font-semibold text-muted-foreground/60 tabular-nums">
            <template v-if="getProgress(goal).isCount">
              {{ getProgress(goal).current }} <span class="text-muted-foreground/40">/</span> {{ goal.target_count }}
              {{ t('app.module.goals.card.activities') }}
            </template>
            <template v-else>
              {{ formatTotalDuration(getProgress(goal).current) }} <span class="text-muted-foreground/40">/</span>
              {{ formatTotalDuration(goal.target_seconds ?? 0) }}
            </template>
          </span>
          <span
            v-if="getDaysRemaining(goal) !== null"
            class="text-2xs font-medium text-muted-foreground/50 bg-muted/30 px-1.5 py-0.5 rounded-md border border-border/20 tabular-nums shrink-0"
          >
            {{ t('app.module.goals.card.days_left', { count: getDaysRemaining(goal) }) }}
          </span>
        </div>
      </div>

      <!-- View More Action Bar -->
      <RouterLink
        v-if="activeGoals.length > MAX_DISPLAYED"
        to="/dashboard/goals"
        class="text-2xs font-bold text-muted-foreground/50 hover:text-foreground transition-colors text-center py-2.5 mt-1 border-t border-border/30 hover:bg-muted/30 rounded-xl"
      >
        +{{ activeGoals.length - MAX_DISPLAYED }} {{ t('app.module.goals.widget.more') }}
      </RouterLink>
    </div>
  </Card>
</template>
