<script setup lang="ts">
import { useLocale, useTranslation } from '@/composables';
import { Button } from '@/components/ui/button';
import Sheet from '@/components/ui/sheet/Sheet.vue';
import SheetContent from '@/components/ui/sheet/SheetContent.vue';
import SheetHeader from '@/components/ui/sheet/SheetHeader.vue';
import SheetTitle from '@/components/ui/sheet/SheetTitle.vue';
import Label from '@/components/ui/label/Label.vue';
import Textarea from '@/components/ui/textarea/Textarea.vue';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectGroup, SelectItem } from '@/components/ui/select';
import Input from '@/components/ui/input/Input.vue';
import type { TableRow as ITableRow } from '@/api/supabase';
import { computed, ref, watch } from 'vue';
import { arrayToString, splitAndTrim } from '@/utils/string';
import { formatDuration, formatActivityDateTime } from '@/utils/time';
import SheetClose from '@/components/ui/sheet/SheetClose.vue';
import SheetFooter from '@/components/ui/sheet/SheetFooter.vue';
import { storeToRefs } from 'pinia';
import { useCategoriesStore } from '@/stores';
import { cn } from '@/lib/utils';
import { Clock } from 'lucide-vue-next';

interface Props {
  activity: ITableRow<'activities'> | undefined;
  sheetMode: 'view' | 'edit';
  isSheetOpen: boolean;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  toggleOpen: [boolean];
  save: [string, string, string | undefined, string, string | undefined];
}>();

const { t } = useTranslation();
const { locale } = useLocale();
const categoriesStore = useCategoriesStore();
const { categories } = storeToRefs(categoriesStore);

const activityDescription = ref(props.activity?.description ?? '');
const activityTags = ref(arrayToString(props.activity?.tags));
const activityCategoryId = ref<string>(props.activity?.category_id ?? '');
const editStartedAt = ref('');
const editFinishedAt = ref('');
const timeError = ref('');

const isActive = computed(() => !props.activity?.finished_at);
const fallback = computed(() => t('app.status.in_progress'));
const formattedStartedAt = computed(() => formatActivityDateTime(props.activity?.started_at, locale.value, fallback.value));
const formattedFinishedAt = computed(() => formatActivityDateTime(props.activity?.finished_at ?? undefined, locale.value, fallback.value));
const formattedDuration = computed(() =>
  props.activity ? formatDuration(props.activity.started_at, props.activity.finished_at || null) : '',
);

const currentCategory = computed(() =>
  categories.value.find(c => c.id === (props.sheetMode === 'edit' ? activityCategoryId.value : props.activity?.category_id)) ?? null,
);

const currentTags = computed<string[]>(() => {
  if (props.sheetMode === 'view') return (props.activity?.tags as string[]) ?? [];
  return splitAndTrim(activityTags.value);
});

function toDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');

  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

const startMin = computed(() => {
  if (!props.activity?.started_at) {return '';}
  const d = new Date(props.activity.started_at);
  d.setDate(d.getDate() - 1);
  return toDatetimeLocal(d.toISOString());
});
const startMax = computed(() => {
  if (!props.activity?.started_at) {return '';}
  const d = new Date(props.activity.started_at);
  d.setDate(d.getDate() + 1);
  const cap = new Date();
  return toDatetimeLocal((d < cap ? d : cap).toISOString());
});
const endMin = computed(() => editStartedAt.value);
const endMax = computed(() => {
  if (!props.activity?.started_at) {return '';}
  const d = new Date(props.activity.started_at);
  d.setDate(d.getDate() + 1);
  const cap = new Date();
  return toDatetimeLocal((d < cap ? d : cap).toISOString());
});

watch(
  () => props.isSheetOpen,
  () => {
    if (props.isSheetOpen) {
      activityDescription.value = props.activity?.description ?? '';
      activityTags.value = arrayToString(props.activity?.tags);
      activityCategoryId.value = props.activity?.category_id ?? '';
      editStartedAt.value = props.activity?.started_at ? toDatetimeLocal(props.activity.started_at) : '';
      editFinishedAt.value = props.activity?.finished_at ? toDatetimeLocal(props.activity.finished_at) : '';
      timeError.value = '';
    }
  },
);

