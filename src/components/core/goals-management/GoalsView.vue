<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue';
import { useRoute } from 'vue-router';
import { Plus, BarChart2, AlertCircle } from 'lucide-vue-next';
import ErrorMessage from '@/components/error-message/ErrorMessage.vue';
import LoadingSpinner from '@/components/ui/loading-spinner/LoadingSpinner.vue';
import { computeGoalCurrentSeconds, computeGoalCurrentCount, getGoalTarget } from './useGoalProgress';
import { getTodayDateString } from '@/utils/time';
import { toast } from 'vue-sonner';
import { useGoalsStore } from '@/stores/goalsStore';
import { useCategoriesStore, useActivitiesStore } from '@/stores';
import { storeToRefs } from 'pinia';
import { useTranslation } from '@/composables';
import { useGoalsManagement } from './useGoalsManagement';
import GoalsManagementCard from './GoalsManagementCard.vue';
import GoalsManagementForm from './GoalsManagementForm.vue';
import GoalsDetailSheet from './GoalsDetailSheet.vue';
import GoalsAnalyticsView from './GoalsAnalyticsView.vue';
import { Card } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import type { TableRow } from '@/api/supabase';

const { t } = useTranslation();
const route = useRoute();

interface GoalGroup {
  category: TableRow<'categories'> | null;
  goals: TableRow<'goals'>[];
}

const goalsStore = useGoalsStore();
const categoriesStore = useCategoriesStore();
const activitiesStore = useActivitiesStore();

const { goals, loading, error } = storeToRefs(goalsStore);
const { activePrivateCategories, publicCategories } = storeToRefs(categoriesStore);
const categories = computed(() => [...activePrivateCategories.value, ...publicCategories.value]);
const { activities } = storeToRefs(activitiesStore);

const { isFormOpen, editingGoal, draft, goalToDelete, openCreate, openEdit, closeForm, getDraftTargetSeconds } =
  useGoalsManagement();

const detailGoal = ref<TableRow<'goals'> | null>(null);
const isDetailOpen = ref(false);

function openDetail(goal: TableRow<'goals'>) {
  detailGoal.value = goal;
  isDetailOpen.value = true;
}

type TabValue = 'active' | 'ended' | 'archived' | 'all';
const activeTab = ref<TabValue>('active');
const viewMode = ref<'list' | 'analytics'>('list');
const actionLoading = ref(false);

const tabs: { value: TabValue; labelKey: string }[] = [
  { value: 'active', labelKey: 'app.module.goals.tab.active' },
  { value: 'ended', labelKey: 'app.module.goals.tab.ended' },
  { value: 'archived', labelKey: 'app.module.goals.tab.archived' },
  { value: 'all', labelKey: 'app.module.goals.tab.all' },
];

const today = computed(() => getTodayDateString());

const categoryMap = computed(() => new Map(categories.value.map((c) => [c.id, c])));

/**
 * Pre-computed goal progress percentages (0–100) for ALL goals.
 * Avoids calling computeGoalCurrentSeconds/Count inside sort(), which would
 * run O(m) activity scans O(n log n) times during filteredGoals sorting.
 */
const goalProgressMap = computed(() => {
  const map = new Map<string, number>();
  for (const g of goals.value) {
    const target = getGoalTarget(g);
    if (target <= 0) {
      map.set(g.id, 0);
      continue;
    }
    const current =
      g.metric === 'count'
        ? computeGoalCurrentCount(g, activities.value)
        : computeGoalCurrentSeconds(g, activities.value);
    map.set(g.id, Math.min(100, Math.round((current / target) * 100)));
  }
  return map;
});

const tabCounts = computed(() => {
  const t = today.value;
  return {
    active: goals.value.filter((g) => !g.archived_at && !(g.ended_at && g.ended_at < t)).length,
    ended: goals.value.filter((g) => !g.archived_at && !!g.ended_at && g.ended_at < t).length,
    archived: goals.value.filter((g) => !!g.archived_at).length,
    all: goals.value.length,
  };
});

