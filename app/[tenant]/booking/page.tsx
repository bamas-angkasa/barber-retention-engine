'use client';

import { use, useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Scissors,
  ChevronRight,
  ChevronLeft,
  CalendarDays,
  Clock,
  User,
  CheckCircle,
  RefreshCw,
  MessageCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ThemeToggle } from '@/components/theme-toggle';
import { formatRupiah } from '@/lib/utils';
import type { Barber, Service, Tenant, BookingPopulated } from '@/lib/types';

// ── Types ─────────────────────────────────────────────────────────────────────

interface TimeSlot {
  time: string;
  available: boolean;
}

interface FormState {
  serviceId: string;
  barberId: string; // '' = any
  date: string;
  startTime: string;
  name: string;
  phone: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function maxDateStr(): string {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().slice(0, 10);
}

function formatDateLabel(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

// Steps: 1=Service, 2=Barber, 3=DateTime, 4=DataDiri, 5=Konfirmasi
const STEPS = ['Layanan', 'Barber', 'Jadwal', 'Data Diri', 'Konfirmasi'];

// ── Step Indicator ─────────────────────────────────────────────────────────────

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`h-1.5 rounded-full transition-all duration-300 ${
            i < current
              ? 'bg-primary flex-1'
              : i === current
              ? 'bg-primary flex-[2]'
              : 'bg-border flex-1'
          }`}
        />
      ))}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function BookingPage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant: slug } = use(params);

  // Tenant data
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loadingTenant, setLoadingTenant] = useState(true);

  // Slot data
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // Form
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>({
    serviceId: '',
    barberId: '',
    date: todayStr(),
    startTime: '',
    name: '',
    phone: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [booking, setBooking] = useState<BookingPopulated | null>(null);

  // Load tenant
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/tenants/${slug}`);
        if (!res.ok) throw new Error('not found');
        const data = await res.json();
        setTenant(data.tenant);
        setBarbers(data.barbers.filter((b: Barber) => b.isActive));
        setServices(data.services);
      } catch {
        toast.error('Barbershop tidak ditemukan');
      } finally {
        setLoadingTenant(false);
      }
    }
    load();
  }, [slug]);

  // Load slots when date/barber/service changes (step 2+)
  const loadSlots = useCallback(async () => {
    if (!form.date || step < 2) return;
    setLoadingSlots(true);
    setForm((f) => ({ ...f, startTime: '' }));
    try {
      const qs = new URLSearchParams({ date: form.date });
      if (form.barberId) qs.set('barberId', form.barberId);
      if (form.serviceId) qs.set('serviceId', form.serviceId);
      const res = await fetch(`/api/tenants/${slug}/bookings/slots?${qs}`);
      if (!res.ok) return;
      const data = await res.json();
      setSlots(data.slots);
    } catch {
      toast.error('Gagal memuat slot waktu');
    } finally {
      setLoadingSlots(false);
    }
  }, [slug, form.date, form.barberId, form.serviceId, step]);

  useEffect(() => {
    if (step === 2) loadSlots();
  }, [step, loadSlots]);

  async function handleSubmit() {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/tenants/${slug}/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer: { name: form.name.trim(), phone: form.phone.trim() },
          serviceId: form.serviceId,
          barberId: form.barberId || null,
          date: form.date,
          startTime: form.startTime,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error?.message ?? 'Booking gagal');
        return;
      }
      setBooking(data.booking);
      toast.success('Booking berhasil! Tunggu konfirmasi dari barbershop.');
    } catch {
      toast.error('Terjadi kesalahan, coba lagi');
    } finally {
      setSubmitting(false);
    }
  }

  const selectedService = services.find((s) => s.id === form.serviceId);
  const selectedBarber = barbers.find((b) => b.id === form.barberId);

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loadingTenant) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // ── Booking success view ───────────────────────────────────────────────────
  if (booking) {
    const startDate = new Date(booking.startAt);
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-50 bg-background border-b-2 border-border">
          <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Scissors className="h-5 w-5 text-primary" strokeWidth={2.5} />
              <span className="font-black text-sm uppercase tracking-tight">{tenant?.name}</span>
            </div>
            <ThemeToggle />
          </div>
        </header>
        <main className="max-w-lg mx-auto px-4 py-8 space-y-6">
          <div className="text-center space-y-2">
            <CheckCircle className="h-14 w-14 mx-auto text-primary" strokeWidth={2} />
            <h1 className="text-2xl font-black uppercase tracking-tight">Booking Dikirim!</h1>
            <p className="text-muted-foreground text-sm">
              Tunggu konfirmasi dari barbershop via WhatsApp.
            </p>
          </div>

          <Card className="border-2 divide-y divide-border">
            {[
              { label: 'Nama', value: booking.customer.name },
              { label: 'No. HP', value: booking.customer.phone },
              { label: 'Layanan', value: booking.service.name },
              { label: 'Barber', value: booking.barber?.name ?? 'Barber mana saja' },
              { label: 'Tanggal', value: formatDateLabel(booking.startAt.slice(0, 10)) },
              {
                label: 'Jam',
                value: `${startDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false })} WIB`,
              },
              { label: 'Harga', value: formatRupiah(booking.priceIdr) },
            ].map(({ label, value }) => (
              <div key={label} className="p-4 flex items-center justify-between gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-muted-foreground w-24 shrink-0">
                  {label}
                </span>
                <span className="font-bold text-right">{value}</span>
              </div>
            ))}
          </Card>

          <div className="p-4 rounded-lg border-2 border-primary/30 bg-primary/5 flex gap-3">
            <MessageCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <p className="text-sm text-foreground">
              Barbershop akan menghubungi kamu via WhatsApp untuk konfirmasi booking ini.
              Pastikan nomor HP kamu aktif.
            </p>
          </div>

          <div className="space-y-3">
            <Button
              className="w-full font-bold uppercase tracking-wide"
              onClick={() => {
                setBooking(null);
                setStep(0);
                setForm({ serviceId: '', barberId: '', date: todayStr(), startTime: '', name: '', phone: '' });
              }}
            >
              Buat Booking Lain
            </Button>
            <Button asChild variant="outline" className="w-full font-bold uppercase tracking-wide border-2">
              <Link href={`/${slug}/queue`}>
                <Scissors className="h-4 w-4 mr-2" />
                Ambil Antrian Langsung
              </Link>
            </Button>
          </div>
        </main>
      </div>
    );
  }

  // ── Form steps ────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background border-b-2 border-border">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {step > 0 ? (
              <button
                onClick={() => setStep((s) => s - 1)}
                className="flex items-center gap-1 text-sm font-bold hover:opacity-70 transition-opacity"
              >
                <ChevronLeft className="h-4 w-4" />
                Kembali
              </button>
            ) : (
              <Link
                href={`/${slug}/queue`}
                className="flex items-center gap-1 text-sm font-bold hover:opacity-70 transition-opacity"
              >
                <ArrowLeft className="h-4 w-4" />
                Kembali
              </Link>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
              {STEPS[step]}
            </span>
            <ThemeToggle />
          </div>
        </div>
        {/* Step progress bar */}
        <div className="max-w-lg mx-auto px-4 pb-2">
          <StepIndicator current={step} total={STEPS.length} />
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 pb-24">
        {/* ── Step 0: Pilih Layanan ─────────────────────────────────────── */}
        {step === 0 && (
          <div className="space-y-4">
            <div>
              <h1 className="text-2xl font-black uppercase tracking-tight">Pilih Layanan</h1>
              <p className="text-muted-foreground text-sm mt-1">Layanan apa yang kamu inginkan?</p>
            </div>
            <div className="space-y-2">
              {services.map((svc) => (
                <button
                  key={svc.id}
                  className={`w-full text-left p-4 rounded-lg border-2 transition-colors ${
                    form.serviceId === svc.id
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                  onClick={() => setForm((f) => ({ ...f, serviceId: svc.id }))}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-black">{svc.name}</div>
                      <div className="text-sm text-muted-foreground">{svc.durationMin} menit</div>
                    </div>
                    <div className="text-right">
                      <div className="font-black text-primary">{formatRupiah(svc.priceIdr)}</div>
                      {form.serviceId === svc.id && (
                        <CheckCircle className="h-4 w-4 text-primary ml-auto mt-1" />
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Step 1: Pilih Barber ──────────────────────────────────────── */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <h1 className="text-2xl font-black uppercase tracking-tight">Pilih Barber</h1>
              <p className="text-muted-foreground text-sm mt-1">Atau pilih barber mana saja.</p>
            </div>
            <div className="space-y-2">
              {/* Any barber option */}
              <button
                className={`w-full text-left p-4 rounded-lg border-2 transition-colors ${
                  form.barberId === ''
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
                onClick={() => setForm((f) => ({ ...f, barberId: '' }))}
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full border-2 border-border bg-muted flex items-center justify-center">
                    <User className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1">
                    <div className="font-black">Barber Mana Saja</div>
                    <div className="text-sm text-muted-foreground">Dilayani barber yang tersedia</div>
                  </div>
                  {form.barberId === '' && <CheckCircle className="h-4 w-4 text-primary" />}
                </div>
              </button>
              {barbers.map((b) => (
                <button
                  key={b.id}
                  className={`w-full text-left p-4 rounded-lg border-2 transition-colors ${
                    form.barberId === b.id
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                  onClick={() => setForm((f) => ({ ...f, barberId: b.id }))}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full border-2 border-border bg-muted flex items-center justify-center font-black text-lg">
                      {b.name.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <div className="font-black">{b.name}</div>
                      <div className="flex items-center gap-1">
                        <span className="h-2 w-2 rounded-full bg-green-500 inline-block" />
                        <span className="text-sm text-muted-foreground">Aktif</span>
                      </div>
                    </div>
                    {form.barberId === b.id && <CheckCircle className="h-4 w-4 text-primary" />}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Step 2: Pilih Tanggal & Waktu ────────────────────────────── */}
        {step === 2 && (
          <div className="space-y-5">
            <div>
              <h1 className="text-2xl font-black uppercase tracking-tight">Pilih Jadwal</h1>
              <p className="text-muted-foreground text-sm mt-1">Tentukan tanggal dan jam kedatangan.</p>
            </div>

            {/* Date picker */}
            <div className="space-y-2">
              <Label className="font-black uppercase text-xs tracking-wider flex items-center gap-2">
                <CalendarDays className="h-3.5 w-3.5" />
                Tanggal
              </Label>
              <input
                type="date"
                min={todayStr()}
                max={maxDateStr()}
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value, startTime: '' }))}
                className="w-full h-11 px-3 rounded-lg border-2 border-border bg-background text-foreground font-medium text-sm focus:outline-none focus:border-primary"
              />
              {form.date && (
                <p className="text-xs text-muted-foreground capitalize">{formatDateLabel(form.date)}</p>
              )}
            </div>

            {/* Time slots */}
            <div className="space-y-2">
              <Label className="font-black uppercase text-xs tracking-wider flex items-center gap-2">
                <Clock className="h-3.5 w-3.5" />
                Jam
                {loadingSlots && <RefreshCw className="h-3 w-3 animate-spin ml-1" />}
              </Label>
              {loadingSlots ? (
                <div className="text-center py-8 text-muted-foreground text-sm">Memuat slot waktu…</div>
              ) : slots.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">Pilih tanggal terlebih dahulu</div>
              ) : (
                <div className="grid grid-cols-4 gap-2">
                  {slots.map((slot) => (
                    <button
                      key={slot.time}
                      disabled={!slot.available}
                      onClick={() => setForm((f) => ({ ...f, startTime: slot.time }))}
                      className={`py-2.5 rounded-lg border-2 text-sm font-bold transition-colors ${
                        !slot.available
                          ? 'opacity-30 cursor-not-allowed border-border text-muted-foreground line-through'
                          : form.startTime === slot.time
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-border hover:border-primary/60'
                      }`}
                    >
                      {slot.time}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Step 3: Data Diri ─────────────────────────────────────────── */}
        {step === 3 && (
          <div className="space-y-4">
            <div>
              <h1 className="text-2xl font-black uppercase tracking-tight">Data Diri</h1>
              <p className="text-muted-foreground text-sm mt-1">Isi nama dan nomor HP kamu.</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="name" className="font-black uppercase text-xs tracking-wider">
                Nama Lengkap
              </Label>
              <Input
                id="name"
                placeholder="Nama lengkap kamu"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="border-2 font-medium h-11"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone" className="font-black uppercase text-xs tracking-wider">
                No. HP / WhatsApp
              </Label>
              <Input
                id="phone"
                type="tel"
                placeholder="08xxxxxxxxxx"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                className="border-2 font-medium h-11"
              />
              <p className="text-xs text-muted-foreground">
                Konfirmasi booking akan dikirim via WhatsApp ke nomor ini.
              </p>
            </div>
          </div>
        )}

        {/* ── Step 4: Review & Konfirmasi ───────────────────────────────── */}
        {step === 4 && (
          <div className="space-y-4">
            <div>
              <h1 className="text-2xl font-black uppercase tracking-tight">Konfirmasi Booking</h1>
              <p className="text-muted-foreground text-sm mt-1">Cek kembali detail booking kamu.</p>
            </div>
            <Card className="border-2 divide-y divide-border">
              {[
                { label: 'Nama', value: form.name },
                { label: 'No. HP', value: form.phone },
                { label: 'Layanan', value: selectedService?.name ?? '—' },
                { label: 'Harga', value: selectedService ? formatRupiah(selectedService.priceIdr) : '—' },
                { label: 'Durasi', value: selectedService ? `${selectedService.durationMin} menit` : '—' },
                { label: 'Barber', value: selectedBarber?.name ?? 'Barber mana saja' },
                { label: 'Tanggal', value: formatDateLabel(form.date) },
                { label: 'Jam', value: form.startTime ? `${form.startTime} WIB` : '—' },
              ].map(({ label, value }) => (
                <div key={label} className="p-3.5 flex items-center justify-between gap-2">
                  <span className="text-xs font-black uppercase tracking-wider text-muted-foreground w-20 shrink-0">
                    {label}
                  </span>
                  <span className="font-bold text-sm text-right">{value}</span>
                </div>
              ))}
            </Card>
            <div className="p-4 rounded-lg border-2 border-primary/30 bg-primary/5 flex gap-3">
              <MessageCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <p className="text-sm">
                Setelah kamu submit, barbershop akan konfirmasi via WhatsApp ke{' '}
                <strong>{form.phone}</strong>.
              </p>
            </div>
          </div>
        )}
      </main>

      {/* ── Bottom CTA ────────────────────────────────────────────────────── */}
      <div className="fixed bottom-0 inset-x-0 bg-background border-t-2 border-border p-4">
        <div className="max-w-lg mx-auto">
          {step < 4 ? (
            <Button
              className="w-full h-13 font-black uppercase tracking-wide"
              size="lg"
              disabled={
                (step === 0 && !form.serviceId) ||
                (step === 2 && (!form.date || !form.startTime)) ||
                (step === 3 && (!form.name.trim() || !form.phone.trim()))
              }
              onClick={() => setStep((s) => s + 1)}
            >
              Lanjut
              <ChevronRight className="h-5 w-5 ml-1" />
            </Button>
          ) : (
            <Button
              className="w-full h-13 font-black uppercase tracking-wide"
              size="lg"
              disabled={submitting}
              onClick={handleSubmit}
            >
              {submitting ? (
                <RefreshCw className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <CalendarDays className="h-5 w-5 mr-2" />
                  Kirim Booking
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
