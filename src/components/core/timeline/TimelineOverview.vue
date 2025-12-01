<script setup lang="ts">
import { Card } from '@/components/ui/card';
import { computed, ref, onMounted } from 'vue';

// --- Definicje Typów na podstawie Twoich danych ---
interface Category {
  id: string;
  name: string;
  color: string; // Hex color
}

interface ActivityLog {
  id: string;
  category_id: string | null;
  description: string;
  started_at: string;
  finished_at: string | null;
}

// --- Przykładowe Dane (Symulacja 24h) ---
const categories: Category[] = [
  { id: '1', name: 'Focused Work', color: '#3b82f6' }, // blue-500
  { id: '2', name: 'Meeting / Collaboration', color: '#10b981' }, // emerald-500
  { id: '3', name: 'Sleep', color: '#4b5563' }, // gray-600
  { id: '4', name: 'Personal / Break', color: '#f59e0b' }, // amber-500
  { id: '5', name: 'Travel / Commute', color: '#ef4444' }, // red-500
];

const activityLogs: ActivityLog[] = [
  // 1. Aktywność przechodząca z wczoraj na dziś (23:00 - 7:00)
  {
    started_at: '2025-11-18T23:00:00Z',
    finished_at: '2025-11-19T07:00:00Z',
    description: 'Nocny Sen (start wczoraj)',
    category_id: '3',
    id: 's1',
  },
  // 2. Poranna rutyna (7:00 - 8:00)
  {
    started_at: '2025-11-19T07:00:00Z',
    finished_at: '2025-11-19T08:00:00Z',
    description: 'Śniadanie i przygotowania',
    category_id: '4',
    id: 'p1',
  },
  // 3. Praca 1 (9:00 - 11:30)
  {
    started_at: '2025-11-19T09:00:00Z',
    finished_at: '2025-11-19T11:30:00Z',
    description: 'Implementacja Logowania',
    category_id: '1',
    id: 'w1',
  },
  // 4. Spotkanie (11:30 - 12:00)
  {
    started_at: '2025-11-19T11:30:00Z',
    finished_at: '2025-11-19T12:00:00Z',
    description: 'Daily Standup',
    category_id: '2',
    id: 'm1',
  },
  // 5. Przerwa na obiad (12:30 - 13:30)
  {
    started_at: '2025-11-19T12:30:00Z',
    finished_at: '2025-11-19T13:30:00Z',
    description: 'Lunch',
    category_id: '4',
    id: 'p2',
  },
  // 6. Praca 2 (14:00 - 16:45)
  {
    started_at: '2025-11-19T14:00:00Z',
    finished_at: '2025-11-19T16:45:00Z',
    description: 'Code Review i poprawki',
    category_id: '1',
    id: 'w2',
  },
  // 7. Dojazd (17:00 - 18:00)
  {
    started_at: '2025-11-19T17:00:00Z',
    finished_at: '2025-11-19T18:00:00Z',
    description: 'Dojazd do domu',
    category_id: '5',
    id: 't1',
  },
  // 8. Aktywność przechodząca z dziś na jutro (22:00 - 02:00 następnego dnia)
  {
    started_at: '2025-11-19T22:00:00Z',
    finished_at: '2025-11-20T02:00:00Z',
    description: 'Projekt nocny (koniec jutro)',
    category_id: '1',
    id: 'w3',
  },
];

// Utworzenie mapy dla szybkiego dostępu do kolorów kategorii
const categoryMap = computed(() => {
  return categories.reduce(
    (acc, cat) => {
      acc[cat.id] = cat;
      return acc;
    },
    {} as Record<string, Category>,
  );
});

// --- Konfiguracja Osi Czasu ---
// Stała data bazowa (Dzień, który wyświetlamy) - Północ
const BASE_DATE = '2025-11-19T00:00:00Z';
const START_OF_DAY = new Date(BASE_DATE).getTime(); // Czas w MS (00:00)

