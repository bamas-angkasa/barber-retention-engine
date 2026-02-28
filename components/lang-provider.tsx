'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { type Lang, type TranslationKey, getTranslations } from '@/lib/i18n';

interface LangContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  toggle: () => void;
  t: (key: TranslationKey) => string;
}

const LangContext = createContext<LangContextValue>({
  lang: 'id',
  setLang: () => {},
  toggle: () => {},
  t: (key) => key,
});

const STORAGE_KEY = 'barbershop-lang';

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>('id');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as Lang | null;
    if (stored === 'id' || stored === 'en') setLangState(stored);
    setMounted(true);
  }, []);

  function setLang(l: Lang) {
    setLangState(l);
    localStorage.setItem(STORAGE_KEY, l);
  }

  function toggle() {
    setLang(lang === 'id' ? 'en' : 'id');
  }

  const translations = getTranslations(lang);
  function t(key: TranslationKey): string {
    return (translations as Record<string, string>)[key] ?? key;
  }

  if (!mounted) return <>{children}</>;

  return (
    <LangContext.Provider value={{ lang, setLang, toggle, t }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  return useContext(LangContext);
}
