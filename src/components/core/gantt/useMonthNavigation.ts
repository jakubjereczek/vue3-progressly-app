import { ref, computed } from 'vue';

export function useMonthNavigation() {
  const now = new Date();
  const currentMonthStart = ref(new Date(now.getFullYear(), now.getMonth(), 1));

  function changeMonth(direction: 'prev' | 'next') {
    const d = new Date(currentMonthStart.value);
    d.setMonth(d.getMonth() + (direction === 'next' ? 1 : -1));
    currentMonthStart.value = d;
  }

  const monthDays = computed<Date[]>(() => {
    const year = currentMonthStart.value.getFullYear();
    const month = currentMonthStart.value.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    return Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1));
  });

  const monthLabel = computed(() =>
    currentMonthStart.value.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }),
  );

  const isCurrentMonth = computed(() => {
    const n = new Date();
    return (
      currentMonthStart.value.getFullYear() === n.getFullYear() && currentMonthStart.value.getMonth() === n.getMonth()
    );
  });

  return { monthDays, monthLabel, changeMonth, isCurrentMonth };
}
