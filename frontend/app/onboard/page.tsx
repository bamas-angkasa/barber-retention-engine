'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  Scissors, ChevronRight, ChevronLeft, CheckCircle, RefreshCw,
  Globe, Store, Clock, Lock, ArrowLeft,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ThemeToggle } from '@/components/theme-toggle';
import { LangToggle } from '@/components/lang-toggle';
import { useLang } from '@/components/lang-provider';

// ── Step indicator ────────────────────────────────────────────────────────────
function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${
          i < current ? 'bg-primary flex-1' : i === current ? 'bg-primary flex-[2]' : 'bg-border flex-1'
        }`} />
      ))}
    </div>
  );
}

// ── Slug status types ─────────────────────────────────────────────────────────
type SlugStatus = 'idle' | 'checking' | 'available' | 'taken' | 'invalid';

// ── Main page ─────────────────────────────────────────────────────────────────
export default function OnboardPage() {
  const { t } = useLang();
  const router = useRouter();

  const STEPS = [t('onboardStep0'), t('onboardStep1'), t('onboardStep2')];

  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    slug: '',
    name: '',
    address: '',
    phone: '',
    openTime: '09:00',
    closeTime: '20:00',
    pin: '',
    confirmPin: '',
  });
  const [slugStatus, setSlugStatus] = useState<SlugStatus>('idle');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [createdSlug, setCreatedSlug] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Validate slug format client-side
  function isValidSlugFormat(s: string) {
    return /^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(s) && s.length >= 3 && s.length <= 30;
  }

  // Debounced slug check
  const checkSlug = useCallback(async (slug: string) => {
    if (!isValidSlugFormat(slug)) {
      setSlugStatus(slug.length >= 1 ? 'invalid' : 'idle');
      return;
    }
    setSlugStatus('checking');
    try {
      const res = await fetch(`/api/onboard/check-slug?slug=${encodeURIComponent(slug)}`);
      if (!res.ok) { setSlugStatus('idle'); return; }
      const data = await res.json();
      setSlugStatus((data.data ?? data).available ? 'available' : 'taken');
    } catch {
      setSlugStatus('idle');
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => checkSlug(form.slug), 500);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [form.slug, checkSlug]);

  async function handleSubmit() {
    if (form.pin !== form.confirmPin) { toast.error(t('onboardPinMismatch')); return; }
    if (!/^\d{4,6}$/.test(form.pin)) { toast.error(t('onboardPinInvalid')); return; }
    setSubmitting(true);
    try {
      const res = await fetch('/api/onboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: form.slug,
          name: form.name,
          address: form.address,
          phone: form.phone,
          openTime: form.openTime,
          closeTime: form.closeTime,
          pin: form.pin,
          confirmPin: form.confirmPin,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error?.message ?? t('onboardError'));
        return;
      }
      const token = (data.data ?? data).token;
      const slug = (data.data ?? data).tenant?.slug ?? form.slug;
      if (token) localStorage.setItem(`admin_token_${slug}`, token);
      setCreatedSlug(slug);
      setDone(true);
      toast.success(t('onboardSuccess'));
      setTimeout(() => router.push(`/${slug}/admin`), 2000);
    } catch {
      toast.error(t('onboardError'));
    } finally {
      setSubmitting(false);
    }
  }

  // Success screen
  if (done) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-sm w-full">
          <CheckCircle className="h-16 w-16 text-primary mx-auto" strokeWidth={1.5} />
          <h1 className="text-2xl font-black uppercase tracking-tight">{t('onboardSuccess')}</h1>
          <p className="text-muted-foreground text-sm">{t('onboardSuccessRedirect')}</p>
          <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mt-2">
            /{createdSlug}/admin
          </div>
          <RefreshCw className="h-5 w-5 animate-spin mx-auto text-primary mt-4" />
        </div>
      </div>
    );
  }

  const step0Valid = slugStatus === 'available';
  const step1Valid = form.name.trim().length >= 2;
  const step2Valid = /^\d{4,6}$/.test(form.pin) && form.pin === form.confirmPin;
  const canNext = step === 0 ? step0Valid : step === 1 ? step1Valid : false;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background border-b-2 border-border">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {step > 0 ? (
              <button onClick={() => setStep(s => s - 1)}
                className="flex items-center gap-1 text-sm font-bold hover:opacity-70 transition-opacity">
                <ChevronLeft className="h-4 w-4" />{t('back')}
              </button>
            ) : (
              <Link href="/" className="flex items-center gap-1 text-sm font-bold hover:opacity-70 transition-opacity">
                <ArrowLeft className="h-4 w-4" />{t('back')}
              </Link>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Scissors className="h-4 w-4 text-primary" strokeWidth={2.5} />
            <span className="text-xs font-black uppercase tracking-widest">{STEPS[step]}</span>
            <LangToggle />
            <ThemeToggle />
          </div>
        </div>
        <div className="max-w-lg mx-auto px-4 pb-2">
          <StepIndicator current={step} total={STEPS.length} />
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-8 pb-28 space-y-6">

        {/* ── Step 0: Slug ────────────────────────────────────────────────── */}
        {step === 0 && (
          <div className="space-y-6">
            <div className="space-y-1">
              <h1 className="text-2xl font-black uppercase tracking-tight">{t('onboardSlugLabel')}</h1>
              <p className="text-muted-foreground text-sm">{t('onboardSlugHint')}</p>
            </div>
            <Card className="border-2 p-4 space-y-3">
              <Label className="font-black uppercase text-xs tracking-wider flex items-center gap-2">
                <Globe className="h-3.5 w-3.5" />{t('onboardSlugLabel')}
              </Label>
              <div className="relative">
                <div className="absolute inset-y-0 left-3 flex items-center text-sm text-muted-foreground font-medium pointer-events-none">
                  queuehub.app/
                </div>
                <Input
                  value={form.slug}
                  onChange={e => setForm(f => ({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))}
                  placeholder={t('onboardSlugPlaceholder')}
                  className="border-2 font-medium pl-28"
                  maxLength={30}
                  autoFocus
                />
              </div>
              {/* Slug status feedback */}
              {form.slug.length > 0 && (
                <div className={`text-xs font-bold flex items-center gap-1.5 ${
                  slugStatus === 'available' ? 'text-green-600 dark:text-green-400' :
                  slugStatus === 'taken' ? 'text-destructive' :
                  slugStatus === 'invalid' ? 'text-destructive' :
                  'text-muted-foreground'
                }`}>
                  {slugStatus === 'checking' && <RefreshCw className="h-3 w-3 animate-spin" />}
                  {slugStatus === 'available' && <CheckCircle className="h-3 w-3" />}
                  {slugStatus === 'checking' && t('onboardSlugChecking')}
                  {slugStatus === 'available' && t('onboardSlugAvailable')}
                  {slugStatus === 'taken' && t('onboardSlugTaken')}
                  {slugStatus === 'invalid' && t('onboardSlugInvalid')}
                </div>
              )}
              {slugStatus === 'available' && (
                <div className="rounded-lg bg-muted/50 border border-border px-3 py-2 text-xs font-mono text-muted-foreground">
                  {typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}/{form.slug}/queue
                </div>
              )}
            </Card>
          </div>
        )}

        {/* ── Step 1: Shop info ───────────────────────────────────────────── */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="space-y-1">
              <h1 className="text-2xl font-black uppercase tracking-tight">{t('onboardStep1')}</h1>
            </div>
            <Card className="border-2 p-4 space-y-4">
              <div className="space-y-1.5">
                <Label className="font-black uppercase text-xs tracking-wider flex items-center gap-2">
                  <Store className="h-3.5 w-3.5" />{t('onboardNameLabel')} *
                </Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder={t('onboardNamePlaceholder')} className="border-2 font-medium" autoFocus />
              </div>
              <div className="space-y-1.5">
                <Label className="font-black uppercase text-xs tracking-wider">{t('onboardAddressLabel')}</Label>
                <Input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                  placeholder={t('onboardAddressPlaceholder')} className="border-2 font-medium" />
              </div>
              <div className="space-y-1.5">
                <Label className="font-black uppercase text-xs tracking-wider">{t('onboardPhoneLabel')}</Label>
                <Input type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder={t('onboardPhonePlaceholder')} className="border-2 font-medium" />
              </div>
            </Card>
          </div>
        )}

        {/* ── Step 2: Hours + PIN ─────────────────────────────────────────── */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="space-y-1">
              <h1 className="text-2xl font-black uppercase tracking-tight">{t('onboardStep2')}</h1>
            </div>

            {/* Hours */}
            <Card className="border-2 p-4 space-y-4">
              <Label className="font-black uppercase text-xs tracking-wider flex items-center gap-2">
                <Clock className="h-3.5 w-3.5" />{t('settingsTitle')}
              </Label>
              <div className="grid grid-cols-2 gap-3">
                {([
                  { key: 'openTime', label: t('onboardOpenTimeLabel') },
                  { key: 'closeTime', label: t('onboardCloseTimeLabel') },
                ] as const).map(({ key, label }) => (
                  <div key={key} className="space-y-1.5">
                    <Label className="font-black uppercase text-xs tracking-wider">{label}</Label>
                    <input type="time" value={form[key]}
                      onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                      className="w-full h-10 px-3 rounded-lg border-2 border-border bg-background text-foreground font-medium text-sm focus:outline-none focus:border-primary" />
                  </div>
                ))}
              </div>
            </Card>

            {/* Admin PIN */}
            <Card className="border-2 p-4 space-y-4">
              <Label className="font-black uppercase text-xs tracking-wider flex items-center gap-2">
                <Lock className="h-3.5 w-3.5" />{t('onboardPinLabel')}
              </Label>
              <div className="space-y-1.5">
                <Label className="font-black uppercase text-xs tracking-wider">{t('onboardPinLabel')}</Label>
                <Input type="password" inputMode="numeric" pattern="[0-9]*" maxLength={6}
                  value={form.pin} onChange={e => setForm(f => ({ ...f, pin: e.target.value.replace(/\D/g, '') }))}
                  placeholder={t('onboardPinPlaceholder')}
                  className="border-2 font-black text-center tracking-[0.5em] text-xl" autoFocus />
              </div>
              <div className="space-y-1.5">
                <Label className="font-black uppercase text-xs tracking-wider">{t('onboardConfirmPinLabel')}</Label>
                <Input type="password" inputMode="numeric" pattern="[0-9]*" maxLength={6}
                  value={form.confirmPin} onChange={e => setForm(f => ({ ...f, confirmPin: e.target.value.replace(/\D/g, '') }))}
                  placeholder={t('onboardPinPlaceholder')}
                  className={`border-2 font-black text-center tracking-[0.5em] text-xl ${
                    form.confirmPin && form.pin !== form.confirmPin ? 'border-destructive' : ''
                  }`} />
                {form.confirmPin && form.pin !== form.confirmPin && (
                  <p className="text-xs text-destructive font-bold">{t('onboardPinMismatch')}</p>
                )}
              </div>
              <p className="text-xs text-muted-foreground">{t('onboardPinNote')}</p>
            </Card>

            {/* Summary card */}
            <Card className="border-2 p-4 space-y-2 bg-muted/30">
              <div className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-2">
                Review
              </div>
              {[
                { label: 'URL', value: `/${form.slug}/queue` },
                { label: t('onboardNameLabel'), value: form.name },
                { label: t('onboardAddressLabel'), value: form.address || '—' },
                { label: t('onboardOpenTimeLabel'), value: form.openTime },
                { label: t('onboardCloseTimeLabel'), value: form.closeTime },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between text-sm">
                  <span className="text-muted-foreground font-medium">{label}</span>
                  <span className="font-bold">{value}</span>
                </div>
              ))}
            </Card>
          </div>
        )}
      </main>

      {/* Bottom CTA */}
      <div className="fixed bottom-0 inset-x-0 bg-background border-t-2 border-border p-4">
        <div className="max-w-lg mx-auto">
          {step < 2 ? (
            <Button className="w-full h-12 font-black uppercase tracking-wide" size="lg"
              disabled={!canNext} onClick={() => setStep(s => s + 1)}>
              {t('onboardNext')} <ChevronRight className="h-5 w-5 ml-1" />
            </Button>
          ) : (
            <Button className="w-full h-12 font-black uppercase tracking-wide" size="lg"
              disabled={submitting || !step2Valid} onClick={handleSubmit}>
              {submitting
                ? <RefreshCw className="h-5 w-5 animate-spin" />
                : <><CheckCircle className="h-5 w-5 mr-2" />{t('onboardSubmit')}</>}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
