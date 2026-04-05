'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import amMessages from '@/messages/am.json';
import enMessages from '@/messages/en.json';

export type AppLocale = 'en' | 'am';

interface MessageTree {
  [key: string]: string | MessageTree;
}

const LOCALE_STORAGE_KEY = 'exam_prep_locale';

const dictionaries: Record<AppLocale, MessageTree> = {
  en: enMessages as MessageTree,
  am: amMessages as MessageTree,
};

interface I18nContextValue {
  locale: AppLocale;
  setLocale: (locale: AppLocale) => void;
  t: (key: string, fallback?: string) => string;
}

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

function resolveMessage(tree: MessageTree, path: string): string | null {
  const segments = path.split('.');
  let current: string | MessageTree | undefined = tree;
  for (const segment of segments) {
    if (!current || typeof current === 'string') return null;
    current = current[segment];
  }
  return typeof current === 'string' ? current : null;
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<AppLocale>('en');

  useEffect(() => {
    const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    if (stored === 'en' || stored === 'am') {
      setLocaleState(stored);
      document.documentElement.lang = stored;
      return;
    }

    const browserLocale = window.navigator.language.toLowerCase();
    const initialLocale: AppLocale = browserLocale.startsWith('am') ? 'am' : 'en';
    setLocaleState(initialLocale);
    document.documentElement.lang = initialLocale;
    window.localStorage.setItem(LOCALE_STORAGE_KEY, initialLocale);
  }, []);

  const setLocale = useCallback((nextLocale: AppLocale) => {
    setLocaleState(nextLocale);
    document.documentElement.lang = nextLocale;
    window.localStorage.setItem(LOCALE_STORAGE_KEY, nextLocale);
  }, []);

  const t = useCallback(
    (key: string, fallback?: string) => {
      const value =
        resolveMessage(dictionaries[locale], key) ??
        resolveMessage(dictionaries.en, key);
      if (value) return value;
      return fallback ?? key;
    },
    [locale],
  );

  const contextValue = useMemo(
    () => ({
      locale,
      setLocale,
      t,
    }),
    [locale, setLocale, t],
  );

  return <I18nContext.Provider value={contextValue}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within I18nProvider');
  }
  return context;
}
