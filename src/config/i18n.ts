import { createI18n } from 'vue-i18n';
import enUS from '../locales/en-US.json';
import plPL from '../locales/pl-PL.json';
import esES from '../locales/es-ES.json';

import type { MessageSchema } from '../locales/schema';

type AvailableLocales = 'en-US' | 'pl-PL' | 'es-ES';

const messages: Record<AvailableLocales, MessageSchema> = {
  'en-US': enUS,
  'pl-PL': plPL,
  'es-ES': esES,
};

const i18n = createI18n<[MessageSchema], 'en-US' | 'pl-PL' | 'es-ES'>({
  legacy: false,
  locale: 'en-US',
  messages,
  numberFormats: {
    'en-US': {
      currency: {
        style: 'currency',
        currencyDisplay: 'symbol',
        currency: 'USD',
      },
    },
    'pl-PL': {
      currency: {
        style: 'currency',
        currencyDisplay: 'symbol',
        currency: 'PLN',
      },
    },
    'es-ES': {
      currency: {
        style: 'currency',
        currencyDisplay: 'symbol',
        currency: 'EUR',
      },
    },
  },
});

export default i18n;
