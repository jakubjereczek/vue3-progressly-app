import type { TableRow } from '@/api/supabase';

export const FAKE_USER_ID = 'dev-fake-user';

export const FAKE_CATEGORIES: TableRow<'categories'>[] = [
  {
    id: 'fcat-1', name: 'Work', color: '#3B82F6', user_id: FAKE_USER_ID, created_at: '2024-01-01T00:00:00Z',
    archived_at: null
  },
  {
    id: 'fcat-2', name: 'Learning', color: '#8B5CF6', user_id: FAKE_USER_ID, created_at: '2024-01-01T00:00:00Z',
    archived_at: null
  },
  {
    id: 'fcat-3', name: 'Exercise', color: '#10B981', user_id: FAKE_USER_ID, created_at: '2024-01-01T00:00:00Z',
    archived_at: null
  },
  {
    id: 'fcat-4', name: 'Personal', color: '#F59E0B', user_id: FAKE_USER_ID, created_at: '2024-01-01T00:00:00Z',
    archived_at: null
  },
  {
    id: 'fcat-5', name: 'Side Project', color: '#EF4444', user_id: FAKE_USER_ID, created_at: '2024-01-01T00:00:00Z',
    archived_at: null
  },
  {
    id: 'fcat-6', name: 'Reading', color: '#06B6D4', user_id: FAKE_USER_ID, created_at: '2024-01-01T00:00:00Z',
    archived_at: null
  },
];

const DESCRIPTIONS: Record<string, string[]> = {
  'fcat-1': [
    'Feature development — auth module',
    'Code review — PR #142',
    'Daily standup',
    'Bug fix: timer interval leak',
    'API endpoint refactoring',
    'Write unit tests for store',
    'Database migration planning',
    'Deploy to staging',
    'Sprint planning session',
    'Security audit review',
    'Performance profiling',
    'Dependency upgrades',
    'Accessibility pass on dashboard',
    'Design system alignment',
    'Incident post-mortem',
  ],
  'fcat-2': [
    'Vue 3 Composition API deep dive',
    'TypeScript generics practice',
    'LeetCode — dynamic programming',
    'System design: distributed caches',
    'Watching Fireship course',
    'CSS Grid & Subgrid workshop',
    'Read: "You Don\'t Know JS"',
    'Supabase row-level security tutorial',
    'Algorithm: graph traversal',
    'Pinia internals walkthrough',
  ],
  'fcat-3': [
    'Morning run — 5 km',
    'Gym — upper body',
    'Yoga flow session',
    'Evening cycling — 18 km',
    'Gym — leg day',
    'HIIT circuit training',
    'Swimming — 40 laps',
    'Stretching & recovery',
  ],
  'fcat-4': [
    'Grocery shopping & meal prep',
    'Personal finance — monthly review',
    'Dentist appointment',
    'Call with family',
    'Apartment cleaning',
    'Organise desk workspace',
    'Cooking dinner',
    'Tax documents sorting',
  ],
  'fcat-5': [
    'Progressly — gantt zoom feature',
    'CLI tool — config parser',
    'Open source — fix issue #88',
    'Portfolio redesign',
    'Chrome extension: tab manager',
    'Bot: Telegram notifications',
    'NPM package: date utils',
    'Dashboard template starter',
  ],
  'fcat-6': [
    'Clean Code — ch. 5-7',
    'The Pragmatic Programmer — notes',
    'Atomic Habits — summary',
    'Software Architecture Patterns',
    'Deep Work — ch. 3',
    'Designing Data-Intensive Applications',
    'The Phoenix Project',
    'Shape Up — product design',
  ],
};

const TAGS: Record<string, string[][]> = {
  'fcat-1': [
    ['work'],
    ['work', 'urgent'],
    ['work', 'review'],
    ['work', 'backend'],
    ['work', 'frontend'],
    ['work', 'devops'],
  ],
  'fcat-2': [['study'], ['study', 'typescript'], ['study', 'algorithms'], ['learning', 'course'], ['self-improvement']],
  'fcat-3': [['health'], ['exercise', 'cardio'], ['exercise', 'strength'], ['fitness', 'recovery']],
  'fcat-4': [['personal'], ['errands'], ['health'], ['home']],
  'fcat-5': [['project'], ['open-source'], ['side-project', 'code'], ['build', 'ship']],
  'fcat-6': [['reading'], ['books', 'technical'], ['self-improvement', 'reading'], ['notes']],
};

function seededRand(seed: number): number {
  const x = Math.sin(seed + 1) * 10000;
  return x - Math.floor(x);
}