function sortPriority(g: TableRow<'goals'>): number {
  const t = today.value;
  if (g.archived_at) return 5;
  if (g.ended_at && g.ended_at < t) return 4;
  if (!g.ended_at && new Date(g.started_at) > new Date()) return 3; // upcoming
  const target = getGoalTarget(g);
  if (target <= 0) return 2;
  if ((goalProgressMap.value.get(g.id) ?? 0) >= 100) return 1; // completed
  return 0; // active/behind — highest priority
}

const filteredGoals = computed(() => {
  const t = today.value;
  let list: TableRow<'goals'>[];
  if (activeTab.value === 'active') {
    list = goals.value.filter((g) => !g.archived_at && !(g.ended_at && g.ended_at < t));
  } else if (activeTab.value === 'ended') {
    list = goals.value.filter((g) => !g.archived_at && !!g.ended_at && g.ended_at < t);
  } else if (activeTab.value === 'archived') {
    list = goals.value.filter((g) => !!g.archived_at);
  } else {
    list = [...goals.value];
  }
  return [...list].sort((a, b) => sortPriority(a) - sortPriority(b));
});

const selectedCategoryId = ref<string | null>(null);
watch(activeTab, () => {
  selectedCategoryId.value = null;
});

const availableCategories = computed(() => {
  const seen = new Set<string>();
  const cats: TableRow<'categories'>[] = [];
  for (const goal of filteredGoals.value) {
    if (goal.category_id && !seen.has(goal.category_id)) {
      seen.add(goal.category_id);
      const cat = categoryMap.value.get(goal.category_id);
      if (cat) cats.push(cat);
    }
  }
  return cats.sort((a, b) => a.name.localeCompare(b.name));
});

const displayedGoals = computed(() => {
  if (!selectedCategoryId.value) return filteredGoals.value;
  return filteredGoals.value.filter((g) => g.category_id === selectedCategoryId.value);
});

const groupedGoals = computed((): GoalGroup[] => {
  if (selectedCategoryId.value) {
    return [{ category: null, goals: displayedGoals.value }];
  }
  const map = new Map<string | null, TableRow<'goals'>[]>();
  for (const goal of filteredGoals.value) {
    const key = goal.category_id ?? null;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(goal);
  }
  const groups: GoalGroup[] = [];
  for (const [catId, gs] of map) {
    const cat = catId ? (categoryMap.value.get(catId) ?? null) : null;
    groups.push({ category: cat, goals: gs });
  }
  return groups.sort((a, b) => {
    if (!a.category && b.category) return 1;
    if (a.category && !b.category) return -1;
    if (a.category && b.category) return a.category.name.localeCompare(b.category.name);
    return 0;
  });
});

async function handleSubmit() {
  actionLoading.value = true;
  const d = draft.value;
  const isDuration = d.metric === 'duration';
  const payload = {
    name: d.name.trim(),
    color: d.color,
    type: d.type,
    period: d.type === 'per_period' ? d.period : null,
    metric: d.metric,
    target_seconds: isDuration ? getDraftTargetSeconds() : null,
    target_count: isDuration ? null : d.target_count,
    category_id: d.category_id,
    started_at: d.started_at,
    ended_at: d.ended_at || null,
  };

  if (editingGoal.value) {
    const { success } = await goalsStore.updateGoal(editingGoal.value.id, payload);
    if (success) {
      toast.success(t('app.toast_notification.goal.updated_success'));
      closeForm();
    } else {
      toast.error(t('app.toast_notification.goal.update_error'));
    }
  } else {
    const { success } = await goalsStore.createGoal(payload);
    if (success) {
      toast.success(t('app.toast_notification.goal.created_success'));
      closeForm();
    } else {
      toast.error(t('app.toast_notification.goal.create_error'));
    }
  }
  actionLoading.value = false;
}

async function handleArchive(goal: TableRow<'goals'>) {
  const { success } = await goalsStore.archiveGoal(goal.id);
  if (success) toast.success(t('app.toast_notification.goal.archived_success'));
  else toast.error(t('app.toast_notification.goal.archive_error'));
}

async function handleUnarchive(goal: TableRow<'goals'>) {
  const { success } = await goalsStore.unarchiveGoal(goal.id);
  if (success) toast.success(t('app.toast_notification.goal.unarchived_success'));
  else toast.error(t('app.toast_notification.goal.archive_error'));
}

