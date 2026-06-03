<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { storeToRefs } from 'pinia';
import {
  Clock,
  Hash,
  Layers,
  TrendingUp,
  Tag,
  BarChart2,
  Info,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
} from 'lucide-vue-next';
import { Card } from '@/components/ui/card';
import LoadingSpinner from '@/components/ui/loading-spinner/LoadingSpinner.vue';
import ErrorMessage from '@/components/error-message/ErrorMessage.vue';
import CategoryBadge from '@/components/ui/category-badge/CategoryBadge.vue';
import { useActivitiesStore, useCategoriesStore } from '@/stores';
import { useTranslation } from '@/composables';
import { useStatsData, getDateRangeBounds, type DateRangePreset } from './useStatsData';
import type { TagStat, CategoryStat } from './useStatsData';
import { cn } from '@/lib/utils';
import CommonHeader from '@/components/CommonHeader.vue';

const { t } = useTranslation();
const activitiesStore = useActivitiesStore();
const categoriesStore = useCategoriesStore();
const { activities, loading, error } = storeToRefs(activitiesStore);
const { categories } = storeToRefs(categoriesStore);

const STORAGE_RANGE_KEY = 'progressly:stats:range';
const STORAGE_TAB_KEY = 'progressly:stats:tab';
const dateRangePreset = ref<DateRangePreset>(
  (localStorage.getItem(STORAGE_RANGE_KEY) as DateRangePreset | null) ?? '30d',
);
const activeTab = ref<'tags' | 'categories'>(
  (localStorage.getItem(STORAGE_TAB_KEY) as 'tags' | 'categories' | null) ?? 'tags',
);
const selectedTags = ref<Set<string>>(new Set());

watch(dateRangePreset, (val) => localStorage.setItem(STORAGE_RANGE_KEY, val));
watch(activeTab, (val) => localStorage.setItem(STORAGE_TAB_KEY, val));

const DATE_RANGES: { value: DateRangePreset; label: string }[] = [
  { value: '7d', label: t('app.module.stats.range.last_7') },
  { value: '30d', label: t('app.module.stats.range.last_30') },
  { value: '90d', label: t('app.module.stats.range.last_90') },
  { value: 'month', label: t('app.module.stats.range.this_month') },
  { value: 'all', label: t('app.module.stats.range.all_time') },
];

const { allTags, tagStats, untaggedStats, categoryStats, summaryStats } = useStatsData(
  activities,
  categories,
  dateRangePreset,
  selectedTags,
);

watch(allTags, (newTags) => {
  if (selectedTags.value.size > 0) {
    const tagSet = new Set(newTags);
    const next = new Set([...selectedTags.value].filter((t) => tagSet.has(t)));
    if (next.size !== selectedTags.value.size) {
      selectedTags.value = next;
    }
  }
});

function toggleTag(tag: string) {
  const next = new Set(selectedTags.value);
  if (next.has(tag)) {
    next.delete(tag);
  } else {
    next.add(tag);
  }
  selectedTags.value = next;
}

function showAllTags() {
  selectedTags.value = new Set();
}

function clearTagFilter() {
  selectedTags.value = new Set(allTags.value);
}

type TagSortKey = keyof Pick<TagStat, 'tag' | 'sessionCount' | 'totalSeconds' | 'avgSessionSeconds' | 'percentage'>;
const tagSortKey = ref<TagSortKey>('totalSeconds');
const tagSortDir = ref<'asc' | 'desc'>('desc');

function toggleTagSort(key: TagSortKey) {
  if (tagSortKey.value === key) {
    tagSortDir.value = tagSortDir.value === 'desc' ? 'asc' : 'desc';
  } else {
    tagSortKey.value = key;
    tagSortDir.value = 'desc';
  }
}

// Merge untagged into sorted position (by totalSeconds) rather than always appending at end
const visibleTagStats = computed(() => {
  const rows = [...tagStats.value];
  if (untaggedStats.value) {
    const u = untaggedStats.value;
    const idx = rows.findIndex((r) => r.totalSeconds < u.totalSeconds);
    if (idx === -1) rows.push(u);
    else rows.splice(idx, 0, u);
  }
  return rows;
});

