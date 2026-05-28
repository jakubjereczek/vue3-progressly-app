<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { Bug, X, Database, RotateCcw, FlaskConical, Zap, Target } from 'lucide-vue-next';
import { isFakeMode, setFakeMode } from '@/lib/devMode';
import { FAKE_ACTIVITIES, FAKE_CATEGORIES } from '@/lib/fakeData';
import { useActivitiesStore, useCategoriesStore } from '@/stores';
import { useCategoryName } from '@/composables';
import { cn } from '@/lib/utils';
import { useOnboarding } from '@/components/core/onboarding/useOnboarding';
import { useGoalsCheckIn } from '@/components/core/goals-management/useGoalsCheckIn';

const activitiesStore = useActivitiesStore();
const categoriesStore = useCategoriesStore();
const { resolveCategoryName } = useCategoryName();
const { reset: resetOnboarding } = useOnboarding();
const { triggerPreview: triggerCheckIn } = useGoalsCheckIn();

const isVisible = ref(false);

// ─── Konami Code detector ─────────────────────────────────────────────────────
const KONAMI = [
  'ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown',
  // 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight',
  // 'b', 'a',
];
const buffer = ref<string[]>([]);

function onKeyDown(e: KeyboardEvent) {
  buffer.value.push(e.key);
  if (buffer.value.length > KONAMI.length) {
    buffer.value.shift();
  }
  if (buffer.value.join(',') === KONAMI.join(',')) {
    isVisible.value = true;
    buffer.value = [];
  }
}

onMounted(() => window.addEventListener('keydown', onKeyDown));
onBeforeUnmount(() => window.removeEventListener('keydown', onKeyDown));

// ─── Fake mode toggle ─────────────────────────────────────────────────────────

function applyFakeData() {
  activitiesStore.activities = [...FAKE_ACTIVITIES];
  categoriesStore.categories = [...FAKE_CATEGORIES];
}

function resetRealData() {
  activitiesStore.getActivities();
  categoriesStore.getCategories();
}

function toggle() {
  const next = !isFakeMode.value;
  setFakeMode(next);
  if (next) {
    applyFakeData();
  } else {
    resetRealData();
  }
}

const fakeStats = {
  activities: FAKE_ACTIVITIES.length,
  categories: FAKE_CATEGORIES.length,
  days: 90,
};
</script>

