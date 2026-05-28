<script setup lang="ts">
import { computed, watch } from 'vue';
import type { GoalDraft } from './useGoalsManagement';
import { useTranslation, useCategoryName } from '@/composables';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { TableRow } from '@/api/supabase';

const props = defineProps<{
  open: boolean;
  draft: GoalDraft;
  isEditing: boolean;
  categories: TableRow<'categories'>[];
  loading?: boolean;
}>();

const emit = defineEmits<{
  'update:open': [value: boolean];
  'update:draft': [value: GoalDraft];
  submit: [];
}>();

const { t } = useTranslation();
const { resolveCategoryName } = useCategoryName();

function update<K extends keyof GoalDraft>(key: K, value: GoalDraft[K]) {
  emit('update:draft', { ...props.draft, [key]: value });
}

watch(
  () => props.draft.type,
  (type) => {
    if (type === 'total' && props.draft.period !== null) {
      update('period', null);
    }
    if (type === 'per_period' && props.draft.period === null) {
      update('period', 'daily');
    }
  },
);

const endedAtError = computed(() => {
  const { started_at, ended_at } = props.draft;
  if (ended_at && started_at && ended_at <= started_at) {
    return t('app.module.goals.form.ended_at_error');
  }
  return null;
});

const isValid = computed(() => {
  const { name, type, period, metric, target_hours, target_minutes, target_count, started_at } = props.draft;
  if (!name.trim()) return false;
  if (type === 'per_period' && !period) return false;
  if (metric === 'duration' && target_hours * 3600 + target_minutes * 60 <= 0) return false;
  if (metric === 'count' && target_count <= 0) return false;
  if (!started_at) return false;
  if (endedAtError.value) return false;
  return true;
});

watch(
  () => props.draft.started_at,
  (newStarted) => {
    if (props.draft.ended_at && newStarted && props.draft.ended_at <= newStarted) {
      update('ended_at', '');
    }
  },
);

const privateCategories = computed(() => props.categories.filter((c) => c.user_id !== null));
const publicCategories = computed(() => props.categories.filter((c) => c.user_id === null));
</script>

