<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { TrendingUp, Zap, CheckCircle2, X, ChevronRight } from 'lucide-vue-next';
import { storeToRefs } from 'pinia';
import { useGoalsStore } from '@/stores/goalsStore';
import { useActivitiesStore } from '@/stores';
import { useTranslation } from '@/composables';
import { Button } from '@/components/ui/button';
import { formatTotalDuration, localDateToString, getTodayDateString } from '@/utils/time';
import { getMondayOfWeek } from '@/utils/date';
import {
  computeGoalCurrentSeconds,
  computeGoalCurrentCount,
  getGoalTarget,
  getGoalStatus,
  getGoalExpectedPct,
} from './useGoalProgress';
import type { TableRow } from '@/api/supabase';
import { useGoalsCheckIn } from './useGoalsCheckIn';

const { t } = useTranslation();
const { devTrigger } = useGoalsCheckIn();
const goalsStore = useGoalsStore();
const activitiesStore = useActivitiesStore();
const { goals } = storeToRefs(goalsStore);
const { activities } = storeToRefs(activitiesStore);

// Ring progress indicator size constants
const RING_SIZE_LG = 108; // px — hero ring in check-in modal

// Delay before showing the modal on mount — gives the page time to fully render
// so the modal doesn't flash during initial navigation.
const CHECKIN_SHOW_DELAY_MS = 1200;

// ── LocalStorage state ──────────────────────────────────────────────
const STORAGE_KEY = 'goaletic_goals_checkin';

interface CheckInState {
  daily: string; // ISO date "YYYY-MM-DD"
  weekly: string; // "YYYY-WNN"
  monthly: string; // "YYYY-MM"
}

function getState(): CheckInState {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
  } catch {
    return { daily: '', weekly: '', monthly: '' };
  }
}

function saveState(patch: Partial<CheckInState>) {
  const current = getState();
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...current, ...patch }));
}

function currentWeek(): string {
  return localDateToString(getMondayOfWeek(new Date()));
}

function currentMonth(): string {
  return getTodayDateString().slice(0, 7);
}

function currentDay(): string {
  return getTodayDateString();
}

function shouldShowGoal(goal: TableRow<'goals'>): boolean {
  if (getGoalStatus(goal) !== 'active') return false;
  const state = getState();
  if (goal.type === 'per_period') {
    if (goal.period === 'daily') return state.daily !== currentDay();
    if (goal.period === 'weekly') return state.weekly !== currentWeek();
    if (goal.period === 'monthly') return state.monthly !== currentMonth();
  }
  // total goals: show once per week
  return state.weekly !== currentWeek();
}

// ── Goals to show ───────────────────────────────────────────────────
const devMode = ref(false);

const goalsToShow = computed<TableRow<'goals'>[]>(() => {
  const activeGoals = goals.value.filter((g) => !g.archived_at);
  if (devMode.value) {
    return activeGoals.filter((g) => getGoalStatus(g) === 'active').slice(0, 5);
  }
  return activeGoals.filter((g) => shouldShowGoal(g)).slice(0, 5);
});

// ── Modal state ─────────────────────────────────────────────────────
const isOpen = ref(false);
const currentIndex = ref(0);

const currentGoal = computed(() => goalsToShow.value[currentIndex.value] ?? null);

// ── Progress ────────────────────────────────────────────────────────
const isCount = computed(() => currentGoal.value?.metric === 'count');

const currentValue = computed(() => {
  if (!currentGoal.value) return 0;
  return isCount.value
    ? computeGoalCurrentCount(currentGoal.value, activities.value)
    : computeGoalCurrentSeconds(currentGoal.value, activities.value);
});

const target = computed(() => (currentGoal.value ? getGoalTarget(currentGoal.value) : 0));

const pct = computed(() => {
  if (target.value <= 0) return 0;
  return Math.min(100, Math.round((currentValue.value / target.value) * 100));
});

const expectedPct = computed(() => (currentGoal.value ? getGoalExpectedPct(currentGoal.value) : 0));
const isOnTrack = computed(() => pct.value >= expectedPct.value);

// ── Ring ─────────────────────────────────────────────────────────────
const CIRC = +(2 * Math.PI * 45).toFixed(2);

function ringOffset(p: number): number {
  return CIRC * (1 - p / 100);
}

