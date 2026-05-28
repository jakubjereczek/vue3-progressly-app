<script setup lang="ts">
import { onMounted, ref, computed, nextTick } from 'vue';
import { useRoute } from 'vue-router';
import { storeToRefs } from 'pinia';
import { Pencil, Trash2, Plus, Lock, Tag, Hash, Archive, ArchiveRestore, ChevronDown, GripVertical } from 'lucide-vue-next';
import LoadingSpinner from '@/components/ui/loading-spinner/LoadingSpinner.vue';
import { toast } from 'vue-sonner';
import { useCategoriesStore, useUserStore } from '@/stores';
import { useTranslation, useCategoryName } from '@/composables';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useCategoriesManagement } from './useCategoriesManagement';
import TagsManagement from '@/components/core/tags-management/TagsManagement.vue';
import { cn } from '@/lib/utils';
import AlertDialog from '@/components/ui/alert-dialog/AlertDialog.vue';
import AlertDialogContent from '@/components/ui/alert-dialog/AlertDialogContent.vue';
import AlertDialogHeader from '@/components/ui/alert-dialog/AlertDialogHeader.vue';
import AlertDialogTitle from '@/components/ui/alert-dialog/AlertDialogTitle.vue';
import AlertDialogDescription from '@/components/ui/alert-dialog/AlertDialogDescription.vue';
import AlertDialogFooter from '@/components/ui/alert-dialog/AlertDialogFooter.vue';
import AlertDialogCancel from '@/components/ui/alert-dialog/AlertDialogCancel.vue';
import AlertDialogAction from '@/components/ui/alert-dialog/AlertDialogAction.vue';

const { t } = useTranslation();
const { resolveCategoryName } = useCategoryName();
const route = useRoute();
const categoriesStore = useCategoriesStore();
const { activePrivateCategories, archivedCategories, publicCategories, loading, actionLoading } = storeToRefs(categoriesStore);
const { plan } = storeToRefs(useUserStore());

const atCategoryLimit = computed(() => {
  if (!plan.value?.categoryLimit) return false;
  return activePrivateCategories.value.length >= plan.value.categoryLimit;
});

const activeTab = ref<'categories' | 'tags'>('categories');
const archivedExpanded = ref(false);
const flashingCategoryId = ref<string | null>(null);

const { editingId, draft, isAdding, newCategory, startEdit, cancelEdit, startAdd, cancelAdd } =
  useCategoriesManagement();

// ── Drag & drop ordering ────────────────────────────────────────────────────

const SORT_KEY = 'progressly:cat-order';

function loadOrder(): string[] {
  try { return JSON.parse(localStorage.getItem(SORT_KEY) ?? '[]'); } catch { return []; }
}

const categoryOrder = ref<string[]>(loadOrder());

const sortedActiveCategories = computed(() => {
  const cats = [...activePrivateCategories.value];
  const order = categoryOrder.value;
  if (!order.length) return cats;
  return cats.sort((a, b) => {
    const ia = order.indexOf(a.id);
    const ib = order.indexOf(b.id);
    if (ia === -1 && ib === -1) return 0;
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });
});

const dragFromIndex = ref<number | null>(null);
const dragOverIndex = ref<number | null>(null);

function onDragStart(e: DragEvent, index: number) {
  dragFromIndex.value = index;
  if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
}

function onDragOver(e: DragEvent, index: number) {
  e.preventDefault();
  dragOverIndex.value = index;
}

function onDrop(e: DragEvent, toIndex: number) {
  e.preventDefault();
  const from = dragFromIndex.value;
  if (from === null || from === toIndex) {
    dragFromIndex.value = null;
    dragOverIndex.value = null;
    return;
  }
  const newOrder = sortedActiveCategories.value.map((c) => c.id);
  const [moved] = newOrder.splice(from, 1);
  newOrder.splice(toIndex, 0, moved!);
  categoryOrder.value = newOrder;
  localStorage.setItem(SORT_KEY, JSON.stringify(newOrder));
  dragFromIndex.value = null;
  dragOverIndex.value = null;
}

function onDragEnd() {
  dragFromIndex.value = null;
  dragOverIndex.value = null;
}

