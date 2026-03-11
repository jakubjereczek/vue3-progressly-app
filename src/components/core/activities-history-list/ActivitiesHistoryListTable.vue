<script setup lang="ts">
import { computed, toRef, ref, watch } from 'vue';
import type { TableRow as ITableRow } from '@/api/supabase';
import { Box, CheckCircle, Hourglass, Pencil, Trash2 } from 'lucide-vue-next';
import { storeToRefs } from 'pinia';
import { useLocale, useTranslation, useActivitySheet, useScrollShadow } from '@/composables';
import { useCategoriesStore } from '@/stores';
import { type Column } from '@/components/core/activities-history-list/config';
import ScrollArea from '@/components/ui/scroll-area/ScrollArea.vue';
import ScrollBar from '@/components/ui/scroll-area/ScrollBar.vue';
import Table from '@/components/ui/table/Table.vue';
import TableHeader from '@/components/ui/table/TableHeader.vue';
import TableRow from '@/components/ui/table/TableRow.vue';
import TableHead from '@/components/ui/table/TableHead.vue';
import TableCell from '@/components/ui/table/TableCell.vue';
import Badge from '@/components/ui/badge/Badge.vue';
import { formatDuration, getDuration, formatTotalDuration, formatActivityDateTime } from '@/utils/time';
import LoadingSpinner from '@/components/ui/loading-spinner/LoadingSpinner.vue';
import CategoryBadge from '@/components/ui/category-badge/CategoryBadge.vue';
import TableBody from '@/components/ui/table/TableBody.vue';
import TableFooter from '@/components/ui/table/TableFooter.vue';
import ErrorMessage from '@/components/error-message/ErrorMessage.vue';
import { useActivitiesTableSpacer } from '@/components/core/activities-history-list/useActivitiesTableSpacer';

interface Props {
  visibleColumns: Column[];
  activities: ITableRow<'activities'>[];
  loading: boolean;
}

const props = defineProps<Props>();
const activitiesRef = toRef(props, 'activities');

const { spacerHeight, isReady } = useActivitiesTableSpacer(activitiesRef);

const totalCount = computed(() => props.activities.length);
const totalDurationSeconds = computed(() =>
  props.activities.reduce((sum, a) => sum + getDuration(a.started_at, a.finished_at) / 1000, 0),
);
const formattedTotalDuration = computed(() => formatTotalDuration(totalDurationSeconds.value));

const { t } = useTranslation();
const { locale } = useLocale();
const { openView, openEdit, openDelete } = useActivitySheet();

const categoriesStore = useCategoriesStore();
const { categories } = storeToRefs(categoriesStore);

function getCategory(categoryId: string | null): { name: string; color: string } | null {
  if (!categoryId) {
    return null;
  }
  const found = categories.value.find((c) => c.id === categoryId);
  return found ? { name: found.name, color: found.color } : null;
}

const scrollWrapperRef = ref<HTMLElement | null>(null);
const scrollViewportRef = ref<HTMLElement | null>(null);
const { canScrollStart: canScrollUp, canScrollEnd: canScrollDown } = useScrollShadow(scrollViewportRef, 'vertical');

watch(scrollWrapperRef, (wrapper) => {
  scrollViewportRef.value =
    (wrapper?.querySelector('[data-slot="scroll-area-viewport"]') as HTMLElement | null) ?? null;
});
</script>

