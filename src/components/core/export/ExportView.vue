<script setup lang="ts">
import { ref } from 'vue';
import { storeToRefs } from 'pinia';
import { Lock, Download, FileText, Braces, Hash, Layers, Clock } from 'lucide-vue-next';
import { RouterLink } from 'vue-router';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import LoadingSpinner from '@/components/ui/loading-spinner/LoadingSpinner.vue';
import { useTranslation } from '@/composables';
import { useUserStore } from '@/stores';
import { useExportData, type ExportPreset } from './useExportData';
import { useExportDownload, type ExportFormat } from './useExportDownload';
import { formatTotalDuration } from '@/utils/time';
import { cn } from '@/lib/utils';

const { t } = useTranslation();
const { isPremium } = storeToRefs(useUserStore());
const {
  selectedPreset,
  selectedCategoryIds,
  toggleCategory,
  categories,
  loading,
  enrichedActivities,
  totalSeconds,
  uniqueCategoryCount,
} = useExportData();
const { download } = useExportDownload();

const selectedFormat = ref<ExportFormat>('csv');

const presets: { value: ExportPreset; labelKey: string }[] = [
  { value: 'last7', labelKey: 'app.module.export.preset.last7' },
  { value: 'last30', labelKey: 'app.module.export.preset.last30' },
  { value: 'thisMonth', labelKey: 'app.module.export.preset.this_month' },
  { value: 'last90', labelKey: 'app.module.export.preset.last90' },
  { value: 'thisYear', labelKey: 'app.module.export.preset.this_year' },
  { value: 'allTime', labelKey: 'app.module.export.preset.all_time' },
];

const formats: { value: ExportFormat; labelKey: string; icon: unknown }[] = [
  { value: 'csv', labelKey: 'app.module.export.format.csv', icon: FileText },
  { value: 'json', labelKey: 'app.module.export.format.json', icon: Braces },
];

function handleExport() {
  download(enrichedActivities.value, selectedFormat.value);
}
</script>

<template>
  <Card class="p-8 flex flex-col gap-6 rounded-2xl border border-border/40 h-full overflow-hidden">
    <div class="flex items-start justify-between gap-4 flex-shrink-0">
      <div>
        <h1 class="text-xl font-semibold">{{ t('app.module.export.title') }}</h1>
        <p class="text-sm text-muted-foreground mt-0.5">{{ t('app.module.export.description') }}</p>
      </div>
      <div v-if="isPremium" class="flex items-center bg-muted rounded-lg p-1 gap-0.5 flex-shrink-0">
        <button
          v-for="fmt in formats"
          :key="fmt.value"
          :class="
            cn(
              'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-150',
              selectedFormat === fmt.value
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )
          "
          @click="selectedFormat = fmt.value"
        >
          <component :is="fmt.icon" class="w-3.5 h-3.5" />
          {{ t(fmt.labelKey) }}
        </button>
      </div>
    </div>
    <div v-if="!isPremium" class="flex-1 flex flex-col items-center justify-center gap-5 text-center">
      <div class="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
        <Lock class="w-6 h-6 text-muted-foreground" />
      </div>
      <div class="max-w-sm">
        <p class="text-base font-semibold">{{ t('app.module.export.premium_title') }}</p>
        <p class="text-sm text-muted-foreground mt-1.5 leading-relaxed">
          {{ t('app.module.export.premium_hint') }}
        </p>
      </div>
      <RouterLink to="/dashboard/upgrade">
        <Button class="gap-2">
          <Download class="w-4 h-4" />
          {{ t('app.module.export.upgrade_cta') }}
        </Button>
      </RouterLink>
    </div>
    <template v-else>
      <div class="flex-shrink-0">
        <p class="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-widest">
          {{ t('app.module.export.range.label') }}
        </p>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="preset in presets"
            :key="preset.value"
            :class="
              cn(
                'px-3 py-1.5 rounded-lg text-sm border transition-all duration-150',
                selectedPreset === preset.value
                  ? 'bg-primary text-primary-foreground border-primary font-medium'
                  : 'border-border/60 text-muted-foreground hover:border-border hover:text-foreground',
              )
            "
            @click="selectedPreset = preset.value"
          >
            {{ t(preset.labelKey) }}
          </button>
        </div>
      </div>
      <div v-if="categories.length > 0" class="flex-shrink-0">
        <p class="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-widest">
          {{ t('app.module.export.category_filter.label') }}
        </p>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="cat in categories"
            :key="cat.id"
            :class="
              cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border transition-all duration-150',
                selectedCategoryIds.has(cat.id)
                  ? 'bg-primary text-primary-foreground border-primary font-medium'
                  : 'border-border/60 text-muted-foreground hover:border-border hover:text-foreground',
              )
            "
            @click="toggleCategory(cat.id)"
          >
            <span
              class="w-2 h-2 rounded-full flex-shrink-0"
              :style="{ backgroundColor: selectedCategoryIds.has(cat.id) ? 'currentColor' : cat.color }"
            />
            {{ cat.name }}
          </button>
        </div>
        <p v-if="selectedCategoryIds.size > 0" class="text-xs text-muted-foreground mt-2">
          {{ t('app.module.export.category_filter.active', { count: selectedCategoryIds.size }) }}
        </p>
      </div>
      <div v-if="loading" class="flex-1 flex items-center justify-center">
        <LoadingSpinner />
      </div>
      <div
        v-else-if="enrichedActivities.length === 0"
        class="flex-1 flex flex-col items-center justify-center gap-3 py-16"
      >
        <div class="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
          <Download class="w-5 h-5 text-muted-foreground" />
        </div>
        <div class="text-center">
          <p class="text-sm font-medium">{{ t('app.module.export.preview.no_data') }}</p>
        </div>
      </div>
      <template v-else>
        <div class="grid grid-cols-3 gap-3 flex-shrink-0">
          <div class="flex flex-col gap-2 rounded-xl border border-border/50 bg-card p-4">
            <div class="flex items-center gap-2">
              <Hash class="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <span class="text-xs text-muted-foreground">{{ t('app.module.export.preview.activities') }}</span>
            </div>
            <span class="text-2xl font-semibold tabular-nums text-foreground leading-none">
              {{ enrichedActivities.length }}
            </span>
          </div>
          <div class="flex flex-col gap-2 rounded-xl border border-border/50 bg-card p-4">
            <div class="flex items-center gap-2">
              <Layers class="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <span class="text-xs text-muted-foreground">{{ t('app.module.export.preview.categories') }}</span>
            </div>
            <span class="text-2xl font-semibold tabular-nums text-foreground leading-none">
              {{ uniqueCategoryCount }}
            </span>
          </div>
          <div class="flex flex-col gap-2 rounded-xl border border-border/50 bg-card p-4">
            <div class="flex items-center gap-2">
              <Clock class="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <span class="text-xs text-muted-foreground">{{ t('app.module.export.preview.total_time') }}</span>
            </div>
            <span class="text-2xl font-semibold font-mono tabular-nums text-foreground leading-none">
              {{ formatTotalDuration(totalSeconds) }}
            </span>
          </div>
        </div>
        <p class="text-xs text-muted-foreground flex-shrink-0">
          {{
            selectedFormat === 'csv' ? t('app.module.export.format.csv_hint') : t('app.module.export.format.json_hint')
          }}
        </p>
        <div class="flex-shrink-0">
          <Button class="gap-2" @click="handleExport">
            <Download class="w-4 h-4" />
            {{ t('app.module.export.action.export') }}
          </Button>
        </div>
      </template>
    </template>
  </Card>
</template>