<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent class="sm:max-w-[480px]">
      <DialogHeader>
        <DialogTitle>
          {{ isEditing ? t('app.module.goals.form.edit_title') : t('app.module.goals.form.create_title') }}
        </DialogTitle>
        <DialogDescription>
          {{ isEditing ? t('app.module.goals.form.edit_description') : t('app.module.goals.form.create_description') }}
        </DialogDescription>
      </DialogHeader>

      <div class="flex flex-col gap-4 py-2">
        <!-- Name + Color -->
        <div class="flex gap-3 items-end">
          <div class="flex-1 flex flex-col gap-1.5">
            <Label>{{ t('app.module.goals.form.name_label') }}</Label>
            <Input
              :model-value="draft.name"
              :placeholder="t('app.module.goals.form.name_placeholder')"
              @update:model-value="update('name', String($event))"
            />
          </div>
          <div class="flex flex-col gap-1.5">
            <Label>{{ t('app.module.goals.form.color_label') }}</Label>
            <div class="relative w-10 h-9">
              <div
                class="w-10 h-9 rounded-md border border-border/50 cursor-pointer"
                :style="{ backgroundColor: draft.color }"
              />
              <input
                type="color"
                :value="draft.color"
                class="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                @input="update('color', ($event.target as HTMLInputElement).value)"
              />
            </div>
          </div>
        </div>

        <!-- Type -->
        <div class="flex flex-col gap-1.5">
          <Label>{{ t('app.module.goals.form.type_label') }}</Label>
          <div class="flex gap-2">
            <button
              v-for="opt in [{ value: 'per_period', label: t('app.module.goals.type.per_period') }, { value: 'total', label: t('app.module.goals.type.total') }]"
              :key="opt.value"
              type="button"
              class="flex-1 py-2 px-3 text-xs rounded-lg border font-medium transition-all"
              :class="
                draft.type === opt.value
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-card text-muted-foreground border-border/50 hover:text-foreground'
              "
              @click="update('type', opt.value as 'per_period' | 'total')"
            >
              {{ opt.label }}
            </button>
          </div>
        </div>

        <!-- Period (only for per_period) -->
        <div v-if="draft.type === 'per_period'" class="flex flex-col gap-1.5">
          <Label>{{ t('app.module.goals.form.period_label') }}</Label>
          <div class="flex gap-2">
            <button
              v-for="p in ['daily', 'weekly', 'monthly'] as const"
              :key="p"
              type="button"
              class="flex-1 py-2 px-3 text-xs rounded-lg border font-medium transition-all"
              :class="
                draft.period === p
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-card text-muted-foreground border-border/50 hover:text-foreground'
              "
              @click="update('period', p)"
            >
              {{ t(`app.module.goals.period.${p}`) }}
            </button>
          </div>
        </div>

        <!-- Metric (duration vs count) -->
        <div class="flex flex-col gap-1.5">
          <Label>{{ t('app.module.goals.form.metric_label') }}</Label>
          <div class="flex gap-2">
            <button
              v-for="opt in [{ value: 'duration', label: t('app.module.goals.form.metric.duration') }, { value: 'count', label: t('app.module.goals.form.metric.count') }]"
              :key="opt.value"
              type="button"
              class="flex-1 py-2 px-3 text-xs rounded-lg border font-medium transition-all"
              :class="
                draft.metric === opt.value
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-card text-muted-foreground border-border/50 hover:text-foreground'
              "
              @click="update('metric', opt.value as 'duration' | 'count')"
            >
              {{ opt.label }}
            </button>
          </div>
        </div>

        <!-- Target: duration -->
        <div v-if="draft.metric === 'duration'" class="flex flex-col gap-1.5">
          <Label>{{ t('app.module.goals.form.target_label') }}</Label>
          <div class="flex gap-2 items-center">
            <div class="flex items-center gap-1.5">
              <Input
                type="number"
                min="0"
                max="23"
                class="w-20 text-center"
                :model-value="draft.target_hours"
                @update:model-value="update('target_hours', Math.max(0, parseInt(String($event)) || 0))"
              />
              <span class="text-sm text-muted-foreground">{{ t('app.module.goals.form.hours') }}</span>
            </div>
            <div class="flex items-center gap-1.5">
              <Input
                type="number"
                min="0"
                max="59"
                class="w-20 text-center"
                :model-value="draft.target_minutes"
                @update:model-value="update('target_minutes', Math.max(0, Math.min(59, parseInt(String($event)) || 0)))"
              />
              <span class="text-sm text-muted-foreground">{{ t('app.module.goals.form.minutes') }}</span>
            </div>
          </div>
        </div>

        <!-- Target: count -->
        <div v-else class="flex flex-col gap-1.5">
          <Label>{{ t('app.module.goals.form.target_count_label') }}</Label>
          <div class="flex items-center gap-2">
            <Input
              type="number"
              min="1"
              class="w-24 text-center"
              :model-value="draft.target_count"
              @update:model-value="update('target_count', Math.max(1, parseInt(String($event)) || 1))"
            />
            <span class="text-sm text-muted-foreground">{{ t('app.module.goals.form.activities') }}</span>
          </div>
        </div>

        <!-- Category -->
        <div class="flex flex-col gap-1.5">
          <Label>{{ t('app.module.goals.form.category_label') }}</Label>
          <Select
            :model-value="draft.category_id ?? '__all__'"
            @update:model-value="update('category_id', $event === '__all__' ? null : $event)"
          >
            <SelectTrigger>
              <SelectValue :placeholder="t('app.module.goals.form.category_all')" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">{{ t('app.module.goals.form.category_all') }}</SelectItem>
              <template v-if="privateCategories.length">
                <SelectItem v-for="cat in privateCategories" :key="cat.id" :value="cat.id">
                  <div class="flex items-center gap-2">
                    <span class="w-2 h-2 rounded-full flex-shrink-0" :style="{ backgroundColor: cat.color }" />
                    {{ resolveCategoryName(cat.name) }}
                  </div>
                </SelectItem>
              </template>
              <template v-if="publicCategories.length">
                <SelectItem v-for="cat in publicCategories" :key="cat.id" :value="cat.id">
                  <div class="flex items-center gap-2">
                    <span class="w-2 h-2 rounded-full flex-shrink-0" :style="{ backgroundColor: cat.color }" />
                    {{ resolveCategoryName(cat.name) }}
                  </div>
                </SelectItem>
              </template>
            </SelectContent>
          </Select>
        </div>

        <!-- Date range -->
        <div class="flex gap-3">
          <div class="flex-1 flex flex-col gap-1.5">
            <Label>{{ t('app.module.goals.form.started_at_label') }}</Label>
            <Input
              type="date"
              :model-value="draft.started_at"
              @update:model-value="update('started_at', String($event))"
            />
          </div>
          <div class="flex-1 flex flex-col gap-1.5">
            <Label>
              {{ t('app.module.goals.form.ended_at_label') }}
              <span class="text-muted-foreground/60 font-normal ml-1 text-2xs">{{ t('app.module.goals.form.optional') }}</span>
            </Label>
            <Input
              type="date"
              :model-value="draft.ended_at"
              :min="draft.started_at"
              :class="endedAtError ? 'border-destructive focus-visible:ring-destructive' : ''"
              @update:model-value="update('ended_at', String($event))"
            />
            <p v-if="endedAtError" class="text-xs text-destructive mt-1">{{ endedAtError }}</p>
          </div>
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" @click="emit('update:open', false)">{{ t('app.action.cancel') }}</Button>
        <Button :disabled="!isValid || loading" @click="emit('submit')">
          {{ loading ? t('app.module.goals.form.saving') : (isEditing ? t('app.action.save_changes') : t('app.module.goals.form.create_button')) }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
