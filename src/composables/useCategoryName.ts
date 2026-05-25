import { useTranslation } from './useTranslation';

export function useCategoryName() {
  const { t } = useTranslation();

  function resolveCategoryName(name: string): string {
    if (name.startsWith('app.')) return t(name);
    return name;
  }

  return { resolveCategoryName };
}
