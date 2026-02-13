<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { storeToRefs } from 'pinia';
import { toast } from 'vue-sonner';
import { Card } from '@/components/ui/card';
import { useActivitiesStore } from '@/stores';
import { useTranslation } from '@/composables';
import type { TableRow as ITableRow } from '@/api/supabase';
import { splitAndTrim } from '@/utils/string';
import { useActivitiesTable } from '@/components/core/activities-history-list/useActivitiesTable';
import { useActivitiesTableColumns } from '@/components/core/activities-history-list/useActivitiesTableColumns';
import ActivitiesHistoryListTable from '@/components/core/activities-history-list/ActivitiesHistoryListTable.vue';
import ActivitiesHistoryListHeader from '@/components/core/activities-history-list/ActivitiesHistoryListHeader.vue';
import ActivityHistoryListSheet from '@/components/core/activities-history-list/ActivitiesHistoryListSheet.vue';
import ActivitiesHistoryListSheetDialog from '@/components/core/activities-history-list/ActivitiesHistoryListSheetDialog.vue';
import { useMonthNavigation } from '@/components/core/activities-history-list//useMonthNavigation';

export interface EditableActivity {
  description: string;
  tags: string;
  category_id: string | undefined;
}

// category is not supported yet
const { t } = useTranslation();
const activitiesStore = useActivitiesStore();
const { loading, activities } = storeToRefs(activitiesStore);

const isDeleteDialogOpen = ref(false);
const activityToDeleteId = ref<string | null>(null);
const isSheetOpen = ref(false);
const currentActivity = ref<ITableRow<'activities'> | undefined>();
const sheetMode = ref<'view' | 'edit'>('view');

function openDeleteDialog(activityId: string) {
  activityToDeleteId.value = activityId;
  isDeleteDialogOpen.value = true;
}

function closeDeleteDialog() {
  activityToDeleteId.value = null;
  isDeleteDialogOpen.value = false;
}

async function confirmDeleteActivity() {
  if (activityToDeleteId.value) {
    const { success } = await activitiesStore.deleteActivityById(activityToDeleteId.value);

    if (success) {
      toast.success(t('app.toast_notification.activity.deleted_success'));
    } else {
      toast.error(t('app.toast_notification.activity.delete_error'));
    }
  }
  closeDeleteDialog();
}

function openSheet(activity: ITableRow<'activities'>, mode: 'view' | 'edit') {
  currentActivity.value = activity;
  sheetMode.value = mode;
  isSheetOpen.value = true;
}

async function saveActivityChanges(description: string, tags: string, categoryId: string | undefined) {
  if (!currentActivity.value) {
    return;
  }
  const updatedTagsArray = splitAndTrim(tags);

  const { success } = await activitiesStore.updateActivityById(currentActivity.value.id, {
    ...currentActivity.value,
    description,
    tags: updatedTagsArray,
    category_id: categoryId,
  });
  if (success) {
    toast.success(t('app.toast_notification.activity.updated_success'));
  } else {
    toast.error(t('activityUpdateError'));
  }
  isSheetOpen.value = false;
}

const { currentMonth, changeMonth } = useMonthNavigation()
const { sortedActivities } = useActivitiesTable(activities, currentMonth);
const { columns, columnVisibility, visibleColumns, toggleColumnVisibility } = useActivitiesTableColumns();


function handleActivityAction(activity: ITableRow<'activities'>, action: 'delete' | 'edit' | 'view') {
  if (!activity) {
    return;
  }
  if (action === 'delete') {
    openDeleteDialog(activity.id);
  }
  if (action === 'edit') {
    openSheet(activity, 'edit');
  }
  if (action === 'view') {
    openSheet(activity, 'view');
  }
}

function toggleSheetOpen(isOpen: boolean) {
  isSheetOpen.value = isOpen;
}

function toggleDialogOpen(isOpen: boolean) {
  isDeleteDialogOpen.value = isOpen;
}

onMounted(async () => {
  // fetch only activites per months
  await activitiesStore.getActivities();
});
</script>

<template>
  <Card class="p-8 flex flex-col gap-4 rounded-2xl border border-border/40 h-full">
    <div class="w-full flex-shrink-0">
      <ActivitiesHistoryListHeader
        :current-month="currentMonth"
        :columns="columns"
        :column-visibility="columnVisibility"
        @toggle="(id) => toggleColumnVisibility(id)"
        @change-month="(direction) => changeMonth(direction)"
      />
    </div>
    <div class="flex-1 min-h-0 relative">
      <ActivitiesHistoryListTable
        :visible-columns="visibleColumns"
        :activities="sortedActivities"
        :loading="loading"
        @view="(activity) => handleActivityAction(activity, 'view')"
        @delete="(activity) => handleActivityAction(activity, 'delete')"
        @edit="(activity) => handleActivityAction(activity, 'edit')"
      />
    </div>
    <ActivityHistoryListSheet
      :activity="currentActivity"
      :sheet-mode="sheetMode"
      :is-sheet-open="isSheetOpen"
      @toggle-open="toggleSheetOpen"
      @save="saveActivityChanges"
    />
    <ActivitiesHistoryListSheetDialog
      :is-dialog-open="isDeleteDialogOpen"
      @toggle-open="toggleDialogOpen"
      @close="closeDeleteDialog"
      @confirm="confirmDeleteActivity"
    />
  </Card>
</template>
