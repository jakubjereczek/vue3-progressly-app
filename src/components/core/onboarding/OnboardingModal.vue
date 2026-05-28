<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import { Zap, Play, ClipboardList, BarChart2, CalendarDays, Layers, PieChart, TrendingUp, Target, Download, ArrowRight, X } from 'lucide-vue-next';
import { useOnboarding } from './useOnboarding';
import { useTranslation } from '@/composables';
import { cn } from '@/lib/utils';
import { useActivitiesStore, useCategoriesStore } from '@/stores';
import { getDemoData } from '@/lib/demoData';

const { t, locale } = useTranslation();
const { isOnboardingDone, complete } = useOnboarding();
const router = useRouter();
const activitiesStore = useActivitiesStore();
const categoriesStore = useCategoriesStore();

function injectDemoData() {
  const { activities, categories, runningActivity } = getDemoData(locale.value);
  // @ts-expect-error direct store state patch
  activitiesStore.demoMode = true;
  // @ts-expect-error direct store state patch
  categoriesStore.demoMode = true;
  // @ts-expect-error direct store state patch
  activitiesStore.activities = activities;
  // @ts-expect-error direct store state patch
  activitiesStore.trackingActivity = runningActivity;
  // @ts-expect-error direct store state patch
  categoriesStore.categories = categories;
}

function clearDemoData() {
  // @ts-expect-error direct store state patch
  activitiesStore.demoMode = false;
  // @ts-expect-error direct store state patch
  categoriesStore.demoMode = false;
  // @ts-expect-error direct store state patch
  activitiesStore.trackingActivity = undefined;
  activitiesStore.getActivities();
  categoriesStore.getCategories();
}

const CARD_W = 320;
const SPOTLIGHT_PAD = 10;
const TOTAL_STEPS = 10;

const STEPS = [
  {
    target: null as string | null,
    route: null as string | null,
    placement: 'center' as const,
    icon: Zap,
    titleKey: 'app.core.onboarding.step1.title',
    descKey: 'app.core.onboarding.step1.desc',
    color: 'text-primary',
    accentVar: '--color-primary',
  },
  {
    target: '[data-tour="activity-tracker"]',
    route: 'Dashboard_Overview',
    placement: 'bottom' as const,
    icon: Play,
    titleKey: 'app.core.onboarding.step2.title',
    descKey: 'app.core.onboarding.step2.desc',
    color: 'text-success',
    accentVar: '--color-success',
  },
  {
    target: '[data-tour="timesheet"]',
    route: 'Dashboard_Timesheet',
    placement: 'center' as const,
    icon: ClipboardList,
    titleKey: 'app.core.onboarding.step3.title',
    descKey: 'app.core.onboarding.step3.desc',
    color: 'text-primary',
    accentVar: '--color-primary',
  },
  {
    target: '[data-tour="gantt"]',
    route: 'Dashboard_Gantt',
    placement: 'center' as const,
    icon: BarChart2,
    titleKey: 'app.core.onboarding.step4.title',
    descKey: 'app.core.onboarding.step4.desc',
    color: 'text-chart-3',
    accentVar: '--color-chart-3',
  },
  {
    target: '[data-tour="calendar"]',
    route: 'Dashboard_Calendar',
    placement: 'center' as const,
    icon: CalendarDays,
    titleKey: 'app.core.onboarding.step5.title',
    descKey: 'app.core.onboarding.step5.desc',
    color: 'text-success',
    accentVar: '--color-success',
  },
  {
    target: '[data-tour="categories-management"]',
    route: 'Dashboard_Categories',
    placement: 'center' as const,
    icon: Layers,
    titleKey: 'app.core.onboarding.step6.title',
    descKey: 'app.core.onboarding.step6.desc',
    color: 'text-warning',
    accentVar: '--color-warning',
  },
  {
    target: '[data-tour="stats"]',
    route: 'Dashboard_Stats',
    placement: 'center' as const,
    icon: PieChart,
    titleKey: 'app.core.onboarding.step7.title',
    descKey: 'app.core.onboarding.step7.desc',
    color: 'text-chart-3',
    accentVar: '--color-chart-3',
  },
  {
    target: '[data-tour="analytics-view"]',
    route: 'Dashboard_Analytics',
    placement: 'center' as const,
    icon: TrendingUp,
    titleKey: 'app.core.onboarding.step8.title',
    descKey: 'app.core.onboarding.step8.desc',
    color: 'text-primary',
    accentVar: '--color-primary',
  },
  {
    target: '[data-tour="goals"]',
    route: 'Dashboard_Goals',
    placement: 'center' as const,
    icon: Target,
    titleKey: 'app.core.onboarding.step9.title',
    descKey: 'app.core.onboarding.step9.desc',
    color: 'text-primary',
    accentVar: '--color-primary',
  },
  {
    target: '[data-tour="export"]',
    route: 'Dashboard_Export',
    placement: 'center' as const,
    icon: Download,
    titleKey: 'app.core.onboarding.step10.title',
    descKey: 'app.core.onboarding.step10.desc',
    color: 'text-success',
    accentVar: '--color-success',
  },
];

