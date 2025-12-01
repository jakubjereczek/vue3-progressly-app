<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { Card } from '@/components/ui/card';
import { useActivitiesStore } from '@/stores';
import { useTranslation } from '@/composables';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  CheckCircle,
  Hourglass,
  Loader2,
  Tag,
  Box,
  Clock3,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  ChevronDown,
} from 'lucide-vue-next';
import type { TableRow as ActivityType } from '@/api/supabase';
import { storeToRefs } from 'pinia';
import { formatDuration } from '@/utils/time';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu';

// todo: do not load all user activities, load data only per month
// todo: add categories support
// todo: add action support (view, delete, edit)

const { t } = useTranslation();
const activitiesStore = useActivitiesStore();
const { loading, activities } = storeToRefs(activitiesStore);

const currentMonth = ref(new Date().toISOString().substring(0, 7)); // YYYY-MM

const columnDefinitions = [
  { id: 'status', label: t('activitiesTable.status'), visible: true, class: 'w-[120px]', isToggleable: false },
  { id: 'description', label: t('activitiesTable.description'), visible: true, class: '', isToggleable: false },
  { id: 'category', label: t('activitiesTable.category'), visible: true, class: 'w-[150px]', isToggleable: true },
  { id: 'tags', label: t('activitiesTable.tags'), visible: true, class: 'w-[180px]', isToggleable: true },
  { id: 'duration', label: t('activitiesTable.duration'), visible: true, class: 'w-[120px]', isToggleable: false },
  {
    id: 'startedAt',
    label: t('activitiesTable.startedAt'),
    visible: true,
    class: 'w-[180px] text-right',
    isToggleable: true,
  },
  {
    id: 'finishedAt',
    label: t('activitiesTable.finishedAt'),
    visible: true,
    class: 'w-[180px] text-right',
    isToggleable: true,
  },

  {
    id: 'actions',
    label: t('activitiesTable.actions'),
    visible: true,
    class: 'w-[50px] text-right',
    isToggleable: false,
  },
];

const columnVisibility = ref(
  columnDefinitions.reduce(
    (acc, col) => {
      acc[col.id] = col.visible;
      return acc;
    },
    {} as Record<string, boolean>,
  ),
);

function toggleColumnVisibility(id: string) {
  columnVisibility.value = {
    ...columnVisibility.value,
    [id]: !columnVisibility.value[id],
  };
}

const visibleColumns = computed(() => {
  return columnDefinitions.filter((col) => columnVisibility.value[col.id]);
});

function formatMonthDisplay(dateString: string): string {
  const parts = dateString.split('-');
  const year = parts[0];
  const month = parts[1];
  const date = new Date(parseInt(year), parseInt(month) - 1, 1);
  return date.toLocaleDateString('pl-PL', { year: 'numeric', month: 'long' });
}

