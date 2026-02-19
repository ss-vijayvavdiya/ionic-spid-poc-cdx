// i18next initialization with three supported languages.
// We keep the setup simple and deterministic for Cordova WebView.

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import enTranslation from './locales/en/translation.json';
import itTranslation from './locales/it/translation.json';
import deTranslation from './locales/de/translation.json';

export type AppLanguage = 'en' | 'it' | 'de';

export const LANGUAGE_STORAGE_KEY = 'spid_pos_language';
export const DEFAULT_LANGUAGE: AppLanguage = 'en';
export const SUPPORTED_LANGUAGES: AppLanguage[] = ['en', 'it', 'de'];

function isSupportedLanguage(value: string | null): value is AppLanguage {
  return value !== null && SUPPORTED_LANGUAGES.includes(value as AppLanguage);
}

function getInitialLanguage(): AppLanguage {
  try {
    const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (isSupportedLanguage(saved)) {
      return saved;
    }
  } catch (_error) {
    // Ignore storage read failures and fallback to default.
  }

  return DEFAULT_LANGUAGE;
}

void i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: enTranslation },
      it: { translation: itTranslation },
      de: { translation: deTranslation }
    },
    lng: getInitialLanguage(),
    fallbackLng: DEFAULT_LANGUAGE,
    interpolation: {
      // React already protects from XSS in rendered text.
      escapeValue: false
    }
  });

export default i18n;
