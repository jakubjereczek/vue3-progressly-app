<script setup lang="ts">
import { ref } from 'vue';
import { storeToRefs } from 'pinia';
import {
  Download,
  FileText,
  Braces,
  Hash,
  Layers,
  Clock,
  CalendarRange,
  FileSpreadsheet,
  Lock,
  Layers2,
} from 'lucide-vue-next';
import { RouterLink } from 'vue-router';
import { toast } from 'vue-sonner';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import LoadingSpinner from '@/components/ui/loading-spinner/LoadingSpinner.vue';
import { useTranslation, useCategoryName } from '@/composables';
import { useUserStore } from '@/stores';
import { useExportData, type ExportPreset } from './useExportData';
import {
  useExportDownload,
  type ExportFormat,
  type CsvSeparator,
  type CsvEncoding,
  type JsonStructure,
} from './useExportDownload';
import { formatTotalDuration, localDateToString } from '@/utils/time';
import { cn } from '@/lib/utils';

const { t } = useTranslation();
const { resolveCategoryName } = useCategoryName();
const { isPremium } = storeToRefs(useUserStore());
const {
  selectedPreset,
  selectedCategoryIds,
  customFrom,
  customTo,
  toggleCategory,
  categories,
  loading,
  enrichedActivities,
  countByCategory,
  totalSeconds,
  uniqueCategoryCount,
} = useExportData();
const { download } = useExportDownload();

const selectedFormat = ref<ExportFormat>('csv');
const csvSeparator = ref<CsvSeparator>('comma');
const csvEncoding = ref<CsvEncoding>('utf8-bom');
const jsonStructure = ref<JsonStructure>('flat');
const exportLoading = ref(false);

const LOCKED_PRESETS: ExportPreset[] = ['last90', 'thisYear', 'allTime', 'custom'];
const LOCKED_FORMATS: ExportFormat[] = ['json', 'xlsx'];

const presets: { value: ExportPreset; labelKey: string }[] = [
  { value: 'last7', labelKey: 'app.module.export.preset.last7' },
  { value: 'last30', labelKey: 'app.module.export.preset.last30' },
  { value: 'thisMonth', labelKey: 'app.module.export.preset.this_month' },
  { value: 'last90', labelKey: 'app.module.export.preset.last90' },
  { value: 'thisYear', labelKey: 'app.module.export.preset.this_year' },
  { value: 'allTime', labelKey: 'app.module.export.preset.all_time' },
  { value: 'custom', labelKey: 'app.module.export.preset.custom' },
];

const formats: { value: ExportFormat; labelKey: string; icon: unknown }[] = [
  { value: 'csv', labelKey: 'app.module.export.format.csv', icon: FileText },
  { value: 'json', labelKey: 'app.module.export.format.json', icon: Braces },
  { value: 'xlsx', labelKey: 'app.module.export.format.xlsx', icon: FileSpreadsheet },
];

function isPresetLocked(preset: ExportPreset): boolean {
  return !isPremium.value && LOCKED_PRESETS.includes(preset);
}

function isFormatLocked(format: ExportFormat): boolean {
  return !isPremium.value && LOCKED_FORMATS.includes(format);
}

async function handleExport() {
  exportLoading.value = true;
  try {
    await download(
      enrichedActivities.value,
      selectedFormat.value,
      { separator: csvSeparator.value, encoding: csvEncoding.value },
      { structure: jsonStructure.value },
    );
    toast.success(t('app.module.export.action.success', { count: enrichedActivities.value.length }));
  } finally {
    exportLoading.value = false;
  }
}
</script>

