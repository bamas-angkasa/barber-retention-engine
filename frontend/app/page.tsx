'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Scissors, Users, CalendarDays, BarChart3, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ThemeToggle } from '@/components/theme-toggle';
import { LangToggle } from '@/components/lang-toggle';
import { useLang } from '@/components/lang-provider';

export default function HomePage() {
  const { t } = useLang();
  const router = useRouter();
  const [shopSlug, setShopSlug] = useState('');

  function handleFind(e: React.FormEvent) {
    e.preventDefault();
    const slug = shopSlug.trim().toLowerCase();
    if (slug) router.push(`/${slug}/queue`);
  }

  const features = [
    { icon: Users, title: t('landingFeature1Title'), desc: t('landingFeature1Desc') },
    { icon: CalendarDays, title: t('landingFeature2Title'), desc: t('landingFeature2Desc') },
    { icon: BarChart3, title: t('landingFeature3Title'), desc: t('landingFeature3Desc') },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b-2 border-border sticky top-0 bg-background z-50">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Scissors className="h-5 w-5 text-primary" strokeWidth={2.5} />
            <span className="font-black text-sm uppercase tracking-widest">Queue Hub</span>
          </div>
          <div className="flex items-center gap-2">
            <LangToggle />
            <ThemeToggle />
            <Link href="/onboard">
              <Button size="sm" className="font-bold uppercase tracking-wide text-xs">
                {t('landingCTA')}
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4">
        {/* Hero */}
        <section className="py-20 text-center space-y-6">
          <div className="inline-flex items-center gap-2 border-2 border-primary/30 rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-primary mb-2">
            <Scissors className="h-3 w-3" strokeWidth={2.5} />
            Barbershop Queue System
          </div>
          <h1 className="text-5xl sm:text-6xl font-black uppercase tracking-tighter leading-none whitespace-pre-line">
            {t('landingHero')}
          </h1>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto leading-relaxed">
            {t('landingTagline')}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Link href="/onboard">
              <Button size="lg" className="h-13 w-full sm:w-auto font-black uppercase tracking-wide px-8">
                {t('landingCTA')} <ChevronRight className="h-5 w-5 ml-1" />
              </Button>
            </Link>
          </div>
        </section>

        {/* Features */}
        <section className="pb-16 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {features.map(({ icon: Icon, title, desc }) => (
            <Card key={title} className="border-2 p-6 space-y-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-black uppercase tracking-wide text-sm">{title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{desc}</p>
            </Card>
          ))}
        </section>

        {/* Find shop */}
        <section className="pb-20">
          <Card className="border-2 p-6 sm:p-8">
            <p className="text-sm font-black uppercase tracking-widest text-muted-foreground mb-4">
              {t('landingFind')}
            </p>
            <form onSubmit={handleFind} className="flex gap-2">
              <div className="flex-1 relative">
                <div className="absolute inset-y-0 left-3 flex items-center text-sm text-muted-foreground font-medium pointer-events-none">
                  /
                </div>
                <Input
                  value={shopSlug}
                  onChange={e => setShopSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  placeholder={t('landingFindPlaceholder')}
                  className="border-2 font-medium pl-6"
                  maxLength={30}
                />
              </div>
              <Button type="submit" className="font-bold uppercase tracking-wide" disabled={!shopSlug.trim()}>
                {t('landingFindCTA')} <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </form>
          </Card>
        </section>
      </main>

      <footer className="border-t-2 border-border py-6 text-center text-xs text-muted-foreground font-bold uppercase tracking-widest">
        Queue Hub — Barbershop Queue System
      </footer>
    </div>
  );
}
