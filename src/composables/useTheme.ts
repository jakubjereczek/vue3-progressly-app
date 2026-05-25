import { ref, computed } from 'vue';

export type ThemeMode = 'system' | 'light' | 'dark';

const STORAGE_KEY = 'progressly-theme';
const TRANSITION_DURATION = 300;

function readStoredTheme(): ThemeMode {
  if (typeof window === 'undefined') {
    return 'system';
  }
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'light' || stored === 'dark' || stored === 'system') {
    return stored as ThemeMode;
  }
  return 'system';
}

function getSystemIsDark(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function resolveMode(mode: ThemeMode): 'light' | 'dark' {
  return mode === 'system' ? (getSystemIsDark() ? 'dark' : 'light') : mode;
}

export function applyThemeClass(mode: ThemeMode) {
  document.documentElement.classList.toggle('dark', resolveMode(mode) === 'dark');
}

const theme = ref<ThemeMode>(readStoredTheme());

if (typeof window !== 'undefined') {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (theme.value === 'system') {
      applyThemeClass('system');
    }
  });
}

export function useTheme() {
  const resolvedTheme = computed<'light' | 'dark'>(() => resolveMode(theme.value));
  const isDark = computed(() => resolvedTheme.value === 'dark');

  function setTheme(mode: ThemeMode) {
    // Enable transitions only during an active switch — prevents transition on initial paint
    document.documentElement.classList.add('theme-transition');

    theme.value = mode;
    localStorage.setItem(STORAGE_KEY, mode);
    applyThemeClass(mode);

    setTimeout(() => {
      document.documentElement.classList.remove('theme-transition');
    }, TRANSITION_DURATION);
  }

  return { theme, resolvedTheme, isDark, setTheme };
}
