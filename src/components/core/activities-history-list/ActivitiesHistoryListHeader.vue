<script setup lang="ts">
import { useLocale, useTranslation } from '@/composables';
import { ChevronLeft, ChevronRight, ChevronDown } from 'lucide-vue-next';
import { Button } from '@/components/ui/button';
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
}

defineProps<Props>();

const emit = defineEmits<{
  toggle: [string];
  changeMonth: ['prev' | 'next']
}>();

const { t } = useTranslation();
const { locale} = useLocale();

function formatMonthDisplay(dateString: string): string {
  const parts = dateString.split('-');
  const year = parts[0];
  const month = parts[1];
  const date = new Date(parseInt(year!), parseInt(month!) - 1, 1);

  return date.toLocaleDateString(locale.value, { year: 'numeric', month: 'long' });
}

</script>

<template>
  <div class="flex flex-wrap items-start justify-between gap-4">
    <h2 class="text-xl font-semibold">{{ t('activitiesTable.activityHistory') }}</h2>
    <div class="flex items-center space-x-4">
      <DropdownMenu>
        <DropdownMenuTrigger as-child>
          <Button variant="outline" class="ml-auto">
            {{ t('activitiesTable.columns') }} <ChevronDown class="w-4 h-4 ml-2" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>{{ t('activitiesTable.toggleColumns') }}</DropdownMenuLabel>
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
              {{ column.label }} ({{ t('activitiesTable.alwaysVisible') }})
            </DropdownMenuLabel>
          </template>
        </DropdownMenuContent>
      </DropdownMenu>
      <div class="flex items-center space-x-2">
        <Button variant="outline" size="icon" @click="emit('changeMonth', 'prev')">
          <ChevronLeft class="w-5 h-5" />
        </Button>
        <span class="text-sm font-medium text-center">
          {{ formatMonthDisplay(currentMonth) }}
        </span>
        <Button variant="outline" size="icon" @click="emit('changeMonth', 'next')">
          <ChevronRight class="w-5 h-5" />
        </Button>
      </div>
    </div>
  </div>
</template>
