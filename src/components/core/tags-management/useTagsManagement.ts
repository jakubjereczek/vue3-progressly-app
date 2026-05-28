import { ref } from 'vue';

export function useTagsManagement() {
  const editingTag = ref<string | null>(null);
  const draft = ref('');

  function startEdit(tag: string) {
    editingTag.value = tag;
    draft.value = tag;
  }

  function cancelEdit() {
    editingTag.value = null;
    draft.value = '';
  }

  return { editingTag, draft, startEdit, cancelEdit };
}
