'use client';

import { useEffect, useState, useCallback, use } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Scissors, Users, Clock, Zap, ChevronRight, RefreshCw, CheckCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ThemeToggle } from '@/components/theme-toggle';
import { LangToggle } from '@/components/lang-toggle';
import { useLang } from '@/components/lang-provider';
import { formatRupiah } from '@/lib/utils';
import type { Tenant, Barber, Service, QueueStats, QueueItemPopulated } from '@/lib/types';

// ── Types ────────────────────────────────────────────────────────────────────

interface TenantData {
  tenant: Tenant;
  barbers: Barber[];
  services: Service[];
}

interface QueueData {
  stats: QueueStats;
  items: QueueItemPopulated[];
}

interface Ticket {
  queueNumber: number;
  item: QueueItemPopulated;
  stats: QueueStats;
}

// ── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const { t } = useLang();
  const classMap: Record<string, string> = {
    WAITING: 'badge-waiting',
    IN_SERVICE: 'badge-inservice',
    DONE: 'badge-done',
    CANCELLED: 'badge-cancelled',
  };
  const label: Record<string, string> = {
    WAITING: t('statusWaiting'),
    IN_SERVICE: t('statusInService'),
    DONE: t('statusDone'),
    CANCELLED: t('statusCancelled'),
  };
  return (
    <span
      className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-bold uppercase tracking-wider ${classMap[status] ?? 'badge-waiting'}`}
    >
      {label[status] ?? status}
    </span>
  );
}

// ── Stats Bar ─────────────────────────────────────────────────────────────────

function StatsBar({ stats }: { stats: QueueStats }) {
  const { t } = useLang();
  return (
    <div className="grid grid-cols-3 gap-3">
      <Card className="flex flex-col items-center justify-center p-4 border-2">
        <Users className="h-5 w-5 mb-1 text-muted-foreground" />
        <div className="text-2xl font-black">{stats.waitingCount}</div>
        <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{t('queueWaiting')}</div>
      </Card>
      <Card className="flex flex-col items-center justify-center p-4 border-2">
        <Clock className="h-5 w-5 mb-1 text-muted-foreground" />
        <div className="text-2xl font-black">~{stats.estimatedWaitMin}</div>
        <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{t('minutes')}</div>
      </Card>
      <Card className="flex flex-col items-center justify-center p-4 border-2">
        <Zap className="h-5 w-5 mb-1 text-muted-foreground" />
        <div className="text-2xl font-black">{stats.activeBarbers}</div>
        <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{t('barber')}</div>
      </Card>
    </div>
  );
}

// ── Join Modal ────────────────────────────────────────────────────────────────

interface JoinModalProps {
  open: boolean;
  onClose: () => void;
  barbers: Barber[];
  services: Service[];
  tenantSlug: string;
  onSuccess: (ticket: Ticket) => void;
}

function JoinModal({ open, onClose, barbers, services, tenantSlug, onSuccess }: JoinModalProps) {
  const { t } = useLang();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [barberId, setBarberId] = useState<string>('any');
  const [loading, setLoading] = useState(false);

  const activeBarbers = barbers.filter((b) => b.isActive);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !phone.trim() || !serviceId) {
      toast.error(t('joinValidation'));
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/tenants/${tenantSlug}/queue/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer: { name: name.trim(), phone: phone.trim() },
          serviceId,
          barberId: barberId === 'any' ? null : barberId,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error?.message ?? t('joinError'));
        return;
      }
      onSuccess({ queueNumber: data.ticket.queueNumber, item: data.ticket.item, stats: data.stats });
      setName('');
      setPhone('');
      setServiceId('');
      setBarberId('any');
    } catch {
      toast.error(t('error'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md border-2">
        <DialogHeader>
          <DialogTitle className="text-xl font-black uppercase tracking-tight">
            {t('joinTitle')}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label htmlFor="name" className="font-bold uppercase text-xs tracking-wider">{t('joinName')}</Label>
            <Input
              id="name"
              placeholder={t('joinNamePlaceholder')}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="border-2 font-medium"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone" className="font-bold uppercase text-xs tracking-wider">{t('joinPhone')}</Label>
            <Input
              id="phone"
              type="tel"
              placeholder={t('joinPhonePlaceholder')}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="border-2 font-medium"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label className="font-bold uppercase text-xs tracking-wider">{t('joinService')}</Label>
            <Select value={serviceId} onValueChange={setServiceId} required>
              <SelectTrigger className="border-2 font-medium">
                <SelectValue placeholder={t('joinServicePlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                {services.map((svc) => (
                  <SelectItem key={svc.id} value={svc.id}>
                    <span className="font-medium">{svc.name}</span>
                    <span className="ml-2 text-muted-foreground text-sm">
                      {formatRupiah(svc.priceIdr)} · {svc.durationMin} {t('minutes')}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="font-bold uppercase text-xs tracking-wider">{t('joinBarber')}</Label>
            <Select value={barberId} onValueChange={setBarberId}>
              <SelectTrigger className="border-2 font-medium">
                <SelectValue placeholder={t('joinBarberAny')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">
                  <span className="font-medium">{t('joinBarberAny')}</span>
                </SelectItem>
                {activeBarbers.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1 border-2 font-bold uppercase tracking-wide"
              onClick={onClose}
              disabled={loading}
            >
              {t('cancel')}
            </Button>
            <Button
              type="submit"
              className="flex-1 font-bold uppercase tracking-wide"
              disabled={loading || !serviceId}
            >
              {loading ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <>{t('joinSubmit')} <ChevronRight className="h-4 w-4 ml-1" /></>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Ticket View ───────────────────────────────────────────────────────────────

function TicketView({ ticket, onReset }: { ticket: Ticket; onReset: () => void }) {
  const { t } = useLang();
  const { queueNumber, item, stats } = ticket;

  return (
    <div className="flex flex-col items-center gap-6 py-6">
      {/* Success indicator */}
      <div className="flex flex-col items-center gap-2">
        <CheckCircle className="h-12 w-12 text-primary" strokeWidth={2.5} />
        <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
          {t('queueTicketSuccess')}
        </p>
      </div>

      {/* Big queue number */}
      <Card className="w-full border-4 flex flex-col items-center justify-center py-10 relative overflow-hidden">
        <div className="text-xs font-black uppercase tracking-[0.3em] text-muted-foreground mb-2">
          {t('queueTicketNumber')}
        </div>
        <div className="queue-number font-black leading-none" aria-label={`${t('queueTicketNumber')} ${queueNumber}`}>
          {String(queueNumber).padStart(3, '0')}
        </div>
        <div className="mt-4 flex items-center gap-2">
          <StatusBadge status={item.status} />
        </div>
      </Card>

      {/* Details */}
      <Card className="w-full border-2 divide-y divide-border">
        <div className="p-4 flex items-center justify-between">
          <span className="text-sm font-bold uppercase tracking-wider text-muted-foreground">{t('name')}</span>
          <span className="font-bold">{item.customer.name}</span>
        </div>
        <div className="p-4 flex items-center justify-between">
          <span className="text-sm font-bold uppercase tracking-wider text-muted-foreground">{t('service')}</span>
          <span className="font-bold">{item.service.name}</span>
        </div>
        <div className="p-4 flex items-center justify-between">
          <span className="text-sm font-bold uppercase tracking-wider text-muted-foreground">{t('barber')}</span>
          <span className="font-bold">{item.barber?.name ?? t('joinBarberAny')}</span>
        </div>
        <div className="p-4 flex items-center justify-between">
          <span className="text-sm font-bold uppercase tracking-wider text-muted-foreground">{t('price')}</span>
          <span className="font-bold">{formatRupiah(item.priceIdr)}</span>
        </div>
        <div className="p-4 flex items-center justify-between">
          <span className="text-sm font-bold uppercase tracking-wider text-muted-foreground">{t('queueEstimatedWait')}</span>
          <span className="font-bold">~{stats.estimatedWaitMin} {t('minutes')}</span>
        </div>
      </Card>

      {/* Live stats */}
      <div className="w-full grid grid-cols-2 gap-3 text-center">
        <Card className="border-2 p-3">
          <div className="text-xl font-black">{stats.waitingCount}</div>
          <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t('queueInFront')}</div>
        </Card>
        <Card className="border-2 p-3">
          <div className="text-xl font-black">{stats.activeBarbers}</div>
          <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t('queueActiveBarbers')}</div>
        </Card>
      </div>

      <p className="text-sm text-muted-foreground text-center">
        {t('queueStayInfo')}
      </p>

      <Button
        variant="outline"
        className="w-full border-2 font-bold uppercase tracking-wide"
        onClick={onReset}
      >
        <X className="h-4 w-4 mr-2" />
        {t('queueAnotherTicket')}
      </Button>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function QueuePage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant: slug } = use(params);
  const { t, lang } = useLang();

  const [tenantData, setTenantData] = useState<TenantData | null>(null);
  const [queueData, setQueueData] = useState<QueueData | null>(null);
  const [loadingTenant, setLoadingTenant] = useState(true);
  const [joinOpen, setJoinOpen] = useState(false);
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const timeLocale = lang === 'en' ? 'en-US' : 'id-ID';

  // Load tenant info once
  useEffect(() => {
    async function loadTenant() {
      try {
        const res = await fetch(`/api/tenants/${slug}`);
        if (!res.ok) throw new Error('Not found');
        setTenantData(await res.json());
      } catch {
        toast.error(t('queueNotFound'));
      } finally {
        setLoadingTenant(false);
      }
    }
    loadTenant();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  // Poll queue stats every 10 seconds
  const refreshQueue = useCallback(async () => {
    try {
      const res = await fetch(`/api/tenants/${slug}/queue`);
      if (!res.ok) return;
      const data: QueueData = await res.json();
      setQueueData(data);
      setLastRefresh(new Date());
    } catch {
      // silent
    }
  }, [slug]);

  useEffect(() => {
    refreshQueue();
    const interval = setInterval(refreshQueue, 10_000);
    return () => clearInterval(interval);
  }, [refreshQueue]);

  function handleJoinSuccess(tk: Ticket) {
    setTicket(tk);
    setJoinOpen(false);
    refreshQueue();
    toast.success(`#${String(tk.queueNumber).padStart(3, '0')} ${t('joinSuccess')}`);
  }

  if (loadingTenant) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!tenantData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-2xl font-black">404</p>
          <p className="text-muted-foreground mt-2">{t('queueNotFound')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background border-b-2 border-border">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Scissors className="h-5 w-5 text-primary" strokeWidth={2.5} />
            <span className="font-black text-lg uppercase tracking-tight">
              {tenantData.tenant.name}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={refreshQueue}
              className="p-1.5 rounded text-muted-foreground hover:text-foreground transition-colors"
              title={t('refresh')}
            >
              <RefreshCw className="h-4 w-4" />
            </button>
            <LangToggle />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 pb-16">
        {ticket ? (
          // ── Ticket view ───────────────────────────────────────────────────
          <TicketView ticket={ticket} onReset={() => setTicket(null)} />
        ) : (
          // ── Landing / join view ───────────────────────────────────────────
          <>
            {/* Hero */}
            <div className="py-10 text-center space-y-2">
              <h1 className="text-4xl font-black uppercase tracking-tighter leading-none">
                Queue
                <br />
                <span className="text-primary">Hub</span>
              </h1>
              <p className="text-muted-foreground font-medium">
                {tenantData.tenant.address ?? 'Barbershop terbaik untuk kamu'}
              </p>
            </div>

            {/* Live stats */}
            {queueData && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-black uppercase tracking-widest text-muted-foreground">
                    {t('queueLiveStatus')}
                  </h2>
                  <span className="text-xs text-muted-foreground">
                    {lastRefresh.toLocaleTimeString(timeLocale, { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <StatsBar stats={queueData.stats} />
              </div>
            )}

            {/* CTAs */}
            <div className="space-y-3 mb-8">
              <Button
                className="w-full h-14 text-base font-black uppercase tracking-wider"
                size="lg"
                onClick={() => setJoinOpen(true)}
              >
                <Scissors className="h-5 w-5 mr-2" strokeWidth={2.5} />
                {t('queueJoinCTA')}
              </Button>
              <Button
                variant="outline"
                className="w-full h-12 font-bold uppercase tracking-wide border-2"
                size="lg"
                asChild
              >
                <Link href={`/${slug}/booking`}>
                  <Clock className="h-4 w-4 mr-2" />
                  {t('queueBookCTA')}
                </Link>
              </Button>
            </div>

            {/* Queue list */}
            {queueData && queueData.items.filter(i => i.status === 'WAITING' || i.status === 'IN_SERVICE').length > 0 && (
              <div>
                <h2 className="text-sm font-black uppercase tracking-widest text-muted-foreground mb-3">
                  {t('queueActiveList')}
                </h2>
                <div className="space-y-2">
                  {queueData.items
                    .filter((i) => i.status === 'WAITING' || i.status === 'IN_SERVICE')
                    .map((item) => (
                      <Card key={item.id} className="border-2 p-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="text-2xl font-black w-12 text-center">
                            {String(item.queueNumber).padStart(3, '0')}
                          </div>
                          <div>
                            <div className="font-bold text-sm">{item.customer.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {item.service.name}
                              {item.barber ? ` · ${item.barber.name}` : ''}
                            </div>
                          </div>
                        </div>
                        <StatusBadge status={item.status} />
                      </Card>
                    ))}
                </div>
              </div>
            )}

            {/* Services */}
            <div className="mt-8">
              <h2 className="text-sm font-black uppercase tracking-widest text-muted-foreground mb-3">
                {t('queueServices')}
              </h2>
              <div className="grid grid-cols-2 gap-2">
                {tenantData.services.map((svc) => (
                  <Card key={svc.id} className="border-2 p-3">
                    <div className="font-bold text-sm">{svc.name}</div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-primary font-black text-sm">{formatRupiah(svc.priceIdr)}</span>
                      <span className="text-xs text-muted-foreground">{svc.durationMin} {t('minutes')}</span>
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            {/* Barbers */}
            <div className="mt-6 mb-4">
              <h2 className="text-sm font-black uppercase tracking-widest text-muted-foreground mb-3">
                {t('queueBarbers')}
              </h2>
              <div className="flex flex-wrap gap-2">
                {tenantData.barbers.map((b) => (
                  <Badge
                    key={b.id}
                    variant={b.isActive ? 'default' : 'secondary'}
                    className="font-bold px-3 py-1 text-sm"
                  >
                    {b.name}
                    {b.isActive ? (
                      <span className="ml-1.5 w-1.5 h-1.5 rounded-full bg-current inline-block" />
                    ) : (
                      <span className="ml-1.5 text-xs opacity-60">off</span>
                    )}
                  </Badge>
                ))}
              </div>
            </div>
          </>
        )}
      </main>

      {/* Join modal */}
      {tenantData && (
        <JoinModal
          open={joinOpen}
          onClose={() => setJoinOpen(false)}
          barbers={tenantData.barbers}
          services={tenantData.services}
          tenantSlug={slug}
          onSuccess={handleJoinSuccess}
        />
      )}
    </div>
  );
}
