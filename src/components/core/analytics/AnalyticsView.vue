<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { storeToRefs } from 'pinia';
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Hash,
  CalendarDays,
  Star,
  TrendingUp,
  TrendingDown,
  Minus,
  Layers,
  Tag,
  Eye,
  EyeOff,
  Lock,
  BarChart2,
  LineChart,
  SearchX,
} from 'lucide-vue-next';
import { RouterLink } from 'vue-router';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import LoadingSpinner from '@/components/ui/loading-spinner/LoadingSpinner.vue';
import ErrorMessage from '@/components/error-message/ErrorMessage.vue';
import { useActivitiesStore, useCategoriesStore, useUserStore } from '@/stores';
import { useTranslation, useCategoryName } from '@/composables';
import { useAnalyticsData, type AnalyticsPeriod } from './useAnalyticsData';
import AnalyticsBarChart from './AnalyticsBarChart.vue';
import AnalyticsLineChart from './AnalyticsLineChart.vue';
import InfoTooltip from '@/components/ui/info-tooltip/InfoTooltip.vue';
import { cn } from '@/lib/utils';

const { t } = useTranslation();
const { resolveCategoryName } = useCategoryName();
const { isPremium } = storeToRefs(useUserStore());
const activitiesStore = useActivitiesStore();
const categoriesStore = useCategoriesStore();
const { activities, loading, error } = storeToRefs(activitiesStore);
const { categories } = storeToRefs(categoriesStore);

const STORAGE_PERIOD_KEY = 'progressly:analytics:period';
const STORAGE_CHART_KEY = 'progressly:analytics:chartType';
const STORAGE_SHOW_PREV_KEY = 'progressly:analytics:showPrevious';

const period = ref<AnalyticsPeriod>((localStorage.getItem(STORAGE_PERIOD_KEY) as AnalyticsPeriod | null) ?? 'week');
const offset = ref(0);
const showPrevious = ref(localStorage.getItem(STORAGE_SHOW_PREV_KEY) !== 'false');
const chartType = ref<'bar' | 'line'>((localStorage.getItem(STORAGE_CHART_KEY) as 'bar' | 'line' | null) ?? 'bar');
const filterCategoryIds = ref<Set<string | null>>(new Set());
const filterTags = ref<Set<string>>(new Set());

// Reset offset on period change; don't reset filters so selections persist
watch(period, (val) => {
  offset.value = 0;
  localStorage.setItem(STORAGE_PERIOD_KEY, val);
});
watch(chartType, (val) => localStorage.setItem(STORAGE_CHART_KEY, val));
watch(showPrevious, (val) => localStorage.setItem(STORAGE_SHOW_PREV_KEY, String(val)));

const PERIODS: { value: AnalyticsPeriod; labelKey: string }[] = [
  { value: 'week', labelKey: 'app.module.analytics.period.week' },
  { value: 'month', labelKey: 'app.module.analytics.period.month' },
  { value: 'year', labelKey: 'app.module.analytics.period.year' },
];

const {
  bars,
  maxBarSeconds,
  summary,
  categoryBreakdown,
  tagBreakdown,
  bounds,
  prevBounds,
  allCategoriesInPeriod,
  allTagsInPeriod,
} = useAnalyticsData(activities, categories, period, offset, filterCategoryIds, filterTags);

// Prune filters to options that still exist in the new period
watch(allCategoriesInPeriod, (newCats) => {
  if (filterCategoryIds.value.size > 0) {
    const validIds = new Set(newCats.map((c) => c.id));
    const next = new Set([...filterCategoryIds.value].filter((id) => validIds.has(id)));
    if (next.size !== filterCategoryIds.value.size) filterCategoryIds.value = next;
  }
});
watch(allTagsInPeriod, (newTags) => {
  if (filterTags.value.size > 0) {
    const tagSet = new Set(newTags);
    const next = new Set([...filterTags.value].filter((tag) => tagSet.has(tag)));
    if (next.size !== filterTags.value.size) filterTags.value = next;
  }
});

// Fetch activities covering both current and previous period so comparisons work
const fetchRange = computed(() => ({ from: prevBounds.value.start, to: bounds.value.end }));
watch(
  fetchRange,
  ({ from, to }) => {
    activitiesStore.getActivitiesInRange(from, to);
  },
  { immediate: true },
);

