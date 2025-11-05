import { useI18n } from 'vue-i18n'
import type { MessageSchema, NumberSchema } from '../locales/schema'

export function useTranslation() {
  const { t, n, locale, availableLocales } = useI18n<{
    message: MessageSchema
    number: NumberSchema
  }>({
    useScope: 'global'
  })

  return {
    t,
    n,
    locale,
    availableLocales
  }
}