<!--
  Goaletic logomark — "Progress Ring"

  Design rationale:
  - 300° arc with a gap at the bottom — "always room to grow"
  - Filled dot at the trailing end (5 o'clock) — the "current position" marker
  - Uses currentColor — works on any background, light or dark
  - viewBox 24×24, radius 8, stroke-width 2

  Arc geometry (center 12,12 radius 8):
    Start → 7 o'clock (120° from 3 o'clock): (8, 18.93)
    End   → 5 o'clock (60°  from 3 o'clock): (16, 18.93)
    Path  → M 8 18.93 A 8 8 0 1 1 16 18.93
              large-arc=1, sweep=1 (clockwise, 300° arc through the top)
-->
<template>
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" v-bind="$attrs">
    <!-- 300° progress arc — gap at bottom center -->
    <path d="M 8 18.93 A 8 8 0 1 1 16 18.93" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
    <!-- Progress head — current position indicator -->
    <circle cx="16" cy="18.93" r="2" fill="currentColor" />
  </svg>
</template>
