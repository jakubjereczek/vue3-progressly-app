import type { TableRow } from '@/api/supabase';

const DEMO_USER_ID = 'demo-onboarding-user';

const CATEGORY_NAMES: Record<string, string[]> = {
  'pl-PL': ['Praca', 'Nauka', 'Ćwiczenia', 'Prywatne', 'Projekt'],
  'en-US': ['Work', 'Learning', 'Exercise', 'Personal', 'Project'],
};

const CATEGORY_COLORS = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444'];
const CATEGORY_IDS = ['dcat-1', 'dcat-2', 'dcat-3', 'dcat-4', 'dcat-5'];

function getCategories(locale: string): TableRow<'categories'>[] {
  const lang = locale.startsWith('pl') ? 'pl-PL' : 'en-US';
  const names = CATEGORY_NAMES[lang]!;

  return CATEGORY_IDS.map((id, i) => ({
    id,
    name: names[i]!,
    color: CATEGORY_COLORS[i]!,
    user_id: DEMO_USER_ID,
    created_at: '2024-01-01T00:00:00Z',
    archived_at: null,
  }));
}

const DESCRIPTIONS: Record<string, Record<string, string[]>> = {
  'en-US': {
    'dcat-1': [
      'Feature development',
      'Code review — PR #142',
      'Team standup',
      'Bug fixing — login flow',
      'API refactoring',
      'Writing unit tests',
      'Sprint planning',
      'Deploy to staging',
      'Performance profiling',
      'Design system alignment',
    ],
    'dcat-2': [
      'Vue 3 Composition API',
      'TypeScript generics practice',
      'Online course — system design',
      'Reading documentation',
      'Algorithm study',
      'Pinia internals walkthrough',
      'CSS Grid workshop',
      'Supabase tutorial',
    ],
    'dcat-3': [
      'Morning run — 5 km',
      'Gym — upper body',
      'Yoga session',
      'Evening cycling',
      'Gym — leg day',
      'HIIT training',
      'Stretching & recovery',
    ],
    'dcat-4': [
      'Meal prep',
      'Grocery shopping',
      'Call with family',
      'Apartment cleaning',
      'Personal finance review',
      'Cooking dinner',
    ],
    'dcat-5': [
      'Side project — new feature',
      'Portfolio redesign',
      'Open source — fix issue',
      'CLI tool development',
      'Writing README',
      'UI prototype',
    ],
  },
  'pl-PL': {
    'dcat-1': [
      'Implementacja nowej funkcji',
      'Code review — PR #142',
      'Codzienny standup',
      'Naprawianie błędów — logowanie',
      'Refaktoryzacja API',
      'Pisanie testów jednostkowych',
      'Planowanie sprintu',
      'Deploy na staging',
      'Profilowanie wydajności',
      'Przegląd design systemu',
    ],
    'dcat-2': [
      'Vue 3 Composition API',
      'Ćwiczenie TypeScript',
      'Kurs online — system design',
      'Czytanie dokumentacji',
      'Nauka algorytmów',
      'Przegląd Pinia internals',
      'Warsztaty CSS Grid',
      'Tutorial Supabase',
    ],
    'dcat-3': [
      'Poranny bieg — 5 km',
      'Siłownia — górna partia',
      'Sesja jogi',
      'Wieczorna jazda na rowerze',
      'Siłownia — nogi',
      'Trening HIIT',
      'Rozciąganie i regeneracja',
    ],
    'dcat-4': [
      'Przygotowanie posiłków',
      'Zakupy spożywcze',
      'Rozmowa z rodziną',
      'Sprzątanie mieszkania',
      'Przegląd finansów osobistych',
      'Gotowanie obiadu',
    ],
    'dcat-5': [
      'Projekt własny — nowa funkcja',
      'Redesign portfolio',
      'Open source — naprawa błędu',
      'Tworzenie narzędzia CLI',
      'Pisanie README',
      'Prototyp interfejsu',
    ],
  },
};