type SpotlightRect = { x: number; y: number; w: number; h: number };

const currentStep = ref(0);
const spotlightRect = ref<SpotlightRect | null>(null);
const animKey = ref(0);
const isNavigating = ref(false);

const step = computed(() => STEPS[currentStep.value]!);
const isLast = computed(() => currentStep.value === TOTAL_STEPS - 1);

// Re-inject demo data and reset when tour is reactivated (e.g. via easter egg)
watch(isOnboardingDone, (done, wasDone) => {
  if (!done && wasDone) {
    currentStep.value = 0;
    spotlightRect.value = null;
    animKey.value++;
    injectDemoData();
    resolveTarget();
  }
});

async function resolveTarget() {
  const s = STEPS[currentStep.value]!;

  if (!s.target) {
    spotlightRect.value = null;
    return;
  }

  if (s.route && router.currentRoute.value.name !== s.route) {
    isNavigating.value = true;
    await router.push({ name: s.route });
    isNavigating.value = false;
  }

  await nextTick();
  await new Promise((r) => setTimeout(r, 250));

  const el = document.querySelector(s.target!);
  if (!el) {
    spotlightRect.value = null;
    return;
  }

  el.scrollIntoView({ behavior: 'instant', block: 'nearest' });
  const r = el.getBoundingClientRect();
  spotlightRect.value = {
    x: r.left - SPOTLIGHT_PAD,
    y: r.top - SPOTLIGHT_PAD,
    w: r.width + SPOTLIGHT_PAD * 2,
    h: r.height + SPOTLIGHT_PAD * 2,
  };
}

watch(currentStep, () => {
  spotlightRect.value = null;
  animKey.value++;
  resolveTarget();
});

onMounted(() => {
  if (!isOnboardingDone.value) {
    injectDemoData();
    resolveTarget();
  }
});

function syncRect() {
  const s = STEPS[currentStep.value]!;
  if (!s.target) return;
  const el = document.querySelector(s.target!);
  if (!el) return;
  const r = el.getBoundingClientRect();
  spotlightRect.value = {
    x: r.left - SPOTLIGHT_PAD,
    y: r.top - SPOTLIGHT_PAD,
    w: r.width + SPOTLIGHT_PAD * 2,
    h: r.height + SPOTLIGHT_PAD * 2,
  };
}

onMounted(() => window.addEventListener('resize', syncRect));
onUnmounted(() => window.removeEventListener('resize', syncRect));

const tooltipStyle = computed(() => {
  const r = spotlightRect.value;
  const placement = !r ? 'center' : step.value.placement;
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1200;

  if (placement === 'center') {
    return {
      position: 'fixed' as const,
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      width: `${CARD_W}px`,
    };
  }

  const left = Math.min(
    Math.max(r!.x + r!.w / 2 - CARD_W / 2, 16),
    vw - CARD_W - 16,
  );

  if (placement === 'bottom') {
    return {
      position: 'fixed' as const,
      top: `${r!.y + r!.h + 16}px`,
      left: `${left}px`,
      width: `${CARD_W}px`,
    };
  }

  return {
    position: 'fixed' as const,
    top: `${r!.y - 16}px`,
    left: `${left}px`,
    transform: 'translateY(-100%)',
    width: `${CARD_W}px`,
  };
});

async function goNext() {
  if (isLast.value) {
    clearDemoData();
    complete();
    router.push({ name: 'Dashboard_Overview' });
  } else {
    currentStep.value++;
  }
}

function handleSkip() {
  clearDemoData();
  complete();
}

function handleKeydown(e: KeyboardEvent) {
  if (isOnboardingDone.value) return;
  if (e.key === 'Escape') handleSkip();
  if (e.key === 'Enter' || e.key === 'ArrowRight') goNext();
}

