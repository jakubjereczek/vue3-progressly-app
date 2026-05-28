<script setup lang="ts">
import { onMounted, watch, computed, ref } from 'vue';
import { storeToRefs } from 'pinia';
import { useRoute } from 'vue-router';
import { toast } from 'vue-sonner';
import { Trash2, Tag, X } from 'lucide-vue-next';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useActivitiesStore, useCategoriesStore } from '@/stores';
import { useActivitiesTable, type SortableField } from '@/components/core/activities-history-list/useActivitiesTable';
import { useActivitiesTableColumns } from '@/components/core/activities-history-list/useActivitiesTableColumns';
import { useActivitiesSelection } from '@/components/core/activities-history-list/useActivitiesSelection';
import ActivitiesHistoryListTable from '@/components/core/activities-history-list/ActivitiesHistoryListTable.vue';
import ActivitiesHistoryListHeader from '@/components/core/activities-history-list/ActivitiesHistoryListHeader.vue';
import { useMonthNavigation } from '@/components/core/activities-history-list/useMonthNavigation';
import { useTranslation } from '@/composables';
import { splitAndTrim } from '@/utils/string';
import type { TableRow } from '@/api/supabase';

const { t } = useTranslation();
const route = useRoute();
const highlightId = computed(() => route.query.highlight as string | undefined);

const activitiesStore = useActivitiesStore();
const categoriesStore = useCategoriesStore();
const { loading, activities } = storeToRefs(activitiesStore);
const { categories } = storeToRefs(categoriesStore);

const { currentMonth, changeMonth } = useMonthNavigation();
const { sortedActivities, sortField, sortDir, toggleSort } = useActivitiesTable(
  activities as ReturnType<typeof computed<TableRow<'activities'>[]>>,
);
const { columns, columnVisibility, visibleColumns, toggleColumnVisibility } = useActivitiesTableColumns();

const searchQuery = ref('');

const filteredActivities = computed(() => {
  const query = searchQuery.value.trim().toLowerCase();
  if (!query) {
    return sortedActivities.value;
  }
  return sortedActivities.value.filter((a) => {
    if (a.description?.toLowerCase().includes(query)) {
      return true;
    }
    if ((a.tags as string[])?.some((tag) => tag.toLowerCase().includes(query))) return true;
    const cat = categories.value.find((c) => c.id === a.category_id);
    if (cat?.name.toLowerCase().includes(query)) {
      return true;
    }
    return false;
  });
});

function getMonthRange(yearMonth: string): { from: Date; to: Date } {
  const [year, month] = yearMonth.split('-').map(Number);
  const from = new Date(year!, month! - 1, 1, 0, 0, 0, 0);
  const to = new Date(year!, month!, 0, 23, 59, 59, 999);
  return { from, to };
}

watch(
  currentMonth,
  (ym) => {
    if (searchQuery.value.trim()) {
      toast.info(t('app.module.activities_history.search_reset_on_month_change'));
    }
    searchQuery.value = '';
    const { from, to } = getMonthRange(ym);
    activitiesStore.getActivitiesInRange(from, to);
  },
  { immediate: true },
);

onMounted(() => categoriesStore.getCategories());

const { selectedIds, selectedCount, hasSelection, toggleOne, clear } = useActivitiesSelection(filteredActivities);
const showDeleteDialog = ref(false);

async function handleBulkDelete() {
  const ids = [...selectedIds.value];
  showDeleteDialog.value = false;
  clear();
  const { success } = await activitiesStore.bulkDeleteActivities(ids);
  if (success) {
    toast.success(t('app.toast_notification.activity.bulk_deleted_success', { count: ids.length }));
  } else {
    toast.error(t('app.toast_notification.activity.delete_error'));
  }
}

const showTagsDialog = ref(false);
const tagsToAdd = ref('');
const tagsToRemove = ref('');

function openTagsDialog() {
  tagsToAdd.value = '';
  tagsToRemove.value = '';
  showTagsDialog.value = true;
}

async function handleBulkTags() {
  const ids = [...selectedIds.value];
  const add = splitAndTrim(tagsToAdd.value);
  const remove = splitAndTrim(tagsToRemove.value);
  if (add.length === 0 && remove.length === 0) {
    showTagsDialog.value = false;
    return;
  }
  showTagsDialog.value = false;
  const { success } = await activitiesStore.bulkSetTags(ids, add, remove);
  if (success) {
    toast.success(t('app.toast_notification.activity.updated_success'));
  } else {
    toast.error(t('app.toast_notification.activity.update_error'));
  }
}
</script>