function changeMonth(direction: 'prev' | 'next') {
  const parts = currentMonth.value.split('-');
  const year = Number(parts[0]);
  const month = Number(parts[1]);
  const date = new Date(year, month - 1, 1);

  if (direction === 'prev') {
    date.setMonth(date.getMonth() - 1);
  } else {
    date.setMonth(date.getMonth() + 1);
  }

  currentMonth.value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function formatDateTime(dateString: string | null): string {
  if (!dateString) {
    return t('activitiesTable.inProgress');
  }
  return new Date(dateString).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

const filteredActivities = computed(() => {
  const activitiesList = (activities.value || []) as ActivityType<'activities'>[];
  const filterMonth = currentMonth.value;

  const filtered = activitiesList.filter((activity: ActivityType<'activities'>) => {
    return activity.started_at && activity.started_at.startsWith(filterMonth);
  });

  return filtered;
});

const sortedActivities = computed(() => {
  return filteredActivities.value
    .slice()
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
});

function handleActivityAction(activityId: string, action: 'delete' | 'edit' | 'view') {
  // todo: handle activity action
}

onMounted(async () => {
  await activitiesStore.getActivities();
});
</script>

<template>
  <Card class="p-8 flex flex-col gap-10 rounded-2xl border border-border/40 h-full">
    <div class="w-full">
      <div class="flex justify-between mb-4 flex-wrap gap-4">
        <h2 class="text-xl font-semibold">
          {{ t('activitiesTable.activityHistory') }}
        </h2>

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

              <template v-for="column in columnDefinitions" :key="column.id">
                <DropdownMenuCheckboxItem
                  v-if="column.isToggleable"
                  :key="column.id"
                  :modelValue="columnVisibility[column.id]"
                  @select="toggleColumnVisibility(column.id)"
                  class="capitalize"
                >
                  {{ column.label }}
                </DropdownMenuCheckboxItem>

                <DropdownMenuItem v-else disabled class="capitalize opacity-60 cursor-default">
                  {{ column.label }}
                </DropdownMenuItem>
              </template>
            </DropdownMenuContent>
          </DropdownMenu>

          <div class="flex items-center space-x-2">
            <Button variant="outline" size="icon" @click="changeMonth('prev')">
              <ChevronLeft class="w-5 h-5" />
            </Button>

            <span class="text-lg font-semibold w-36 text-center text-gray-800">
              {{ formatMonthDisplay(currentMonth) }}
            </span>

            <Button variant="outline" size="icon" @click="changeMonth('next')">
              <ChevronRight class="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>

      <div v-if="loading" class="flex justify-center items-center h-40">
        <Loader2 class="w-8 h-8 animate-spin text-primary" />
      </div>
      <div
        v-else-if="sortedActivities.length === 0"
        class="text-center py-12 text-gray-500 bg-gray-50 rounded-lg border border-dashed"
      >
        <Box class="w-10 h-10 mx-auto mb-3 text-gray-400" />
        <p class="text-lg font-medium">
          {{ t('activitiesTable.noActivitiesFoundForMonth') }}
        </p>
      </div>

      <div v-else class="border rounded-xl">
        <Table>
          <TableHeader class="bg-gray-50 sticky top-0 z-10 shadow-sm">
            <TableRow>
              <template v-for="column in visibleColumns" :key="column.id">
                <TableHead :class="[column.class, 'font-semibold text-gray-700']">
                  {{ column.label }}
                </TableHead>
              </template>
            </TableRow>
          </TableHeader>

          <TableBody>
            <TableRow
              v-for="activity in sortedActivities"
              :key="activity.id"
              class="hover:bg-blue-50/50 transition-colors"
            >
              <template v-for="column in visibleColumns" :key="column.id">
                <TableCell v-if="column.id === 'status'">
                  <Badge
                    :variant="activity.finished_at ? 'success' : 'info'"
                    class="text-xs py-1 px-2 flex items-center justify-center gap-1"
                  >
                    <template v-if="activity.finished_at">
                      <CheckCircle class="w-3 h-3" />
                      {{ t('activitiesTable.finished') }}
                    </template>
                    <template v-else>
                      <Hourglass class="w-3 h-3 animate-pulse" />
                      {{ t('activitiesTable.inProgress') }}
                    </template>
                  </Badge>
                </TableCell>

                <TableCell
                  v-else-if="column.id === 'description'"
                  class="text-sm text-gray-700 max-w-[200px] truncate"
                  :title="activity.description || t('activitiesTable.noDescription')"
                >
                  {{ activity.description || t('activitiesTable.noDescription') }}
                </TableCell>

                <TableCell v-else-if="column.id === 'category'">
                  <Badge
                    v-if="activity.category_id"
                    variant="outline"
                    class="text-xs text-gray-600 bg-gray-100 hover:bg-gray-200 cursor-default"
                  >
                    <Tag class="w-3 h-3 mr-1" />
                    {{ t('activitiesTable.categoryName') }}
                  </Badge>
                  <span v-else class="italic text-gray-400">{{ t('activitiesTable.uncategorized') }}</span>
                </TableCell>

                <TableCell v-else-if="column.id === 'tags'">
                  <div class="flex flex-wrap gap-1">
                    <template v-if="activity.tags && activity.tags.length > 0">
                      <Badge
                        v-for="(tag, index) in activity.tags"
                        :key="index"
                        variant="outline"
                        class="text-xs text-gray-600 bg-gray-100 hover:bg-gray-200 cursor-default"
                      >
                        {{ tag }}
                      </Badge>
                    </template>
                    <span v-else class="italic text-gray-400">{{ t('activitiesTable.noTags') }}</span>
                  </div>
                </TableCell>

                <TableCell v-else-if="column.id === 'duration'" class="text-sm">
                  {{ formatDuration(activity.started_at, activity.finished_at) }}
                </TableCell>

                <TableCell
                  v-else-if="column.id === 'finishedAt'"
                  class="text-right text-sm text-gray-700 whitespace-nowrap"
                >
                  <span :class="{ 'italic text-gray-400': !activity.finished_at }">
                    {{ formatDateTime(activity.finished_at) }}
                  </span>
                </TableCell>

                <TableCell
                  v-else-if="column.id === 'startedAt'"
                  class="text-right text-sm text-gray-700 whitespace-nowrap"
                >
                  {{ formatDateTime(activity.started_at) }}
                </TableCell>

                <TableCell v-else-if="column.id === 'actions'" class="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger as-child>
                      <Button variant="ghost" class="h-8 w-8 p-0">
                        <span class="sr-only">{{ t('activitiesTable.openMenu') }}</span>
                        <MoreHorizontal class="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>{{ t('activitiesTable.actions') }}</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem @click="handleActivityAction(activity.id, 'edit')">
                        {{ t('activitiesTable.edit') }}
                      </DropdownMenuItem>
                      <DropdownMenuItem @click="handleActivityAction(activity.id, 'view')">
                        {{ t('activitiesTable.viewDetails') }}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        @click="handleActivityAction(activity.id, 'delete')"
                        class="text-red-600 focus:bg-red-50"
                      >
                        {{ t('activitiesTable.delete') }}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </template>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  </Card>
</template>
