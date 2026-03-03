import { ref, watch, onBeforeUnmount, nextTick, useTemplateRef, toValue, type MaybeRefOrGetter } from 'vue';
import type { TableRow } from '@/api/supabase';
import { getElement, type ElementOrComponent } from '@/lib/utils';

export function useActivitiesTableSpacer(activitiesSource: MaybeRefOrGetter<TableRow<'activities'>[]>) {
  const scrollAreaRef = useTemplateRef<ElementOrComponent>('scroll-area');
  const tableRef = useTemplateRef<ElementOrComponent>('table');

  const spacerHeight = ref(0);
  const isReady = ref(false);
  let observer: ResizeObserver | null = null;

  const updateSpacerHeight = () => {
    const tableEl = getElement(tableRef.value);
    const scrollAreaEl = getElement(scrollAreaRef.value);

    if (!scrollAreaEl || !tableEl) {
      return;
    }

    requestAnimationFrame(() => {
      const currentTableHeight = tableEl.offsetHeight - spacerHeight.value;
      const viewportHeight = scrollAreaEl.clientHeight;

      spacerHeight.value = currentTableHeight < viewportHeight ? viewportHeight - currentTableHeight : 0;
    });
  };

  const cleanup = () => {
    if (observer) {
      observer.disconnect();
      observer = null;
    }
    spacerHeight.value = 0;
  };

  watch(
    () => toValue(activitiesSource),
    async () => {
      await nextTick();
      cleanup();

      const scrollAreaEl = getElement(scrollAreaRef.value);

      if (scrollAreaEl) {
        observer = new ResizeObserver(() => {
          updateSpacerHeight();
          isReady.value = true;
        });
        observer.observe(scrollAreaEl);
      }

      updateSpacerHeight();
      isReady.value = true;
    },
    { deep: true, immediate: true },
  );

  onBeforeUnmount(cleanup);

  return {
    spacerHeight,
    isReady,
    updateSpacerHeight,
  };
}