<template>
  <Card data-tour="timesheet" class="p-6 flex flex-col gap-4 rounded-2xl border border-border/40 h-full">
    <div class="w-full flex-shrink-0">
      <ActivitiesHistoryListHeader
        :current-month="currentMonth"
        :columns="columns"
        :column-visibility="columnVisibility"
        :search-query="searchQuery"
        @toggle="(id) => toggleColumnVisibility(id)"
        @change-month="(direction) => changeMonth(direction)"
        @update:search-query="searchQuery = $event"
      />
    </div>

    <Transition
      enter-active-class="transition-all duration-200 ease-out"
      enter-from-class="opacity-0 -translate-y-2"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition-all duration-150 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 -translate-y-2"
    >
      <div
        v-if="hasSelection"
        class="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/8 border border-primary/20 flex-shrink-0"
      >
        <span class="text-sm font-medium text-primary flex-1">
          {{ t('app.module.activities_history.bulk.selected', { count: selectedCount }) }}
        </span>
        <Button size="sm" variant="outline" class="gap-1.5 h-7 text-xs" @click="openTagsDialog">
          <Tag class="w-3.5 h-3.5" />
          {{ t('app.module.activities_history.bulk.edit_tags') }}
        </Button>
        <Button size="sm" variant="destructive" class="gap-1.5 h-7 text-xs" @click="showDeleteDialog = true">
          <Trash2 class="w-3.5 h-3.5" />
          {{ t('app.module.activities_history.bulk.delete') }}
        </Button>
        <button
          class="rounded-md p-1 hover:bg-muted transition-colors duration-150"
          :aria-label="t('app.module.activities_history.bulk.deselect_all')"
          @click="clear"
        >
          <X class="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      </div>
    </Transition>

    <div class="flex-1 min-h-0 relative">
      <ActivitiesHistoryListTable
        :visible-columns="visibleColumns"
        :activities="filteredActivities"
        :loading="loading"
        :highlight-id="highlightId"
        :search-active="searchQuery.trim().length > 0"
        :sort-field="sortField"
        :sort-dir="sortDir"
        :selected-ids="selectedIds"
        @sort="(field: SortableField) => toggleSort(field)"
        @toggle-one="toggleOne"
      />
    </div>
  </Card>

  <AlertDialog :open="showDeleteDialog" @update:open="showDeleteDialog = $event">
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>
          {{ t('app.module.activities_history.bulk.delete_dialog.title', { count: selectedCount }) }}
        </AlertDialogTitle>
        <AlertDialogDescription>
          {{ t('app.module.activities_history.bulk.delete_dialog.description', { count: selectedCount }) }}
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>{{ t('app.action.cancel') }}</AlertDialogCancel>
        <AlertDialogAction
          class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          @click="handleBulkDelete"
        >
          {{ t('app.module.activities_history.bulk.delete_dialog.confirm') }}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>

  <Dialog :open="showTagsDialog" @update:open="showTagsDialog = $event">
    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>
          {{ t('app.module.activities_history.bulk.tags_dialog.title', { count: selectedCount }) }}
        </DialogTitle>
      </DialogHeader>
      <div class="flex flex-col gap-4 py-2">
        <div class="flex flex-col gap-1.5">
          <Label>{{ t('app.module.activities_history.bulk.tags_dialog.add_label') }}</Label>
          <Input v-model="tagsToAdd" :placeholder="t('app.module.activities_history.bulk.tags_dialog.placeholder')" />
        </div>
        <div class="flex flex-col gap-1.5">
          <Label>{{ t('app.module.activities_history.bulk.tags_dialog.remove_label') }}</Label>
          <Input
            v-model="tagsToRemove"
            :placeholder="t('app.module.activities_history.bulk.tags_dialog.placeholder')"
          />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" @click="showTagsDialog = false">{{ t('app.action.cancel') }}</Button>
        <Button :disabled="!tagsToAdd.trim() && !tagsToRemove.trim()" @click="handleBulkTags">
          {{ t('app.module.activities_history.bulk.tags_dialog.apply') }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