// Tablica z etykietami dla osi czasu (00:00 do 24:00)
const timeLabels = Array.from({ length: 25 }, (_, i) => `${i < 10 ? '0' : ''}${i}:00`);

// --- Parametry Siatki ---
const PIXELS_PER_HOUR = 120; // Szerokość jednej godziny w pikselach
const TIMELINE_WIDTH = PIXELS_PER_HOUR * 24; // Całkowita szerokość dla 24 godzin

// --- Linia Aktualnego Czasu ---
const now = ref(new Date());
const msPerHour = 1000 * 60 * 60;
const msPerDay = 24 * msPerHour;

const currentTimeOffsetStyle = computed(() => {
  const nowTime = now.value;

  // Tworzymy referencję do daty bazowej i ustawiamy na niej obecny czas
  // Używamy UTC, zakładając, że dane logu są też w UTC (co sugeruje 'Z' w started_at)
  let currentDayRef = new Date(BASE_DATE);
  currentDayRef.setUTCHours(nowTime.getUTCHours());
  currentDayRef.setUTCMinutes(nowTime.getUTCMinutes());
  currentDayRef.setUTCSeconds(nowTime.getUTCSeconds());
  currentDayRef.setUTCMilliseconds(0);

  const msSinceStartOfDay = currentDayRef.getTime() - START_OF_DAY;

  // Jeśli obecny czas jest poza wyświetlanym dniem, ukryj znacznik
  if (msSinceStartOfDay < 0 || msSinceStartOfDay > msPerDay) {
    return { display: 'none' };
  }

  const hoursElapsed = msSinceStartOfDay / msPerHour;
  const offsetPx = hoursElapsed * PIXELS_PER_HOUR;
  return {
    left: `${offsetPx}px`,
  };
});

// --- KLUCZOWA Funkcja Obliczeniowa Aktywności (z Clippingiem) ---
const getActivityGridStyle = (log: ActivityLog) => {
  if (!log.finished_at) {
    // Ukryj aktywność, która nie ma czasu zakończenia (można by też wizualizować jako trwającą do teraz)
    return { display: 'none' };
  }

  const start = new Date(log.started_at);
  const end = new Date(log.finished_at);

  const endOfDayMs = START_OF_DAY + msPerDay;

  // Aktywność musi mieć koniec i musi kończyć się po początku dnia.
  if (end.getTime() <= START_OF_DAY || start.getTime() >= endOfDayMs) {
    return { display: 'none' };
  }

  // 1. Obcinanie Początku (Clipping Start)
  // Jeśli aktywność zaczęła się przed START_OF_DAY, ustawiamy początek na START_OF_DAY (północ).
  const clippedStartMs = Math.max(start.getTime(), START_OF_DAY);

  // 2. Obcinanie Końca (Clipping End)
  // Jeśli aktywność kończy się po endOfDayMs, ustawiamy koniec na endOfDayMs (24:00).
  const clippedEndMs = Math.min(end.getTime(), endOfDayMs);

  // 3. Obliczanie Długości i Pozycji
  const durationMs = clippedEndMs - clippedStartMs;

  if (durationMs <= 0) {
    return { display: 'none' };
  }

  // Odległość od 00:00 wyświetlanego dnia do rozpoczęcia (clipped) aktywności (ms)
  const offsetFromDayStartMs = clippedStartMs - START_OF_DAY;

  // Obliczenie pozycji początkowej (left)
  const hoursSinceStart = offsetFromDayStartMs / msPerHour;
  const offsetPx = hoursSinceStart * PIXELS_PER_HOUR;

  // Obliczenie szerokości (width)
  const durationHours = durationMs / msPerHour;
  const widthPx = durationHours * PIXELS_PER_HOUR;

  const category = categoryMap.value[log.category_id!];

  return {
    left: `${offsetPx}px`,
    width: `${widthPx}px`,
    'background-color': category?.color || 'hsl(var(--muted-foreground))',
  };
};

