import { ref, watch, onUnmounted, type Ref } from 'vue';

export function useScrollShadow(elRef: Ref<HTMLElement | null>, direction: 'vertical' | 'horizontal' = 'vertical') {
  const canScrollStart = ref(false);
  const canScrollEnd = ref(false);

  function update() {
    const el = elRef.value;
    if (!el) return;
    if (direction === 'vertical') {
      canScrollStart.value = el.scrollTop > 1;
      canScrollEnd.value = el.scrollTop < el.scrollHeight - el.clientHeight - 1;
    } else {
      canScrollStart.value = el.scrollLeft > 1;
      canScrollEnd.value = el.scrollLeft < el.scrollWidth - el.clientWidth - 1;
    }
  }

  let currentEl: HTMLElement | null = null;

  function attach(el: HTMLElement) {
    currentEl = el;
    el.addEventListener('scroll', update, { passive: true });
    update();
  }

  function detach() {
    if (currentEl) {
      currentEl.removeEventListener('scroll', update);
      currentEl = null;
    }
  }

  watch(elRef, (newEl, oldEl) => {
    if (oldEl) detach();
    if (newEl) attach(newEl);
  }, { immediate: true });

  onUnmounted(() => detach());

  return { canScrollStart, canScrollEnd, update };
}