<template>
  <div v-if="loading" class="flex justify-center items-center h-full">
    <LoadingSpinner />
  </div>
  <ErrorMessage
    v-else-if="activities.length === 0"
    :title="t('app.module.activities_history.no_activities_found_for_month')"
    :icon="Box"
  />
  <div v-else class="flex flex-col h-full min-h-0">
    <div ref="scrollWrapperRef" class="relative flex-1 min-h-0">
      <div
        class="absolute inset-x-0 h-10 z-20 pointer-events-none transition-opacity duration-200"
        style="top: 40px; background: linear-gradient(to bottom, var(--color-card), transparent)"
        :class="canScrollUp ? 'opacity-100' : 'opacity-0'"
      />
      <div
        class="absolute inset-x-0 h-10 z-20 pointer-events-none transition-opacity duration-200"
        style="bottom: 40px; background: linear-gradient(to top, var(--color-card), transparent)"
        :class="canScrollDown ? 'opacity-100' : 'opacity-0'"
      />
      <ScrollArea
        ref="scroll-area"
        class="h-full w-full border border-border/40 rounded-xl overflow-hidden"
        :class="{ 'opacity-0': !isReady, 'opacity-100': isReady }"
      >
        <div class="min-w-full w-max">
          <Table ref="table">
            <TableHeader class="sticky top-0 z-10 bg-muted border-b">
              <TableRow>
                <TableHead
                  v-for="column in visibleColumns"
                  :key="column.id"
                  :class="[column.class, 'font-semibold text-foreground whitespace-nowrap']"
                >
                  {{ column.label }}
                </TableHead>
                <TableHead class="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow
                v-for="activity in activities"
                :key="activity.id"
                class="hover:bg-accent/50 transition-colors cursor-pointer group"
                @click="openView(activity)"
              >
                <TableCell
                  v-for="column in visibleColumns"
                  :key="column.id"
                  :class="[column.class, 'whitespace-nowrap']"
                >
                  <template v-if="column.id === 'status'">
                    <Badge
                      :variant="activity.finished_at ? 'success' : 'info'"
                      class="text-xs py-1 px-2 flex items-center justify-center gap-1"
                    >
                      <template v-if="activity.finished_at">
                        <CheckCircle class="w-3 h-3" />
                        {{ t('app.status.finished') }}
                      </template>
                      <template v-else>
                        <Hourglass class="w-3 h-3 animate-pulse" />
                        {{ t('app.status.in_progress') }}
                      </template>
                    </Badge>
                  </template>
                  <template v-else-if="column.id === 'description'">
                    <span
                      class="text-sm text-foreground max-w-[360px] truncate block"
                      :title="activity.description || t('app.module.activities_history.no_description')"
                    >
                      {{ activity.description || t('app.module.activities_history.no_description') }}
                    </span>
                  </template>
                  <template v-else-if="column.id === 'category'">
                    <CategoryBadge
                      v-if="getCategory(activity.category_id)"
                      :name="getCategory(activity.category_id)!.name"
                      :color="getCategory(activity.category_id)!.color"
                    />
                    <span v-else class="italic text-muted-foreground text-xs">
                      {{ t('app.module.activities_history.uncategorized') }}
                    </span>
                  </template>
                  <template v-else-if="column.id === 'tags'">
                    <div class="flex gap-1">
                      <template v-if="activity?.tags && (activity.tags as string[]).length > 0">
                        <Badge
                          v-for="(tag, index) in (activity.tags as string[]).slice(0, 3)"
                          :key="index"
                          variant="outline"
                          class="text-xs text-muted-foreground bg-muted hover:bg-muted/80 cursor-default"
                        >
                          {{ tag }}
                        </Badge>
                        <Badge
                          v-if="(activity.tags as string[]).length > 3"
                          variant="outline"
                          class="text-xs text-muted-foreground bg-muted"
                        >
                          +{{ (activity.tags as string[]).length - 3 }}
                        </Badge>
                      </template>
                      <span v-else class="italic text-muted-foreground">{{
                        t('app.module.activities_history.no_tags')
                      }}</span>
                    </div>
                  </template>
                  <template v-else-if="column.id === 'duration'">
                    <span class="text-sm text-foreground">
                      {{ formatDuration(activity.started_at, activity.finished_at) }}
                    </span>
                  </template>
                  <template v-else-if="column.id === 'finishedAt'">
                    <span
                      class="text-sm text-foreground"
                      :class="{ 'italic text-muted-foreground': !activity.finished_at }"
                    >
                      {{ formatActivityDateTime(activity.finished_at, locale, t('app.status.in_progress')) }}
                    </span>
                  </template>
                  <template v-else-if="column.id === 'startedAt'">
                    <span class="text-sm text-foreground">
                      {{ formatActivityDateTime(activity.started_at, locale, t('app.status.in_progress')) }}
                    </span>
                  </template>
                </TableCell>
                <TableCell class="w-16 px-2 text-right">
                  <div
                    class="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <button
                      @click.stop="openEdit(activity)"
                      class="rounded-md p-1.5 hover:bg-muted"
                      :title="t('app.action.edit')"
                    >
                      <Pencil class="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                    <button
                      @click.stop="openDelete(activity)"
                      class="rounded-md p-1.5 hover:bg-destructive/10"
                      :title="t('app.action.delete')"
                    >
                      <Trash2 class="w-3.5 h-3.5 text-destructive/60 hover:text-destructive" />
                    </button>
                  </div>
                </TableCell>
              </TableRow>
              <tr v-if="spacerHeight > 0" :style="{ height: `${spacerHeight}px` }" aria-hidden="true">
                <td :colspan="visibleColumns.length + 1" class="p-0 border-none"></td>
              </tr>
            </TableBody>
            <TableFooter v-if="activities.length > 0" class="border-t border-border/40">
              <TableRow>
                <TableCell
                  :colspan="visibleColumns.length + 1"
                  class="sticky bottom-0 z-10 whitespace-nowrap px-4 py-3 text-sm font-medium text-foreground bg-muted border-t border-border/40"
                >
                  {{
                    t('app.module.activities_history.summary.line', {
                      count: totalCount,
                      duration: formattedTotalDuration,
                    })
                  }}
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </div>
        <ScrollBar orientation="horizontal" />
        <ScrollBar orientation="vertical" />
      </ScrollArea>
    </div>
  </div>
</template>
