import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

function toYearMonth(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function useMonthNavigation() {
  const route = useRoute();
  const router = useRouter();

  const queryMonth = route.query.month as string | undefined;
  const initial = queryMonth && /^\d{4}-\d{2}$/.test(queryMonth)
    ? queryMonth
    : toYearMonth(new Date());

  const currentMonth = ref(initial);

  function changeMonth(direction: 'prev' | 'next') {
    const [year, month] = currentMonth.value.split('-').map(Number);
    const date = new Date(year, month - 1, 1);
    date.setMonth(date.getMonth() + (direction === 'next' ? 1 : -1));
    currentMonth.value = toYearMonth(date);
    router.replace({ query: { ...route.query, month: currentMonth.value } });
  }

  return { currentMonth, changeMonth };
}
