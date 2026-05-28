import { ref, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { getMondayOfWeek } from '@/utils/date';
import { localDateToString } from '@/utils/time';

export function useWeekNavigation() {
  const route = useRoute();
  const router = useRouter();

  const queryWeek = route.query.week as string | undefined;
  const parsedWeek = queryWeek ? new Date(queryWeek) : null;
  const initial =
    parsedWeek && !isNaN(parsedWeek.getTime()) ? getMondayOfWeek(parsedWeek) : getMondayOfWeek(new Date());

  const currentWeekStart = ref(initial);

  function changeWeek(direction: 'prev' | 'next') {
    const d = new Date(currentWeekStart.value);
    d.setDate(d.getDate() + (direction === 'next' ? 7 : -7));
    currentWeekStart.value = d;
    router.replace({ query: { ...route.query, week: localDateToString(d) } });
  }

  const weekDays = computed(() =>
    Array.from({ length: 7 }, (_, i) => {
      const d = new Date(currentWeekStart.value);
      d.setDate(d.getDate() + i);
      return d;
    }),
  );

  return { weekDays, changeWeek };
}
