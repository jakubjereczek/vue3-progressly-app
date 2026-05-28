import { ref } from 'vue';

export interface CategoryDraft {
  name: string;
  color: string;
}

function resolveTokenColor(token: string): string {
  const el = document.createElement('div');
  el.style.color = `var(${token})`;
  el.style.position = 'absolute';
  el.style.opacity = '0';
  document.body.appendChild(el);
  const computed = getComputedStyle(el).color;
  document.body.removeChild(el);
  const m = computed.match(/[\d.]+/g);
  if (!m || m.length < 3) return '#6366f1';
  const [r, g, b] = m.map((n) => Math.round(parseFloat(n)));
  return '#' + [r, g, b].map((n) => n!.toString(16).padStart(2, '0')).join('');
}

export function getDefaultCategoryColor(): string {
  if (typeof document === 'undefined') return '#6366f1';
  return resolveTokenColor('--color-chart-1');
}

export function useCategoriesManagement() {
  const editingId = ref<string | null>(null);
  const draft = ref<CategoryDraft>({ name: '', color: '#6366f1' });

  const isAdding = ref(false);
  const newCategory = ref<CategoryDraft>({ name: '', color: '#6366f1' });

  function startEdit(category: { id: string; name: string; color: string }) {
    editingId.value = category.id;
    draft.value = { name: category.name, color: category.color };
    isAdding.value = false;
  }

  function cancelEdit() {
    editingId.value = null;
  }

  function startAdd() {
    isAdding.value = true;
    editingId.value = null;
    newCategory.value = { name: '', color: getDefaultCategoryColor() };
  }

  function cancelAdd() {
    isAdding.value = false;
  }

  return {
    editingId,
    draft,
    isAdding,
    newCategory,
    startEdit,
    cancelEdit,
    startAdd,
    cancelAdd,
  };
}
