<script setup lang="ts">
import { computed } from 'vue';
import type { BarItem } from './useAnalyticsData';
import { cn } from '@/lib/utils';
import { formatTotalDuration } from '@/utils/time';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useTranslation } from '@/composables';

const { t } = useTranslation();

const props = withDefaults(
  defineProps<{
    items: BarItem[];
    maxSeconds: number;
    showPrevious?: boolean;
    compact?: boolean;
    ariaLabel?: string;
  }>(),
  { showPrevious: true, compact: false, ariaLabel: '' },
);

const CHART_H = 190;
const MAX_TOOLTIP_SEGMENTS = 3;

function barHeightPx(seconds: number): number {
  if (!seconds || !props.maxSeconds) return 0;
  return Math.max(3, (seconds / props.maxSeconds) * CHART_H);
}

function prevBottomPx(seconds: number): number {
  if (!seconds || !props.maxSeconds) return 0;
  return Math.min((seconds / props.maxSeconds) * CHART_H, CHART_H);
}

const gridLines = computed(() => {
  const max = props.maxSeconds;
  if (!max) return [];
  return [0.25, 0.5, 0.75, 1].map((pct) => ({
    bottom: pct * CHART_H,
    pct,
  }));
});

const minWidth = computed(() => (props.compact || props.items.length > 14 ? `${props.items.length * 22}px` : '100%'));
</script>

<template>
  <div
    class="w-full overflow-x-auto custom-scrollbar"
    role="img"
    :aria-label="ariaLabel || t('app.module.analytics.chart_label')"
  >
    <div :style="{ minWidth }">
      <div class="relative" :style="{ height: CHART_H + 'px' }">
        <div
          v-for="line in gridLines"
          :key="line.pct"
          class="absolute left-0 right-0 border-t pointer-events-none"
          :class="line.pct === 1 ? 'border-border/40' : 'border-border/15'"
          :style="{ bottom: line.bottom + 'px' }"
        />

        <div
          class="absolute bottom-0 left-0 right-0 flex gap-0.5 sm:gap-1 items-end"
          :style="{ height: CHART_H + 'px' }"
        >
          <TooltipProvider v-for="bar in items" :key="bar.key" :delay-duration="150">
            <Tooltip>
              <TooltipTrigger as-child>
                <div class="relative flex-1 min-w-0 cursor-default" :style="{ height: CHART_H + 'px' }">
                  <div
                    v-if="showPrevious && bar.prevSeconds > 0"
                    class="absolute left-0 right-0 h-px z-10 pointer-events-none"
                    :style="{
                      bottom: prevBottomPx(bar.prevSeconds) + 'px',
                      background:
                        'repeating-linear-gradient(90deg, var(--color-muted-foreground) 0, var(--color-muted-foreground) 3px, transparent 3px, transparent 6px)',
                      opacity: 0.65,
                    }"
                  />

                  <div
                    :class="
                      cn(
                        'absolute bottom-0 left-0 right-0 rounded-t overflow-hidden transition-all duration-700 ease-out',
                        bar.isFuture ? 'opacity-20' : '',
                        bar.isCurrentPeriod ? 'brightness-110' : '',
                      )
                    "
                    :style="{ height: barHeightPx(bar.totalSeconds) + 'px' }"
                  >
                    <div v-if="bar.totalSeconds > 0" class="absolute inset-0 flex flex-col">
                      <div
                        v-for="seg in [...bar.segments].reverse()"
                        :key="seg.categoryId ?? '__none__'"
                        :style="{
                          height: `${(seg.seconds / bar.totalSeconds) * 100}%`,
                          backgroundColor: seg.color,
                        }"
                      />
                    </div>
                    <div
                      v-else
                      class="absolute inset-0 rounded-t"
                      style="background-color: var(--color-border); opacity: 0.4"
                    />
                  </div>

                  <div
                    v-if="bar.isCurrentPeriod"
                    class="absolute bottom-0 left-0 right-0 rounded-t ring-1 ring-primary/50 pointer-events-none"
                    :style="{ height: Math.max(barHeightPx(bar.totalSeconds), 3) + 'px' }"
                  />
                </div>
              </TooltipTrigger>

              <TooltipContent
                side="top"
                :side-offset="8"
                hide-arrow
                class="bg-popover text-popover-foreground border border-border/50 shadow-xl rounded-xl px-3 py-2 text-xs w-52 z-50"
              >
                <div class="flex items-baseline justify-between gap-3 mb-2">
                  <span class="font-semibold text-foreground leading-tight whitespace-nowrap">
                    {{ bar.label }}
                    <span v-if="bar.subLabel" class="font-normal text-muted-foreground ml-1">{{ bar.subLabel }}</span>
                  </span>
                  <span class="font-mono font-semibold text-foreground whitespace-nowrap">{{
                    bar.formattedTotal
                  }}</span>
                </div>

                <div v-if="bar.segments.length > 0" class="flex flex-col gap-1">
                  <div
                    v-for="seg in bar.segments.slice(0, MAX_TOOLTIP_SEGMENTS)"
                    :key="seg.categoryId ?? '__none__'"
                    class="flex items-center gap-1.5"
                  >
                    <span class="w-1.5 h-1.5 rounded-full flex-shrink-0" :style="{ backgroundColor: seg.color }" />
                    <span class="text-muted-foreground truncate flex-1 max-w-[100px]">
                      {{ seg.name === '__uncategorized__' ? t('app.module.analytics.uncategorized') : seg.name }}
                    </span>
                    <span class="font-mono tabular-nums text-foreground flex-shrink-0 ml-auto pl-2">
                      {{ formatTotalDuration(seg.seconds) }}
                    </span>
                  </div>
                  <span
                    v-if="bar.segments.length > MAX_TOOLTIP_SEGMENTS"
                    class="text-2xs text-muted-foreground/60 pl-3"
                  >
                    {{ t('app.core.common.more_items', { count: bar.segments.length - MAX_TOOLTIP_SEGMENTS }) }}
                  </span>
                </div>
                <p v-else class="text-muted-foreground/60 italic">—</p>

                <div
                  v-if="showPrevious && bar.prevSeconds > 0"
                  class="flex items-center gap-1.5 mt-2 pt-2 border-t border-border/40"
                >
                  <div
                    class="w-3 h-px flex-shrink-0"
                    style="
                      background: repeating-linear-gradient(
                        90deg,
                        var(--color-muted-foreground) 0,
                        var(--color-muted-foreground) 3px,
                        transparent 3px,
                        transparent 6px
                      );
                      opacity: 0.5;
                    "
                  />
                  <span class="text-muted-foreground/60 flex-1">{{ t('app.core.common.prev_period') }}</span>
                  <span class="font-mono tabular-nums text-muted-foreground">{{ bar.formattedPrev }}</span>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      <div class="flex gap-0.5 sm:gap-1 mt-1.5">
        <div v-for="bar in items" :key="bar.key + '_lbl'" class="flex-1 min-w-0 flex flex-col items-center">
          <span
            class="block text-2xs leading-tight font-medium w-full text-center truncate"
            :class="
              bar.isCurrentPeriod ? 'text-primary' : bar.isFuture ? 'text-muted-foreground/30' : 'text-muted-foreground'
            "
          >
            {{ bar.label }}
          </span>
          <span v-if="bar.subLabel" class="block text-2xs text-muted-foreground/40 leading-tight">
            {{ bar.subLabel }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>
