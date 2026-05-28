<script setup lang="ts">
import { computed } from 'vue';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectGroup, SelectItem } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useTranslation, useCategoryName } from '@/composables';
import type { TableRow } from '@/api/supabase';

export type TimerState = 'playing' | 'ready' | 'loading' | 'disabled';

interface Props {
  description: string;
  category: string;
  tagsInput: string;
  elapsedSeconds: number;
  state: TimerState;
  categories: TableRow<'categories'>[];
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'update:description', value: string): void;
  (e: 'update:category', value: string): void;
  (e: 'update:tagsInput', value: string): void;
  (e: 'submitForm'): void;
}>();

const { t } = useTranslation();
const { resolveCategoryName } = useCategoryName();

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
</script>

<template>
  <form @submit.prevent="$emit('submitForm')" class="flex flex-col flex-1 min-h-0 gap-3" id="activityForm">
    <div class="relative flex flex-col">
      <Textarea
        v-model="localDescription"
        :placeholder="t('app.module.overview.activity_tracker.start_placeholder')"
        :disabled="isDisabled"
        maxlength="500"
        class="min-h-[100px] max-h-[160px] resize-none text-base placeholder:text-muted-foreground/40 border-border/60 focus-visible:ring-primary/20 leading-relaxed pb-6"
      />
      <span
        class="absolute bottom-2 right-2.5 text-2xs tabular-nums pointer-events-none select-none leading-none transition-colors duration-150"
        :class="localDescription.length >= 450 ? 'text-warning' : 'text-muted-foreground/35'"
      >
        {{ localDescription.length }}/500
      </span>
    </div>
    <div class="flex gap-3 flex-shrink-0">
      <Select v-model="localCategory" :disabled="isDisabled">
        <SelectTrigger class="flex-1 min-w-0">
          <SelectValue :placeholder="t('app.module.overview.activity_tracker.category_placeholder')" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectItem v-for="cat in categories" :key="cat.id" :value="cat.id">
              <div class="flex items-center gap-2">
                <span class="w-2.5 h-2.5 rounded-full flex-shrink-0" :style="{ backgroundColor: cat.color }" />
                {{ resolveCategoryName(cat.name) }}
              </div>
            </SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>

      <Input
        v-model="localTagsInput"
        :placeholder="t('app.module.overview.activity_tracker.tags_placeholder')"
        :disabled="isDisabled"
        class="flex-1 min-w-0"
      />
    </div>
  </form>
</template>
