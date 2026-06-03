<script setup lang="ts">
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-vue-next';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/composables';
import { cn } from '@/lib/utils';
import CommonHeader from '@/components/CommonHeader.vue';

export type GanttMode = 'week' | 'month';

interface Props {
  mode: GanttMode;
  rangeLabel: string;
  canGoNext: boolean;
  zoom: number;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  changeMode: [GanttMode];
  navigate: ['prev' | 'next'];
  changeZoom: [number];
}>();

const { t } = useTranslation();

const MODES: { value: GanttMode; labelKey: string }[] = [
  { value: 'week', labelKey: 'app.module.gantt.mode.week' },
  { value: 'month', labelKey: 'app.module.gantt.mode.month' },
];

const ZOOM_LEVELS = [25, 50, 100, 150, 200];

function stepZoom(direction: 'in' | 'out') {
  const idx = ZOOM_LEVELS.indexOf(props.zoom);
  if (direction === 'in' && idx < ZOOM_LEVELS.length - 1) emit('changeZoom', ZOOM_LEVELS[idx + 1]!);
  if (direction === 'out' && idx > 0) emit('changeZoom', ZOOM_LEVELS[idx - 1]!);
}
</script>

<template>
  <div class="flex flex-wrap justify-between gap-4">
    <CommonHeader :title="t('app.module.gantt.title')" :desc="t('app.module.gantt.description')" />

    <div class="flex items-center gap-3 flex-wrap">
      <!-- Mode tabs -->
      <div class="flex items-center bg-muted/40 rounded-lg p-0.5 gap-0.5 border border-border/40">
        <button
          v-for="m in MODES"
          :key="m.value"
          @click="emit('changeMode', m.value)"
          :class="
            cn(
              'px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-150',
              mode === m.value
                ? 'bg-card text-foreground shadow-sm border border-border/40'
                : 'text-muted-foreground hover:text-foreground',
            )
          "
        >
          {{ t(m.labelKey) }}
        </button>
      </div>

      <!-- Zoom controls -->
      <div class="flex items-center gap-0.5 bg-muted/40 rounded-lg p-0.5 border border-border/40">
        <button
          class="p-1 rounded-md hover:bg-card transition-colors disabled:opacity-50"
          :disabled="zoom <= ZOOM_LEVELS[0]!"
          @click="stepZoom('out')"
          :aria-label="t('app.module.gantt.zoom_out')"
        >
          <ZoomOut class="w-3.5 h-3.5 text-muted-foreground" />
        </button>
        <div class="flex items-center gap-0.5">
          <button
            v-for="level in ZOOM_LEVELS"
            :key="level"
            :class="[
              'px-2 py-1 text-xs font-medium rounded-md transition-all duration-150',
              zoom === level
                ? 'bg-card text-foreground shadow-sm border border-border/40'
                : 'text-muted-foreground hover:text-foreground',
            ]"
            @click="emit('changeZoom', level)"
          >
            {{ level }}%
          </button>
        </div>
        <button
          class="p-1 rounded-md hover:bg-card transition-colors disabled:opacity-50"
          :disabled="zoom >= ZOOM_LEVELS[ZOOM_LEVELS.length - 1]!"
          @click="stepZoom('in')"
          :aria-label="t('app.module.gantt.zoom_in')"
        >
          <ZoomIn class="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      </div>

      <!-- Navigation -->
      <div class="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          @click="emit('navigate', 'prev')"
          :aria-label="t('app.module.gantt.nav.prev')"
        >
          <ChevronLeft class="w-5 h-5" />
        </Button>
        <span class="text-sm font-medium text-center text-center">
          {{ rangeLabel }}
        </span>
        <Button
          variant="outline"
          size="icon"
          :disabled="!canGoNext"
          @click="emit('navigate', 'next')"
          :aria-label="t('app.module.gantt.nav.next')"
        >
          <ChevronRight class="w-5 h-5" />
        </Button>
      </div>
    </div>
  </div>
</template>
