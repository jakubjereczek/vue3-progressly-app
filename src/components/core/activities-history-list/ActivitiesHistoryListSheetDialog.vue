<script setup lang="ts">
import { useTranslation } from '@/composables';
import AlertDialog from '@/components/ui/alert-dialog/AlertDialog.vue';
import AlertDialogContent from '@/components/ui/alert-dialog/AlertDialogContent.vue';
import AlertDialogHeader from '@/components/ui/alert-dialog/AlertDialogHeader.vue';
import AlertDialogTitle from '@/components/ui/alert-dialog/AlertDialogTitle.vue';
import AlertDialogDescription from '@/components/ui/alert-dialog/AlertDialogDescription.vue';
import AlertDialogFooter from '@/components/ui/alert-dialog/AlertDialogFooter.vue';
import AlertDialogCancel from '@/components/ui/alert-dialog/AlertDialogCancel.vue';
import AlertDialogAction from '@/components/ui/alert-dialog/AlertDialogAction.vue';

interface Props {
  isDialogOpen: boolean;
}

defineProps<Props>();

const emit = defineEmits<{
  toggleOpen: [boolean];
  close: [];
  confirm: [];
}>();

const { t } = useTranslation();
</script>

<template>
  <AlertDialog :open="isDialogOpen" @update:open="(open) => emit('toggleOpen', open)">
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>{{ t('app.module.activities_history.delete_dialog.title') }}</AlertDialogTitle>
        <AlertDialogDescription>{{ t('app.module.activities_history.delete_dialog.description') }}</AlertDialogDescription>
      </AlertDialogHeader>

      <AlertDialogFooter>
        <AlertDialogCancel @click="emit('close')">{{ t('app.action.cancel') }}</AlertDialogCancel>
        <AlertDialogAction @click="emit('confirm')" class="bg-red-600 hover:bg-red-700">
          {{ t('app.action.delete') }}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
