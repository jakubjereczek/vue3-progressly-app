<template>
  <SidebarProvider>
    <AppSidebar />

    <SidebarInset>
      <header
        class="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12 border-b bg-background"
      >
        <div class="flex items-center gap-2 px-4">
          <SidebarTrigger class="-ml-1" />
          <Separator orientation="vertical" class="mr-2 h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <template v-for="(crumb, index) in breadcrumbs" :key="crumb.path">
                <BreadcrumbItem>
                  <BreadcrumbPage v-if="index === breadcrumbs.length - 1" class="font-semibold text-primary">
                    {{ crumb.name }}
                  </BreadcrumbPage>
                  <BreadcrumbLink v-else :to="crumb.path">
                    {{ crumb.name }}
                  </BreadcrumbLink>
                </BreadcrumbItem>

                <BreadcrumbSeparator v-if="index < breadcrumbs.length - 1" />
              </template>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>

      <main class="flex flex-1 flex-col gap-4 p-4 overflow-hidden bg-muted/30">
        <RouterView />
      </main>
    </SidebarInset>
  </SidebarProvider>

  <ActivityHistoryListSheet
    :activity="activity"
    :sheet-mode="mode"
    :is-sheet-open="isOpen"
    @toggle-open="setOpen"
    @save="saveActivityChanges"
  />

  <DeleteActivityDialog
    :is-dialog-open="isDeleteOpen"
    @toggle-open="setDeleteOpen"
    @close="setDeleteOpen(false)"
    @confirm="handleDeleteActivity"
  />

  <FloatingActivityTracker v-if="showFloatingTracker" />
</template>

<script setup lang="ts">
import { RouterView, useRoute } from 'vue-router';
import { computed } from 'vue';
import { useBreadcrumbs, useActivitySheet } from '@/composables';
import { useActivitiesStore } from '@/stores';
import { toast } from 'vue-sonner';
import { useTranslation } from '@/composables';
import { splitAndTrim } from '@/utils/string';
import AppSidebar from '@/components/AppSidebar.vue';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb/';
import { Separator } from '@/components/ui/separator';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import ActivityHistoryListSheet from '@/components/core/activity-sheet/ActivitySheet.vue';
import DeleteActivityDialog from '@/components/core/activities-history-list/ActivitiesHistoryListSheetDialog.vue';
import FloatingActivityTracker from '@/components/core/activity/FloatingActivityTracker.vue';

const route = useRoute();
const showFloatingTracker = computed(() => route.name !== 'Dashboard_Overview');
const { breadcrumbs } = useBreadcrumbs();
const { t } = useTranslation();
const activitiesStore = useActivitiesStore();
const { isOpen, mode, activity, setOpen, isDeleteOpen, activityToDelete, setDeleteOpen } = useActivitySheet();

async function saveActivityChanges(
  description: string,
  tags: string,
  categoryId: string | undefined,
  startedAt: string,
  finishedAt: string | undefined,
) {
  if (!activity.value) return;
  const updatedTagsArray = splitAndTrim(tags);
  const { success } = await activitiesStore.updateActivityById(activity.value.id, {
    ...activity.value,
    description,
    tags: updatedTagsArray,
    category_id: categoryId,
    started_at: startedAt,
    finished_at: finishedAt ?? activity.value.finished_at,
  });
  if (success) {
    toast.success(t('app.toast_notification.activity.updated_success'));
  } else {
    toast.error(t('app.toast_notification.activity.update_error'));
  }
  setOpen(false);
}

async function handleDeleteActivity() {
  const target = activityToDelete.value;
  if (!target) {
    return;
  }
  const { success } = await activitiesStore.deleteActivityById(target.id);
  if (success) {
    toast.success(t('app.toast_notification.activity.deleted_success'));
  } else {
    toast.error(t('app.toast_notification.activity.delete_error'));
  }
  setDeleteOpen(false);
  activityToDelete.value = undefined;
}
</script>
