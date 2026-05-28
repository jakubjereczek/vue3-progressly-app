<template>
  <SidebarProvider>
    <AppSidebar />

    <SidebarInset>
      <header
        class="flex h-12 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-10 border-b bg-background"
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
    @save="save"
  />

  <DeleteActivityDialog
    :is-dialog-open="isDeleteOpen"
    @toggle-open="setDeleteOpen"
    @close="setDeleteOpen(false)"
    @confirm="confirmDelete"
  />

  <FloatingActivityTracker v-if="showFloatingTracker" />
  <GlobalSearch />
  <EasterEgg />
  <OnboardingModal />
  <GoalsCheckInModal />
</template>

<script setup lang="ts">
import { RouterView, useRoute } from 'vue-router';
import { computed, onMounted, onBeforeUnmount } from 'vue';
import { useBreadcrumbs, useActivitySheet } from '@/composables';
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
import EasterEgg from '@/components/core/easter-egg/EasterEgg.vue';
import OnboardingModal from '@/components/core/onboarding/OnboardingModal.vue';
import { GoalsCheckInModal } from '@/components/core/goals-management';
import { GlobalSearch, useGlobalSearch } from '@/components/core/global-search';

const route = useRoute();
const showFloatingTracker = computed(() => route.name !== 'Dashboard_Overview');
const { breadcrumbs } = useBreadcrumbs();
const { toggle: toggleSearch } = useGlobalSearch();

onMounted(() => {
  window.addEventListener('keydown', handleGlobalKeydown);
});
onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleGlobalKeydown);
});

function handleGlobalKeydown(e: KeyboardEvent) {
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault();
    toggleSearch();
  }
}
const { isOpen, mode, activity, setOpen, isDeleteOpen, setDeleteOpen, save, confirmDelete } = useActivitySheet();
</script>
