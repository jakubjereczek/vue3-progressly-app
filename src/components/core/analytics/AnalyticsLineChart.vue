<script setup lang="ts">
import { computed, ref, useId } from 'vue';
import type { BarItem } from './useAnalyticsData';
import { formatTotalDuration } from '@/utils/time';
import { useTranslation } from '@/composables';

const { t } = useTranslation();

const props = withDefaults(
  defineProps<{
    items: BarItem[];
    maxSeconds: number;
    showPrevious?: boolean;
    ariaLabel?: string;
  }>(),
  { showPrevious: true, ariaLabel: '' },
);

const CHART_H = 160;
const TOOLTIP_SPACE = 90;
const SVG_H = 100;
const MAX_TOOLTIP_SEGMENTS = 3;

const gradientId = `alc-area-${useId()}`;
const N = computed(() => Math.max(1, props.items.length));

function yUnit(seconds: number): number {
  if (!props.maxSeconds) return SVG_H;
  return SVG_H - (Math.min(seconds, props.maxSeconds) / props.maxSeconds) * SVG_H;
}

function yPxFromBottom(seconds: number): number {
  if (!props.maxSeconds) return 0;
  return (Math.min(seconds, props.maxSeconds) / props.maxSeconds) * CHART_H;
}

function xPct(i: number): string {
  return (((i + 0.5) / N.value) * 100).toFixed(3) + '%';
}

// ── Bezier path helpers ───────────────────────────────────────────────────

const BEZIER_TENSION = 0.25;

function smoothBezierPath(pts: Array<{ x: number; y: number }>): string {
  if (pts.length < 2) return '';
  const parts: string[] = [`M ${pts[0]!.x},${pts[0]!.y}`];
  for (let i = 1; i < pts.length; i++) {
    const prev = pts[i - 1]!;
    const curr = pts[i]!;
    const prevPrev = pts[Math.max(0, i - 2)]!;
    const next = pts[Math.min(pts.length - 1, i + 1)]!;
    const cp1x = prev.x + (curr.x - prevPrev.x) * BEZIER_TENSION;
    const cp1y = prev.y + (curr.y - prevPrev.y) * BEZIER_TENSION;
    const cp2x = curr.x - (next.x - prev.x) * BEZIER_TENSION;
    const cp2y = curr.y - (next.y - prev.y) * BEZIER_TENSION;
    parts.push(`C ${cp1x.toFixed(3)},${cp1y.toFixed(3)} ${cp2x.toFixed(3)},${cp2y.toFixed(3)} ${curr.x},${curr.y}`);
  }
  return parts.join(' ');
}

const lineDataPoints = computed(() => props.items.map((bar, i) => ({ x: i + 0.5, y: yUnit(bar.totalSeconds) })));
const prevLineDataPoints = computed(() => props.items.map((bar, i) => ({ x: i + 0.5, y: yUnit(bar.prevSeconds) })));

const linePath = computed(() => smoothBezierPath(lineDataPoints.value));
const prevLinePath = computed(() => smoothBezierPath(prevLineDataPoints.value));

const areaPath = computed(() => {
  const pts = lineDataPoints.value;
  if (pts.length < 2) return '';
  const smooth = smoothBezierPath(pts);
  return `${smooth} L ${pts[pts.length - 1]!.x},${SVG_H} L ${pts[0]!.x},${SVG_H} Z`;
});

const gridLines = computed(() =>
  [0.25, 0.5, 0.75, 1].map((pct, idx) => ({
    y: SVG_H - pct * SVG_H,
    major: idx === 3,
  })),
);

const todayIndex = computed(() => props.items.findIndex((b) => b.isCurrentPeriod));
const hasAnyData = computed(() => props.items.some((b) => b.totalSeconds > 0));
const hasPrevData = computed(() => props.showPrevious && props.items.some((b) => b.prevSeconds > 0));

// ── Hover + keyboard navigation ───────────────────────────────────────────

