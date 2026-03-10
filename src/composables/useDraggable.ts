import { ref, onMounted, onBeforeUnmount } from 'vue';

interface UseDraggableOptions {
  storageKey?: string;
  defaultRight?: number;
  defaultBottom?: number;
}

export function useDraggable(options: UseDraggableOptions = {}) {
  const { storageKey, defaultRight = 20, defaultBottom = 20 } = options;

  const x = ref(0);
  const y = ref(0);

  let dragging = false;
  let startPointerX = 0;
  let startPointerY = 0;
  let startElemX = 0;
  let startElemY = 0;

  function clamp(value: number, min: number, max: number) {
    return Math.max(min, Math.min(max, value));
  }

  function save() {
    if (storageKey) {
      localStorage.setItem(storageKey, JSON.stringify({ x: x.value, y: y.value }));
    }
  }

  function load(elWidth: number, elHeight: number) {
    if (storageKey) {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as { x: number; y: number };
          x.value = clamp(parsed.x, 0, window.innerWidth - elWidth);
          y.value = clamp(parsed.y, 0, window.innerHeight - elHeight);
          return;
        } catch {
          // fall through to default
        }
      }
    }
    x.value = window.innerWidth - elWidth - defaultRight;
    y.value = window.innerHeight - elHeight - defaultBottom;
  }

  function onPointerMove(e: PointerEvent) {
    if (!dragging) {
      return;
    }
    const dx = e.clientX - startPointerX;
    const dy = e.clientY - startPointerY;
    x.value = clamp(startElemX + dx, 0, window.innerWidth - 20);
    y.value = clamp(startElemY + dy, 0, window.innerHeight - 20);
  }

  function onPointerUp() {
    if (!dragging) {
      return;
    }
    dragging = false;
    document.removeEventListener('pointermove', onPointerMove);
    document.removeEventListener('pointerup', onPointerUp);
    save();
  }

  function startDrag(e: PointerEvent) {
    if (e.button !== 0) {
      return;
    }
    e.preventDefault();
    dragging = true;
    startPointerX = e.clientX;
    startPointerY = e.clientY;
    startElemX = x.value;
    startElemY = y.value;
    document.addEventListener('pointermove', onPointerMove);
    document.addEventListener('pointerup', onPointerUp);
  }

  function onResize() {
    x.value = clamp(x.value, 0, window.innerWidth - 20);
    y.value = clamp(y.value, 0, window.innerHeight - 20);
  }

  onMounted(() => {
    requestAnimationFrame(() => {
      load(288, 60);
    });
    window.addEventListener('resize', onResize);
  });

  onBeforeUnmount(() => {
    document.removeEventListener('pointermove', onPointerMove);
    document.removeEventListener('pointerup', onPointerUp);
    window.removeEventListener('resize', onResize);
  });

  return { x, y, startDrag };
}
