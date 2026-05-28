<script setup lang="ts">
import { ref, watch, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import {
  Search,
  Clock,
  Tag,
  Target,
  LayoutDashboard,
  List,
  GanttChartSquare,
  CalendarDays,
  BarChart2,
  TrendingUp,
  Download,
  Settings,
} from 'lucide-vue-next';
import { useTranslation } from '@/composables';
import { useGlobalSearch, highlightMatch, type SearchResult, type SearchResultType } from './useGlobalSearch';

const { t } = useTranslation();
const router = useRouter();
const {
  isOpen,
  query,
  activeIndex,
  close,
  activityResults,
  categoryResults,
  goalResults,
  hasResults,
  hasQuery,
  navigateDown,
  navigateUp,
  selectActive,
  getResultIndex,
} = useGlobalSearch();

const inputRef = ref<HTMLInputElement | null>(null);

// Focus input when modal opens
watch(isOpen, async (val) => {
  if (val) {
    await nextTick();
    inputRef.value?.focus();
  }
});

// Quick nav pages shown when query is empty
const quickPages = [
  { labelKey: 'app.core.navbar.time_tracking', url: '/dashboard/overview', icon: LayoutDashboard },
  { labelKey: 'app.core.navbar.timesheet', url: '/dashboard/timesheet', icon: List },
  { labelKey: 'app.core.navbar.gantt', url: '/dashboard/gantt', icon: GanttChartSquare },
  { labelKey: 'app.core.navbar.calendar', url: '/dashboard/calendar', icon: CalendarDays },
  { labelKey: 'app.core.navbar.goals', url: '/dashboard/goals', icon: Target },
  { labelKey: 'app.core.navbar.categories', url: '/dashboard/categories', icon: Tag },
  { labelKey: 'app.core.navbar.stats', url: '/dashboard/stats', icon: BarChart2 },
  { labelKey: 'app.core.navbar.analytics', url: '/dashboard/analytics', icon: TrendingUp },
  { labelKey: 'app.core.navbar.export', url: '/dashboard/export', icon: Download },
  { labelKey: 'app.core.navbar.settings', url: '/dashboard/settings', icon: Settings },
];

function navigateTo(url: string) {
  router.push(url);
  close();
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    navigateDown();
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    navigateUp();
  } else if (e.key === 'Enter') {
    e.preventDefault();
    selectActive();
  } else if (e.key === 'Escape') {
    close();
  }
}

function isActive(type: SearchResultType, id: string): boolean {
  return getResultIndex(type, id) === activeIndex.value;
}

function handleResultClick(result: SearchResult) {
  result.action();
}