const TAGS: Record<string, string[][]> = {
  'dcat-1': [['work'], ['work', 'review'], ['work', 'backend'], ['work', 'frontend'], ['work', 'urgent']],
  'dcat-2': [['study'], ['learning', 'course'], ['self-improvement'], ['study', 'typescript']],
  'dcat-3': [['health'], ['exercise', 'cardio'], ['exercise', 'strength'], ['fitness']],
  'dcat-4': [['personal'], ['errands'], ['home'], ['health']],
  'dcat-5': [['project'], ['side-project'], ['open-source'], ['build']],
};

function seededRand(seed: number): number {
  const x = Math.sin(seed + 1) * 10000;
  return x - Math.floor(x);
}

function pick<T>(arr: T[], seed: number): T {
  return arr[Math.floor(seededRand(seed) * arr.length)]!;
}

function generateDemoActivities(locale: string): TableRow<'activities'>[] {
  const lang = locale.startsWith('pl') ? 'pl-PL' : 'en-US';
  const descs = DESCRIPTIONS[lang]!;
  const activities: TableRow<'activities'>[] = [];
  const now = new Date();
  let idCounter = 0;

  for (let dayOffset = 29; dayOffset >= 0; dayOffset--) {
    const seed = dayOffset * 13;
    const date = new Date(now);
    date.setDate(date.getDate() - dayOffset);
    const dow = date.getDay();
    const isWeekend = dow === 0 || dow === 6;

    // Skip ~25% of workdays, ~55% of weekend days
    if (seededRand(seed) < (isWeekend ? 0.55 : 0.25)) continue;

    const sessionCount = isWeekend
      ? 1
      : Math.max(1, Math.floor(seededRand(seed + 1) * 3) + 1);

    let currentMinute = 8 * 60 + Math.floor(seededRand(seed + 2) * 90);

    for (let s = 0; s < sessionCount; s++) {
      const sSeed = seed + s * 29;
      const catId = pick(CATEGORY_IDS, sSeed);
      const durationMin = 25 + Math.floor(seededRand(sSeed + 5) * 155);

      const startedAt = new Date(date);
      startedAt.setHours(Math.floor(currentMinute / 60), currentMinute % 60, 0, 0);
      currentMinute += durationMin + 15 + Math.floor(seededRand(sSeed + 7) * 45);
      if (currentMinute >= 22 * 60) break;

      const finishedAt = new Date(startedAt.getTime() + durationMin * 60_000);

      activities.push({
        id: `demoact-${++idCounter}`,
        user_id: DEMO_USER_ID,
        description: pick(descs[catId]!, sSeed + 3),
        category_id: catId,
        tags: pick(TAGS[catId]!, sSeed + 9) as unknown as import('@/api/db-types').Json,
        started_at: startedAt.toISOString(),
        finished_at: finishedAt.toISOString(),
        created_at: startedAt.toISOString(),
      });
    }
  }

  return activities;
}

function getRunningActivity(locale: string): TableRow<'activities'> {
  const lang = locale.startsWith('pl') ? 'pl-PL' : 'en-US';
  const description = lang === 'pl-PL' ? 'Trening siłowy — klatka i barki' : 'Gym training — chest & shoulders';
  const startedAt = new Date(Date.now() - 90 * 60_000); // 1.5h ago
  return {
    id: 'demoact-running',
    user_id: DEMO_USER_ID,
    description,
    category_id: 'dcat-3',
    tags: ['exercise', 'strength'] as unknown as import('@/api/db-types').Json,
    started_at: startedAt.toISOString(),
    finished_at: null,
    created_at: startedAt.toISOString(),
  };
}

export function getDemoData(locale: string) {
  const runningActivity = getRunningActivity(locale);
  return {
    categories: getCategories(locale),
    activities: [runningActivity, ...generateDemoActivities(locale)],
    runningActivity,
  };
}
