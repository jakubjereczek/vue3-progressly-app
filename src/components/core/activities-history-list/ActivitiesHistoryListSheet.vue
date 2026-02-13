<script setup lang="ts">
import { useLocale, useTranslation } from '@/composables';
import { Button } from '@/components/ui/button';
import Sheet from '@/components/ui/sheet/Sheet.vue';
import SheetContent from '@/components/ui/sheet/SheetContent.vue';
import SheetHeader from '@/components/ui/sheet/SheetHeader.vue';
import SheetTitle from '@/components/ui/sheet/SheetTitle.vue';
import SheetDescription from '@/components/ui/sheet/SheetDescription.vue';
import Label from '@/components/ui/label/Label.vue';
import Textarea from '@/components/ui/textarea/Textarea.vue';
import Input from '@/components/ui/input/Input.vue';
import type { TableRow as ITableRow } from '@/api/supabase';
import { computed, ref, watch } from 'vue';
import { arrayToString } from '@/utils/string';
import { formatDuration } from '@/utils/time';
import SheetClose from '@/components/ui/sheet/SheetClose.vue';
import SheetFooter from '@/components/ui/sheet/SheetFooter.vue';

interface Props {
  activity: ITableRow<'activities'> | undefined;
  sheetMode: 'view' | 'edit';
  isSheetOpen: boolean;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  toggleOpen: [boolean];
  save: [string, string, string | undefined];
}>();

const { t } = useTranslation();
const { locale } = useLocale();
const activityDescription = ref(props.activity?.description ?? '');
const activityTags = ref(arrayToString(props.activity?.tags));
const activityCategoryId = ref(props.activity?.category_id ?? undefined);

const formattedStartedAt = computed(() => formatDateTime(props.activity?.started_at));
const formattedFinishedAt = computed(() => formatDateTime(props.activity?.finished_at ?? undefined));
const formattedDuration = computed(() =>
  props.activity ? formatDuration(props.activity?.started_at, props.activity?.finished_at || null) : '',
);

function formatDateTime(dateString: string | undefined): string {
  if (!dateString) {
    return t('app.status.in_progress');
  }
  return new Date(dateString).toLocaleString(locale.value, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

watch(
  () => props.isSheetOpen,
  () => {
    if (props.isSheetOpen) {
      activityDescription.value = props.activity?.description ?? '';
      activityTags.value = arrayToString(props.activity?.tags);
      activityCategoryId.value = props.activity?.category_id ?? undefined;
    }
  },
);

</script>

<template>
  <Sheet :open="isSheetOpen" @update:open="(open) => emit('toggleOpen', open)">
    <SheetContent class="flex flex-col w-full sm:max-w-lg overflow-y-auto">
      <SheetHeader>
        <SheetTitle>
          {{ sheetMode === 'edit' ? t('app.module.activities_history.details_sheet.edit_title') : t('app.module.activities_history.details_sheet.view_title') }}
        </SheetTitle>
        <SheetDescription>
          {{ sheetMode === 'edit' ? t('app.module.activities_history.details_sheet.edit_description') : t('app.module.activities_history.details_sheet.view_description') }}
        </SheetDescription>
      </SheetHeader>
      <div v-if="activity" class="flex-1 flex flex-col gap-6 p-4">
        <div class="grid grid-cols-1 sm:grid-cols-4 items-start gap-2 sm:gap-4">
          <Label class="sm:text-right sm:mt-2 text-sm font-semibold">
            {{ t('app.module.activities_history.category.description') }}
          </Label>
          <Textarea class="sm:col-span-3 min-h-[80px]" :disabled="sheetMode === 'view'" v-model="activityDescription" />
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-4 items-start gap-2 sm:gap-4">
          <Label class="sm:text-right sm:mt-2 text-sm font-semibold">
            {{ t('app.module.activities_history.category.tags') }}
          </Label>
          <div class="sm:col-span-3">
            <Textarea
              placeholder="tag1, tag2, tag3"
              class="min-h-[80px] w-full"
              :disabled="sheetMode === 'view'"
              v-model="activityTags"
            />
            <p class="text-xs text-muted-foreground mt-1" v-if="sheetMode === 'edit'">
              {{ t('app.module.overview.activity_tracker.tags_hint') }}
            </p>
          </div>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
          <Label class="sm:text-right text-sm font-semibold">{{ t('app.module.activities_history.category.category') }}</Label>
          <Input
            :placeholder="t('app.module.activities_history.uncategorized')"
            :disabled="sheetMode === 'view'"
            v-model="activityCategoryId"
            class="sm:col-span-3"
          />
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
          <Label class="sm:text-right text-sm font-semibold">{{ t('app.module.activities_history.category.started_at') }}</Label>
          <Input v-model="formattedStartedAt" class="sm:col-span-3" disabled />
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
          <Label class="sm:text-right text-sm font-semibold">{{ t('app.module.activities_history.category.finished_at') }}</Label>
          <Input v-model="formattedFinishedAt" class="sm:col-span-3" disabled />
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
          <Label class="sm:text-right text-sm font-semibold">{{ t('app.module.activities_history.category.duration') }}</Label>
          <Input v-model="formattedDuration" class="sm:col-span-3" disabled />
        </div>
      </div>
      <SheetFooter class="mt-4">
        <SheetClose as-child>
          <Button variant="outline">{{ t('app.action.cancel') }}</Button>
        </SheetClose>
        <Button
          v-if="sheetMode === 'edit'"
          @click="() => emit('save', activityDescription, activityTags, activityCategoryId)"
          type="submit"
        >
          {{ t('app.action.save_changes') }}
        </Button>
      </SheetFooter>
    </SheetContent>
  </Sheet>
</template>
