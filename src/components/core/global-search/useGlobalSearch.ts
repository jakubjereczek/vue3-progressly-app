import { ref, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useActivitiesStore, useCategoriesStore } from '@/stores';
import { useGoalsStore } from '@/stores/goalsStore';
import { formatTotalDuration, getDuration, localDateToString } from '@/utils/time';

// ── Shared module-level state (singleton) ──────────────────────────────────
const isOpen = ref(false);
const query = ref('');
const activeIndex = ref(-1);

// ── Types ──────────────────────────────────────────────────────────────────

export type SearchResultType = 'activity' | 'category' | 'goal' | 'page';

export interface SearchResult {
  id: string;
  type: SearchResultType;
  title: string;
  subtitle?: string;
  meta?: string;
  color?: string;
  score: number;
  action: () => void;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function scoreText(text: string, q: string): number {
  if (!q || !text) return 0;
  const t = text.toLowerCase();
  const lq = q.toLowerCase();
  if (t === lq) return 100;
  if (t.startsWith(lq)) return 80;
  if (t.includes(lq)) return 60;
  return 0;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function highlightMatch(text: string, q: string): string {
  const safe = escapeHtml(text);
  if (!q.trim() || !text) return safe;
  const escaped = q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return safe.replace(
    new RegExp(`(${escaped})`, 'gi'),
    '<mark class="bg-primary/20 text-foreground not-italic rounded-[2px] px-px">$1</mark>',
  );
}

function formatActivityDate(isoString: string): string {
  const date = new Date(isoString);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

// ── Composable ─────────────────────────────────────────────────────────────

export function useGlobalSearch() {
  const router = useRouter();
  const activitiesStore = useActivitiesStore();
  const categoriesStore = useCategoriesStore();
  const goalsStore = useGoalsStore();

  const { activities } = storeToRefs(activitiesStore);
  const { categories } = storeToRefs(categoriesStore);
  const { goals } = storeToRefs(goalsStore);

  // ── Open / close ──────────────────────────────────────────────────────────

  function open() {
    isOpen.value = true;
    query.value = '';
    activeIndex.value = -1;
  }

  function close() {
    isOpen.value = false;
    query.value = '';
    activeIndex.value = -1;
  }

  function toggle() {
    if (isOpen.value) close();
    else open();
  }

  // ── Results ───────────────────────────────────────────────────────────────

  const activityResults = computed((): SearchResult[] => {
    const q = query.value.trim();
    if (!q) return [];

    return activities.value
      .filter((a) => !!a.finished_at && !!a.description)
      .map((a) => {
        let score = scoreText(a.description ?? '', q);
        if (score === 0 && Array.isArray(a.tags)) {
          const tagScore = (a.tags as string[]).reduce(
            (max, tag) => Math.max(max, scoreText(tag, q) > 0 ? 40 : 0),
            0,
          );
          score = tagScore;
        }
        return { a, score };
      })
      .filter(({ score }) => score > 0)
      .sort((x, y) => {
        if (y.score !== x.score) return y.score - x.score;
        return new Date(y.a.started_at).getTime() - new Date(x.a.started_at).getTime();
      })
      .slice(0, 5)
      .map(({ a, score }) => {
        const durationSec = getDuration(a.started_at, a.finished_at) / 1000;
        const categoryName = categories.value.find((c) => c.id === a.category_id)?.name;
        const categoryColor = categories.value.find((c) => c.id === a.category_id)?.color;
        return {
          id: a.id,
          type: 'activity' as SearchResultType,
          title: a.description ?? '',
          subtitle: categoryName,
          meta: `${formatActivityDate(a.started_at)} · ${formatTotalDuration(durationSec)}`,
          color: categoryColor,
          score,
          action: () => {
            router.push({ path: '/dashboard/timesheet', query: { highlight: a.id, month: localDateToString(new Date(a.started_at)).slice(0, 7) } });
            close();
          },
        };
      });
  });

  const categoryResults = computed((): SearchResult[] => {
    const q = query.value.trim();
    if (!q) return [];

    return categories.value
      .filter((c) => c.user_id !== null && !c.archived_at)
      .map((c) => ({ c, score: scoreText(c.name, q) }))
      .filter(({ score }) => score > 0)
      .sort((x, y) => y.score - x.score)
      .slice(0, 5)
      .map(({ c, score }) => ({
        id: c.id,
        type: 'category' as SearchResultType,
        title: c.name,
        color: c.color,
        score,
        action: () => {
          router.push({ path: '/dashboard/categories', query: { highlight: c.id } });
          close();
        },
      }));
  });

  const goalResults = computed((): SearchResult[] => {
    const q = query.value.trim();
    if (!q) return [];

    return goals.value
      .filter((g) => !g.archived_at)
      .map((g) => ({ g, score: scoreText(g.name, q) }))
      .filter(({ score }) => score > 0)
      .sort((x, y) => y.score - x.score)
      .slice(0, 5)
      .map(({ g, score }) => {
        const periodKey = g.period ?? g.type;
        return {
          id: g.id,
          type: 'goal' as SearchResultType,
          title: g.name,
          meta: periodKey,
          color: g.color,
          score,
          action: () => {
            router.push({ path: '/dashboard/goals', query: { open: g.id } });
            close();
          },
        };
      });
  });

  // Flat list for keyboard navigation — preserves section order
  const allResults = computed(() => [
    ...activityResults.value,
    ...categoryResults.value,
    ...goalResults.value,
  ]);

  const hasResults = computed(() => allResults.value.length > 0);
  const hasQuery = computed(() => query.value.trim().length > 0);

  // ── Keyboard navigation ───────────────────────────────────────────────────

  function navigateDown() {
    if (allResults.value.length === 0) return;
    activeIndex.value = (activeIndex.value + 1) % allResults.value.length;
  }

  function navigateUp() {
    if (allResults.value.length === 0) return;
    activeIndex.value =
      activeIndex.value <= 0
        ? allResults.value.length - 1
        : activeIndex.value - 1;
  }

  function selectActive() {
    const result = allResults.value[activeIndex.value];
    if (result) result.action();
  }

  // Reset active index on query change
  watch(query, () => {
    activeIndex.value = -1;
  });

  // Index of a result in the flat allResults list
  function getResultIndex(type: SearchResultType, id: string): number {
    return allResults.value.findIndex((r) => r.type === type && r.id === id);
  }

  return {
    isOpen,
    query,
    activeIndex,
    open,
    close,
    toggle,
    activityResults,
    categoryResults,
    goalResults,
    allResults,
    hasResults,
    hasQuery,
    navigateDown,
    navigateUp,
    selectActive,
    getResultIndex,
    highlightMatch,
  };
}