const sortedVisibleTagStats = computed(() => {
  const dir = tagSortDir.value === 'desc' ? -1 : 1;
  return [...visibleTagStats.value].sort((a, b) => {
    if (tagSortKey.value === 'tag') return dir * a.tag.localeCompare(b.tag);
    return dir * (a[tagSortKey.value] - b[tagSortKey.value]);
  });
});

type CatSortKey = keyof Pick<
  CategoryStat,
  'name' | 'sessionCount' | 'totalSeconds' | 'avgSessionSeconds' | 'percentage'
>;
const catSortKey = ref<CatSortKey>('totalSeconds');
const catSortDir = ref<'asc' | 'desc'>('desc');

function toggleCatSort(key: CatSortKey) {
  if (catSortKey.value === key) {
    catSortDir.value = catSortDir.value === 'desc' ? 'asc' : 'desc';
  } else {
    catSortKey.value = key;
    catSortDir.value = 'desc';
  }
}

const sortedCategoryStats = computed(() => {
  const dir = catSortDir.value === 'desc' ? -1 : 1;
  return [...categoryStats.value].sort((a, b) => {
    if (catSortKey.value === 'name') return dir * a.name.localeCompare(b.name);
    return dir * (a[catSortKey.value] - b[catSortKey.value]);
  });
});

// Max sparkline value for scaling bars
const maxTagSparkline = computed(() => Math.max(1, ...visibleTagStats.value.flatMap((s) => s.sparklineSeconds)));
const maxCategorySparkline = computed(() => Math.max(1, ...categoryStats.value.flatMap((s) => s.sparklineSeconds)));

watch(
  dateRangePreset,
  (preset) => {
    const { from, to } = getDateRangeBounds(preset);
    activitiesStore.getActivitiesInRange(from, to);
  },
  { immediate: true },
);

onMounted(() => categoriesStore.getCategories());
</script>

