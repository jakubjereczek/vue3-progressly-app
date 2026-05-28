<script setup lang="ts">
import { computed, toRef, ref, watch, nextTick } from 'vue';
import type { TableRow as ITableRow } from '@/api/supabase';
import {
  Box,
  CheckCircle,
  Hourglass,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Search,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
} from 'lucide-vue-next';
import { storeToRefs } from 'pinia';
import { useLocale, useTranslation, useActivitySheet, useScrollShadow } from '@/composables';
import { useCategoriesStore, useActivitiesStore } from '@/stores';
import { type Column } from '@/components/core/activities-history-list/config';
import type { SortableField, SortDir } from '@/components/core/activities-history-list/useActivitiesTable';
import ScrollArea from '@/components/ui/scroll-area/ScrollArea.vue';
import ScrollBar from '@/components/ui/scroll-area/ScrollBar.vue';
import Table from '@/components/ui/table/Table.vue';
import TableHeader from '@/components/ui/table/TableHeader.vue';
import TableRow from '@/components/ui/table/TableRow.vue';
import TableHead from '@/components/ui/table/TableHead.vue';
import TableCell from '@/components/ui/table/TableCell.vue';
import Badge from '@/components/ui/badge/Badge.vue';
import { formatDuration, getDuration, formatTotalDuration, formatActivityDateTime } from '@/utils/time';
import CategoryBadge from '@/components/ui/category-badge/CategoryBadge.vue';
import TableBody from '@/components/ui/table/TableBody.vue';
import TableFooter from '@/components/ui/table/TableFooter.vue';
import ErrorMessage from '@/components/error-message/ErrorMessage.vue';
import { useActivitiesTableSpacer } from '@/components/core/activities-history-list/useActivitiesTableSpacer';
import LoadingSpinner from '@/components/ui/loading-spinner/LoadingSpinner.vue';

const PAGE_SIZE = 50;

interface Props {
  visibleColumns: Column[];
  activities: ITableRow<'activities'>[];
  loading: boolean;
  highlightId?: string;
  searchActive?: boolean;
  sortField?: SortableField | null;
  sortDir?: SortDir;
  selectedIds?: Set<string>;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  sort: [SortableField];
  'toggle-one': [id: string];
}>();
const activitiesRef = toRef(props, 'activities');

const { spacerHeight, isReady } = useActivitiesTableSpacer(activitiesRef);

const totalCount = computed(() => props.activities.length);
const totalDurationSeconds = computed(() =>
  props.activities.reduce((sum, a) => sum + getDuration(a.started_at, a.finished_at) / 1000, 0),
);
const formattedTotalDuration = computed(() => formatTotalDuration(totalDurationSeconds.value));

const { t } = useTranslation();
const { locale } = useLocale();
const { openEdit, openDelete } = useActivitySheet();

const activitiesStore = useActivitiesStore();
const categoriesStore = useCategoriesStore();
const { categories } = storeToRefs(categoriesStore);

function getCategory(categoryId: string | null): { name: string; color: string } | null {
  if (!categoryId) return null;
  const found = categories.value.find((c) => c.id === categoryId);
  return found ? { name: found.name, color: found.color } : null;
}

const currentPage = ref(1);
const totalPages = computed(() => Math.max(1, Math.ceil(props.activities.length / PAGE_SIZE)));

watch(
  () => props.activities,
  () => {
    currentPage.value = 1;
  },
);

const paginatedActivities = computed(() => {
  const start = (currentPage.value - 1) * PAGE_SIZE;
  return props.activities.slice(start, start + PAGE_SIZE);
});

const scrollWrapperRef = ref<HTMLElement | null>(null);
const scrollViewportRef = ref<HTMLElement | null>(null);
const { canScrollStart: canScrollUp, canScrollEnd: canScrollDown } = useScrollShadow(scrollViewportRef, 'vertical');

watch(scrollWrapperRef, (wrapper) => {
  scrollViewportRef.value =
    (wrapper?.querySelector('[data-slot="scroll-area-viewport"]') as HTMLElement | null) ?? null;
});

const flashingId = ref<string | null>(null);

function scrollToHighlight(id: string) {
  nextTick(() => {
    const row = scrollWrapperRef.value?.querySelector(`[data-activity-id="${id}"]`) as HTMLElement | null;
    if (row) {
      row.scrollIntoView({ block: 'center', behavior: 'smooth' });
      flashingId.value = id;
      setTimeout(() => {
        flashingId.value = null;
      }, 2000);
    }
  });
}

watch(
  [() => props.activities, () => props.loading, () => props.highlightId],
  ([acts, isLoading, id]) => {
    if (!id || isLoading || (acts as ITableRow<'activities'>[]).length === 0) return;
    const idx = (acts as ITableRow<'activities'>[]).findIndex((a) => a.id === id);
    if (idx !== -1) {
      currentPage.value = Math.floor(idx / PAGE_SIZE) + 1;
    }
    scrollToHighlight(id);
  },
  { immediate: true },
);

const editingId = ref<string | null>(null);
const editingDescription = ref('');

function startInlineEdit(activity: ITableRow<'activities'>, event: MouseEvent) {
  event.stopPropagation();
  if (editingId.value === activity.id) {
    return;
  }
  editingId.value = activity.id;
  editingDescription.value = activity.description ?? '';
  nextTick(() => {
    const input = document.querySelector<HTMLInputElement>(`[data-edit-input="${activity.id}"]`);
    input?.select();
  });
}

