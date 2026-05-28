import { computed, type Ref } from 'vue';
import type { TableRow } from '@/api/supabase';

export interface TagStat {
  name: string;
  count: number;
  lastUsed: string | null;
  formattedLastUsed: string;
}

export function useTagsData(activities: Ref<TableRow<'activities'>[]>) {
  const tagStats = computed<TagStat[]>(() => {
    const map = new Map<string, { count: number; lastUsed: string | null }>();

    for (const a of activities.value) {
      const tags = (a.tags as string[]) ?? [];
      for (const tag of tags) {
        if (!tag.trim()) continue;
        if (!map.has(tag)) map.set(tag, { count: 0, lastUsed: null });
        const entry = map.get(tag)!;
        entry.count++;
        if (!entry.lastUsed || a.started_at > entry.lastUsed) {
          entry.lastUsed = a.started_at;
        }
      }
    }

    return Array.from(map.entries())
      .map(([name, data]) => ({
        name,
        count: data.count,
        lastUsed: data.lastUsed,
        formattedLastUsed: data.lastUsed ? new Date(data.lastUsed).toLocaleDateString() : '—',
      }))
      .sort((a, b) => b.count - a.count);
  });

  return { tagStats };
}