onMounted(async () => {
  await categoriesStore.getCategories();

  const highlightId = route.query.highlight as string | undefined;
  if (highlightId) {
    const isArchived = archivedCategories.value.some((c) => c.id === highlightId);
    if (isArchived) archivedExpanded.value = true;
    await nextTick();
    const el = document.querySelector(`[data-category-id="${highlightId}"]`) as HTMLElement | null;
    if (el) {
      el.scrollIntoView({ block: 'center', behavior: 'smooth' });
      flashingCategoryId.value = highlightId;
      setTimeout(() => { flashingCategoryId.value = null; }, 2000);
    }
  }
});

// ── Edit ──────────────────────────────────────────────────────────────────────

async function handleSaveEdit(id: string) {
  if (!draft.value.name.trim()) return;
  const { success } = await categoriesStore.updateCategory(id, draft.value.name.trim(), draft.value.color);
  if (success) {
    toast.success(t('app.toast_notification.category.updated_success'));
    cancelEdit();
  } else {
    toast.error(t('app.toast_notification.category.update_error'));
  }
}

// ── Create ────────────────────────────────────────────────────────────────────

async function handleCreate() {
  if (!newCategory.value.name.trim()) return;
  const { success } = await categoriesStore.createCategory(
    newCategory.value.name.trim(),
    newCategory.value.color,
  );
  if (success) {
    toast.success(t('app.toast_notification.category.created_success'));
    cancelAdd();
  } else {
    toast.error(t('app.toast_notification.category.create_error'));
  }
}

// ── Archive ───────────────────────────────────────────────────────────────────

const categoryToArchive = ref<string | null>(null);

function requestArchive(id: string) {
  categoryToArchive.value = id;
}

async function confirmArchive() {
  const id = categoryToArchive.value;
  categoryToArchive.value = null;
  if (!id) return;
  const { success } = await categoriesStore.archiveCategory(id);
  if (success) {
    toast.success(t('app.toast_notification.category.archived_success'));
  } else {
    toast.error(t('app.toast_notification.category.archive_error'));
  }
}

async function handleUnarchive(id: string) {
  const { success, limitReached } = await categoriesStore.unarchiveCategory(id);
  if (success) {
    toast.success(t('app.toast_notification.category.unarchived_success'));
  } else if (limitReached) {
    toast.error(t('app.module.categories.restore_limit_reached'));
  } else {
    toast.error(t('app.toast_notification.category.unarchive_error'));
  }
}

// ── Delete ────────────────────────────────────────────────────────────────────

const categoryToDelete = ref<string | null>(null);

function requestDelete(id: string) {
  categoryToDelete.value = id;
}

async function confirmDelete() {
  const id = categoryToDelete.value;
  categoryToDelete.value = null;
  if (!id) return;
  const { success } = await categoriesStore.deleteCategory(id);
  if (success) {
    toast.success(t('app.toast_notification.category.deleted_success'));
  } else {
    toast.error(t('app.toast_notification.category.delete_error'));
  }
}
</script>

