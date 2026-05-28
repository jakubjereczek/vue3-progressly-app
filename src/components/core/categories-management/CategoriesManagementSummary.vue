<script setup lang="ts">
import { computed } from 'vue';
import { storeToRefs } from 'pinia';
import { RouterLink } from 'vue-router';
import { Tag, ArrowRight, Plus } from 'lucide-vue-next';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useCategoriesStore } from '@/stores';
import { useTranslation, useCategoryName } from '@/composables';

const MAX_DISPLAY = 8;

const { t } = useTranslation();
const { resolveCategoryName } = useCategoryName();
const categoriesStore = useCategoriesStore();
const { activePrivateCategories, publicCategories } = storeToRefs(categoriesStore);

const displayedCategories = computed(() => activePrivateCategories.value.slice(0, MAX_DISPLAY));
const hiddenCount = computed(() => Math.max(0, activePrivateCategories.value.length - MAX_DISPLAY));
</script>

<template>
  <Card class="px-5 py-4 rounded-2xl border border-border/40">
    <div class="flex items-center gap-4">
      <!-- Icon + label -->
      <div class="flex items-center gap-3 flex-shrink-0">
        <div class="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
          <Tag class="w-4 h-4 text-muted-foreground" />
        </div>
        <div>
          <p class="text-sm font-semibold text-foreground leading-tight">
            {{ t('app.module.categories.summary.title') }}
          </p>
          <p class="text-xs text-muted-foreground leading-tight mt-0.5">
            {{ activePrivateCategories.length }} {{ t('app.module.categories.summary.personal') }} ·
            {{ publicCategories.length }} {{ t('app.module.categories.summary.public') }}
          </p>
        </div>
      </div>

      <!-- Category pills -->
      <div class="flex-1 flex flex-wrap items-center gap-1.5 min-w-0 overflow-hidden">
        <span v-if="activePrivateCategories.length === 0" class="text-xs text-muted-foreground italic">
          {{ t('app.module.categories.summary.empty') }}
        </span>

        <span
          v-for="cat in displayedCategories"
          :key="cat.id"
          class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border whitespace-nowrap"
          :style="{
            backgroundColor: cat.color + '20',
            color: cat.color,
            borderColor: cat.color + '55',
          }"
        >
          <span class="w-1.5 h-1.5 rounded-full flex-shrink-0" :style="{ backgroundColor: cat.color }" />
          {{ resolveCategoryName(cat.name) }}
        </span>

        <span v-if="hiddenCount > 0" class="text-xs text-muted-foreground px-1">
          +{{ hiddenCount }} {{ t('app.module.categories.summary.more') }}
        </span>
      </div>

      <!-- Actions -->
      <div class="flex items-center gap-2 flex-shrink-0">
        <RouterLink to="/dashboard/categories">
          <Button variant="ghost" size="sm" class="gap-1.5 h-8 px-2.5 text-xs">
            <Plus class="w-3.5 h-3.5" />
            {{ t('app.module.categories.add_category') }}
          </Button>
        </RouterLink>
        <RouterLink to="/dashboard/categories">
          <Button variant="outline" size="sm" class="gap-1.5 h-8 px-2.5 text-xs">
            {{ t('app.module.categories.summary.manage') }}
            <ArrowRight class="w-3.5 h-3.5" />
          </Button>
        </RouterLink>
      </div>
    </div>
  </Card>
</template>