const hoveredIndex = ref<number | null>(null);
const focusedIndex = ref<number | null>(null);
const activeIndex = computed(() => focusedIndex.value ?? hoveredIndex.value);

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'ArrowLeft') {
    e.preventDefault();
    if (focusedIndex.value === null) focusedIndex.value = props.items.length - 1;
    else focusedIndex.value = Math.max(0, focusedIndex.value - 1);
  } else if (e.key === 'ArrowRight') {
    e.preventDefault();
    if (focusedIndex.value === null) focusedIndex.value = 0;
    else focusedIndex.value = Math.min(props.items.length - 1, focusedIndex.value + 1);
  } else if (e.key === 'Escape') {
    focusedIndex.value = null;
  }
}

// ── Tooltip edge clamping ─────────────────────────────────────────────────

function tooltipTransform(index: number): string {
  if (index === 0) return 'translateX(-10%)';
  if (index === N.value - 1) return 'translateX(-90%)';
  return 'translateX(-50%)';
}

const minWidth = computed(() => (props.items.length > 14 ? `${props.items.length * 22}px` : '100%'));
</script>

<template>
  <div class="w-full overflow-x-auto" role="img" :aria-label="ariaLabel || t('app.module.analytics.chart_label')">
    <div :style="{ minWidth }">
      <div class="relative select-none" :style="{ height: CHART_H + TOOLTIP_SPACE + 'px' }">
        <!-- SVG: gridlines, area, lines -->
        <svg
          class="absolute bottom-0 left-0 w-full pointer-events-none"
          :height="CHART_H"
          :viewBox="`0 0 ${N} ${SVG_H}`"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <defs>
            <linearGradient :id="gradientId" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="var(--color-primary)" stop-opacity="0.10" />
              <stop offset="100%" stop-color="var(--color-primary)" stop-opacity="0.01" />
            </linearGradient>
          </defs>

          <!-- Grid lines -->
          <line
            v-for="(gl, gi) in gridLines"
            :key="gi"
            :x1="0"
            :y1="gl.y"
            :x2="N"
            :y2="gl.y"
            stroke="var(--color-border)"
            :stroke-width="gl.major ? '0.5' : '0.3'"
            stroke-opacity="0.6"
            vector-effect="non-scaling-stroke"
          />

          <!-- Area fill -->
          <path v-if="hasAnyData" :d="areaPath" :fill="`url(#${gradientId})`" />

          <!-- Previous period line (bezier, dashed) -->
          <path
            v-if="hasPrevData"
            :d="prevLinePath"
            fill="none"
            stroke="var(--color-muted-foreground)"
            stroke-width="1"
            stroke-opacity="0.65"
            stroke-dasharray="4 3"
            stroke-linecap="round"
            stroke-linejoin="round"
            vector-effect="non-scaling-stroke"
          />

          <!-- Today vertical highlight -->
          <line
            v-if="todayIndex >= 0"
            :x1="todayIndex + 0.5"
            y1="0"
            :x2="todayIndex + 0.5"
            :y2="SVG_H"
            stroke="var(--color-primary)"
            stroke-width="0.6"
            stroke-opacity="0.2"
            vector-effect="non-scaling-stroke"
          />

          <!-- Active hover column highlight -->
          <rect
            v-if="activeIndex !== null"
            :x="activeIndex"
            y="0"
            width="1"
            :height="SVG_H"
            fill="var(--color-border)"
            fill-opacity="0.12"
          />

          <!-- Current period line (bezier) -->
          <path
            v-if="hasAnyData"
            :d="linePath"
            fill="none"
            stroke="var(--color-primary)"
            stroke-width="1.5"
            stroke-opacity="0.75"
            stroke-linecap="round"
            stroke-linejoin="round"
            vector-effect="non-scaling-stroke"
          />
        </svg>

        <!-- HTML dots -->
        <div class="absolute bottom-0 left-0 right-0 pointer-events-none" :style="{ height: CHART_H + 'px' }">
          <div
            v-for="(bar, i) in items"
            :key="bar.key + '_dot'"
            class="absolute rounded-full transition-all duration-100"
            :style="{
              left: xPct(i),
              bottom: yPxFromBottom(bar.totalSeconds) - (activeIndex === i ? 5 : 3.5) + 'px',
              transform: 'translateX(-50%)',
              width: activeIndex === i ? '10px' : '7px',
              height: activeIndex === i ? '10px' : '7px',
              border: '2px solid var(--color-card)',
              backgroundColor: bar.totalSeconds > 0 ? 'var(--color-primary)' : 'var(--color-border)',
              opacity: bar.isFuture ? 0.2 : bar.totalSeconds === 0 ? 0.3 : 0.85,
            }"
          />
        </div>

        <!-- Tooltip pinned to top, edge-clamped -->
        <transition
          enter-active-class="transition-opacity duration-100"
          enter-from-class="opacity-0"
          enter-to-class="opacity-100"
          leave-active-class="transition-opacity duration-75"
          leave-from-class="opacity-100"
          leave-to-class="opacity-0"
        >
          <div
            v-if="activeIndex !== null"
            class="absolute top-0 z-30 pointer-events-none"
            :style="{ left: xPct(activeIndex) }"
          >
            <div :style="{ transform: tooltipTransform(activeIndex), maxWidth: '180px' }">
              <div
                class="bg-card border border-border/60 rounded-xl px-3 py-2 text-xs shadow-xl text-left min-w-[148px]"
              >
                <!-- Header -->
                <div class="flex items-baseline justify-between gap-4 mb-1.5">
                  <span class="font-semibold text-foreground leading-tight whitespace-nowrap">
                    {{ items[activeIndex]?.label }}
                    <span v-if="items[activeIndex]?.subLabel" class="font-normal text-muted-foreground ml-1">
                      {{ items[activeIndex]?.subLabel }}
                    </span>
                  </span>
                  <span class="font-mono font-semibold text-foreground whitespace-nowrap">
                    {{ items[activeIndex]?.formattedTotal }}
                  </span>
                </div>

                <!-- Segments -->
                <div v-if="items[activeIndex]?.segments?.length ?? 0 > 0" class="flex flex-col gap-0.5">
                  <div
                    v-for="seg in items[activeIndex]?.segments.slice(0, MAX_TOOLTIP_SEGMENTS)"
                    :key="seg.categoryId ?? '__none__'"
                    class="flex items-center gap-1.5"
                  >
                    <span class="w-1.5 h-1.5 rounded-full flex-shrink-0" :style="{ backgroundColor: seg.color }" />
                    <span class="text-muted-foreground truncate flex-1 max-w-[90px]">
                      {{ seg.name === '__uncategorized__' ? t('app.module.analytics.uncategorized') : seg.name }}
                    </span>
                    <span class="font-mono tabular-nums text-foreground flex-shrink-0 ml-auto pl-2">
                      {{ formatTotalDuration(seg.seconds) }}
                    </span>
                  </div>
                  <span
                    v-if="items[activeIndex]?.segments.length ?? 0 > MAX_TOOLTIP_SEGMENTS"
                    class="text-2xs text-muted-foreground/60 pl-3"
                  >
                    {{
                      t('app.core.common.more_items', {
                        count: items[activeIndex]?.segments.length ?? 0 - MAX_TOOLTIP_SEGMENTS,
                      })
                    }}
                  </span>
                </div>
                <p v-else class="text-muted-foreground/60 italic">—</p>

                <!-- Previous period -->
                <div
                  v-if="showPrevious && (items[activeIndex]?.prevSeconds ?? 0) > 0"
                  class="flex items-center gap-1.5 mt-1.5 pt-1.5 border-t border-border/40"
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
                      opacity: 0.65;
                    "
                  />
                  <span class="text-muted-foreground/60 flex-1">{{ t('app.core.common.prev_period') }}</span>
                  <span class="font-mono tabular-nums text-muted-foreground">
                    {{ items[activeIndex]?.formattedPrev }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </transition>

        <div
          class="absolute inset-0 flex focus:outline-none"
          tabindex="0"
          role="group"
          :aria-label="t('app.module.analytics.chart_label')"
          @keydown="handleKeydown"
          @blur="focusedIndex = null"
        >
          <div
            v-for="(bar, i) in items"
            :key="bar.key + '_hz'"
            class="flex-1 cursor-default"
            @mouseenter="
              hoveredIndex = i;
              focusedIndex = null;
            "
            @mouseleave="hoveredIndex = null"
          />
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
