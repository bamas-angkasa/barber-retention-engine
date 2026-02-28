'use client';

import { useLang } from './lang-provider';
import { Button } from './ui/button';

export function LangToggle({ className }: { className?: string }) {
  const { lang, toggle } = useLang();

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={toggle}
      className={`font-black text-xs tracking-wider border-2 h-8 px-2.5 ${className ?? ''}`}
      aria-label={lang === 'id' ? 'Switch to English' : 'Ganti ke Bahasa Indonesia'}
    >
      {lang === 'id' ? 'ID' : 'EN'}
    </Button>
  );
}
