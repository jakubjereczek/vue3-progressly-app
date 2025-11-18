<script setup lang="ts">
import { computed } from 'vue';
import { FormField, FormLabel, FormControl, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectGroup, SelectItem } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useTranslation } from '@/composables';

export type TimerState = 'playing' | 'ready' | 'loading' | 'disabled';

interface Props {
  description: string;
  category: string;
  tagsInput: string;
  elapsedSeconds: number;
  state: TimerState;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'update:description', value: string): void;
  (e: 'update:category', value: string): void;
  (e: 'update:tagsInput', value: string): void;
  (e: 'submitForm'): void;
}>();

const { t } = useTranslation();

const localDescription = computed({
  get: () => props.description,
  set: (value) => emit('update:description', value),
});

const localCategory = computed({
  get: () => props.category,
  set: (value) => emit('update:category', value),
});

const localTagsInput = computed({
  get: () => props.tagsInput,
  set: (value) => emit('update:tagsInput', value),
});

const isDisabled = computed(() => props.state === 'playing' || props.state === 'loading');

function handleSubmit() {
  emit('submitForm');
}
</script>

<template>
  <form @submit.prevent="handleSubmit" class="space-y-5" id="activityForm">
    <FormField name="activityDescription">
      <FormLabel>{{ t('activityTracker.descriptionLabel') }}</FormLabel>
      <FormControl>
        <Textarea
          v-model="localDescription"
          :placeholder="t('activityTracker.startPlaceholder')"
          rows="4"
          :disabled="isDisabled"
        />
      </FormControl>
      <FormDescription>{{ t('activityTracker.descriptionHint') }}</FormDescription>
    </FormField>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <FormField name="activityCategory">
        <FormLabel>{{ t('activityTracker.categoryLabel') }}</FormLabel>
        <FormControl>
          <Select v-model="localCategory" :disabled="isDisabled">
            <SelectTrigger class="w-full">
              <SelectValue :placeholder="t('activityTracker.categoryPlaceholder')" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="Praca">{{ t('activityTracker.categoryWork') }}</SelectItem>
                <SelectItem value="Nauka">{{ t('activityTracker.categoryStudy') }}</SelectItem>
                <SelectItem value="Ćwiczenia">{{ t('activityTracker.categoryExercise') }}</SelectItem>
                <SelectItem value="Inne">{{ t('activityTracker.categoryOther') }}</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </FormControl>
      </FormField>

      <FormField name="activityTags">
        <FormLabel>{{ t('activityTracker.tagsLabel') }}</FormLabel>
        <FormControl>
          <Input 
            v-model="localTagsInput" 
            :placeholder="t('activityTracker.tagsLabel')" 
            :disabled="isDisabled" 
          />
        </FormControl>
        <FormDescription class="col-span-2">{{ t('activityTracker.tagsHint') }}</FormDescription>
      </FormField>
    </div>
  </form>
</template>