'use client';

import { useLang } from './lang-provider';
import { Button } from './ui/button';

export function LangToggle({ className }: { className?: string }) {
  const { lang, toggle, t } = useLang();

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={toggle}
      className={`font-black text-xs tracking-wider border-2 h-8 px-2.5 ${className ?? ''}`}
      aria-label={t('switchLang')}
    >
      {lang === 'id' ? 'ID' : 'EN'}
    </Button>
  );
}