async function handleDelete() {
  if (!goalToDelete.value) return;
  const { success } = await goalsStore.deleteGoal(goalToDelete.value.id);
  if (success) toast.success(t('app.toast_notification.goal.deleted_success'));
  else toast.error(t('app.toast_notification.goal.delete_error'));
  goalToDelete.value = null;
}

onMounted(async () => {
  await Promise.all([goalsStore.getGoals(), categoriesStore.getCategories(), activitiesStore.getActivities()]);

  const openId = route.query.open as string | undefined;
  if (openId) {
    const goal = goals.value.find((g) => g.id === openId);
    if (goal) openDetail(goal);
  }
});
</script>

<template>
  <Card data-tour="goals" class="p-6 flex flex-col gap-4 rounded-2xl border border-border/40 h-full overflow-hidden">
    <!-- Page header -->
    <div class="flex items-start justify-between gap-4 flex-shrink-0">
      <div>
        <p class="text-sm font-medium text-muted-foreground">{{ t('app.module.goals.title') }}</p>
        <p class="text-xs text-muted-foreground/60 mt-0.5">{{ t('app.module.goals.description') }}</p>
      </div>
      <Button size="sm" class="flex items-center gap-1.5 flex-shrink-0" @click="openCreate">
        <Plus class="w-4 h-4" />
        {{ t('app.module.goals.add_goal') }}
      </Button>
    </div>

    <!-- Tabs -->
    <div class="flex items-center justify-between gap-3 flex-shrink-0">
      <div class="flex items-center gap-0.5 bg-muted/40 rounded-lg p-0.5 border border-border/40">
        <button
          v-for="tab in tabs"
          :key="tab.value"
          class="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md font-medium transition-all duration-200"
          :class="
            activeTab === tab.value
              ? 'bg-card text-foreground shadow-sm border border-border/40'
              : 'text-muted-foreground hover:text-foreground'
          "
          @click="
            activeTab = tab.value;
            viewMode = 'list';
          "
        >
          {{ t(tab.labelKey) }}
          <span
            class="text-2xs tabular-nums px-1 py-px rounded font-semibold leading-none"
            :class="activeTab === tab.value ? 'bg-muted text-muted-foreground' : 'text-muted-foreground/50'"
            >{{ tabCounts[tab.value] }}</span
          >
        </button>
      </div>
      <button
        class="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg font-medium transition-all duration-200 border"
        :class="
          viewMode === 'analytics'
            ? 'bg-primary text-primary-foreground border-primary shadow-sm'
            : 'bg-card text-muted-foreground hover:text-foreground border-border/40 hover:border-border'
        "
        @click="viewMode = viewMode === 'analytics' ? 'list' : 'analytics'"
      >
        <BarChart2 class="w-3.5 h-3.5" />
        {{ t('app.module.goals.tab.analytics') }}
      </button>
    </div>

    <!-- Category filter chips -->
    <div
      v-if="viewMode === 'list' && availableCategories.length >= 2"
      class="flex items-center gap-1.5 flex-wrap flex-shrink-0"
    >
      <button
        class="text-2xs font-medium px-2.5 py-1 rounded-full border transition-colors duration-150"
        :class="
          !selectedCategoryId
            ? 'bg-primary text-primary-foreground border-primary'
            : 'bg-card text-muted-foreground border-border/40 hover:text-foreground hover:border-border'
        "
        @click="selectedCategoryId = null"
      >
        {{ t('app.module.goals.filter.all_categories') }}
      </button>
      <button
        v-for="cat in availableCategories"
        :key="cat.id"
        class="inline-flex items-center gap-1 text-2xs font-medium px-2.5 py-1 rounded-full border transition-colors duration-150"
        :style="
          selectedCategoryId === cat.id
            ? { color: cat.color, backgroundColor: cat.color + '18', borderColor: cat.color + '50' }
            : {}
        "
        :class="
          selectedCategoryId === cat.id
            ? ''
            : 'bg-card text-muted-foreground border-border/40 hover:text-foreground hover:border-border'
        "
        @click="selectedCategoryId = selectedCategoryId === cat.id ? null : cat.id"
      >
        <span class="w-1.5 h-1.5 rounded-full flex-shrink-0" :style="{ backgroundColor: cat.color }" />
        {{ cat.name }}
      </button>
    </div>

    <!-- Scrollable content area -->
    <div class="flex-1 min-h-0 overflow-y-auto -mx-6 px-6 pb-1">
      <!-- Analytics view -->
      <GoalsAnalyticsView v-if="viewMode === 'analytics'" :filter="activeTab === 'archived' ? 'all' : activeTab" />

      <!-- Goals tabs content -->
      <template v-else>
        <!-- Error -->
        <div v-if="error" class="flex items-center justify-center py-12">
          <ErrorMessage :title="t(error)" :icon="AlertCircle" />
        </div>

        <!-- Loading -->
        <div v-else-if="loading" class="flex items-center justify-center py-20">
          <LoadingSpinner />
        </div>

        <!-- Empty state -->
        <div
          v-else-if="displayedGoals.length === 0"
          class="flex flex-col items-center justify-center py-20 gap-3 text-center"
        >
          <p class="text-muted-foreground text-sm">{{ t(`app.module.goals.empty_title.${activeTab}`) }}</p>
          <p class="text-muted-foreground/60 text-xs max-w-xs">{{ t(`app.module.goals.empty_hint.${activeTab}`) }}</p>
          <Button v-if="activeTab === 'active'" size="sm" variant="outline" class="mt-2" @click="openCreate">
            <Plus class="w-3.5 h-3.5 mr-1.5" />
            {{ t('app.module.goals.add_goal') }}
          </Button>
        </div>

        <!-- Goals grid (grouped by category) -->
        <div v-else class="flex flex-col gap-6">
          <div v-for="group in groupedGoals" :key="group.category?.id ?? '__none__'" class="flex flex-col gap-3">
            <!-- Group header (only when multiple groups) -->
            <div v-if="groupedGoals.length > 1" class="flex items-center gap-2">
              <span
                v-if="group.category"
                class="w-2 h-2 rounded-full flex-shrink-0"
                :style="{ backgroundColor: group.category.color }"
              />
              <span class="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                {{ group.category ? group.category.name : t('app.module.goals.card.all_categories') }}
              </span>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <GoalsManagementCard
                v-for="goal in group.goals"
                :key="goal.id"
                :goal="goal"
                :activities="activities"
                :categories="categories"
                @click="openDetail(goal)"
                @edit="openEdit(goal)"
                @archive="handleArchive(goal)"
                @unarchive="handleUnarchive(goal)"
                @delete="goalToDelete = goal"
              />
            </div>
          </div>
        </div>
      </template>
    </div>
  </Card>

  <!-- Detail sheet -->
  <GoalsDetailSheet
    v-model:open="isDetailOpen"
    :goal="detailGoal"
    :activities="activities"
    :categories="categories"
    @edit="
      () => {
        isDetailOpen = false;
        if (detailGoal) openEdit(detailGoal);
      }
    "
    @archive="
      () => {
        if (detailGoal) handleArchive(detailGoal);
      }
    "
    @unarchive="
      () => {
        if (detailGoal) handleUnarchive(detailGoal);
      }
    "
    @delete="
      () => {
        isDetailOpen = false;
        if (detailGoal) goalToDelete = detailGoal;
      }
    "
  />

  <!-- Create / Edit form -->
  <GoalsManagementForm
    :key="editingGoal?.id ?? 'new'"
    v-model:open="isFormOpen"
    v-model:draft="draft"
    :is-editing="!!editingGoal"
    :categories="categories"
    :loading="actionLoading"
    @submit="handleSubmit"
  />

  <!-- Delete confirmation -->
  <AlertDialog
    :open="goalToDelete !== null"
    @update:open="
      (v) => {
        if (!v)
          nextTick(() => {
            goalToDelete = null;
          });
      }
    "
  >
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>{{ t('app.module.goals.delete_dialog.title') }}</AlertDialogTitle>
        <AlertDialogDescription>{{ t('app.module.goals.delete_dialog.description') }}</AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>{{ t('app.action.cancel') }}</AlertDialogCancel>
        <AlertDialogAction
          class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          @click="handleDelete"
        >
          {{ t('app.action.delete') }}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