<template>
  <Card data-tour="categories-management" class="p-6 flex flex-col gap-6 rounded-2xl border border-border/40 h-full overflow-hidden">
    <!-- Header -->
    <div class="flex items-start justify-between gap-4 flex-shrink-0">
      <div>
        <p class="text-sm font-medium text-muted-foreground">
          {{ activeTab === 'categories' ? t('app.module.categories.title') : t('app.module.tags.title') }}
        </p>
        <p class="text-xs text-muted-foreground/60 mt-0.5">
          {{ activeTab === 'categories' ? t('app.module.categories.description') : t('app.module.tags.description') }}
        </p>
      </div>
      <Button
        v-if="activeTab === 'categories' && !isAdding"
        size="sm"
        :disabled="atCategoryLimit"
        :title="atCategoryLimit ? t('app.module.categories.restore_limit_reached') : undefined"
        @click="startAdd"
        class="gap-1.5 flex-shrink-0"
      >
        <Plus class="w-4 h-4" />
        {{ t('app.module.categories.add_category') }}
      </Button>
    </div>

    <!-- Tab switcher -->
    <div role="tablist" class="flex items-center gap-1 flex-shrink-0 border-b border-border/40 -mb-2">
      <button
        role="tab"
        :aria-selected="activeTab === 'categories'"
        @click="activeTab = 'categories'"
        :class="cn(
          'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border-b-2 -mb-px transition-colors',
          activeTab === 'categories'
            ? 'border-primary text-primary'
            : 'border-transparent text-muted-foreground hover:text-foreground'
        )"
      >
        <Tag class="w-3.5 h-3.5" />
        {{ t('app.module.categories.tab.categories') }}
      </button>
      <button
        role="tab"
        :aria-selected="activeTab === 'tags'"
        @click="activeTab = 'tags'"
        :class="cn(
          'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border-b-2 -mb-px transition-colors',
          activeTab === 'tags'
            ? 'border-primary text-primary'
            : 'border-transparent text-muted-foreground hover:text-foreground'
        )"
      >
        <Hash class="w-3.5 h-3.5" />
        {{ t('app.module.categories.tab.tags') }}
      </button>
    </div>

    <!-- ── CATEGORIES TAB ─────────────────────────────────────── -->
    <div v-if="activeTab === 'categories'" class="flex-1 overflow-y-auto flex flex-col gap-4 min-h-0 pr-1">

      <!-- My Categories (active) -->
      <div class="flex flex-col gap-2">
        <div class="flex items-center gap-2">
          <span class="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
            {{ t('app.module.categories.my_categories') }}
          </span>
          <Badge variant="secondary" class="text-xs px-1.5 py-0 h-4 font-normal">
            {{ activePrivateCategories.length }}
          </Badge>
        </div>

        <!-- Loading -->
        <div v-if="loading" class="flex items-center justify-center py-8">
          <LoadingSpinner />
        </div>

        <template v-else>
          <!-- Empty state -->
          <div
            v-if="activePrivateCategories.length === 0 && !isAdding"
            class="flex flex-col items-center justify-center py-10 gap-3 rounded-xl border border-dashed border-border/60 bg-muted/20"
          >
            <div class="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
              <Tag class="w-5 h-5 text-muted-foreground" />
            </div>
            <div class="text-center">
              <p class="text-sm font-medium text-foreground">{{ t('app.module.categories.empty_title') }}</p>
              <p class="text-xs text-muted-foreground mt-0.5">{{ t('app.module.categories.empty_hint') }}</p>
            </div>
            <Button size="sm" variant="outline" @click="startAdd" class="gap-1.5 mt-1">
              <Plus class="w-3.5 h-3.5" />
              {{ t('app.module.categories.add_category') }}
            </Button>
          </div>

          <!-- Active list + optional add form -->
          <div v-else class="flex flex-col gap-0.5">
            <div
              v-for="(cat, catIndex) in sortedActiveCategories"
              :key="cat.id"
              draggable="true"
              @dragstart="onDragStart($event, catIndex)"
              @dragover="onDragOver($event, catIndex)"
              @drop="onDrop($event, catIndex)"
              @dragend="onDragEnd"
              :class="[
                'transition-all duration-150',
                dragOverIndex === catIndex && dragFromIndex !== catIndex && 'border-t-2 border-primary/50',
              ]"
            >
              <!-- View mode -->
              <div
                v-if="editingId !== cat.id"
                :data-category-id="cat.id"
                :class="[
                  'flex items-center gap-3 py-3 px-3 rounded-lg group hover:bg-muted transition-colors',
                  flashingCategoryId === cat.id && 'bg-primary/10',
                  dragFromIndex === catIndex && 'opacity-40',
                ]"
              >
                <GripVertical class="w-3.5 h-3.5 text-muted-foreground/30 flex-shrink-0 cursor-grab sm:opacity-0 sm:group-hover:opacity-100 transition-opacity" />
                <span
                  class="w-5 h-5 rounded-full flex-shrink-0 ring-1 ring-border/40 shadow-sm"
                  :style="{ backgroundColor: cat.color }"
                />
                <span class="text-sm font-medium flex-1 truncate text-foreground">{{ resolveCategoryName(cat.name) }}</span>
                <div class="flex gap-0.5 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                  <button
                    @click="startEdit(cat)"
                    :disabled="actionLoading"
                    class="rounded-md p-1.5 hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    :aria-label="t('app.action.edit')"
                  >
                    <Pencil class="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                  <button
                    @click="requestArchive(cat.id)"
                    :disabled="actionLoading"
                    class="rounded-md p-1.5 hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    :aria-label="t('app.module.categories.action.archive')"
                  >
                    <Archive class="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                  <button
                    @click="requestDelete(cat.id)"
                    :disabled="actionLoading"
                    class="rounded-md p-1.5 hover:bg-destructive/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    :aria-label="t('app.action.delete')"
                  >
                    <Trash2 class="w-3.5 h-3.5 text-destructive/60 hover:text-destructive" />
                  </button>
                </div>
              </div>

              <!-- Edit mode -->
              <div
                v-else
                class="flex items-center gap-3 py-2 px-3 rounded-lg bg-muted/30 border border-border/50"
              >
                <label
                  class="w-7 h-7 rounded-full flex-shrink-0 ring-2 ring-border overflow-hidden cursor-pointer shadow-sm"
                  :style="{ backgroundColor: draft.color }"
                >
                  <input type="color" v-model="draft.color" class="opacity-0 w-full h-full cursor-pointer" />
                </label>
                <input
                  v-model="draft.name"
                  type="text"
                  maxlength="50"
                  class="flex-1 bg-background border border-border/60 rounded-md px-2.5 py-1 text-sm text-foreground outline-none focus:ring-1 focus:ring-ring min-w-0"
                  :placeholder="t('app.module.categories.name_placeholder')"
                  @keydown.enter="handleSaveEdit(cat.id)"
                  @keydown.escape="cancelEdit"
                />
                <div class="flex gap-1.5 flex-shrink-0">
                  <Button size="sm" class="h-7 px-2.5 text-xs" @click="handleSaveEdit(cat.id)">
                    {{ t('app.action.save_changes') }}
                  </Button>
                  <Button size="sm" variant="ghost" class="h-7 px-2.5 text-xs" @click="cancelEdit">
                    {{ t('app.action.cancel') }}
                  </Button>
                </div>
              </div>
            </div>

            <!-- Add form -->
            <div
              v-if="isAdding"
              class="flex items-center gap-3 py-2 px-3 rounded-lg bg-muted/30 border border-primary/30 mt-1"
            >
              <label
                class="w-7 h-7 rounded-full flex-shrink-0 ring-2 ring-border overflow-hidden cursor-pointer shadow-sm"
                :style="{ backgroundColor: newCategory.color }"
              >
                <input
                  type="color"
                  v-model="newCategory.color"
                  class="opacity-0 w-full h-full cursor-pointer"
                />
              </label>
              <input
                v-model="newCategory.name"
                type="text"
                autofocus
                maxlength="50"
                class="flex-1 bg-background border border-border/60 rounded-md px-2.5 py-1 text-sm text-foreground outline-none focus:ring-1 focus:ring-ring min-w-0"
                :placeholder="t('app.module.categories.name_placeholder')"
                @keydown.enter="handleCreate"
                @keydown.escape="cancelAdd"
              />
              <div class="flex gap-1.5 flex-shrink-0">
                <Button size="sm" class="h-7 px-2.5 text-xs gap-1" @click="handleCreate">
                  <Plus class="w-3 h-3" />
                  {{ t('app.module.categories.add_category') }}
                </Button>
                <Button size="sm" variant="ghost" class="h-7 px-2.5 text-xs" @click="cancelAdd">
                  {{ t('app.action.cancel') }}
                </Button>
              </div>
            </div>
          </div>
        </template>
      </div>

      <!-- Archived Categories (collapsible) -->
      <div v-if="!loading && archivedCategories.length > 0" class="flex flex-col gap-2">
        <button
          class="flex items-center gap-2 w-fit"
          @click="archivedExpanded = !archivedExpanded"
          :aria-expanded="archivedExpanded"
        >
          <span class="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
            {{ t('app.module.categories.archived_categories') }}
          </span>
          <Badge variant="secondary" class="text-xs px-1.5 py-0 h-4 font-normal">
            {{ archivedCategories.length }}
          </Badge>
          <ChevronDown
            :class="cn('w-3.5 h-3.5 text-muted-foreground transition-transform duration-200', archivedExpanded && 'rotate-180')"
          />
        </button>

        <template v-if="archivedExpanded">
          <p class="text-xs text-muted-foreground -mt-1">{{ t('app.module.categories.archived_hint') }}</p>
          <div class="flex flex-col gap-0.5">
            <div
              v-for="cat in archivedCategories"
              :key="cat.id"
              :data-category-id="cat.id"
              :class="[
                'flex items-center gap-3 py-3 px-3 rounded-lg group hover:bg-muted transition-colors opacity-60 hover:opacity-100',
                flashingCategoryId === cat.id && 'opacity-100 bg-primary/10',
              ]"
            >
              <span
                class="w-5 h-5 rounded-full flex-shrink-0 ring-1 ring-border/40 shadow-sm grayscale"
                :style="{ backgroundColor: cat.color }"
              />
              <span class="text-sm font-medium flex-1 truncate text-muted-foreground">{{ resolveCategoryName(cat.name) }}</span>
              <div class="flex gap-0.5 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                <button
                  @click="handleUnarchive(cat.id)"
                  :disabled="atCategoryLimit || actionLoading"
                  :title="atCategoryLimit ? t('app.module.categories.restore_limit_reached') : undefined"
                  :class="cn(
                    'rounded-md p-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
                    !atCategoryLimit && !actionLoading ? 'hover:bg-muted' : '',
                  )"
                  :aria-label="t('app.module.categories.action.restore')"
                >
                  <ArchiveRestore class="w-3.5 h-3.5 text-muted-foreground" />
                </button>
                <button
                  @click="requestDelete(cat.id)"
                  :disabled="actionLoading"
                  class="rounded-md p-1.5 hover:bg-destructive/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  :aria-label="t('app.action.delete')"
                >
                  <Trash2 class="w-3.5 h-3.5 text-destructive/60 hover:text-destructive" />
                </button>
              </div>
            </div>
          </div>
        </template>
      </div>

      <Separator />

      <!-- Public Categories -->
      <div class="flex flex-col gap-2">
        <div class="flex items-center gap-2">
          <span class="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
            {{ t('app.module.categories.public_categories') }}
          </span>
          <Badge variant="secondary" class="text-xs px-1.5 py-0 h-4 font-normal">
            {{ publicCategories.length }}
          </Badge>
        </div>
        <p class="text-xs text-muted-foreground -mt-1">{{ t('app.module.categories.public_description') }}</p>

        <div v-if="publicCategories.length === 0" class="py-4 text-center text-sm text-muted-foreground">
          {{ t('app.module.categories.no_public_categories') }}
        </div>

        <div v-else class="flex flex-col gap-0.5">
          <div
            v-for="cat in publicCategories"
            :key="cat.id"
            class="flex items-center gap-3 py-3 px-3 rounded-lg hover:bg-muted transition-colors"
          >
            <span
              class="w-5 h-5 rounded-full flex-shrink-0 ring-1 ring-border/40 shadow-sm"
              :style="{ backgroundColor: cat.color }"
            />
            <span class="text-sm font-medium flex-1 truncate text-foreground">{{ resolveCategoryName(cat.name) }}</span>
            <div class="flex items-center gap-1.5 text-muted-foreground">
              <Lock class="w-3 h-3" />
              <span class="text-xs">{{ t('app.module.categories.public_badge') }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ── TAGS TAB ──────────────────────────────────────────── -->
    <div v-else class="flex-1 overflow-y-auto flex flex-col gap-4 min-h-0 pr-1">
      <TagsManagement />
    </div>
  </Card>

  <!-- Archive confirmation dialog -->
  <AlertDialog :open="categoryToArchive !== null" @update:open="(open) => { if (!open) nextTick(() => { categoryToArchive = null }) }">
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>{{ t('app.module.categories.archive_dialog.title') }}</AlertDialogTitle>
        <AlertDialogDescription>{{ t('app.module.categories.archive_dialog.description') }}</AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel @click="categoryToArchive = null">{{ t('app.action.cancel') }}</AlertDialogCancel>
        <AlertDialogAction @click="confirmArchive">
          {{ t('app.module.categories.archive_dialog.confirm') }}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>

  <!-- Delete confirmation dialog -->
  <AlertDialog :open="categoryToDelete !== null" @update:open="(open) => { if (!open) nextTick(() => { categoryToDelete = null }) }">
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>{{ t('app.module.categories.delete_dialog.title') }}</AlertDialogTitle>
        <AlertDialogDescription>{{ t('app.module.categories.delete_dialog.description') }}</AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel @click="categoryToDelete = null">{{ t('app.action.cancel') }}</AlertDialogCancel>
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