async function saveInlineEdit(activityId: string) {
  if (editingId.value !== activityId) {
    return;
  }
  const activity = props.activities.find((a) => a.id === activityId);
  const newDesc = editingDescription.value.trim();
  if (activity && newDesc !== (activity.description ?? '').trim()) {
    const { success } = await activitiesStore.updateActivityById(activityId, { description: newDesc });
    if (!success) {
      return;
    }
  }
  editingId.value = null;
}

function cancelInlineEdit(event: KeyboardEvent) {
  event.stopPropagation();
  editingId.value = null;
}
</script>

<template>
  <div v-if="loading" class="flex items-center justify-center py-8">
    <LoadingSpinner />
  </div>

  <ErrorMessage
    v-else-if="activities.length === 0 && searchActive"
    :title="t('app.module.activities_history.no_results_for_search')"
    :icon="Search"
  />
  <ErrorMessage
    v-else-if="activities.length === 0"
    :title="t('app.module.activities_history.no_activities_found_for_month')"
    :icon="Box"
  />

  <div v-else class="flex flex-col h-full min-h-0 gap-0">
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
        <div ref="table" class="min-w-full w-max">
          <Table>
            <TableHeader class="sticky top-0 z-10 bg-muted border-b">
              <TableRow>
                <TableHead
                  v-for="column in visibleColumns"
                  :key="column.id"
                  :class="[
                    column.class,
                    'font-semibold text-foreground whitespace-nowrap',
                    column.isSortable
                      ? 'cursor-pointer select-none hover:bg-muted/80 transition-colors duration-150'
                      : '',
                  ]"
                  @click="column.isSortable && emit('sort', column.id as SortableField)"
                >
                  <div class="flex items-center gap-1.5">
                    {{ column.label }}
                    <template v-if="column.isSortable">
                      <ArrowUp
                        v-if="sortField === column.id && sortDir === 'asc'"
                        class="w-3 h-3 text-primary flex-shrink-0"
                      />
                      <ArrowDown
                        v-else-if="sortField === column.id && sortDir === 'desc'"
                        class="w-3 h-3 text-primary flex-shrink-0"
                      />
                      <ArrowUpDown v-else class="w-3 h-3 text-muted-foreground/40 flex-shrink-0" />
                    </template>
                  </div>
                </TableHead>
                <TableHead class="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow
                v-for="activity in paginatedActivities"
                :key="activity.id"
                :data-activity-id="activity.id"
                :class="[
                  'transition-colors cursor-pointer group',
                  selectedIds?.has(activity.id) ? 'bg-primary/10 hover:bg-primary/15' : 'hover:bg-accent/50',
                  flashingId === activity.id ? 'bg-primary/10' : '',
                  editingId === activity.id ? 'bg-muted/30' : '',
                ]"
                @click="editingId !== activity.id && emit('toggle-one', activity.id)"
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
                    <div v-if="editingId === activity.id" class="max-w-[360px]" @click.stop>
                      <input
                        :data-edit-input="activity.id"
                        v-model="editingDescription"
                        maxlength="500"
                        class="w-full text-sm bg-transparent border-b border-primary outline-none py-0.5 text-foreground"
                        @keyup.enter.stop="saveInlineEdit(activity.id)"
                        @keyup.escape="cancelInlineEdit($event)"
                        @blur="saveInlineEdit(activity.id)"
                      />
                    </div>
                    <span
                      v-else
                      class="text-sm text-foreground max-w-[360px] truncate block cursor-text"
                      :title="activity.description || t('app.module.activities_history.no_description')"
                      @click.stop="startInlineEdit(activity, $event)"
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
                      <span v-else class="italic text-muted-foreground">
                        {{ t('app.module.activities_history.no_tags') }}
                      </span>
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
                    class="flex items-center justify-end gap-0.5 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                  >
                    <button
                      class="rounded-md p-1.5 hover:bg-muted"
                      :aria-label="t('app.action.edit')"
                      @click.stop="openEdit(activity)"
                    >
                      <Pencil class="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                    <button
                      class="rounded-md p-1.5 hover:bg-destructive/10"
                      :aria-label="t('app.action.delete')"
                      @click.stop="openDelete(activity)"
                    >
                      <Trash2 class="w-3.5 h-3.5 text-destructive/60 hover:text-destructive" />
                    </button>
                  </div>
                </TableCell>
              </TableRow>

              <tr
                v-if="spacerHeight > 0 && totalPages <= 1"
                :style="{ height: `${spacerHeight}px` }"
                aria-hidden="true"
              >
                <td :colspan="visibleColumns.length + 1" class="p-0 border-none" />
              </tr>
            </TableBody>

            <TableFooter class="border-t border-border/40">
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

    <div v-if="totalPages > 1" class="flex items-center justify-between px-1 pt-2 flex-shrink-0">
      <span class="text-xs text-muted-foreground">
        {{ t('app.module.activities_history.page_x_of_y', { page: currentPage, total: totalPages }) }}
      </span>
      <div class="flex items-center gap-1">
        <button
          class="rounded-md p-1 hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          :disabled="currentPage === 1"
          :aria-label="t('app.action.prev_month')"
          @click="currentPage--"
        >
          <ChevronLeft class="w-4 h-4 text-muted-foreground" />
        </button>
        <span class="text-xs tabular-nums px-1 text-muted-foreground">{{ currentPage }} / {{ totalPages }}</span>
        <button
          class="rounded-md p-1 hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          :disabled="currentPage === totalPages"
          :aria-label="t('app.action.next_month')"
          @click="currentPage++"
        >
          <ChevronRight class="w-4 h-4 text-muted-foreground" />
        </button>
      </div>
    </div>
  </div>
</template>
