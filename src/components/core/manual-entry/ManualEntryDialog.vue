<script setup lang="ts">
import { ref, computed } from 'vue';
import { storeToRefs } from 'pinia';
import { toast } from 'vue-sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectGroup, SelectItem } from '@/components/ui/select';
import { useTranslation } from '@/composables';
import { useActivitiesStore, useCategoriesStore } from '@/stores';
import { splitAndTrim } from '@/utils/string';
import Input from '@/components/ui/input/Input.vue';
import Textarea from '@/components/ui/textarea/Textarea.vue';
import Label from '@/components/ui/label/Label.vue';

interface Props {
  open: boolean;
}

defineProps<Props>();
const emit = defineEmits<{ 'update:open': [boolean] }>();

const { t } = useTranslation();
const activitiesStore = useActivitiesStore();
const { actionLoading } = storeToRefs(activitiesStore);
const { categories } = storeToRefs(useCategoriesStore());

const todayDate = new Date().toISOString().split('T')[0]!;
const nowTime = new Date().toTimeString().slice(0, 5);
const oneHourAgoTime = (() => {
  const d = new Date();
  d.setHours(d.getHours() - 1);
  return d.toTimeString().slice(0, 5);
})();

const description = ref('');
const category = ref('');
const tagsInput = ref('');
const date = ref(todayDate);
const startTime = ref(oneHourAgoTime);
const endTime = ref(nowTime);

const timeError = computed(() => {
  if (!startTime.value || !endTime.value || !date.value) {return false;}
  const start = new Date(`${date.value}T${startTime.value}`);
  const end = new Date(`${date.value}T${endTime.value}`);
  return end <= start;
});

const isValid = computed(
  () => description.value.trim().length > 0 && !timeError.value && !!startTime.value && !!endTime.value,
);

function reset() {
  description.value = '';
  category.value = '';
  tagsInput.value = '';
  date.value = todayDate;
  startTime.value = oneHourAgoTime;
  endTime.value = nowTime;
}

async function handleSubmit() {
  if (!isValid.value) return;
  const startedAt = new Date(`${date.value}T${startTime.value}`).toISOString();
  const finishedAt = new Date(`${date.value}T${endTime.value}`).toISOString();
  const { success } = await activitiesStore.insertManualActivity({
    description: description.value.trim(),
    category_id: category.value || null,
    tags: splitAndTrim(tagsInput.value),
    started_at: startedAt,
    finished_at: finishedAt,
  });
  if (success) {
    toast.success(t('app.toast_notification.activity.created_success'));
    emit('update:open', false);
    reset();
  } else {
    toast.error(t('app.toast_notification.activity.create_error'));
  }
}

function handleOpenChange(open: boolean) {
  if (!open) reset();
  emit('update:open', open);
}
</script>

<template>
  <Dialog :open="open" @update:open="handleOpenChange">
    <DialogContent class="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>{{ t('app.module.manual_entry.title') }}</DialogTitle>
        <DialogDescription>{{ t('app.module.manual_entry.description') }}</DialogDescription>
      </DialogHeader>
      <div class="flex flex-col gap-4 py-2">
        <div class="flex flex-col gap-1.5">
          <Label>{{ t('app.module.manual_entry.description_label') }}</Label>
          <Textarea
            v-model="description"
            :placeholder="t('app.module.manual_entry.description_placeholder')"
            rows="3"
          />
        </div>
        <div class="grid grid-cols-3 gap-3">
          <div class="flex flex-col gap-1.5">
            <Label>{{ t('app.module.manual_entry.date_label') }}</Label>
            <Input v-model="date" type="date" :max="todayDate" />
          </div>
          <div class="flex flex-col gap-1.5">
            <Label>{{ t('app.module.manual_entry.start_time_label') }}</Label>
            <Input v-model="startTime" type="time" />
          </div>
          <div class="flex flex-col gap-1.5">
            <Label>{{ t('app.module.manual_entry.end_time_label') }}</Label>
            <Input v-model="endTime" type="time" :class="timeError ? 'border-destructive' : ''" />
          </div>
        </div>
        <p v-if="timeError" class="text-xs text-destructive -mt-2">
          {{ t('app.module.manual_entry.time_error') }}
        </p>
        <div class="grid grid-cols-2 gap-3">
          <div class="flex flex-col gap-1.5">
            <Label>{{ t('app.module.manual_entry.category_label') }}</Label>
            <Select v-model="category">
              <SelectTrigger class="w-full">
                <SelectValue :placeholder="t('app.module.manual_entry.category_placeholder')" />
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
            <Label>{{ t('app.module.manual_entry.tags_label') }}</Label>
            <Input
              v-model="tagsInput"
              :placeholder="t('app.module.manual_entry.tags_placeholder')"
            />
          </div>
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" @click="handleOpenChange(false)">
          {{ t('app.action.cancel') }}
        </Button>
        <Button :disabled="!isValid || actionLoading" @click="handleSubmit">
          {{ actionLoading ? t('app.module.manual_entry.saving') : t('app.module.manual_entry.save') }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