<template>
  <transition
    enter-active-class="transition-all duration-300 ease-out"
    enter-from-class="opacity-0 translate-y-4"
    enter-to-class="opacity-100 translate-y-0"
    leave-active-class="transition-all duration-200 ease-in"
    leave-from-class="opacity-100 translate-y-0"
    leave-to-class="opacity-0 translate-y-4"
  >
    <div
      v-if="isVisible"
      class="fixed bottom-5 left-5 z-50 w-80 rounded-2xl border border-border/60 bg-card shadow-2xl shadow-black/20 overflow-hidden"
    >
      <!-- Top accent -->
      <div class="h-0.5 w-full bg-gradient-to-r from-primary via-chart-3 to-success" />

      <!-- Header -->
      <div class="flex items-center justify-between px-4 pt-3 pb-2 border-b border-border/40">
        <div class="flex items-center gap-2">
          <FlaskConical class="w-4 h-4 text-primary" />
          <span class="text-sm font-semibold">Developer Mode</span>
          <span class="text-2xs font-mono px-1.5 py-0.5 rounded bg-primary/10 text-primary uppercase tracking-wide">
            secret
          </span>
        </div>
        <button
          class="p-1 rounded-md hover:bg-muted transition-colors text-muted-foreground"
          @click="isVisible = false"
          aria-label="Close"
        >
          <X class="w-3.5 h-3.5" />
        </button>
      </div>

      <!-- Body -->
      <div class="px-4 py-4 flex flex-col gap-4">

        <!-- Fake data toggle -->
        <div
          :class="cn(
            'flex items-start gap-3 p-3 rounded-xl border transition-colors cursor-pointer',
            isFakeMode
              ? 'bg-primary/5 border-primary/30'
              : 'bg-muted/30 border-border/40 hover:bg-muted',
          )"
          @click="toggle"
        >
          <div class="flex-shrink-0 mt-0.5">
            <Database :class="cn('w-4 h-4', isFakeMode ? 'text-primary' : 'text-muted-foreground')" />
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center justify-between gap-2">
              <p class="text-sm font-medium">Fake Data Mode</p>
              <!-- Toggle pill -->
              <div
                :class="cn(
                  'w-8 h-4.5 rounded-full transition-colors flex-shrink-0 relative',
                  isFakeMode ? 'bg-primary' : 'bg-border',
                )"
                style="height: 18px; width: 32px;"
              >
                <span
                  :class="cn(
                    'absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white shadow transition-transform',
                    isFakeMode ? 'translate-x-[14px]' : 'translate-x-0.5',
                  )"
                />
              </div>
            </div>
            <p class="text-xs text-muted-foreground mt-0.5">
              {{ isFakeMode ? 'Intercepting all API requests with mock data.' : 'Click to load fake data into all views.' }}
            </p>
          </div>
        </div>

        <!-- Stats when active -->
        <div v-if="isFakeMode" class="grid grid-cols-3 gap-2">
          <div class="flex flex-col items-center gap-0.5 py-2 px-1 rounded-lg bg-muted/40 border border-border/30">
            <span class="text-base font-semibold tabular-nums text-foreground">{{ fakeStats.activities }}</span>
            <span class="text-2xs text-muted-foreground">activities</span>
          </div>
          <div class="flex flex-col items-center gap-0.5 py-2 px-1 rounded-lg bg-muted/40 border border-border/30">
            <span class="text-base font-semibold tabular-nums text-foreground">{{ fakeStats.categories }}</span>
            <span class="text-2xs text-muted-foreground">categories</span>
          </div>
          <div class="flex flex-col items-center gap-0.5 py-2 px-1 rounded-lg bg-muted/40 border border-border/30">
            <span class="text-base font-semibold tabular-nums text-foreground">{{ fakeStats.days }}</span>
            <span class="text-2xs text-muted-foreground">days</span>
          </div>
        </div>

        <!-- Category preview dots -->
        <div v-if="isFakeMode" class="flex items-center gap-2">
          <span class="text-2xs text-muted-foreground uppercase tracking-wide font-medium">Categories:</span>
          <div class="flex items-center gap-1.5 flex-wrap">
            <div
              v-for="cat in FAKE_CATEGORIES"
              :key="cat.id"
              class="flex items-center gap-1"
              :title="resolveCategoryName(cat.name)"
            >
              <span class="w-2 h-2 rounded-full" :style="{ backgroundColor: cat.color }" />
              <span class="text-2xs text-muted-foreground">{{ resolveCategoryName(cat.name) }}</span>
            </div>
          </div>
        </div>

        <!-- Reset -->
        <button
          v-if="isFakeMode"
          class="flex items-center justify-center gap-1.5 w-full py-1.5 rounded-lg border border-border/50 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          @click="toggle"
        >
          <RotateCcw class="w-3 h-3" />
          Disable & reload real data
        </button>

        <!-- Onboarding reset -->
        <button
          class="flex items-center justify-center gap-1.5 w-full py-1.5 rounded-lg border border-border/50 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          @click="resetOnboarding(); isVisible = false"
        >
          <Zap class="w-3 h-3" />
          Replay onboarding
        </button>

        <!-- Goals check-in preview -->
        <button
          class="flex items-center justify-center gap-1.5 w-full py-1.5 rounded-lg border border-border/50 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          @click="triggerCheckIn(); isVisible = false"
        >
          <Target class="w-3 h-3" />
          Preview goals check-in
        </button>

        <!-- Hint -->
        <p class="text-2xs text-muted-foreground/60 text-center -mt-1">
          <Bug class="w-2.5 h-2.5 inline mr-0.5" />
          triggered via konami code · ↑↑↓↓←→←→BA
        </p>
      </div>
    </div>
  </transition>
</template>