// Funkcja pomocnicza formatująca czas trwania
const formatDuration = (log: ActivityLog): string => {
  if (!log.finished_at) return 'Trwa...';
  const start = new Date(log.started_at);
  const end = new Date(log.finished_at);
  const diffMs = end.getTime() - start.getTime();
  const hours = Math.floor(diffMs / msPerHour);
  const minutes = Math.floor((diffMs % msPerHour) / (1000 * 60));
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
};

// --- Logika Przewijania ---
const timelineContainerRef = ref<HTMLElement | null>(null);

/**
 * Automatyczne przewijanie do linii aktualnego czasu.
 */
const scrollToCurrentTime = () => {
  if (timelineContainerRef.value) {
    const offsetPx = parseFloat(currentTimeOffsetStyle.value.left || '0');
    const containerWidth = timelineContainerRef.value.clientWidth;
    // Przewiń do 1/4 ekranu przed obecnym czasem, aby go widzieć
    const scrollPosition = offsetPx - containerWidth / 4;

    timelineContainerRef.value.scroll({
      left: Math.max(0, scrollPosition),
      behavior: 'smooth',
    });
  }
};

onMounted(() => {
  // Automatyczne przewijanie po załadowaniu
  setTimeout(scrollToCurrentTime, 100);
});
</script>

<template>
  <Card class="p-6 flex flex-col rounded-xl border border-border/40 h-full">
    <h2 class="text-xl font-semibold mb-4 text-card-foreground">
      <h2 class="text-xl font-semibold mb-4">Timeline</h2>
    </h2>

    <div>
      <div ref="timelineContainerRef" class="relative overflow-x-auto flex-grow h-32 pb-2 scroll-smooth">
        <div
          class="grid mb-1 h-6 sticky top-0 bg-card z-20"
          :style="{ width: `${TIMELINE_WIDTH}px`, gridTemplateColumns: `repeat(24, 1fr)` }"
        >
          <div v-for="(label, index) in timeLabels.slice(0, 24)" :key="index" class="relative">
            <div
              v-if="index % 2 === 0"
              class="absolute top-0 left-0 text-xs font-semibold text-card-foreground/70 translate-x-[-50%]"
            >
              {{ label }}
            </div>
          </div>
        </div>

        <div
          class="relative pt-1 border-y border-border/60"
          :style="{
            width: `${TIMELINE_WIDTH}px`,
            minHeight: '120px',
          }"
        >
          <div
            v-for="index in 24 * 2"
            :key="'grid-line-' + index"
            :class="[
              'w-px absolute h-full z-0 pointer-events-none',
              index % 2 !== 0 ? 'bg-border/100' : 'bg-border/30',
            ]"
            :style="{ left: `${(index - 1) * (PIXELS_PER_HOUR / 2)}px` }"
          ></div>

          <div class="absolute top-0 h-full w-0.5 bg-red-500 z-30" :style="currentTimeOffsetStyle">
            <div class="w-2 h-2 rounded-full bg-red-500 absolute -top-1 -left-1"></div>
          </div>

          <div
            v-for="log in activityLogs"
            :key="log.id"
            :style="getActivityGridStyle(log)"
            :title="`${log.description} | Całkowity czas: ${formatDuration(log)}`"
            class="h-16 rounded-sm shadow-md cursor-pointer transition-all duration-200 hover:shadow-lg text-xs font-medium text-white p-1 truncate flex items-center self-start mt-6 z-10 absolute"
          >
            <span v-if="parseFloat(getActivityGridStyle(log).width || '0') > 30">
              {{ formatDuration(log) }}
            </span>
          </div>
        </div>
      </div>

      <div class="text-sm">
        <h3 class="font-semibold mb-2 text-card-foreground">Legenda Kategori:</h3>

        <div class="flex flex-wrap gap-x-6 gap-y-2 text-muted-foreground">
          <span v-for="cat in categories" :key="cat.id" class="inline-flex items-center">
            <span class="w-3 h-3 rounded-full mr-1 shrink-0" :style="{ backgroundColor: cat.color }"></span>
            {{ cat.name }}
          </span>
        </div>
      </div>
    </div>
  </Card>
</template>