const hasFilters = computed(() => filterCategoryIds.value.size > 0 || filterTags.value.size > 0);
const hasFilterOptions = computed(() => allCategoriesInPeriod.value.length > 0 || allTagsInPeriod.value.length > 0);

function toggleCategoryFilter(id: string | null) {
  const next = new Set(filterCategoryIds.value);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  filterCategoryIds.value = next;
}

function toggleTagFilter(tag: string) {
  const next = new Set(filterTags.value);
  if (next.has(tag)) next.delete(tag);
  else next.add(tag);
  filterTags.value = next;
}

function clearFilters() {
  filterCategoryIds.value = new Set();
  filterTags.value = new Set();
}

const isCurrentPeriod = computed(() => offset.value === 0);

function prevPeriod() {
  offset.value--;
}

function nextPeriod() {
  if (!isCurrentPeriod.value) offset.value++;
}

function changeLabel(pct: number | null): string {
  if (pct === null) return '';
  const sign = pct >= 0 ? '+' : '';
  return `${sign}${Math.round(pct)}%`;
}

const activePeriodUnitKey = computed(() => {
  switch (period.value) {
    case 'week':
      return 'app.module.analytics.unit.days';
    case 'month':
      return 'app.module.analytics.unit.days';
    case 'year':
      return 'app.module.analytics.unit.months';
    default:
      return '';
  }
});

const bestPeriodUnitKey = computed(() => {
  switch (period.value) {
    case 'week':
      return 'app.module.analytics.unit.day';
    case 'month':
      return 'app.module.analytics.unit.day';
    case 'year':
      return 'app.module.analytics.unit.month';
    default:
      return '';
  }
});

onMounted(() => categoriesStore.getCategories());
</script>