onMounted(() => document.addEventListener('keydown', handleKeydown));
onUnmounted(() => document.removeEventListener('keydown', handleKeydown));
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-opacity duration-300"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-200"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div v-if="!isOnboardingDone" class="fixed inset-0 z-tour" style="pointer-events: none">

        <!-- Spotlight overlay -->
        <svg class="absolute inset-0 w-full h-full">
          <defs>
            <mask id="tour-spotlight-mask">
              <rect width="100%" height="100%" fill="white" />
              <rect
                v-if="spotlightRect"
                :x="spotlightRect.x"
                :y="spotlightRect.y"
                :width="spotlightRect.w"
                :height="spotlightRect.h"
                rx="14"
                fill="black"
              />
            </mask>
          </defs>
          <rect
            width="100%"
            height="100%"
            style="fill: var(--color-overlay-light)"
            mask="url(#tour-spotlight-mask)"
          />
        </svg>

        <!-- Highlight ring -->
        <Transition
          enter-active-class="transition-all duration-350 ease-out"
          enter-from-class="opacity-0 scale-[0.985]"
          enter-to-class="opacity-100 scale-100"
          leave-active-class="transition-all duration-150"
          leave-from-class="opacity-100"
          leave-to-class="opacity-0"
        >
          <div
            v-if="spotlightRect"
            class="absolute rounded-xl pointer-events-none"
            :style="{
              left: spotlightRect.x + 'px',
              top: spotlightRect.y + 'px',
              width: spotlightRect.w + 'px',
              height: spotlightRect.h + 'px',
              boxShadow: `0 0 0 2px var(${step.accentVar}), 0 0 0 5px color-mix(in oklab, var(${step.accentVar}) 18%, transparent)`,
            }"
          />
        </Transition>

        <!-- Tooltip card -->
        <div :style="{ ...tooltipStyle, pointerEvents: 'auto', zIndex: 10 }">
          <Transition
            enter-active-class="transition-all duration-300 ease-out"
            enter-from-class="opacity-0 translate-y-2 scale-[0.96]"
            enter-to-class="opacity-100 translate-y-0 scale-100"
            leave-active-class="transition-all duration-150 ease-in"
            leave-from-class="opacity-100 translate-y-0 scale-100"
            leave-to-class="opacity-0 translate-y-1 scale-[0.97]"
            mode="out-in"
          >
            <div
              :key="animKey"
              class="bg-card border border-border/60 rounded-2xl shadow-2xl overflow-hidden"
            >
              <div class="h-0.5 w-full" :style="{ background: `var(${step.accentVar})` }" />

              <div class="px-5 py-5">
                <div class="flex items-center justify-between mb-4">
                  <span class="text-2xs font-medium text-muted-foreground/50 uppercase tracking-widest">
                    {{ t('app.core.onboarding.step_of', { current: currentStep + 1, total: TOTAL_STEPS }) }}
                  </span>
                  <button
                    class="p-1 rounded-md text-muted-foreground/40 hover:text-foreground hover:bg-muted transition-colors"
                    @click="handleSkip"
                    :aria-label="t('app.core.onboarding.skip')"
                  >
                    <X class="w-3.5 h-3.5" />
                  </button>
                </div>

                <div class="flex items-start gap-3 mb-5">
                  <div
                    class="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                    :style="{
                      backgroundColor: `color-mix(in oklab, var(${step.accentVar}) 12%, transparent)`,
                    }"
                  >
                    <component :is="step.icon" class="w-4 h-4" :class="step.color" />
                  </div>
                  <div>
                    <h3 class="text-sm font-semibold text-foreground leading-snug mb-1.5">
                      {{ t(step.titleKey) }}
                    </h3>
                    <p class="text-xs text-muted-foreground leading-relaxed">
                      {{ t(step.descKey) }}
                    </p>
                  </div>
                </div>

                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-1.5" role="group" :aria-label="t('app.core.common.step_indicator', { current: currentStep + 1, total: TOTAL_STEPS })">
                    <div
                      v-for="i in TOTAL_STEPS"
                      :key="i"
                      role="img"
                      :aria-label="t('app.core.common.step_indicator', { current: i, total: TOTAL_STEPS })"
                      :aria-current="currentStep === i - 1 ? 'step' : undefined"
                      :class="cn(
                        'rounded-full transition-all duration-200',
                        currentStep === i - 1
                          ? 'w-4 h-1.5 bg-primary'
                          : 'w-1.5 h-1.5 bg-muted-foreground/25',
                      )"
                    />
                  </div>
                  <button
                    @click="goNext"
                    :disabled="isNavigating"
                    :class="cn(
                      'flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150',
                      'bg-primary text-primary-foreground hover:opacity-90 active:scale-[0.97] shadow-sm',
                      isNavigating && 'opacity-60 cursor-wait',
                    )"
                  >
                    {{ isLast ? t('app.core.onboarding.done') : t('app.core.onboarding.next') }}
                    <ArrowRight v-if="!isLast" class="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          </Transition>
        </div>

      </div>
    </Transition>
  </Teleport>
</template>
