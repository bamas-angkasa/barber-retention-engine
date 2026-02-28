'use client';

import { use } from 'react';
import Link from 'next/link';
import { ArrowLeft, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme-toggle';

export default function BookingPage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant: slug } = use(params);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background border-b-2 border-border">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <Link href={`/${slug}/queue`} className="flex items-center gap-2 text-sm font-bold hover:opacity-70 transition-opacity">
            <ArrowLeft className="h-4 w-4" />
            Kembali
          </Link>
          <ThemeToggle />
        </div>
      </header>
      <main className="max-w-lg mx-auto px-4 py-16 text-center space-y-6">
        <Clock className="h-16 w-16 mx-auto text-muted-foreground" strokeWidth={1.5} />
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tight">Booking Jadwal</h1>
          <p className="text-muted-foreground mt-2">Fitur ini akan segera tersedia.</p>
        </div>
        <Button asChild className="font-bold uppercase tracking-wide">
          <Link href={`/${slug}/queue`}>Ambil Antrian Sekarang</Link>
        </Button>
      </main>
    </div>
  );
}