function pick<T>(arr: T[], seed: number): T {
  return arr[Math.floor(seededRand(seed) * arr.length)]!;
}

export function generateFakeActivities(): TableRow<'activities'>[] {
  const activities: TableRow<'activities'>[] = [];
  const now = new Date();
  let idCounter = 0;

  for (let dayOffset = 89; dayOffset >= 0; dayOffset--) {
    const seed = dayOffset * 17;

    // Skip ~20% of days (weekends more likely)
    const date = new Date(now);
    date.setDate(date.getDate() - dayOffset);
    const dow = date.getDay(); // 0=Sun, 6=Sat
    const isWeekend = dow === 0 || dow === 6;
    if (seededRand(seed) < (isWeekend ? 0.45 : 0.12)) continue;

    // 1–4 sessions on workdays, 1–2 on weekends
    const maxSessions = isWeekend ? 2 : 4;
    const sessionCount = Math.max(1, Math.floor(seededRand(seed + 1) * maxSessions) + 1);

    // Start between 7:30 and 9:30
    let currentMinute = 7 * 60 + 30 + Math.floor(seededRand(seed + 2) * 120);

    for (let s = 0; s < sessionCount; s++) {
      const sSeed = seed + s * 31;

      const catId = pick(
        FAKE_CATEGORIES.map((c) => c.id),
        sSeed,
      );
      const descriptions = DESCRIPTIONS[catId]!;
      const tagsList = TAGS[catId]!;

      // Duration: 20 min – 3.5 h (in minutes)
      const durationMin = 20 + Math.floor(seededRand(sSeed + 5) * 190);

      const startedAt = new Date(date);
      startedAt.setHours(Math.floor(currentMinute / 60), currentMinute % 60, 0, 0);

      currentMinute += durationMin + 10 + Math.floor(seededRand(sSeed + 7) * 50); // gap
      if (currentMinute >= 23 * 60) break;

      const finishedAt = new Date(startedAt.getTime() + durationMin * 60_000);

      activities.push({
        id: `fakeact-${++idCounter}`,
        user_id: FAKE_USER_ID,
        description: pick(descriptions, sSeed + 3),
        category_id: catId,
        tags: pick(tagsList, sSeed + 9) as unknown as import('@/api/db-types').Json,
        started_at: startedAt.toISOString(),
        finished_at: finishedAt.toISOString(),
        created_at: startedAt.toISOString(),
      });
    }
  }

  return activities;
}

export const FAKE_ACTIVITIES = generateFakeActivities();

export const FAKE_GOALS: TableRow<'goals'>[] = [
  {
    id: 'fgoal-1',
    user_id: FAKE_USER_ID,
    name: 'Daily Work Focus',
    color: '#3B82F6',
    type: 'per_period',
    period: 'daily',
    target_seconds: 6 * 3600,
    category_id: 'fcat-1',
    started_at: '2026-01-01',
    ended_at: null,
    archived_at: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: null,
    metric: '',
    target_count: null
  },
  {
    id: 'fgoal-2',
    user_id: FAKE_USER_ID,
    name: 'Weekly Learning',
    color: '#8B5CF6',
    type: 'per_period',
    period: 'weekly',
    target_seconds: 5 * 3600,
    category_id: 'fcat-2',
    started_at: '2026-01-01',
    ended_at: null,
    archived_at: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: null,
    metric: '',
    target_count: null
  },
  {
    id: 'fgoal-3',
    user_id: FAKE_USER_ID,
    name: 'March Exercise Goal',
    color: '#10B981',
    type: 'per_period',
    period: 'monthly',
    target_seconds: 20 * 3600,
    category_id: 'fcat-3',
    started_at: '2026-03-01',
    ended_at: '2026-03-31',
    archived_at: null,
    created_at: '2026-03-01T00:00:00Z',
    updated_at: null,
    metric: '',
    target_count: null
  },
  {
    id: 'fgoal-4',
    user_id: FAKE_USER_ID,
    name: 'Q1 Side Project Sprint',
    color: '#EF4444',
    type: 'total',
    period: null,
    target_seconds: 40 * 3600,
    category_id: 'fcat-5',
    started_at: '2026-01-01',
    ended_at: '2026-03-31',
    archived_at: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: null,
    metric: '',
    target_count: null
  },
  {
    id: 'fgoal-5',
    user_id: FAKE_USER_ID,
    name: 'Daily Reading Habit',
    color: '#06B6D4',
    type: 'per_period',
    period: 'daily',
    target_seconds: 30 * 60,
    category_id: 'fcat-6',
    started_at: '2026-01-01',
    ended_at: null,
    archived_at: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: null,
    metric: '',
    target_count: null
  },
];
