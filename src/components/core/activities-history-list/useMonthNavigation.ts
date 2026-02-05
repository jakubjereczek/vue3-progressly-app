import { ref } from 'vue';

export function useMonthNavigation(initialMonth?: string) {
  const currentMonth = ref(initialMonth ?? new Date().toISOString().substring(0, 7));

  function changeMonth(direction: 'prev' | 'next') {
    const parts = currentMonth.value.split('-');
    const year = Number(parts[0]);
    const month = Number(parts[1]);
    const date = new Date(year, month - 1, 1);

    if (direction === 'prev') {
      date.setMonth(date.getMonth() - 1);
    } else {
      date.setMonth(date.getMonth() + 1);
    }

    currentMonth.value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }

  return {
    currentMonth,
    changeMonth,
  };
}