<template>
  <Card data-tour="export" class="p-6 flex flex-col gap-6 rounded-2xl border border-border/40 h-full overflow-hidden">
    <!-- Header -->
    <div class="flex items-start justify-between gap-4 flex-shrink-0">
      <div>
        <p class="text-sm font-medium text-muted-foreground">{{ t('app.module.export.title') }}</p>
        <p class="text-xs text-muted-foreground/60 mt-0.5">{{ t('app.module.export.description') }}</p>
      </div>
      <!-- Format tabs -->
      <div class="flex items-center bg-muted/40 rounded-lg p-0.5 gap-0.5 border border-border/40 flex-shrink-0">
        <button
          v-for="fmt in formats"
          :key="fmt.value"
          :disabled="isFormatLocked(fmt.value)"
          :title="isFormatLocked(fmt.value) ? t('app.module.export.premium_required') : undefined"
          :class="
            cn(
              'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-150',
              selectedFormat === fmt.value && !isFormatLocked(fmt.value)
                ? 'bg-card text-foreground shadow-sm border border-border/40'
                : isFormatLocked(fmt.value)
                  ? 'text-muted-foreground/40 cursor-not-allowed'
                  : 'text-muted-foreground hover:text-foreground',
            )
          "
          @click="!isFormatLocked(fmt.value) && (selectedFormat = fmt.value)"
        >
          <component :is="fmt.icon" class="w-3.5 h-3.5" />
          {{ t(fmt.labelKey) }}
          <Lock v-if="isFormatLocked(fmt.value)" class="w-2.5 h-2.5 opacity-50" />
        </button>
      </div>
    </div>

    <!-- Standard user upgrade banner -->
    <div
      v-if="!isPremium"
      class="flex-shrink-0 flex items-center gap-3 px-4 py-3 rounded-xl border border-border/40 bg-muted/30"
    >
      <Lock class="w-4 h-4 text-muted-foreground flex-shrink-0" />
      <p class="text-xs text-muted-foreground flex-1">{{ t('app.module.export.standard_hint') }}</p>
      <RouterLink to="/dashboard/upgrade">
        <Button size="sm" variant="outline" class="text-xs h-7 px-3 flex-shrink-0">
          {{ t('app.module.export.upgrade_cta') }}
        </Button>
      </RouterLink>
    </div>

    <!-- ── DATE RANGE ──────────────────────────────────────────────── -->
    <div class="flex-shrink-0">
      <p class="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-widest">
        {{ t('app.module.export.range.label') }}
      </p>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="preset in presets"
          :key="preset.value"
          :disabled="isPresetLocked(preset.value)"
          :title="isPresetLocked(preset.value) ? t('app.module.export.premium_required') : undefined"
          :class="
            cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border transition-all duration-150',
              isPresetLocked(preset.value)
                ? 'border-border/30 text-muted-foreground/40 cursor-not-allowed'
                : selectedPreset === preset.value
                  ? 'bg-primary text-primary-foreground border-primary font-medium'
                  : 'border-border/60 text-muted-foreground hover:border-border hover:text-foreground',
            )
          "
          @click="!isPresetLocked(preset.value) && (selectedPreset = preset.value)"
        >
          <CalendarRange v-if="preset.value === 'custom'" class="w-3.5 h-3.5" />
          <Lock v-else-if="isPresetLocked(preset.value)" class="w-3 h-3" />
          {{ t(preset.labelKey) }}
        </button>
      </div>

      <!-- Custom date inputs -->
      <div v-if="selectedPreset === 'custom'" class="mt-3 flex items-center gap-3 flex-wrap">
        <div class="flex items-center gap-2">
          <label class="text-xs text-muted-foreground w-8 flex-shrink-0">{{ t('app.module.export.range.from') }}</label>
          <Input type="date" v-model="customFrom" :max="customTo || undefined" class="h-8 text-sm w-40" />
        </div>
        <div class="flex items-center gap-2">
          <label class="text-xs text-muted-foreground w-8 flex-shrink-0">{{ t('app.module.export.range.to') }}</label>
          <Input type="date" v-model="customTo" :min="customFrom || undefined" class="h-8 text-sm w-40" />
        </div>
      </div>
    </div>

    <!-- ── CATEGORY FILTER ────────────────────────────────────────── -->
    <div v-if="categories.length > 0" class="flex-shrink-0">
      <p class="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-widest">
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
          {{ resolveCategoryName(cat.name) }}
          <span
            v-if="countByCategory.get(cat.id)"
            class="text-2xs tabular-nums leading-none px-1 py-px rounded"
            :class="selectedCategoryIds.has(cat.id) ? 'bg-primary-foreground/20' : 'bg-muted text-muted-foreground'"
            >{{ countByCategory.get(cat.id) }}</span
          >
        </button>
      </div>
      <p v-if="selectedCategoryIds.size > 0" class="text-xs text-muted-foreground mt-2">
        {{ t('app.module.export.category_filter.active', { count: selectedCategoryIds.size }) }}
      </p>
    </div>

    <!-- ── CSV OPTIONS ────────────────────────────────────────────── -->
    <div v-if="selectedFormat === 'csv'" class="flex-shrink-0">
      <p class="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-widest">
        {{ t('app.module.export.csv_options.label') }}
      </p>
      <div class="flex items-center gap-4 flex-wrap">
        <div class="flex items-center gap-2">
          <span class="text-xs text-muted-foreground flex-shrink-0">{{
            t('app.module.export.csv_options.separator')
          }}</span>
          <Select v-model="csvSeparator">
            <SelectTrigger class="h-8 text-xs w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="comma">{{ t('app.module.export.csv_options.separator.comma') }}</SelectItem>
              <SelectItem value="semicolon">{{ t('app.module.export.csv_options.separator.semicolon') }}</SelectItem>
              <SelectItem value="tab">{{ t('app.module.export.csv_options.separator.tab') }}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div class="flex items-center gap-2">
          <span class="text-xs text-muted-foreground flex-shrink-0">{{
            t('app.module.export.csv_options.encoding')
          }}</span>
          <Select v-model="csvEncoding">
            <SelectTrigger class="h-8 text-xs w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="utf8-bom">{{ t('app.module.export.csv_options.encoding.utf8_bom') }}</SelectItem>
              <SelectItem value="utf8">{{ t('app.module.export.csv_options.encoding.utf8') }}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>

    <!-- ── JSON STRUCTURE ─────────────────────────────────────────── -->
    <div v-if="selectedFormat === 'json'" class="flex-shrink-0">
      <p class="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-widest">
        {{ t('app.module.export.json_options.label') }}
      </p>
      <div class="flex items-center gap-0.5 bg-muted/40 rounded-lg p-0.5 border border-border/40 w-fit">
        <button
          v-for="opt in [
            { value: 'flat', labelKey: 'app.module.export.json_options.flat', icon: Layers2 },
            { value: 'nested', labelKey: 'app.module.export.json_options.nested', icon: Layers },
          ] as const"
          :key="opt.value"
          :class="
            cn(
              'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-150',
              jsonStructure === opt.value
                ? 'bg-card text-foreground shadow-sm border border-border/40'
                : 'text-muted-foreground hover:text-foreground',
            )
          "
          @click="jsonStructure = opt.value"
        >
          <component :is="opt.icon" class="w-3.5 h-3.5" />
          {{ t(opt.labelKey) }}
        </button>
      </div>
      <p class="text-xs text-muted-foreground mt-1.5">
        {{
          jsonStructure === 'flat'
            ? t('app.module.export.json_options.flat_hint')
            : t('app.module.export.json_options.nested_hint')
        }}
      </p>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex-1 flex items-center justify-center">
      <LoadingSpinner />
    </div>

    <!-- Empty state -->
    <div
      v-else-if="enrichedActivities.length === 0"
      class="flex-1 flex flex-col items-center justify-center gap-3 py-16"
    >
      <div class="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
        <Download class="w-5 h-5 text-muted-foreground" />
      </div>
      <p class="text-sm font-medium">{{ t('app.module.export.preview.no_data') }}</p>
    </div>

    <template v-else>
      <!-- ── SUMMARY STATS ──────────────────────────────────────── -->
      <div class="grid grid-cols-3 gap-3 flex-shrink-0">
        <div class="flex flex-col gap-2 rounded-xl border border-border/40 bg-card p-4">
          <div class="flex items-center gap-2">
            <Hash class="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <span class="text-xs text-muted-foreground">{{ t('app.module.export.preview.activities') }}</span>
          </div>
          <span class="text-2xl font-semibold tabular-nums text-foreground leading-none">{{
            enrichedActivities.length
          }}</span>
        </div>
        <div class="flex flex-col gap-2 rounded-xl border border-border/40 bg-card p-4">
          <div class="flex items-center gap-2">
            <Layers class="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <span class="text-xs text-muted-foreground">{{ t('app.module.export.preview.categories') }}</span>
          </div>
          <span class="text-2xl font-semibold tabular-nums text-foreground leading-none">{{
            uniqueCategoryCount
          }}</span>
        </div>
        <div class="flex flex-col gap-2 rounded-xl border border-border/40 bg-card p-4">
          <div class="flex items-center gap-2">
            <Clock class="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <span class="text-xs text-muted-foreground">{{ t('app.module.export.preview.total_time') }}</span>
          </div>
          <span class="text-2xl font-semibold font-mono tabular-nums text-foreground leading-none">{{
            formatTotalDuration(totalSeconds)
          }}</span>
        </div>
      </div>

      <!-- ── DATA PREVIEW TABLE ─────────────────────────────────── -->
      <div class="flex flex-col gap-2 flex-1 min-h-0">
        <p class="text-xs font-semibold text-muted-foreground uppercase tracking-widest flex-shrink-0">
          {{ t('app.module.export.preview.table_label', { count: enrichedActivities.length }) }}
        </p>
        <div class="rounded-xl border border-border/40 overflow-hidden flex-1 min-h-0 flex flex-col">
          <div class="overflow-auto flex-1 min-h-0 touch-pan-x">
            <table class="w-full text-xs">
              <thead class="sticky top-0 z-10">
                <tr class="bg-muted/80 border-b border-border/40">
                  <th class="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap" scope="col">
                    {{ t('app.module.export.preview.col.date') }}
                  </th>
                  <th class="px-3 py-2 text-left font-medium text-muted-foreground max-w-[180px]" scope="col">
                    {{ t('app.module.export.preview.col.description') }}
                  </th>
                  <th class="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap" scope="col">
                    {{ t('app.module.export.preview.col.category') }}
                  </th>
                  <th class="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap" scope="col">
                    {{ t('app.module.export.preview.col.tags') }}
                  </th>
                  <th class="px-3 py-2 text-right font-medium text-muted-foreground whitespace-nowrap" scope="col">
                    {{ t('app.module.export.preview.col.duration') }}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(row, i) in enrichedActivities"
                  :key="row.id"
                  :class="cn('border-b border-border/20 last:border-0', i % 2 === 1 && 'bg-muted/20')"
                >
                  <td class="px-3 py-2 text-muted-foreground whitespace-nowrap font-mono">
                    {{ localDateToString(new Date(row.started_at)) }}
                  </td>
                  <td class="px-3 py-2 max-w-[180px] truncate text-foreground" :title="row.description">
                    {{ row.description }}
                  </td>
                  <td class="px-3 py-2 whitespace-nowrap">
                    <span v-if="row.categoryName" class="text-foreground">{{ row.categoryName }}</span>
                    <span v-else class="text-muted-foreground/40">—</span>
                  </td>
                  <td class="px-3 py-2 whitespace-nowrap">
                    <span v-if="row.tags.length" class="text-muted-foreground">{{ row.tags.join(', ') }}</span>
                    <span v-else class="text-muted-foreground/40">—</span>
                  </td>
                  <td class="px-3 py-2 text-right font-mono text-foreground whitespace-nowrap">
                    {{ row.durationFormatted }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- ── EXPORT ACTION ──────────────────────────────────────── -->
      <div class="flex items-center justify-between gap-4 flex-shrink-0">
        <p class="text-xs text-muted-foreground">
          {{
            selectedFormat === 'csv'
              ? t('app.module.export.format.csv_hint')
              : selectedFormat === 'json'
                ? t('app.module.export.format.json_hint')
                : t('app.module.export.format.xlsx_hint')
          }}
        </p>
        <Button class="gap-2 flex-shrink-0" :disabled="exportLoading" @click="handleExport">
          <LoadingSpinner v-if="exportLoading" class="w-4 h-4" />
          <Download v-else class="w-4 h-4" />
          {{ t('app.module.export.action.export') }}
        </Button>
      </div>
    </template>
  </Card>
</template>