<template>
  <Card data-tour="stats" class="p-6 flex flex-col gap-6 rounded-2xl border border-border/40 h-full overflow-hidden">
    <div class="flex items-start justify-between gap-4 flex-shrink-0">
      <CommonHeader :title="t('app.module.stats.title')" :desc="t('app.module.stats.description')" />

      <div class="flex items-center bg-muted/40 rounded-lg p-0.5 gap-0.5 border border-border/40 flex-shrink-0">
        <button
          v-for="range in DATE_RANGES"
          :key="range.value"
          @click="dateRangePreset = range.value"
          :class="
            cn(
              'px-2.5 py-1 text-xs font-medium rounded-md transition-all duration-150',
              dateRangePreset === range.value
                ? 'bg-card text-foreground shadow-sm border border-border/40'
                : 'text-muted-foreground hover:text-foreground',
            )
          "
        >
          {{ range.label }}
        </button>
      </div>
    </div>

    <div v-if="error" class="flex-1 flex items-center justify-center p-6">
      <ErrorMessage :title="t(error)" />
    </div>

    <div v-else-if="loading" class="flex-1 flex items-center justify-center">
      <LoadingSpinner />
    </div>

    <template v-else>
      <div class="grid grid-cols-2 xl:grid-cols-4 gap-3 flex-shrink-0">
        <div class="flex flex-col gap-3 rounded-xl border border-border/40 bg-card p-4">
          <div class="flex items-start justify-between gap-2">
            <span class="text-xs font-medium text-muted-foreground leading-tight">{{
              t('app.module.stats.kpi.total_time')
            }}</span>
            <div class="w-7 h-7 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
              <Clock class="w-3.5 h-3.5 text-muted-foreground" />
            </div>
          </div>
          <span class="text-2xl font-semibold font-mono tabular-nums text-foreground leading-none">
            {{ summaryStats.formattedTotal }}
          </span>
        </div>
        <div class="flex flex-col gap-3 rounded-xl border border-border/40 bg-card p-4">
          <div class="flex items-start justify-between gap-2">
            <span class="text-xs font-medium text-muted-foreground leading-tight">{{
              t('app.module.stats.kpi.sessions')
            }}</span>
            <div class="w-7 h-7 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
              <Hash class="w-3.5 h-3.5 text-muted-foreground" />
            </div>
          </div>
          <span class="text-2xl font-semibold tabular-nums text-foreground leading-none">
            {{ summaryStats.sessionCount }}
          </span>
        </div>
        <div class="flex flex-col gap-3 rounded-xl border border-border/40 bg-card p-4">
          <div class="flex items-start justify-between gap-2">
            <span class="text-xs font-medium text-muted-foreground leading-tight">{{
              t('app.module.stats.kpi.avg_session')
            }}</span>
            <div class="w-7 h-7 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
              <TrendingUp class="w-3.5 h-3.5 text-muted-foreground" />
            </div>
          </div>
          <span class="text-2xl font-semibold font-mono tabular-nums text-foreground leading-none">
            {{ summaryStats.formattedAvg }}
          </span>
        </div>
        <div class="flex flex-col gap-3 rounded-xl border border-border/40 bg-card p-4">
          <div class="flex items-start justify-between gap-2">
            <span class="text-xs font-medium text-muted-foreground leading-tight">{{
              t('app.module.stats.kpi.categories_tags')
            }}</span>
            <div class="w-7 h-7 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
              <Layers class="w-3.5 h-3.5 text-muted-foreground" />
            </div>
          </div>
          <span class="text-2xl font-semibold tabular-nums text-foreground leading-none">
            {{ summaryStats.activeCategoryCount }}
            <span class="text-sm text-muted-foreground font-normal">{{
              t('app.module.stats.kpi.categories_unit')
            }}</span>
            · {{ summaryStats.uniqueTagCount }}
            <span class="text-sm text-muted-foreground font-normal">{{ t('app.module.stats.kpi.tags_unit') }}</span>
          </span>
        </div>
      </div>

      <div class="flex items-center gap-1 flex-shrink-0 border-b border-border/40 -mb-1">
        <button
          @click="activeTab = 'tags'"
          :class="
            cn(
              'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border-b-2 -mb-px transition-colors',
              activeTab === 'tags'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )
          "
        >
          <Tag class="w-3 h-3" />
          {{ t('app.module.stats.tab.tags') }}
        </button>
        <button
          @click="activeTab = 'categories'"
          :class="
            cn(
              'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border-b-2 -mb-px transition-colors',
              activeTab === 'categories'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )
          "
        >
          <BarChart2 class="w-3 h-3" />
          {{ t('app.module.stats.tab.categories') }}
        </button>
      </div>

      <div class="flex-1 overflow-y-auto min-h-0 flex flex-col gap-4">
        <template v-if="activeTab === 'tags'">
          <div v-if="allTags.length > 0" class="flex flex-col gap-2 flex-shrink-0">
            <div class="flex items-center justify-between gap-2">
              <span class="text-xs text-muted-foreground font-medium">{{ t('app.module.stats.tags.filter') }}</span>
              <div class="flex gap-2">
                <button
                  @click="showAllTags"
                  class="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  {{ t('app.module.stats.tags.show_all') }}
                </button>
                <span class="text-muted-foreground/40">·</span>
                <button
                  @click="clearTagFilter"
                  class="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  {{ t('app.module.stats.tags.clear') }}
                </button>
              </div>
            </div>
            <div class="flex flex-wrap gap-1.5">
              <button
                v-for="tag in allTags"
                :key="tag"
                @click="toggleTag(tag)"
                :class="
                  cn(
                    'px-2.5 py-1 rounded-full text-xs font-medium border transition-all duration-150',
                    selectedTags.size === 0 || selectedTags.has(tag)
                      ? 'bg-primary/10 text-primary border-primary/30 hover:bg-primary/20'
                      : 'bg-muted text-muted-foreground border-border/50 hover:bg-muted/80',
                  )
                "
              >
                {{ tag }}
              </button>
            </div>
          </div>

          <div
            v-if="sortedVisibleTagStats.length === 0"
            class="flex-1 flex flex-col items-center justify-center gap-3 py-16"
          >
            <div class="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
              <Tag class="w-6 h-6 text-muted-foreground" />
            </div>
            <div class="text-center">
              <p class="text-sm font-medium">{{ t('app.module.stats.no_data') }}</p>
              <p class="text-xs text-muted-foreground mt-0.5">{{ t('app.module.stats.no_data_hint') }}</p>
            </div>
          </div>

          <div v-else class="rounded-xl border border-border/40 overflow-hidden">
            <div class="overflow-x-auto touch-pan-x">
              <div class="flex flex-col gap-0 min-w-[500px]">
                <div
                  class="grid grid-cols-[2rem_1fr_2fr_5rem_5rem_5rem_5.5rem] items-center gap-3 px-4 py-2 bg-muted border-b border-border/40"
                >
                  <span class="text-xs text-muted-foreground font-medium">#</span>
                  <button
                    class="flex items-center gap-1 text-xs text-muted-foreground font-medium hover:text-foreground transition-colors text-left"
                    @click="toggleTagSort('tag')"
                  >
                    {{ t('app.module.stats.col.name') }}
                    <component
                      :is="tagSortKey === 'tag' ? (tagSortDir === 'desc' ? ChevronDown : ChevronUp) : ChevronsUpDown"
                      class="w-3 h-3 flex-shrink-0"
                    />
                  </button>
                  <button
                    class="flex items-center gap-1 text-xs text-muted-foreground font-medium hover:text-foreground transition-colors text-left"
                    @click="toggleTagSort('percentage')"
                  >
                    {{ t('app.module.stats.col.share') }}
                    <component
                      :is="
                        tagSortKey === 'percentage' ? (tagSortDir === 'desc' ? ChevronDown : ChevronUp) : ChevronsUpDown
                      "
                      class="w-3 h-3 flex-shrink-0"
                    />
                  </button>
                  <button
                    class="flex items-center gap-1 justify-end text-xs text-muted-foreground font-medium hover:text-foreground transition-colors w-full"
                    @click="toggleTagSort('sessionCount')"
                  >
                    <component
                      :is="
                        tagSortKey === 'sessionCount'
                          ? tagSortDir === 'desc'
                            ? ChevronDown
                            : ChevronUp
                          : ChevronsUpDown
                      "
                      class="w-3 h-3 flex-shrink-0"
                    />
                    {{ t('app.module.stats.col.sessions') }}
                  </button>
                  <button
                    class="flex items-center gap-1 justify-end text-xs text-muted-foreground font-medium hover:text-foreground transition-colors w-full"
                    @click="toggleTagSort('totalSeconds')"
                  >
                    <component
                      :is="
                        tagSortKey === 'totalSeconds'
                          ? tagSortDir === 'desc'
                            ? ChevronDown
                            : ChevronUp
                          : ChevronsUpDown
                      "
                      class="w-3 h-3 flex-shrink-0"
                    />
                    {{ t('app.module.stats.col.total') }}
                  </button>
                  <button
                    class="flex items-center gap-1 justify-end text-xs text-muted-foreground font-medium hover:text-foreground transition-colors w-full"
                    @click="toggleTagSort('avgSessionSeconds')"
                  >
                    <component
                      :is="
                        tagSortKey === 'avgSessionSeconds'
                          ? tagSortDir === 'desc'
                            ? ChevronDown
                            : ChevronUp
                          : ChevronsUpDown
                      "
                      class="w-3 h-3 flex-shrink-0"
                    />
                    {{ t('app.module.stats.col.avg') }}
                  </button>
                  <span class="text-xs text-muted-foreground font-medium text-center">{{
                    t('app.module.stats.col.trend')
                  }}</span>
                </div>

                <div
                  v-for="(stat, index) in sortedVisibleTagStats"
                  :key="stat.tag"
                  class="grid grid-cols-[2rem_1fr_2fr_5rem_5rem_5rem_5.5rem] items-center gap-3 px-4 py-3 border-b border-border/30 last:border-0 hover:bg-muted/30 transition-colors"
                >
                  <span class="text-xs text-muted-foreground/60 tabular-nums">{{ index + 1 }}</span>

                  <div class="flex items-center gap-2 min-w-0">
                    <span
                      :class="
                        cn(
                          'px-2 py-0.5 rounded-full text-xs font-medium border truncate max-w-[140px]',
                          stat.tag === '__untagged__'
                            ? 'bg-muted text-muted-foreground border-border/40 italic'
                            : 'bg-primary/10 text-primary border-primary/20',
                        )
                      "
                    >
                      {{ stat.tag === '__untagged__' ? t('app.module.stats.tags.untagged') : stat.tag }}
                    </span>
                  </div>

                  <div class="flex items-center gap-2">
                    <div class="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        class="h-full rounded-full bg-primary/70 transition-all duration-500"
                        :class="{ 'bg-muted-foreground/30': stat.tag === '__untagged__' }"
                        :style="{ width: stat.percentage.toFixed(1) + '%' }"
                      />
                    </div>
                    <span class="text-xs tabular-nums text-muted-foreground w-8 text-right flex-shrink-0">
                      {{ stat.percentage.toFixed(0) }}%
                    </span>
                  </div>

                  <span class="text-sm tabular-nums text-foreground text-right">{{ stat.sessionCount }}</span>

                  <span class="text-sm tabular-nums font-mono text-foreground text-right">{{
                    stat.formattedTotal
                  }}</span>

                  <span class="text-sm tabular-nums font-mono text-muted-foreground text-right">{{
                    stat.formattedAvg
                  }}</span>

                  <div class="flex items-end gap-px h-6 justify-center">
                    <div
                      v-for="(val, i) in stat.sparklineSeconds"
                      :key="i"
                      class="w-1.5 rounded-sm transition-all duration-300"
                      :style="{
                        height: val > 0 ? Math.max(3, Math.round((val / maxTagSparkline) * 24)) + 'px' : '2px',
                        backgroundColor:
                          val > 0
                            ? stat.tag === '__untagged__'
                              ? 'var(--color-muted-foreground)'
                              : 'var(--color-primary)'
                            : 'var(--color-border)',
                        opacity: val > 0 ? (stat.tag === '__untagged__' ? 0.3 : 0.7) : 0.5,
                      }"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div v-if="sortedVisibleTagStats.length > 0" class="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Info class="w-3 h-3 flex-shrink-0" />
            {{ t('app.module.stats.trend_note') }}
          </div>
        </template>

        <template v-if="activeTab === 'categories'">
          <div v-if="categoryStats.length === 0" class="flex-1 flex flex-col items-center justify-center gap-3 py-16">
            <div class="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
              <Layers class="w-6 h-6 text-muted-foreground" />
            </div>
            <div class="text-center">
              <p class="text-sm font-medium">{{ t('app.module.stats.no_data') }}</p>
              <p class="text-xs text-muted-foreground mt-0.5">{{ t('app.module.stats.no_data_hint') }}</p>
            </div>
          </div>

          <div v-else class="rounded-xl border border-border/40 overflow-hidden">
            <div class="overflow-x-auto touch-pan-x">
              <div class="flex flex-col gap-0 min-w-[500px]">
                <div
                  class="grid grid-cols-[2rem_1fr_2fr_5rem_5rem_5rem_5.5rem] items-center gap-3 px-4 py-2 bg-muted border-b border-border/40"
                >
                  <span class="text-xs text-muted-foreground font-medium">#</span>
                  <button
                    class="flex items-center gap-1 text-xs text-muted-foreground font-medium hover:text-foreground transition-colors text-left"
                    @click="toggleCatSort('name')"
                  >
                    {{ t('app.module.stats.col.name') }}
                    <component
                      :is="catSortKey === 'name' ? (catSortDir === 'desc' ? ChevronDown : ChevronUp) : ChevronsUpDown"
                      class="w-3 h-3 flex-shrink-0"
                    />
                  </button>
                  <button
                    class="flex items-center gap-1 text-xs text-muted-foreground font-medium hover:text-foreground transition-colors text-left"
                    @click="toggleCatSort('percentage')"
                  >
                    {{ t('app.module.stats.col.share') }}
                    <component
                      :is="
                        catSortKey === 'percentage' ? (catSortDir === 'desc' ? ChevronDown : ChevronUp) : ChevronsUpDown
                      "
                      class="w-3 h-3 flex-shrink-0"
                    />
                  </button>
                  <button
                    class="flex items-center gap-1 justify-end text-xs text-muted-foreground font-medium hover:text-foreground transition-colors w-full"
                    @click="toggleCatSort('sessionCount')"
                  >
                    <component
                      :is="
                        catSortKey === 'sessionCount'
                          ? catSortDir === 'desc'
                            ? ChevronDown
                            : ChevronUp
                          : ChevronsUpDown
                      "
                      class="w-3 h-3 flex-shrink-0"
                    />
                    {{ t('app.module.stats.col.sessions') }}
                  </button>
                  <button
                    class="flex items-center gap-1 justify-end text-xs text-muted-foreground font-medium hover:text-foreground transition-colors w-full"
                    @click="toggleCatSort('totalSeconds')"
                  >
                    <component
                      :is="
                        catSortKey === 'totalSeconds'
                          ? catSortDir === 'desc'
                            ? ChevronDown
                            : ChevronUp
                          : ChevronsUpDown
                      "
                      class="w-3 h-3 flex-shrink-0"
                    />
                    {{ t('app.module.stats.col.total') }}
                  </button>
                  <button
                    class="flex items-center gap-1 justify-end text-xs text-muted-foreground font-medium hover:text-foreground transition-colors w-full"
                    @click="toggleCatSort('avgSessionSeconds')"
                  >
                    <component
                      :is="
                        catSortKey === 'avgSessionSeconds'
                          ? catSortDir === 'desc'
                            ? ChevronDown
                            : ChevronUp
                          : ChevronsUpDown
                      "
                      class="w-3 h-3 flex-shrink-0"
                    />
                    {{ t('app.module.stats.col.avg') }}
                  </button>
                  <span class="text-xs text-muted-foreground font-medium text-center">{{
                    t('app.module.stats.col.trend')
                  }}</span>
                </div>

                <div
                  v-for="(stat, index) in sortedCategoryStats"
                  :key="stat.name"
                  class="grid grid-cols-[2rem_1fr_2fr_5rem_5rem_5rem_5.5rem] items-center gap-3 px-4 py-3 border-b border-border/30 last:border-0 hover:bg-muted/30 transition-colors"
                >
                  <span class="text-xs text-muted-foreground/60 tabular-nums">{{ index + 1 }}</span>

                  <div class="flex items-center gap-2 min-w-0">
                    <CategoryBadge
                      v-if="stat.categoryId"
                      :name="stat.name"
                      :color="stat.color"
                      class="truncate max-w-[160px]"
                    />
                    <span
                      v-else
                      class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border border-border/40 bg-muted text-muted-foreground italic truncate max-w-[160px]"
                    >
                      {{ t('app.module.stats.categories.uncategorized') }}
                    </span>
                  </div>

                  <div class="flex items-center gap-2">
                    <div class="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        class="h-full rounded-full transition-all duration-500"
                        :style="{
                          width: stat.percentage.toFixed(1) + '%',
                          backgroundColor: stat.categoryId ? stat.color : 'var(--color-muted-foreground)',
                          opacity: stat.categoryId ? 0.8 : 0.4,
                        }"
                      />
                    </div>
                    <span class="text-xs tabular-nums text-muted-foreground w-8 text-right flex-shrink-0">
                      {{ stat.percentage.toFixed(0) }}%
                    </span>
                  </div>

                  <span class="text-sm tabular-nums text-foreground text-right">{{ stat.sessionCount }}</span>

                  <span class="text-sm tabular-nums font-mono text-foreground text-right">{{
                    stat.formattedTotal
                  }}</span>

                  <span class="text-sm tabular-nums font-mono text-muted-foreground text-right">{{
                    stat.formattedAvg
                  }}</span>

                  <div class="flex items-end gap-px h-6 justify-center">
                    <div
                      v-for="(val, i) in stat.sparklineSeconds"
                      :key="i"
                      class="w-1.5 rounded-sm transition-all duration-300"
                      :style="{
                        height: val > 0 ? Math.max(3, Math.round((val / maxCategorySparkline) * 24)) + 'px' : '2px',
                        backgroundColor:
                          val > 0
                            ? stat.categoryId
                              ? stat.color
                              : 'var(--color-muted-foreground)'
                            : 'var(--color-border)',
                        opacity: val > 0 ? (stat.categoryId ? 0.7 : 0.3) : 0.5,
                      }"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div v-if="categoryStats.length > 0" class="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Info class="w-3 h-3 flex-shrink-0" />
            {{ t('app.module.stats.trend_note') }}
          </div>
        </template>
      </div>
    </template>
  </Card>
</template>
