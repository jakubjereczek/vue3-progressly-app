<script setup lang="ts">
import type { TableRow as ITableRow } from '@/api/supabase';
import { Box, CheckCircle, Hourglass, Loader2, MoreHorizontal, Tag } from 'lucide-vue-next';
import { useLocale, useTranslation } from '@/composables';
import { type Column } from '@/components/core/activities-history-list/config';
import ScrollArea from '@/components/ui/scroll-area/ScrollArea.vue';
import Table from '@/components/ui/table/Table.vue';
import TableHeader from '@/components/ui/table/TableHeader.vue';
import TableRow from '@/components/ui/table/TableRow.vue';
import TableHead from '@/components/ui/table/TableHead.vue';
import TableCell from '@/components/ui/table/TableCell.vue';
import Badge from '@/components/ui/badge/Badge.vue';
import { formatDuration } from '@/utils/time';
import DropdownMenu from '@/components/ui/dropdown-menu/DropdownMenu.vue';
import DropdownMenuTrigger from '@/components/ui/dropdown-menu/DropdownMenuTrigger.vue';
import Button from '@/components/ui/button/Button.vue';
import DropdownMenuContent from '@/components/ui/dropdown-menu/DropdownMenuContent.vue';
import DropdownMenuLabel from '@/components/ui/dropdown-menu/DropdownMenuLabel.vue';
import DropdownMenuSeparator from '@/components/ui/dropdown-menu/DropdownMenuSeparator.vue';
import DropdownMenuItem from '@/components/ui/dropdown-menu/DropdownMenuItem.vue';
import TableBody from '@/components/ui/table/TableBody.vue';

interface Props {
  visibleColumns: Column[];
  activities: ITableRow<'activities'>[];
  loading: boolean;
}

defineProps<Props>();

const emit = defineEmits<{
  edit: [ITableRow<'activities'>];
  view: [ITableRow<'activities'>];
  delete: [ITableRow<'activities'>];
}>();

const { t } = useTranslation();
const { locale } = useLocale();

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
</script>

<template>
  <div v-if="loading" class="flex justify-center items-center h-full">
    <Loader2 class="w-8 h-8 animate-spin text-primary" />
  </div>
  <div
    v-else-if="activities.length === 0"
    class="text-center py-12 text-gray-500 bg-gray-50 rounded-lg border border-dashed"
  >
    <Box class="w-10 h-10 mx-auto mb-3 text-gray-400" />
    <p class="text-lg font-medium">{{ t('activitiesTable.noActivitiesFoundForMonth') }}</p>
  </div>
  <ScrollArea v-else class="h-full w-full border rounded-xl">
    <Table>
      <TableHeader class="sticky top-0 z-20 bg-white dark:bg-gray-900 border-b">
        <TableRow>
          <TableHead
            v-for="column in visibleColumns"
            :key="column.id"
            :class="[column.class, 'font-semibold text-gray-700']"
          >
            {{ column.label }}
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow v-for="activity in activities" :key="activity.id" class="hover:bg-blue-50/50 transition-colors">
          <TableCell v-for="column in visibleColumns" :key="column.id" :class="column.class">
            <template v-if="column.id === 'status'">
              <Badge
                :variant="activity.finished_at ? 'success' : 'info'"
                class="text-xs py-1 px-2 flex items-center justify-center gap-1"
              >
                <template v-if="activity.finished_at">
                  <CheckCircle class="w-3 h-3" />
                  {{ t('activitiesTable.finished') }}
                </template>

                <template v-else>
                  <Hourglass lass="w-3 h-3 animate-pulse" />
                  {{ t('activitiesTable.inProgress') }}
                </template>
              </Badge>
            </template>

            <template v-else-if="column.id === 'description'">
              <span
                class="text-sm text-gray-700 max-w-[200px] truncate block"
                :title="activity.description || t('activitiesTable.noDescription')"
              >
                {{ activity.description || t('activitiesTable.noDescription') }}
              </span>
            </template>

            <template v-else-if="column.id === 'category'">
              <Badge
                v-if="activity.category_id"
                variant="outline"
                class="text-xs text-gray-600 bg-gray-100 hover:bg-gray-200 cursor-default"
              >
                <Tag class="w-3 h-3 mr-1" />
                {{ t('activitiesTable.categoryName') }}
              </Badge>
              <span v-else class="italic text-gray-400">{{ t('activitiesTable.uncategorized') }}</span>
            </template>

            <template v-else-if="column.id === 'tags'">
              <div class="flex flex-wrap gap-1">
                <template v-if="activity?.tags && (activity.tags as string[])?.length > 0">
                  <Badge
                    v-for="(tag, index) in activity.tags as string[]"
                    :key="index"
                    variant="outline"
                    class="text-xs text-gray-600 bg-gray-100 hover:bg-gray-200 cursor-default"
                  >
                    {{ tag }}
                  </Badge>
                </template>

                <span v-else class="italic text-gray-400">{{ t('activitiesTable.noTags') }}</span>
              </div>
            </template>

            <template v-else-if="column.id === 'duration'">
              <span class="text-sm text-gray-700">
                {{ formatDuration(activity.started_at, activity.finished_at) }}
              </span>
            </template>

            <template v-else-if="column.id === 'finishedAt'">
              <span
                class="text-right text-sm text-gray-700 block"
                :class="{ 'italic text-gray-400': !activity.finished_at }"
              >
                {{ formatDateTime(activity.finished_at) }}
              </span>
            </template>

            <template v-else-if="column.id === 'startedAt'">
              <span class="text-right text-sm text-gray-700 block">
                {{ formatDateTime(activity.started_at) }}
              </span>
            </template>

            <template v-else-if="column.id === 'actions'">
              <div class="flex justify-end">
                <DropdownMenu>
                  <DropdownMenuTrigger as-child>
                    <Button variant="ghost" class="h-8 w-8 p-0">
                      <MoreHorizontal class="w-4 h-4" />
                      <span class="sr-only">{{ t('activitiesTable.actions') }}</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>{{ t('activitiesTable.actions') }}</DropdownMenuLabel>
                    <DropdownMenuSeparator />

                    <DropdownMenuItem @click="emit('edit', activity)">
                      {{ t('activitiesTable.edit') }}
                    </DropdownMenuItem>

                    <DropdownMenuItem @click="emit('view', activity)">
                      {{ t('activitiesTable.viewDetails') }}
                    </DropdownMenuItem>

                    <DropdownMenuSeparator />

                    <DropdownMenuItem @click="emit('delete', activity)" class="text-red-600 focus:bg-red-50">
                      {{ t('activitiesTable.delete') }}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </template>
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  </ScrollArea>
</template>
