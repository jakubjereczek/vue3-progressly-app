import { ref } from 'vue';
import type { TableRow } from '@/api/supabase';
import { getTodayDateString } from '@/utils/time';

export interface GoalDraft {
  name: string;
  color: string;
  type: 'per_period' | 'total';
  period: 'daily' | 'weekly' | 'monthly' | null;
  metric: 'duration' | 'count';
  target_hours: number;
  target_minutes: number;
  target_count: number;
  category_id: string | null;
  started_at: string;
  ended_at: string;
}

export const DEFAULT_COLOR = '#6366f1';

function emptyDraft(): GoalDraft {
  return {
    name: '',
    color: DEFAULT_COLOR,
    type: 'per_period',
    period: 'daily',
    metric: 'duration',
    target_hours: 1,
    target_minutes: 0,
    target_count: 1,
    category_id: null,
    started_at: getTodayDateString(),
    ended_at: '',
  };
}

export function useGoalsManagement() {
  const isFormOpen = ref(false);
  const editingGoal = ref<TableRow<'goals'> | null>(null);
  const draft = ref<GoalDraft>(emptyDraft());
  const goalToDelete = ref<TableRow<'goals'> | null>(null);

  function openCreate() {
    editingGoal.value = null;
    draft.value = emptyDraft();
    isFormOpen.value = true;
  }

  function openEdit(goal: TableRow<'goals'>) {
    editingGoal.value = goal;
    draft.value = {
      name: goal.name,
      color: goal.color,
      type: goal.type as 'per_period' | 'total',
      period: (goal.period as 'daily' | 'weekly' | 'monthly' | null) ?? null,
      metric: (goal.metric as 'duration' | 'count') ?? 'duration',
      target_hours: Math.floor((goal.target_seconds ?? 0) / 3600),
      target_minutes: Math.floor(((goal.target_seconds ?? 0) % 3600) / 60),
      target_count: goal.target_count ?? 1,
      category_id: goal.category_id,
      started_at: goal.started_at,
      ended_at: goal.ended_at ?? '',
    };
    isFormOpen.value = true;
  }

  function closeForm() {
    isFormOpen.value = false;
    editingGoal.value = null;
  }

  function getDraftTargetSeconds(): number {
    return draft.value.target_hours * 3600 + draft.value.target_minutes * 60;
  }

  return {
    isFormOpen,
    editingGoal,
    draft,
    goalToDelete,
    openCreate,
    openEdit,
    closeForm,
    getDraftTargetSeconds,
  };
}
