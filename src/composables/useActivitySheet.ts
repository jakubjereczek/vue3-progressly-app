import { ref } from 'vue';
import type { TableRow } from '@/api/supabase';

const isOpen = ref(false);
const mode = ref<'view' | 'edit'>('view');
const activity = ref<TableRow<'activities'> | undefined>();
const isDeleteOpen = ref(false);
const activityToDelete = ref<TableRow<'activities'> | undefined>();

export function useActivitySheet() {
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

  return { isOpen, mode, activity, openView, openEdit, setOpen, isDeleteOpen, activityToDelete, openDelete, setDeleteOpen };
}