const ringColor = computed(() => {
  if (pct.value >= 100) return 'var(--color-success)';
  if (isOnTrack.value && expectedPct.value > 0) return 'var(--color-chart-3)';
  return currentGoal.value?.color ?? 'var(--color-primary)';
});

// ── Headline ─────────────────────────────────────────────────────────
type HeadlineType = 'completed' | 'great' | 'on_track' | 'behind' | 'start';

const headlineType = computed((): HeadlineType => {
  if (pct.value >= 100) return 'completed';
  if (pct.value >= 70) return 'great';
  if (isOnTrack.value && expectedPct.value > 0) return 'on_track';
  if (!isOnTrack.value && expectedPct.value > 10) return 'behind';
  return 'start';
});

// ── Format ───────────────────────────────────────────────────────────
const currentFmt = computed(() => {
  if (!currentGoal.value) return '0';
  return isCount.value
    ? `${currentValue.value} ${t('app.module.goals.form.activities')}`
    : formatTotalDuration(currentValue.value as number);
});

const targetFmt = computed(() => {
  if (!currentGoal.value) return '0';
  return isCount.value
    ? `${currentGoal.value.target_count} ${t('app.module.goals.form.activities')}`
    : formatTotalDuration(currentGoal.value.target_seconds ?? 0);
});

// ── Period label ──────────────────────────────────────────────────────
const checkInTitle = computed(() => {
  const g = currentGoal.value;
  if (!g) return '';
  if (g.type === 'per_period') {
    if (g.period === 'daily') return t('app.module.goals.checkin.title.daily');
    if (g.period === 'weekly') return t('app.module.goals.checkin.title.weekly');
    return t('app.module.goals.checkin.title.monthly');
  }
  return t('app.module.goals.checkin.title.total');
});

// ── Dismiss & navigation ─────────────────────────────────────────────
function markSeen() {
  const state = getState();
  const day = currentDay();
  const week = currentWeek();
  const month = currentMonth();
  // Mark all periods as seen based on shown goal types
  const hasDaily = goalsToShow.value.some((g) => g.period === 'daily');
  const hasWeekly = goalsToShow.value.some((g) => g.period === 'weekly' || g.type === 'total');
  const hasMonthly = goalsToShow.value.some((g) => g.period === 'monthly');
  saveState({
    daily: hasDaily ? day : state.daily,
    weekly: hasWeekly || !hasDaily ? week : state.weekly,
    monthly: hasMonthly ? month : state.monthly,
  });
}

function dismiss() {
  if (!devMode.value) markSeen();
  devMode.value = false;
  isOpen.value = false;
}

function next() {
  if (currentIndex.value < goalsToShow.value.length - 1) {
    currentIndex.value++;
  } else {
    dismiss();
  }
}

const isLastGoal = computed(() => currentIndex.value === goalsToShow.value.length - 1);

// ── Dev trigger (easter egg) ──────────────────────────────────────────
watch(devTrigger, async (val) => {
  if (val === 0) return;
  const loads: Promise<unknown>[] = [];
  if (goals.value.length === 0) loads.push(goalsStore.getGoals());
  if (activities.value.length === 0) loads.push(activitiesStore.getActivities());
  if (loads.length > 0) await Promise.all(loads);
  devMode.value = true;
  currentIndex.value = 0;
  // goalsToShow now includes all active goals via devMode — open if any exist
  isOpen.value = goals.value.some((g) => !g.archived_at && getGoalStatus(g) === 'active');
});