function handleSave() {
  timeError.value = '';
  if (editStartedAt.value && editFinishedAt.value) {
    const start = new Date(editStartedAt.value);
    const end = new Date(editFinishedAt.value);
    if (end <= start) {
      timeError.value = t('app.module.activities_history.edit.time_end_before_start');
      return;
    }
  }
  const startedAt = editStartedAt.value ? new Date(editStartedAt.value).toISOString() : props.activity!.started_at;
  const finishedAt = editFinishedAt.value ? new Date(editFinishedAt.value).toISOString() : props.activity!.finished_at ?? undefined;
  emit('save', activityDescription.value, activityTags.value, activityCategoryId.value || undefined, startedAt, finishedAt);
}
</script>

<template>
  <Sheet :open="isSheetOpen" @update:open="(open) => emit('toggleOpen', open)">
    <SheetContent class="flex flex-col w-full sm:max-w-lg p-0 overflow-hidden gap-0">
      <SheetHeader class="px-6 pt-6 pb-4 border-b border-border/40 flex-shrink-0">
        <div class="flex items-center gap-2 mb-3">
          <span
            :class="cn(
              'inline-block w-2 h-2 rounded-full ring-1 ring-border/40 flex-shrink-0',
              isActive ? 'bg-chart-3' : 'bg-success',
            )"
          />
          <SheetTitle class="text-base font-semibold">
            {{ sheetMode === 'edit'
              ? t('app.module.activities_history.details_sheet.edit_title')
              : t('app.module.activities_history.details_sheet.view_title') }}
          </SheetTitle>
        </div>
        <p
          v-if="sheetMode === 'view'"
          class="text-xl font-bold leading-snug text-foreground"
        >
          {{ activity?.description || t('app.module.calendar.no_description') }}
        </p>
        <div v-if="sheetMode === 'view' && activity" class="flex items-center gap-3 mt-2">
          <div class="flex items-center gap-1.5 text-sm font-semibold">
            <Clock class="w-3.5 h-3.5 text-muted-foreground" />
            <span>{{ formattedDuration }}</span>
          </div>
          <span class="text-muted-foreground/40">·</span>
          <span class="text-sm text-muted-foreground">
            {{ formattedStartedAt }} – {{ formattedFinishedAt }}
          </span>
        </div>
      </SheetHeader>
      <div v-if="activity" class="flex-1 overflow-y-auto">
        <template v-if="sheetMode === 'view'">
          <div class="px-6 py-4 border-b border-border/40 flex flex-col gap-4">
            <div>
              <p class="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-2">
                {{ t('app.module.activities_history.category.category') }}
              </p>
              <div v-if="currentCategory" class="flex items-center gap-2">
                <span
                  class="w-2.5 h-2.5 rounded-full flex-shrink-0 ring-1 ring-border/40"
                  :style="{ backgroundColor: currentCategory.color }"
                />
                <span class="text-sm font-medium">{{ currentCategory.name }}</span>
              </div>
              <p v-else class="text-sm text-muted-foreground">
                {{ t('app.module.activities_history.uncategorized') }}
              </p>
            </div>
            <div v-if="currentTags.length > 0">
              <p class="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-2">
                {{ t('app.module.activities_history.category.tags') }}
              </p>
              <div class="flex flex-wrap gap-1.5">
                <span
                  v-for="tag in currentTags"
                  :key="tag"
                  class="text-xs bg-muted text-muted-foreground px-2 py-1 rounded-full"
                >
                  {{ tag }}
                </span>
              </div>
            </div>
          </div>
          <div class="px-6 py-4 flex flex-col gap-3">
            <p class="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
              {{ t('app.module.activities_history.category.duration') }}
            </p>
            <div class="grid grid-cols-2 gap-3">
              <div class="bg-muted/50 rounded-xl p-3">
                <p class="text-[10px] text-muted-foreground mb-1">
                  {{ t('app.module.activities_history.category.started_at') }}
                </p>
                <p class="text-sm font-medium">{{ formattedStartedAt }}</p>
              </div>
              <div class="bg-muted/50 rounded-xl p-3">
                <p class="text-[10px] text-muted-foreground mb-1">
                  {{ t('app.module.activities_history.category.finished_at') }}
                </p>
                <p class="text-sm font-medium" :class="isActive ? 'text-chart-3' : ''">
                  {{ formattedFinishedAt }}
                </p>
              </div>
            </div>
          </div>
        </template>
        <template v-else>
          <div class="px-6 py-5 flex flex-col gap-5">
            <div class="flex flex-col gap-1.5">
              <Label class="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {{ t('app.module.activities_history.category.description') }}
              </Label>
              <Textarea
                v-model="activityDescription"
                class="min-h-[100px] resize-none"
              />
            </div>
            <div class="flex flex-col gap-1.5">
              <Label class="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {{ t('app.module.activities_history.category.category') }}
              </Label>
              <Select v-model="activityCategoryId">
                <SelectTrigger class="w-full">
                  <SelectValue :placeholder="t('app.module.activities_history.uncategorized')" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem
                      v-for="cat in categories"
                      :key="cat.id"
                      :value="cat.id"
                    >
                      <div class="flex items-center gap-2">
                        <span
                          class="w-2.5 h-2.5 rounded-full flex-shrink-0 ring-1 ring-border/40"
                          :style="{ backgroundColor: cat.color }"
                        />
                        {{ cat.name }}
                      </div>
                    </SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            <div class="flex flex-col gap-1.5">
              <Label class="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {{ t('app.module.activities_history.category.tags') }}
              </Label>
              <Input
                v-model="activityTags"
                placeholder="tag1, tag2, tag3"
              />
              <p class="text-xs text-muted-foreground">
                {{ t('app.module.overview.activity_tracker.tags_hint') }}
              </p>
            </div>
            <div class="flex flex-col gap-2">
              <p class="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                {{ t('app.module.activities_history.category.duration') }}
              </p>
              <p class="text-xs text-muted-foreground -mt-1">
                {{ t('app.module.activities_history.edit.time_hint') }}
              </p>
              <div class="grid grid-cols-2 gap-3">
                <div class="flex flex-col gap-1.5">
                  <Label class="text-[10px] text-muted-foreground">
                    {{ t('app.module.activities_history.category.started_at') }}
                  </Label>
                  <input
                    v-model="editStartedAt"
                    type="datetime-local"
                    :min="startMin"
                    :max="startMax"
                    class="bg-background border border-border/60 rounded-md px-2.5 py-1.5 text-sm text-foreground outline-none focus:ring-1 focus:ring-ring w-full"
                  />
                </div>
                <div class="flex flex-col gap-1.5">
                  <Label class="text-[10px] text-muted-foreground">
                    {{ t('app.module.activities_history.category.finished_at') }}
                  </Label>
                  <input
                    v-if="!isActive"
                    v-model="editFinishedAt"
                    type="datetime-local"
                    :min="endMin"
                    :max="endMax"
                    class="bg-background border border-border/60 rounded-md px-2.5 py-1.5 text-sm text-foreground outline-none focus:ring-1 focus:ring-ring w-full"
                  />
                  <div v-else class="bg-muted/50 rounded-md px-2.5 py-1.5 text-sm text-chart-3 font-medium">
                    {{ t('app.status.in_progress') }}
                  </div>
                </div>
              </div>
              <p v-if="timeError" class="text-xs text-destructive">{{ timeError }}</p>
            </div>
          </div>
        </template>
      </div>
      <SheetFooter class="px-6 py-4 border-t border-border/40 flex-shrink-0">
        <SheetClose as-child>
          <Button variant="outline">{{ t('app.action.cancel') }}</Button>
        </SheetClose>
        <Button
          v-if="sheetMode === 'edit'"
          @click="handleSave"
          type="submit"
        >
          {{ t('app.action.save_changes') }}
        </Button>
      </SheetFooter>
    </SheetContent>
  </Sheet>
</template>
