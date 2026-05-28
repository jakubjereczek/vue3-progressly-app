import { ref } from 'vue';
import type { TableRow } from '@/api/supabase';
import { useActivitiesStore } from '@/stores';
import { useTranslation } from './useTranslation';
import { splitAndTrim } from '@/utils/string';
import { toast } from 'vue-sonner';

const isOpen = ref(false);
const mode = ref<'view' | 'edit'>('view');
const activity = ref<TableRow<'activities'> | undefined>();
const isDeleteOpen = ref(false);
const activityToDelete = ref<TableRow<'activities'> | undefined>();

export function useActivitySheet() {
  const { t } = useTranslation();
  const activitiesStore = useActivitiesStore();

  function openView(a: TableRow<'activities'>) {
    activity.value = a;
    mode.value = 'view';
    isOpen.value = true;
  }

  function openEdit(a: TableRow<'activities'>) {
    activity.value = a;
    mode.value = 'edit';
    isOpen.value = true;
  }

  function setOpen(open: boolean) {
    isOpen.value = open;
  }

  function openDelete(a: TableRow<'activities'>) {
    activityToDelete.value = a;
    isDeleteOpen.value = true;
  }

  function setDeleteOpen(open: boolean) {
    isDeleteOpen.value = open;
  }

  async function save(
    description: string,
    tags: string,
    categoryId: string | undefined,
    startedAt: string,
    finishedAt: string | undefined,
  ) {
    if (!activity.value) return;
    const { success } = await activitiesStore.updateActivityById(activity.value.id, {
      ...activity.value,
      description,
      tags: splitAndTrim(tags),
      category_id: categoryId,
      started_at: startedAt,
      finished_at: finishedAt ?? activity.value.finished_at,
    });
    if (success) {
      toast.success(t('app.toast_notification.activity.updated_success'));
    } else {
      toast.error(t('app.toast_notification.activity.update_error'));
    }
    isOpen.value = false;
  }

  async function confirmDelete() {
    const target = activityToDelete.value;
    if (!target) return;
    const { success } = await activitiesStore.deleteActivityById(target.id);
    if (success) {
      toast.success(t('app.toast_notification.activity.deleted_success'));
    } else {
      toast.error(t('app.toast_notification.activity.delete_error'));
    }
    isDeleteOpen.value = false;
    activityToDelete.value = undefined;
  }

  return {
    isOpen,
    mode,
    activity,
    openView,
    openEdit,
    setOpen,
    isDeleteOpen,
    activityToDelete,
    openDelete,
    setDeleteOpen,
    save,
    confirmDelete,
  };
}