<template>
  <Card
    data-tour="analytics-view"
    class="p-6 flex flex-col gap-6 rounded-2xl border border-border/40 h-full overflow-hidden"
  >
    <div class="flex items-start justify-between gap-4 flex-shrink-0">
      <div>
        <p class="text-sm font-medium text-muted-foreground">{{ t('app.module.analytics.title') }}</p>
        <p class="text-xs text-muted-foreground/60 mt-0.5">{{ t('app.module.analytics.description') }}</p>
      </div>

      <div v-if="isPremium" class="flex items-center bg-muted rounded-lg p-1 gap-0.5 flex-shrink-0">
        <button
          v-for="p in PERIODS"
          :key="p.value"
          @click="period = p.value"
          :class="
            cn(
              'px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-150',
              period === p.value
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )
          "
        >
          {{ t(p.labelKey) }}
        </button>
      </div>
    </div>

    <div v-if="!isPremium" class="flex-1 relative overflow-hidden min-h-0">
      <div
        class="flex flex-col gap-4 blur-[3px] pointer-events-none select-none opacity-50 scale-[1.01] origin-top"
        aria-hidden="true"
      >
        <div class="rounded-xl border border-border/40 bg-card px-4 pt-3 pb-2">
          <div class="flex items-end gap-0.5 h-[120px]">
            <div
              v-for="(h, i) in [
                35, 55, 70, 45, 90, 60, 40, 75, 50, 85, 65, 45, 80, 55, 70, 40, 90, 60, 50, 75, 85, 45, 65, 55, 80, 40,
                70, 90, 60, 50,
              ]"
              :key="i"
              class="flex-1 rounded-t-sm"
              :style="{ height: h + '%', backgroundColor: 'var(--color-primary)', opacity: '0.3' }"
            />
          </div>
        </div>
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div v-for="i in 4" :key="i" class="rounded-xl border border-border/40 bg-card p-4 flex flex-col gap-3">
            <div class="h-3 w-16 bg-muted rounded" />
            <div class="h-7 w-20 bg-muted rounded" />
            <div class="h-2.5 w-24 bg-muted rounded" />
          </div>
        </div>
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div class="flex flex-col gap-2">
            <div v-for="i in 4" :key="i" class="flex items-center gap-3 py-2 px-3 rounded-lg bg-muted/30">
              <div class="w-2 h-2 rounded-full bg-muted-foreground/30 flex-shrink-0" />
              <div class="h-3 rounded bg-muted flex-1" />
              <div class="h-2 w-8 rounded bg-muted flex-shrink-0" />
            </div>
          </div>
          <div class="flex flex-col gap-2">
            <div v-for="i in 3" :key="i" class="flex items-center gap-3 py-2 px-3 rounded-lg bg-muted/30">
              <div class="h-5 w-16 rounded-full bg-muted flex-shrink-0" />
              <div class="h-2 rounded bg-muted flex-1" />
              <div class="h-2 w-8 rounded bg-muted flex-shrink-0" />
            </div>
          </div>
        </div>
      </div>

      <div
        class="absolute inset-0 flex flex-col items-center justify-center gap-6 text-center bg-gradient-to-b from-card/10 via-card/70 to-card/90"
      >
        <div class="w-14 h-14 rounded-xl bg-muted flex items-center justify-center shadow-card">
          <Lock class="w-6 h-6 text-muted-foreground" />
        </div>
        <div class="max-w-sm">
          <p class="text-base font-semibold">{{ t('app.module.analytics.premium_title') }}</p>
          <p class="text-sm text-muted-foreground mt-1.5 leading-relaxed">
            {{ t('app.module.analytics.premium_hint') }}
          </p>
        </div>
        <RouterLink to="/dashboard/upgrade">
          <Button class="gap-2">
            {{ t('app.module.analytics.upgrade_cta') }}
          </Button>
        </RouterLink>
      </div>
    </div>

    <div v-else-if="error" class="flex-1 flex items-center justify-center p-6">
      <ErrorMessage :title="t(error)" />
    </div>

    <div v-else-if="loading" class="flex-1 flex items-center justify-center">
      <LoadingSpinner />
    </div>

    <template v-else>
      <div class="flex items-center justify-between gap-4 flex-shrink-0">
        <div class="flex items-center gap-2 min-w-0">
          <button
            @click="prevPeriod"
            class="w-7 h-7 flex items-center justify-center rounded-md border border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors flex-shrink-0"
            :aria-label="t('app.module.analytics.nav.prev')"
          >
            <ChevronLeft class="w-4 h-4" />
          </button>

          <span class="text-sm font-medium text-foreground truncate">
            {{ summary.periodLabel }}
          </span>

          <button
            @click="nextPeriod"
            :disabled="isCurrentPeriod"
            class="w-7 h-7 flex items-center justify-center rounded-md border border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
            :aria-label="t('app.module.analytics.nav.next')"
          >
            <ChevronRight class="w-4 h-4" />
          </button>
        </div>

        <div class="flex items-center gap-2 flex-shrink-0">
          <div class="flex items-center bg-muted rounded-lg p-1 gap-0.5">
            <button
              @click="chartType = 'bar'"
              :class="
                cn(
                  'p-1.5 rounded-md transition-all duration-150',
                  chartType === 'bar'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )
              "
              :aria-label="t('app.module.analytics.chart.bar')"
            >
              <BarChart2 class="w-3.5 h-3.5" />
            </button>
            <button
              @click="chartType = 'line'"
              :class="
                cn(
                  'p-1.5 rounded-md transition-all duration-150',
                  chartType === 'line'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )
              "
              :aria-label="t('app.module.analytics.chart.line')"
            >
              <LineChart class="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            @click="showPrevious = !showPrevious"
            :class="
              cn(
                'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors flex-shrink-0',
                showPrevious
                  ? 'bg-muted border-border/60 text-foreground'
                  : 'border-border/30 text-muted-foreground hover:text-foreground',
              )
            "
          >
            <Eye v-if="showPrevious" class="w-3.5 h-3.5" />
            <EyeOff v-else class="w-3.5 h-3.5" />
            {{ t('app.module.analytics.compare') }}
          </button>
        </div>
      </div>

      <div v-if="hasFilterOptions" class="flex flex-col gap-2 flex-shrink-0">
        <div class="flex flex-wrap items-center gap-1.5">
          <button
            v-for="cat in allCategoriesInPeriod"
            :key="cat.id ?? '__none__'"
            @click="toggleCategoryFilter(cat.id)"
            :class="
              cn(
                'flex items-center gap-1.5 px-2 py-1 rounded-full text-2xs font-medium border transition-all duration-150',
                filterCategoryIds.size === 0 || filterCategoryIds.has(cat.id)
                  ? 'bg-card border-border/60 text-foreground opacity-100'
                  : 'bg-card border-border/30 text-muted-foreground opacity-40 hover:opacity-70',
              )
            "
          >
            <span class="w-2 h-2 rounded-full flex-shrink-0" :style="{ backgroundColor: cat.color }" />
            <span class="truncate max-w-[100px]">
              {{
                cat.name === '__uncategorized__'
                  ? t('app.module.analytics.uncategorized')
                  : resolveCategoryName(cat.name)
              }}
            </span>
          </button>

          <span
            v-if="allCategoriesInPeriod.length > 0 && allTagsInPeriod.length > 0"
            class="w-px h-4 bg-border/50 mx-0.5 flex-shrink-0"
          />

          <button
            v-for="tag in allTagsInPeriod"
            :key="tag"
            @click="toggleTagFilter(tag)"
            :class="
              cn(
                'px-2 py-1 rounded-full text-2xs font-medium border transition-all duration-150',
                filterTags.size === 0 || filterTags.has(tag)
                  ? 'bg-primary/10 border-primary/30 text-primary opacity-100'
                  : 'bg-card border-border/30 text-muted-foreground opacity-40 hover:opacity-70',
              )
            "
          >
            {{ tag }}
          </button>

          <button
            v-if="hasFilters"
            @click="clearFilters"
            class="ml-1 text-2xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2 flex-shrink-0"
          >
            {{ t('app.module.analytics.filter.clear') }}
          </button>
        </div>
      </div>

      <div
        v-if="hasFilters && summary.totalSeconds === 0 && !loading"
        class="flex items-center gap-3 px-4 py-3 rounded-xl border border-border/40 bg-muted/30 flex-shrink-0"
      >
        <SearchX class="w-4 h-4 text-muted-foreground flex-shrink-0" />
        <p class="text-sm text-muted-foreground flex-1">{{ t('app.module.analytics.filter.no_results') }}</p>
        <button class="text-xs text-primary hover:underline flex-shrink-0" @click="clearFilters">
          {{ t('app.module.analytics.filter.clear') }}
        </button>
      </div>

      <div class="flex-shrink-0 rounded-xl border border-border/40 bg-card px-4 pt-3 pb-2">
        <AnalyticsBarChart
          v-if="chartType === 'bar'"
          :items="bars"
          :max-seconds="maxBarSeconds"
          :show-previous="showPrevious"
          :compact="period === 'month'"
        />
        <AnalyticsLineChart v-else :items="bars" :max-seconds="maxBarSeconds" :show-previous="showPrevious" />
        <div v-if="showPrevious" class="flex items-center gap-3 mt-1">
          <div class="flex items-center gap-1.5">
            <div class="w-4 h-0.5 rounded-full bg-primary/60" />
            <span class="text-2xs text-muted-foreground">{{ t('app.module.analytics.legend.current') }}</span>
          </div>
          <div class="flex items-center gap-1.5">
            <div
              class="w-4 h-px opacity-65"
              style="
                background: repeating-linear-gradient(
                  90deg,
                  var(--color-muted-foreground) 0,
                  var(--color-muted-foreground) 3px,
                  transparent 3px,
                  transparent 6px
                );
              "
            />
            <span class="text-2xs text-muted-foreground">{{ t('app.module.analytics.legend.previous') }}</span>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 flex-shrink-0">
        <div class="flex flex-col gap-3 rounded-xl border border-border/40 bg-card p-4">
          <div class="flex items-start justify-between gap-2">
            <span class="text-xs font-medium text-muted-foreground leading-tight">{{
              t('app.module.analytics.kpi.total_time')
            }}</span>
            <div class="w-7 h-7 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
              <Clock class="w-3.5 h-3.5 text-muted-foreground" />
            </div>
          </div>
          <span class="text-2xl font-semibold font-mono tabular-nums text-foreground leading-none">
            {{ summary.formattedTotal }}
          </span>
          <div v-if="summary.changePercent !== null" class="flex items-center gap-1">
            <TrendingUp v-if="summary.changePercent > 0" class="w-3 h-3 text-success flex-shrink-0" />
            <TrendingDown v-else-if="summary.changePercent < 0" class="w-3 h-3 text-destructive flex-shrink-0" />
            <Minus v-else class="w-3 h-3 text-muted-foreground flex-shrink-0" />
            <span
              class="text-xs font-medium"
              :class="
                summary.changePercent > 0
                  ? 'text-success'
                  : summary.changePercent < 0
                    ? 'text-destructive'
                    : 'text-muted-foreground'
              "
            >
              {{ changeLabel(summary.changePercent) }}
            </span>
            <span class="text-xs text-muted-foreground">{{ t('app.module.analytics.kpi.vs_prev') }}</span>
            <InfoTooltip :text="summary.prevPeriodLabel" side="bottom" />
          </div>
          <span v-else class="text-xs text-muted-foreground">{{ t('app.module.analytics.kpi.no_prev') }}</span>
        </div>

        <div class="flex flex-col gap-3 rounded-xl border border-border/40 bg-card p-4">
          <div class="flex items-start justify-between gap-2">
            <span class="text-xs font-medium text-muted-foreground leading-tight">{{
              t('app.module.analytics.kpi.sessions')
            }}</span>
            <div class="w-7 h-7 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
              <Hash class="w-3.5 h-3.5 text-muted-foreground" />
            </div>
          </div>
          <span class="text-2xl font-semibold tabular-nums text-foreground leading-none">
            {{ summary.sessionCount }}
          </span>
          <span class="text-xs text-muted-foreground">
            {{ summary.activePeriods }}/{{ summary.totalPeriods }}
            {{ t(activePeriodUnitKey) }}
            {{ t('app.module.analytics.kpi.active') }}
          </span>
        </div>

        <div class="flex flex-col gap-3 rounded-xl border border-border/40 bg-card p-4">
          <div class="flex items-start justify-between gap-2">
            <span class="text-xs font-medium text-muted-foreground leading-tight">{{
              t('app.module.analytics.kpi.avg')
            }}</span>
            <div class="w-7 h-7 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
              <CalendarDays class="w-3.5 h-3.5 text-muted-foreground" />
            </div>
          </div>
          <span class="text-2xl font-semibold font-mono tabular-nums text-foreground leading-none">
            {{ summary.formattedAvg }}
          </span>
          <span class="text-xs text-muted-foreground">
            {{ t('app.module.analytics.kpi.per_active') }} {{ t(bestPeriodUnitKey) }}
          </span>
        </div>

        <div class="flex flex-col gap-3 rounded-xl border border-border/40 bg-card p-4">
          <div class="flex items-start justify-between gap-2">
            <span class="text-xs font-medium text-muted-foreground leading-tight">{{
              t('app.module.analytics.kpi.best')
            }}</span>
            <div class="w-7 h-7 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
              <Star class="w-3.5 h-3.5 text-muted-foreground" />
            </div>
          </div>
          <span class="text-2xl font-semibold font-mono tabular-nums text-foreground leading-none">
            {{ summary.formattedBest }}
          </span>
          <span class="text-xs text-muted-foreground">
            {{ t(bestPeriodUnitKey) }}: <span class="text-foreground font-medium">{{ summary.bestBarLabel }}</span>
          </span>
        </div>
      </div>

      <div class="flex-1 overflow-y-auto min-h-0 grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div class="flex flex-col gap-3 min-h-0">
          <div class="flex items-center gap-2 flex-shrink-0">
            <Layers class="w-4 h-4 text-muted-foreground" />
            <h2 class="text-sm font-semibold">{{ t('app.module.analytics.categories') }}</h2>
            <span class="ml-auto text-xs text-muted-foreground">{{ t('app.module.analytics.col.time') }}</span>
          </div>

          <div v-if="categoryBreakdown.length === 0" class="flex flex-col items-center justify-center gap-2 py-10">
            <Layers class="w-8 h-8 text-muted-foreground/30" />
            <p class="text-sm text-muted-foreground">
              {{ hasFilters ? t('app.module.analytics.filter.no_results') : t('app.module.analytics.no_data') }}
            </p>
          </div>

          <div v-else class="flex flex-col gap-0.5">
            <div
              v-for="cat in categoryBreakdown"
              :key="cat.categoryId ?? '__none__'"
              class="flex items-center gap-3 py-3 px-3 rounded-lg hover:bg-muted transition-colors"
            >
              <div
                class="w-2 h-2 rounded-full flex-shrink-0"
                :style="{ backgroundColor: cat.categoryId ? cat.color : 'var(--color-muted-foreground)' }"
              />

              <span
                class="text-sm w-28 flex-shrink-0 truncate"
                :class="cat.categoryId ? 'text-foreground' : 'text-muted-foreground italic'"
              >
                {{ cat.categoryId ? resolveCategoryName(cat.name) : t('app.module.analytics.uncategorized') }}
              </span>

              <div class="flex-1 h-1.5 bg-muted rounded-full overflow-hidden min-w-0">
                <div
                  class="h-full rounded-full transition-all duration-500"
                  :style="{
                    width: cat.percentage.toFixed(1) + '%',
                    backgroundColor: cat.categoryId ? cat.color : 'var(--color-muted-foreground)',
                    opacity: cat.categoryId ? 0.75 : 0.35,
                  }"
                />
              </div>

              <span class="text-2xs text-muted-foreground tabular-nums w-8 text-right flex-shrink-0">
                {{ cat.percentage.toFixed(0) }}%
              </span>

              <div
                v-if="showPrevious && cat.changePercent !== null"
                class="flex items-center gap-0.5 flex-shrink-0 w-12 justify-end"
              >
                <TrendingUp v-if="cat.changePercent > 2" class="w-3 h-3 text-success flex-shrink-0" />
                <TrendingDown v-else-if="cat.changePercent < -2" class="w-3 h-3 text-destructive flex-shrink-0" />
                <span
                  class="text-2xs font-medium"
                  :class="
                    cat.changePercent > 2
                      ? 'text-success'
                      : cat.changePercent < -2
                        ? 'text-destructive'
                        : 'text-muted-foreground'
                  "
                >
                  {{ changeLabel(cat.changePercent) }}
                </span>
              </div>
              <div v-else-if="showPrevious" class="flex items-center justify-end flex-shrink-0 w-12">
                <span class="text-2xs text-muted-foreground/30" :title="t('app.module.analytics.kpi.no_prev')">—</span>
              </div>
              <div v-else class="w-12 flex-shrink-0" />

              <span class="text-xs font-mono tabular-nums text-foreground flex-shrink-0 text-right w-14">
                {{ cat.formattedTotal }}
              </span>
            </div>
          </div>
        </div>

        <div class="flex flex-col gap-3 min-h-0">
          <div class="flex items-center gap-2 flex-shrink-0">
            <Tag class="w-4 h-4 text-muted-foreground" />
            <h2 class="text-sm font-semibold">{{ t('app.module.analytics.tags') }}</h2>
            <span class="ml-auto text-xs text-muted-foreground">{{ t('app.module.analytics.col.time') }}</span>
          </div>

          <div v-if="tagBreakdown.length === 0" class="flex flex-col items-center justify-center gap-2 py-10">
            <Tag class="w-8 h-8 text-muted-foreground/30" />
            <p class="text-sm text-muted-foreground">
              {{ hasFilters ? t('app.module.analytics.filter.no_results') : t('app.module.analytics.no_data') }}
            </p>
          </div>

          <div v-else class="flex flex-col gap-0.5">
            <div
              v-for="tag in tagBreakdown"
              :key="tag.tag"
              class="flex items-center gap-3 py-3 px-3 rounded-lg hover:bg-muted transition-colors"
            >
              <span
                class="px-2 py-0.5 rounded-full text-2xs font-medium bg-muted text-muted-foreground border border-border/40 flex-shrink-0 w-28 truncate text-center"
              >
                {{ tag.tag }}
              </span>

              <div class="flex-1 h-1.5 bg-muted rounded-full overflow-hidden min-w-0">
                <div
                  class="h-full rounded-full bg-primary/50 transition-all duration-500"
                  :style="{ width: tag.percentage.toFixed(1) + '%' }"
                />
              </div>

              <span class="text-2xs text-muted-foreground tabular-nums w-8 text-right flex-shrink-0">
                {{ tag.percentage.toFixed(0) }}%
              </span>

              <span class="text-xs text-muted-foreground flex-shrink-0 tabular-nums w-10 text-right">
                {{ tag.sessionCount }}x
              </span>

              <span class="text-xs font-mono tabular-nums text-foreground flex-shrink-0 text-right w-14">
                {{ tag.formattedTotal }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </template>
  </Card>
</template>
