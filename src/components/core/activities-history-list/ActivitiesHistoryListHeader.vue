<script setup lang="ts">
import { useLocale, useTranslation } from '@/composables';
import { ChevronLeft, ChevronRight, ChevronDown, Search, X } from 'lucide-vue-next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu';
import type { Column } from './config';

interface Props {
  currentMonth: string;
  columns: Column[];
  columnVisibility: Record<string, boolean>;
  searchQuery: string;
}

defineProps<Props>();

const emit = defineEmits<{
  toggle: [string];
  changeMonth: ['prev' | 'next'];
  'update:searchQuery': [string];
}>();

const { t } = useTranslation();
const { locale } = useLocale();

function formatMonthDisplay(dateString: string): string {
  const parts = dateString.split('-');
  const year = parts[0];
  const month = parts[1];
  const date = new Date(parseInt(year!), parseInt(month!) - 1, 1);
  return date.toLocaleDateString(locale.value, { year: 'numeric', month: 'long' });
}
</script>

<template>
  <div class="flex flex-col gap-3">
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <p class="text-sm font-medium text-muted-foreground">{{ t('app.module.activities_history.title') }}</p>
        <p class="text-xs text-muted-foreground/60 mt-0.5">{{ t('app.module.activities_history.description') }}</p>
      </div>
      <div class="flex items-center gap-4">
        <DropdownMenu>
          <DropdownMenuTrigger as-child>
            <Button variant="outline" class="gap-2">
              {{ t('app.module.activities_history.columns') }} <ChevronDown class="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>{{ t('app.module.activities_history.toggle_columns') }}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <template v-for="column in columns" :key="column.id">
              <DropdownMenuCheckboxItem
                v-if="column.isToggleable"
                :modelValue="columnVisibility[column.id]"
                @select="emit('toggle', column.id)"
                class="capitalize"
              >
                {{ column.label }}
              </DropdownMenuCheckboxItem>
              <DropdownMenuLabel v-else disabled class="capitalize opacity-60 cursor-default">
                {{ column.label }} ({{ t('app.module.activities_history.always_visible') }})
              </DropdownMenuLabel>
            </template>
          </DropdownMenuContent>
        </DropdownMenu>
        <div class="flex items-center gap-2">
          <Button variant="outline" size="icon" @click="emit('changeMonth', 'prev')" :aria-label="t('app.action.prev_month')">
            <ChevronLeft class="w-5 h-5" />
          </Button>
          <span class="text-sm font-medium text-center min-w-[120px] text-center">
            {{ formatMonthDisplay(currentMonth) }}
          </span>
          <Button variant="outline" size="icon" @click="emit('changeMonth', 'next')" :aria-label="t('app.action.next_month')">
            <ChevronRight class="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>

    <div class="relative">
      <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50 pointer-events-none" />
      <Input
        :model-value="searchQuery"
        :placeholder="t('app.module.activities_history.search_placeholder')"
        class="pl-8 h-8 text-sm"
        :class="searchQuery ? 'pr-8' : ''"
        @update:model-value="emit('update:searchQuery', $event as string)"
      />
      <button
        v-if="searchQuery"
        class="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-muted text-muted-foreground/50 hover:text-foreground transition-colors duration-150"
        :aria-label="t('app.module.activities_history.search_clear')"
        @click="emit('update:searchQuery', '')"
      >
        <X class="w-3.5 h-3.5" />
      </button>
    </div>
  </div>
</template>
