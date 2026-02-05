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
const activityDescription = ref<string>('');
const activityTags = ref<string>('');
const activityCategoryId = ref<string | undefined>();

const formattedStartedAt = computed(() => formatDateTime(props.activity?.started_at || null));
const formattedFinishedAt = computed(() => formatDateTime(props.activity?.finished_at || null));
const formattedDuration = computed(() =>
  formatDuration(props.activity?.started_at, props.activity?.finished_at || null),
);

function formatDateTime(dateString: string | null): string {
  if (!dateString) {
    return t('activitiesTable.inProgress');
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
    <SheetContent class="flex flex-col">
      <SheetHeader>
        <SheetTitle>
          {{ sheetMode === 'edit' ? t('activitySheet.editTitle') : t('activitySheet.viewTitle') }}
        </SheetTitle>
        <SheetDescription>
          {{ sheetMode === 'edit' ? t('activitySheet.editDescription') : t('activitySheet.viewDescription') }}
        </SheetDescription>
      </SheetHeader>

      <div v-if="activity" class="grid flex-1 auto-rows-min gap-6 px-4">
        <div class="grid grid-cols-4 items-start gap-4">
          <Label class="text-right mt-2">
            {{ t('activitiesTable.description') }}
          </Label>
          <Textarea class="col-span-3 min-h-[80px]" :disabled="sheetMode === 'view'" v-model="activityDescription" />
        </div>

        <div class="grid grid-cols-4 items-start gap-4">
          <Label class="text-right mt-2">{{ t('activitiesTable.tags') }}</Label>
          <div class="col-span-3">
            <Textarea
              placeholder="tag1, tag2, tag3"
              class="min-h-[80px]"
              :disabled="sheetMode === 'view'"
              v-model="activityTags"
            />
            <p class="text-xs text-muted-foreground mt-1" v-if="sheetMode === 'edit'">
              {{ t('activityTracker.tagsHint') }}
            </p>
          </div>
        </div>

        <div class="grid grid-cols-4 items-center gap-4">
          <Label class="text-right">{{ t('activitiesTable.category') }}</Label>
          <Input
            :placeholder="t('activitiesTable.uncategorized')"
            :disabled="sheetMode === 'view'"
            v-model="activityCategoryId"
            class="col-span-3"
          />
        </div>

        <div class="grid grid-cols-4 items-center gap-4">
          <Label class="text-right">{{ t('activitiesTable.startedAt') }}</Label>
          <Input v-model="formattedStartedAt" class="col-span-3" disabled />
        </div>

        <div class="grid grid-cols-4 items-center gap-4">
          <Label class="text-right">{{ t('activitiesTable.finishedAt') }}</Label>
          <Input v-model="formattedFinishedAt" class="col-span-3" disabled />
        </div>

        <div class="grid grid-cols-4 items-center gap-4">
          <Label class="text-right">{{ t('activitiesTable.duration') }}</Label>
          <Input v-model="formattedDuration" class="col-span-3" disabled />
        </div>
      </div>

      <SheetFooter class="mt-4">
        <SheetClose as-child>
          <Button variant="outline">{{ t('activitySheet.cancel') }}</Button>
        </SheetClose>

        <Button
          v-if="sheetMode === 'edit'"
          @click="() => emit('save', activityDescription, activityTags, activityCategoryId)"
          type="submit"
        >
          {{ t('activitySheet.saveChanges') }}
        </Button>
      </SheetFooter>
    </SheetContent>
  </Sheet>
</template>