function setActive(type: SearchResultType, id: string) {
  activeIndex.value = getResultIndex(type, id);
}
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-150 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-100 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="isOpen"
        class="fixed inset-0 z-50 flex items-start justify-center"
        role="dialog"
        aria-modal="true"
        :aria-label="t('app.core.search.aria_label')"
      >
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="close" />

        <!-- Modal -->
        <Transition
          enter-active-class="transition duration-150 ease-out"
          enter-from-class="opacity-0 scale-95 -translate-y-2"
          enter-to-class="opacity-100 scale-100 translate-y-0"
          leave-active-class="transition duration-100 ease-in"
          leave-from-class="opacity-100 scale-100 translate-y-0"
          leave-to-class="opacity-0 scale-95 -translate-y-2"
          appear
        >
          <div class="relative z-10 w-full max-w-lg mx-4 mt-[13vh]">
            <div class="bg-card rounded-2xl border border-border/40 shadow-2xl overflow-hidden flex flex-col">
              <!-- ── Search Input ──────────────────────────────────────── -->
              <div class="flex items-center gap-3 px-4 py-3.5 border-b border-border/40 flex-shrink-0">
                <Search class="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <input
                  ref="inputRef"
                  v-model="query"
                  type="text"
                  :placeholder="t('app.core.search.placeholder')"
                  class="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/50 min-w-0"
                  autocomplete="off"
                  autocorrect="off"
                  autocapitalize="off"
                  spellcheck="false"
                  @keydown="handleKeydown"
                />
                <kbd
                  class="hidden sm:flex text-2xs leading-none text-muted-foreground/50 bg-muted px-1.5 py-1 rounded border border-border/40 flex-shrink-0"
                >
                  Esc
                </kbd>
              </div>

              <!-- ── Results area ──────────────────────────────────────── -->
              <div class="overflow-y-auto max-h-[55vh] overscroll-contain">
                <!-- Quick nav: empty query state -->
                <div v-if="!hasQuery" class="p-2">
                  <p
                    class="px-2 pt-1 pb-2 text-2xs font-semibold text-muted-foreground/60 uppercase tracking-widest select-none"
                  >
                    {{ t('app.core.search.section.quick_nav') }}
                  </p>
                  <div class="grid grid-cols-2 gap-0.5">
                    <button
                      v-for="page in quickPages"
                      :key="page.url"
                      class="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors duration-100 text-left w-full"
                      @click="navigateTo(page.url)"
                    >
                      <component :is="page.icon" class="w-3.5 h-3.5 flex-shrink-0" />
                      <span class="truncate">{{ t(page.labelKey) }}</span>
                    </button>
                  </div>
                </div>

                <!-- No results -->
                <div
                  v-else-if="hasQuery && !hasResults"
                  class="flex flex-col items-center justify-center gap-2 py-12 text-center px-4"
                >
                  <div class="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                    <Search class="w-4 h-4 text-muted-foreground/50" />
                  </div>
                  <p class="text-sm font-medium text-muted-foreground">
                    {{ t('app.core.search.no_results', { query }) }}
                  </p>
                  <p class="text-xs text-muted-foreground/50">
                    {{ t('app.core.search.no_results_hint') }}
                  </p>
                </div>

                <!-- Results -->
                <template v-else-if="hasQuery && hasResults">
                  <div class="p-2 flex flex-col gap-1">
                    <!-- Activities section -->
                    <template v-if="activityResults.length > 0">
                      <p
                        class="px-2 pt-1 pb-1.5 text-2xs font-semibold text-muted-foreground/60 uppercase tracking-widest select-none"
                      >
                        {{ t('app.core.search.section.activities') }}
                      </p>
                      <button
                        v-for="result in activityResults"
                        :key="result.id"
                        class="flex items-center gap-3 w-full px-3 py-3 rounded-lg text-left transition-colors duration-100 group"
                        :class="isActive('activity', result.id) ? 'bg-primary/10' : 'hover:bg-muted'"
                        @mouseenter="setActive('activity', result.id)"
                        @mouseleave="activeIndex = -1"
                        @click="handleResultClick(result)"
                      >
                        <!-- Category color dot or clock icon -->
                        <div
                          class="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0"
                          :style="result.color ? { backgroundColor: result.color + '22' } : {}"
                        >
                          <div
                            v-if="result.color"
                            class="w-2 h-2 rounded-full"
                            :style="{ backgroundColor: result.color }"
                          />
                          <Clock v-else class="w-3.5 h-3.5 text-muted-foreground" />
                        </div>
                        <!-- Text -->
                        <div class="flex-1 min-w-0">
                          <p
                            class="text-sm font-medium text-foreground truncate leading-snug"
                            v-html="highlightMatch(result.title, query)"
                          />
                          <div v-if="result.subtitle || result.meta" class="flex items-center gap-1.5 mt-0.5">
                            <span v-if="result.subtitle" class="text-2xs text-muted-foreground truncate">
                              {{ result.subtitle }}
                            </span>
                            <span v-if="result.subtitle && result.meta" class="text-muted-foreground/40 text-2xs"
                              >·</span
                            >
                            <span
                              v-if="result.meta"
                              class="text-2xs text-muted-foreground/70 tabular-nums font-mono flex-shrink-0"
                            >
                              {{ result.meta }}
                            </span>
                          </div>
                        </div>
                        <!-- Arrow hint -->
                        <div
                          class="w-4 h-4 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          :class="isActive('activity', result.id) ? 'opacity-100' : ''"
                        >
                          <svg viewBox="0 0 16 16" fill="none" class="w-4 h-4 text-muted-foreground/50">
                            <path
                              d="M3 8h10M9 4l4 4-4 4"
                              stroke="currentColor"
                              stroke-width="1.5"
                              stroke-linecap="round"
                              stroke-linejoin="round"
                            />
                          </svg>
                        </div>
                      </button>
                    </template>

                    <!-- Categories section -->
                    <template v-if="categoryResults.length > 0">
                      <p
                        class="px-2 pt-2 pb-1.5 text-2xs font-semibold text-muted-foreground/60 uppercase tracking-widest select-none"
                      >
                        {{ t('app.core.search.section.categories') }}
                      </p>
                      <button
                        v-for="result in categoryResults"
                        :key="result.id"
                        class="flex items-center gap-3 w-full px-3 py-3 rounded-lg text-left transition-colors duration-100 group"
                        :class="isActive('category', result.id) ? 'bg-primary/10' : 'hover:bg-muted'"
                        @mouseenter="setActive('category', result.id)"
                        @mouseleave="activeIndex = -1"
                        @click="handleResultClick(result)"
                      >
                        <div
                          class="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0"
                          :style="{ backgroundColor: result.color + '22' }"
                        >
                          <div class="w-2 h-2 rounded-full" :style="{ backgroundColor: result.color }" />
                        </div>
                        <div class="flex-1 min-w-0">
                          <p
                            class="text-sm font-medium text-foreground truncate leading-snug"
                            v-html="highlightMatch(result.title, query)"
                          />
                        </div>
                        <Tag
                          class="w-3.5 h-3.5 text-muted-foreground/30 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          :class="isActive('category', result.id) ? 'opacity-100' : ''"
                        />
                      </button>
                    </template>

                    <!-- Goals section -->
                    <template v-if="goalResults.length > 0">
                      <p
                        class="px-2 pt-2 pb-1.5 text-2xs font-semibold text-muted-foreground/60 uppercase tracking-widest select-none"
                      >
                        {{ t('app.core.search.section.goals') }}
                      </p>
                      <button
                        v-for="result in goalResults"
                        :key="result.id"
                        class="flex items-center gap-3 w-full px-3 py-3 rounded-lg text-left transition-colors duration-100 group"
                        :class="isActive('goal', result.id) ? 'bg-primary/10' : 'hover:bg-muted'"
                        @mouseenter="setActive('goal', result.id)"
                        @mouseleave="activeIndex = -1"
                        @click="handleResultClick(result)"
                      >
                        <div
                          class="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0"
                          :style="{ backgroundColor: result.color + '22' }"
                        >
                          <div class="w-2 h-2 rounded-full" :style="{ backgroundColor: result.color }" />
                        </div>
                        <div class="flex-1 min-w-0">
                          <p
                            class="text-sm font-medium text-foreground truncate leading-snug"
                            v-html="highlightMatch(result.title, query)"
                          />
                          <p v-if="result.meta" class="text-2xs text-muted-foreground capitalize mt-0.5">
                            {{ result.meta }}
                          </p>
                        </div>
                        <Target
                          class="w-3.5 h-3.5 text-muted-foreground/30 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          :class="isActive('goal', result.id) ? 'opacity-100' : ''"
                        />
                      </button>
                    </template>
                  </div>
                </template>
              </div>

              <!-- ── Hint bar ───────────────────────────────────────────── -->
              <div class="flex items-center gap-4 px-4 py-2 border-t border-border/40 flex-shrink-0 bg-muted/20">
                <div class="flex items-center gap-1.5 text-2xs text-muted-foreground/50">
                  <kbd class="bg-muted border border-border/40 rounded px-1 py-0.5 text-2xs leading-none">↑↓</kbd>
                  <span>{{ t('app.core.search.hint.navigate') }}</span>
                </div>
                <div class="flex items-center gap-1.5 text-2xs text-muted-foreground/50">
                  <kbd class="bg-muted border border-border/40 rounded px-1 py-0.5 text-2xs leading-none">↵</kbd>
                  <span>{{ t('app.core.search.hint.select') }}</span>
                </div>
                <div class="flex items-center gap-1.5 text-2xs text-muted-foreground/50">
                  <kbd class="bg-muted border border-border/40 rounded px-1 py-0.5 text-2xs leading-none">Esc</kbd>
                  <span>{{ t('app.core.search.hint.close') }}</span>
                </div>
              </div>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>
