<script setup lang="ts">
import { computed, toRef } from 'vue';
import type { TableRow as ITableRow } from '@/api/supabase';
import { Box, CheckCircle, Hourglass, Loader2, MoreHorizontal, Tag } from 'lucide-vue-next';
import { useLocale, useTranslation } from '@/composables';
import { type Column } from '@/components/core/activities-history-list/config';
import ScrollArea from '@/components/ui/scroll-area/ScrollArea.vue';
import ScrollBar from '@/components/ui/scroll-area/ScrollBar.vue';
import Table from '@/components/ui/table/Table.vue';
import TableHeader from '@/components/ui/table/TableHeader.vue';
import TableRow from '@/components/ui/table/TableRow.vue';
import TableHead from '@/components/ui/table/TableHead.vue';
import TableCell from '@/components/ui/table/TableCell.vue';
import Badge from '@/components/ui/badge/Badge.vue';
import { formatDuration, getDuration, formatTotalDuration } from '@/utils/time';
import DropdownMenu from '@/components/ui/dropdown-menu/DropdownMenu.vue';
import DropdownMenuTrigger from '@/components/ui/dropdown-menu/DropdownMenuTrigger.vue';
import Button from '@/components/ui/button/Button.vue';
import DropdownMenuContent from '@/components/ui/dropdown-menu/DropdownMenuContent.vue';
import DropdownMenuLabel from '@/components/ui/dropdown-menu/DropdownMenuLabel.vue';
import DropdownMenuSeparator from '@/components/ui/dropdown-menu/DropdownMenuSeparator.vue';
import DropdownMenuItem from '@/components/ui/dropdown-menu/DropdownMenuItem.vue';
import TableBody from '@/components/ui/table/TableBody.vue';
import TableFooter from '@/components/ui/table/TableFooter.vue';
import ErrorMessage from '@/components/error-message/ErrorMessage.vue';
import { useActivitiesTableSpacer } from '@/components/core/activities-history-list/useActivitiesTableSpacer';

interface Props {
  visibleColumns: Column[];
  activities: ITableRow<'activities'>[];
  loading: boolean;
}

const props = defineProps<Props>();
const activitiesRef = toRef(props, 'activities');

const { spacerHeight, isReady } = useActivitiesTableSpacer(activitiesRef);

const totalCount = computed(() => props.activities.length);
const totalDurationSeconds = computed(() =>
  props.activities.reduce((sum, a) => sum + getDuration(a.started_at, a.finished_at) / 1000, 0),
);
const formattedTotalDuration = computed(() => formatTotalDuration(totalDurationSeconds.value));

const emit = defineEmits<{
  edit: [ITableRow<'activities'>];
  view: [ITableRow<'activities'>];
  delete: [ITableRow<'activities'>];
}>();

const { t } = useTranslation();
const { locale } = useLocale();

