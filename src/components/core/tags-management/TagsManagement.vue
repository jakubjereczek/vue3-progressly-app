<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { storeToRefs } from 'pinia';
import { Pencil, Trash2, Tag } from 'lucide-vue-next';
import { toast } from 'vue-sonner';
import LoadingSpinner from '@/components/ui/loading-spinner/LoadingSpinner.vue';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useActivitiesStore } from '@/stores';
import { useTranslation } from '@/composables';
import { useTagsData } from './useTagsData';
import { useTagsManagement } from './useTagsManagement';

const { t } = useTranslation();
const activitiesStore = useActivitiesStore();
const { activities, loading } = storeToRefs(activitiesStore);

const actionLoading = ref(false);
const tagToDelete = ref<{ name: string; count: number } | null>(null);
const { tagStats } = useTagsData(activities);
const { editingTag, draft, startEdit, cancelEdit } = useTagsManagement();

onMounted(() => activitiesStore.getActivities());

async function handleRename(oldTag: string) {
  const newName = draft.value.trim();
  if (!newName || newName === oldTag) {
    cancelEdit();
    return;
  }
  actionLoading.value = true;
  const { success, count } = await activitiesStore.renameTag(oldTag, newName);
  actionLoading.value = false;
  if (success) {
    toast.success(t('app.toast_notification.tag.renamed_success', { count }));
    cancelEdit();
  } else {
    toast.error(t('app.toast_notification.tag.rename_error'));
  }
}

function requestDelete(tag: string, count: number) {
  tagToDelete.value = { name: tag, count };
}

async function confirmDelete() {
  if (!tagToDelete.value) return;
  const { name } = tagToDelete.value;
  tagToDelete.value = null;
  actionLoading.value = true;
  const { success, count } = await activitiesStore.removeTag(name);
  actionLoading.value = false;
  if (success) {
    toast.success(t('app.toast_notification.tag.deleted_success', { count }));
  } else {
    toast.error(t('app.toast_notification.tag.delete_error'));
  }
}
</script>

<template>
  <div v-if="loading" class="flex items-center justify-center py-16">
    <LoadingSpinner />
  </div>

  <template v-else>
    <div
      v-if="tagStats.length === 0"
      class="flex flex-col items-center justify-center py-16 gap-3 rounded-xl border border-dashed border-border/60 bg-muted/20"
    >
      <div class="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
        <Tag class="w-5 h-5 text-muted-foreground" />
      </div>
      <div class="text-center">
        <p class="text-sm font-medium text-foreground">{{ t('app.module.tags.empty_title') }}</p>
        <p class="text-xs text-muted-foreground mt-0.5">{{ t('app.module.tags.empty_hint') }}</p>
      </div>
    </div>

    <div v-else class="flex flex-col gap-0 rounded-xl border border-border/40 overflow-hidden">
      <div
        class="grid grid-cols-[1fr_5rem_7rem_5.5rem] items-center gap-3 px-4 py-2 bg-muted border-b border-border/40 flex-shrink-0"
      >
        <span class="text-xs text-muted-foreground font-medium">{{ t('app.module.tags.col.tag') }}</span>
        <span class="text-xs text-muted-foreground font-medium text-right">{{ t('app.module.tags.col.uses') }}</span>
        <span class="text-xs text-muted-foreground font-medium text-right">{{
          t('app.module.tags.col.last_used')
        }}</span>
        <span class="text-xs text-muted-foreground font-medium text-center">{{
          t('app.module.tags.col.actions')
        }}</span>
      </div>

      <div v-for="stat in tagStats" :key="stat.name" class="border-b border-border/30 last:border-0">
        <div
          v-if="editingTag !== stat.name"
          class="grid grid-cols-[1fr_5rem_7rem_5.5rem] items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors group"
        >
          <span class="min-w-0">
            <Badge variant="secondary" class="font-mono text-xs px-2 py-0.5 truncate max-w-[220px] inline-block">
              {{ stat.name }}
            </Badge>
          </span>

          <span class="text-sm tabular-nums text-foreground text-right">
            {{ stat.count }}
          </span>

          <span class="text-xs text-muted-foreground text-right tabular-nums">
            {{ stat.formattedLastUsed }}
          </span>

          <div
            class="flex items-center justify-center gap-0.5 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
          >
            <button
              :disabled="actionLoading"
              @click="startEdit(stat.name)"
              class="rounded-md p-1.5 hover:bg-muted transition-colors disabled:opacity-50"
              :aria-label="t('app.action.edit')"
            >
              <Pencil class="w-3.5 h-3.5 text-muted-foreground" />
            </button>
            <button
              :disabled="actionLoading"
              @click="requestDelete(stat.name, stat.count)"
              class="rounded-md p-1.5 hover:bg-destructive/10 transition-colors disabled:opacity-50"
              :aria-label="t('app.action.delete')"
            >
              <Trash2 class="w-3.5 h-3.5 text-destructive/60 hover:text-destructive" />
            </button>
          </div>
        </div>

        <div v-else class="flex items-center gap-3 py-2 px-4 bg-muted/30 border-l-2 border-primary/40">
          <input
            v-model="draft"
            type="text"
            autofocus
            class="flex-1 bg-background border border-border/60 rounded-md px-2.5 py-1 text-sm text-foreground outline-none focus:ring-1 focus:ring-ring min-w-0 font-mono"
            :placeholder="t('app.module.tags.name_placeholder')"
            @keydown.enter="handleRename(stat.name)"
            @keydown.escape="cancelEdit"
          />
          <div class="flex gap-1.5 flex-shrink-0">
            <Button
              size="sm"
              class="h-7 px-2.5 text-xs"
              :disabled="actionLoading || !draft.trim()"
              @click="handleRename(stat.name)"
            >
              {{ t('app.action.save_changes') }}
            </Button>
            <Button size="sm" variant="ghost" class="h-7 px-2.5 text-xs" @click="cancelEdit">
              {{ t('app.action.cancel') }}
            </Button>
          </div>
        </div>
      </div>
    </div>

    <p v-if="tagStats.length > 0" class="text-xs text-muted-foreground">
      {{ t('app.module.tags.legend', { total: tagStats.length }) }}
    </p>
  </template>

  <AlertDialog
    :open="!!tagToDelete"
    @update:open="
      (v) => {
        if (!v) tagToDelete = null;
      }
    "
  >
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>
          {{ t('app.module.tags.delete_confirm_title', { tag: tagToDelete?.name }) }}
        </AlertDialogTitle>
        <AlertDialogDescription>
          {{ t('app.module.tags.delete_confirm_desc', { count: tagToDelete?.count ?? 0 }) }}
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>{{ t('app.action.cancel') }}</AlertDialogCancel>
        <AlertDialogAction
          class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          @click="confirmDelete"
        >
          {{ t('app.action.delete') }}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