// ── Mount ─────────────────────────────────────────────────────────────
onMounted(async () => {
  // Load data if not yet present
  const loads: Promise<unknown>[] = [];
  if (goals.value.length === 0) loads.push(goalsStore.getGoals());
  if (activities.value.length === 0) loads.push(activitiesStore.getActivities());
  if (loads.length > 0) await Promise.all(loads);

  // Delay to let the page settle before showing
  setTimeout(() => {
    if (goalsToShow.value.length > 0) {
      isOpen.value = true;
    }
  }, CHECKIN_SHOW_DELAY_MS);
});
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-all duration-300 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-all duration-200 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="isOpen && currentGoal"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-overlay backdrop-blur-sm"
        @click.self="dismiss"
      >
        <Transition
          enter-active-class="transition-all duration-300 ease-out"
          enter-from-class="opacity-0 scale-95 translate-y-4"
          enter-to-class="opacity-100 scale-100 translate-y-0"
          leave-active-class="transition-all duration-200 ease-in"
          leave-from-class="opacity-100 scale-100 translate-y-0"
          leave-to-class="opacity-0 scale-95 translate-y-2"
          appear
        >
          <div
            v-if="isOpen"
            role="dialog"
            aria-modal="true"
            aria-labelledby="checkin-modal-title"
            class="relative w-full max-w-sm rounded-2xl overflow-hidden bg-card shadow-hero"
          >
            <!-- Close button -->
            <button
              class="absolute top-4 right-4 z-10 w-7 h-7 flex items-center justify-center rounded-full bg-background/60 text-muted-foreground hover:text-foreground transition-colors"
              @click="dismiss"
              :aria-label="t('app.action.close')"
            >
              <X class="w-4 h-4" />
            </button>

            <!-- ── Colored header section ── -->
            <div
              class="relative px-6 pt-8 pb-6 flex flex-col items-center gap-3"
              :style="{
                background: `radial-gradient(ellipse at 50% 0%, ${currentGoal.color}28 0%, transparent 70%), linear-gradient(180deg, ${currentGoal.color}18 0%, transparent 100%)`,
              }"
            >
              <!-- Check-in type label -->
              <span class="text-2xs font-semibold uppercase tracking-[0.15em]" :style="{ color: currentGoal.color }">{{
                checkInTitle
              }}</span>

              <!-- Goal name -->
              <p id="checkin-modal-title" class="text-base font-semibold text-center text-foreground leading-snug px-6">
                {{ currentGoal.name }}
              </p>

              <!-- Large ring -->
              <div class="relative mt-1" :style="{ width: RING_SIZE_LG + 'px', height: RING_SIZE_LG + 'px' }">
                <svg class="w-full h-full" viewBox="0 0 108 108" fill="none">
                  <!-- Track -->
                  <circle cx="54" cy="54" r="45" stroke="var(--color-muted)" stroke-width="7" />
                  <!-- Background glow ring -->
                  <circle
                    cx="54"
                    cy="54"
                    r="45"
                    :stroke="ringColor"
                    stroke-width="7"
                    opacity="0.12"
                    stroke-dasharray="none"
                  />
                  <!-- Progress arc -->
                  <circle
                    cx="54"
                    cy="54"
                    r="45"
                    :stroke="ringColor"
                    stroke-width="7"
                    stroke-linecap="round"
                    :stroke-dasharray="CIRC"
                    :stroke-dashoffset="ringOffset(pct)"
                    transform="rotate(-90 54 54)"
                    class="transition-all duration-1000 ease-out"
                    :style="{ filter: `drop-shadow(0 0 8px ${ringColor})` }"
                  />
                </svg>
                <!-- Center content -->
                <div class="absolute inset-0 flex flex-col items-center justify-center">
                  <span class="text-3xl font-black tabular-nums leading-none" :style="{ color: ringColor }">{{
                    pct
                  }}</span>
                  <span class="text-2xs font-semibold text-muted-foreground/60 mt-0.5">%</span>
                </div>

                <!-- Completed sparkle ring -->
                <div
                  v-if="pct >= 100"
                  class="absolute inset-[-6px] rounded-full animate-ping"
                  :style="{ border: `2px solid ${currentGoal.color}40` }"
                />
              </div>

              <!-- Streak badge -->
              <div
                v-if="pct >= 100"
                class="flex items-center gap-1.5 px-3 py-1.5 rounded-full border"
                :style="{
                  backgroundColor: 'color-mix(in oklab, var(--color-success) 10%, transparent)',
                  borderColor: 'color-mix(in oklab, var(--color-success) 25%, transparent)',
                  color: 'var(--color-success)',
                }"
              >
                <CheckCircle2 class="w-3.5 h-3.5 flex-shrink-0" />
                <span class="text-xs font-semibold">{{ t('app.module.goals.checkin.headline.completed') }}</span>
              </div>
            </div>

            <!-- ── Body ── -->
            <div class="px-6 py-5 flex flex-col gap-4">
              <!-- Headline block -->
              <div class="text-center">
                <h2 class="text-2xl font-black leading-tight text-foreground">
                  <template v-if="headlineType === 'completed'">{{
                    t('app.module.goals.checkin.headline.completed_long')
                  }}</template>
                  <template v-else-if="headlineType === 'great'">{{
                    t('app.module.goals.checkin.headline.great')
                  }}</template>
                  <template v-else-if="headlineType === 'on_track'">{{
                    t('app.module.goals.checkin.headline.on_track')
                  }}</template>
                  <template v-else-if="headlineType === 'behind'">{{
                    t('app.module.goals.checkin.headline.behind')
                  }}</template>
                  <template v-else>{{ t('app.module.goals.checkin.headline.start') }}</template>
                </h2>
                <p class="text-sm text-muted-foreground mt-1.5 leading-relaxed">
                  <template v-if="headlineType === 'completed'">{{
                    t('app.module.goals.checkin.sub.completed')
                  }}</template>
                  <template v-else-if="headlineType === 'great'">{{
                    t('app.module.goals.checkin.sub.great')
                  }}</template>
                  <template v-else-if="headlineType === 'on_track'">{{
                    t('app.module.goals.checkin.sub.on_track')
                  }}</template>
                  <template v-else-if="headlineType === 'behind'">{{
                    t('app.module.goals.checkin.sub.behind')
                  }}</template>
                  <template v-else>{{ t('app.module.goals.checkin.sub.start') }}</template>
                </p>
              </div>

              <!-- Progress details pill -->
              <div
                class="flex items-center justify-center gap-1.5 py-3 px-4 rounded-xl"
                :style="{ backgroundColor: `${currentGoal.color}0d`, border: `1px solid ${currentGoal.color}20` }"
              >
                <span class="text-sm font-semibold tabular-nums" :style="{ color: ringColor }">{{ currentFmt }}</span>
                <span class="text-muted-foreground/50">/</span>
                <span class="text-sm text-muted-foreground">{{ targetFmt }}</span>
                <span
                  v-if="expectedPct > 0"
                  class="ml-2 pl-2 border-l border-border/30 text-2xs font-semibold"
                  :style="{ color: isOnTrack ? 'var(--color-success)' : 'var(--color-destructive)' }"
                >
                  <TrendingUp v-if="isOnTrack" class="w-3 h-3 inline -mt-px" />
                  <Zap v-else class="w-3 h-3 inline -mt-px" />
                  {{
                    pct >= expectedPct
                      ? t('app.module.goals.analytics.status.on_track')
                      : t('app.module.goals.analytics.status.behind')
                  }}
                </span>
              </div>

              <!-- Pagination dots (multiple goals) -->
              <div
                v-if="goalsToShow.length > 1"
                class="flex justify-center gap-1.5"
                role="group"
                :aria-label="
                  t('app.core.common.step_indicator', { current: currentIndex + 1, total: goalsToShow.length })
                "
              >
                <div
                  v-for="(_, i) in goalsToShow"
                  :key="i"
                  role="img"
                  :aria-label="t('app.core.common.step_indicator', { current: i + 1, total: goalsToShow.length })"
                  :aria-current="i === currentIndex ? 'step' : undefined"
                  class="rounded-full transition-all duration-300"
                  :class="i === currentIndex ? 'w-4 h-1.5' : 'w-1.5 h-1.5 bg-muted'"
                  :style="
                    i === currentIndex ? { width: '16px', height: '6px', backgroundColor: currentGoal.color } : {}
                  "
                />
              </div>

              <!-- CTAs -->
              <div class="flex flex-col gap-2 pt-1">
                <Button
                  class="w-full h-11 font-semibold text-sm rounded-xl"
                  :style="{
                    backgroundColor: currentGoal.color,
                    color: 'var(--color-primary-foreground)',
                    boxShadow: `0 4px 20px -4px ${currentGoal.color}88`,
                  }"
                  @click="next"
                >
                  <span>{{ isLastGoal ? t('app.module.goals.checkin.cta') : t('app.module.goals.checkin.next') }}</span>
                  <ChevronRight v-if="!isLastGoal" class="w-4 h-4 ml-1" />
                </Button>
                <button
                  class="text-xs text-muted-foreground hover:text-foreground transition-colors py-1 text-center"
                  @click="dismiss"
                >
                  {{ t('app.module.goals.checkin.dismiss') }}
                </button>
              </div>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>
