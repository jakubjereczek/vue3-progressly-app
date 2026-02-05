import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

export function useLocale() {
  const { locale } = useI18n();

  const currentLocale = computed(() => locale.value);

  const setLocale = (newLocale: string) => {
    locale.value = newLocale;
  };

  return {
    locale: currentLocale,
    setLocale,
  };
}
