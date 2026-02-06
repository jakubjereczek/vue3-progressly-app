<template>
  <div class="grid auto-rows-min gap-4 **grid-cols-1** xl:grid-cols-5">
    <div class="rounded-xl bg-muted xl:col-span-3">
      <ActivityTracker />
    </div>
    <div class="rounded-xl bg-muted xl:col-span-2">
       <TodayTimeSummary/>
    </div>
  </div>
</template>

<script setup lang="ts">
import ActivityTracker from '@/components/core/activity/ActivityTracker.vue';
import TodayTimeSummary from '@/components/core/today-time-summary/TodayTimeSummary.vue';
</script>