function formatDateTime(dateString: string | null): string {
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
</script>

<template>
  <div v-if="loading" class="flex justify-center items-center h-full">
    <Loader2 class="w-8 h-8 animate-spin text-primary" />
  </div>
  <ErrorMessage
    v-else-if="activities.length === 0"
    :title="t('app.module.activities_history.no_activities_found_for_month')"
    :icon="Box"
  />
  <div v-else class="flex flex-col h-full min-h-0">
    <ScrollArea
      ref="scroll-area"
      class="flex-1 min-h-0 w-full border rounded-xl overflow-hidden"
      :class="{ 'opacity-0': !isReady, 'opacity-100': isReady }"
    >
      <div class="min-w-full w-max">
        <Table ref="table">
          <TableHeader class="sticky top-0 z-10 bg-muted border-b">
            <TableRow>
              <TableHead
                v-for="column in visibleColumns"
                :key="column.id"
                :class="[column.class, 'font-semibold text-foreground whitespace-nowrap']"
              >
                {{ column.label }}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-for="activity in activities" :key="activity.id" class="hover:bg-accent/50 transition-colors">
              <TableCell v-for="column in visibleColumns" :key="column.id" :class="[column.class, 'whitespace-nowrap']">
                <template v-if="column.id === 'status'">
                  <Badge
                    :variant="activity.finished_at ? 'success' : 'info'"
                    class="text-xs py-1 px-2 flex items-center justify-center gap-1"
                  >
                    <template v-if="activity.finished_at">
                      <CheckCircle class="w-3 h-3" />
                      {{ t('app.status.finished') }}
                    </template>
                    <template v-else>
                      <Hourglass class="w-3 h-3 animate-pulse" />
                      {{ t('app.status.in_progress') }}
                    </template>
                  </Badge>
                </template>
                <template v-else-if="column.id === 'description'">
                  <span
                    class="text-sm text-foreground max-w-[360px] truncate block"
                    :title="activity.description || t('app.module.activities_history.no_description')"
                  >
                    {{ activity.description || t('app.module.activities_history.no_description') }}
                  </span>
                </template>
                <template v-else-if="column.id === 'category'">
                  <Badge
                    v-if="activity.category_id"
                    variant="outline"
                    class="text-xs text-muted-foreground bg-muted hover:bg-muted/80 cursor-default"
                  >
                    <Tag class="w-3 h-3 mr-1" />
                    {{ t('app.module.activities_history.category_name') }}
                  </Badge>
                  <span v-else class="italic text-muted-foreground">{{
                    t('app.module.activities_history.uncategorized')
                  }}</span>
                </template>
                <template v-else-if="column.id === 'tags'">
                  <div class="flex gap-1">
                    <template v-if="activity?.tags && (activity.tags as string[]).length > 0">
                      <Badge
                        v-for="(tag, index) in (activity.tags as string[]).slice(0, 3)"
                        :key="index"
                        variant="outline"
                        class="text-xs text-muted-foreground bg-muted hover:bg-muted/80 cursor-default"
                      >
                        {{ tag }}
                      </Badge>
                      <Badge
                        v-if="(activity.tags as string[]).length > 3"
                        variant="outline"
                        class="text-xs text-muted-foreground bg-muted"
                      >
                        +{{ (activity.tags as string[]).length - 3 }}
                      </Badge>
                    </template>
                    <span v-else class="italic text-muted-foreground">{{ t('app.module.activities_history.no_tags') }}</span>
                  </div>
                </template>
                <template v-else-if="column.id === 'duration'">
                  <span class="text-sm text-foreground">
                    {{ formatDuration(activity.started_at, activity.finished_at) }}
                  </span>
                </template>
                <template v-else-if="column.id === 'finishedAt'">
                  <span class="text-sm text-foreground" :class="{ 'italic text-muted-foreground': !activity.finished_at }">
                    {{ formatDateTime(activity.finished_at) }}
                  </span>
                </template>
                <template v-else-if="column.id === 'startedAt'">
                  <span class="text-sm text-foreground">
                    {{ formatDateTime(activity.started_at) }}
                  </span>
                </template>
                <template v-else-if="column.id === 'actions'">
                  <div class="flex justify-end px-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger as-child>
                        <Button variant="ghost" class="h-8 w-8 p-0">
                          <MoreHorizontal class="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>{{ t('app.module.activities_history.actions') }}</DropdownMenuLabel>
                        <DropdownMenuItem @click="emit('edit', activity)">{{ t('app.action.edit') }}</DropdownMenuItem>
                        <DropdownMenuItem @click="emit('view', activity)">{{
                          t('app.module.activities_history.view_details')
                        }}</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem @click="emit('delete', activity)" class="text-destructive">{{
                          t('app.action.delete')
                        }}</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </template>
              </TableCell>
            </TableRow>
            <tr v-if="spacerHeight > 0" :style="{ height: `${spacerHeight}px` }" aria-hidden="true">
              <td :colspan="visibleColumns.length" class="p-0 border-none"></td>
            </tr>
          </TableBody>
          <TableFooter v-if="activities.length > 0" class="border-t border-border/40">
            <TableRow>
              <TableCell
                :colspan="visibleColumns.length"
                class="sticky bottom-0 z-10 whitespace-nowrap px-4 py-3 text-sm font-medium text-foreground bg-muted border-t border-border/40"
              >
                {{
                  t('app.module.activities_history.summary.line', {
                    count: totalCount,
                    duration: formattedTotalDuration,
                  })
                }}
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </div>
      <ScrollBar orientation="horizontal" />
      <ScrollBar orientation="vertical" />
    </ScrollArea>
  </div>
</template>
