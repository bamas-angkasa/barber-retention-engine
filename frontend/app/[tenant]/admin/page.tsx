'use client';

import { useEffect, useState, useCallback, use } from 'react';
import { toast } from 'sonner';
import {
  Scissors,
  Users,
  DollarSign,
  ListOrdered,
  RefreshCw,
  Play,
  CheckCircle,
  XCircle,
  CalendarDays,
  ToggleLeft,
  ToggleRight,
  ArrowLeft,
  Clock,
  MessageCircle,
  ChevronDown,
  ChevronUp,
  Plus,
  Pencil,
  Trash2,
  Settings,
  BarChart3,
  Save,
  Sparkles,
  Pause,
  QrCode,
  Copy,
  Download,
  Lock,
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ThemeToggle } from '@/components/theme-toggle';
import { LangToggle } from '@/components/lang-toggle';
import { useLang } from '@/components/lang-provider';
import { formatRupiah, formatTime, formatDateTime, adminAuthHeaders } from '@/lib/utils';
import type {
  Barber, BarberStats, BookingPopulated, Customer,
  DashboardSummary, QueueItemPopulated, QueueStats, Service, Tenant,
  DailyRevenue, ServiceStats,
} from '@/lib/types';

// ── Types ─────────────────────────────────────────────────────────────────────
interface QueueData { stats: QueueStats; items: QueueItemPopulated[] }
// Matches Go backend /dashboard/today response shape directly
interface DashboardData extends DashboardSummary { barberStats: BarberStats[] }
// Matches Go backend /dashboard/stats response shape (last7Days, not daily)
interface WeeklyStats { last7Days: DailyRevenue[]; topBarbers: BarberStats[]; topServices: ServiceStats[]; totalRevenue: number; totalCustomers: number }

// ── Status Badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const classMap: Record<string, string> = {
    WAITING: 'badge-waiting', IN_SERVICE: 'badge-inservice',
    DONE: 'badge-done', CANCELLED: 'badge-cancelled',
    UPCOMING: 'badge-waiting', IN_PROGRESS: 'badge-inservice',
  };
  const { t } = useLang();
  const label: Record<string, string> = {
    WAITING: t('statusWaiting'), IN_SERVICE: t('statusInService'),
    DONE: t('statusDone'), CANCELLED: t('statusCancelled'),
    UPCOMING: t('statusUpcoming'), IN_PROGRESS: t('statusInProgress'),
  };
  return (
    <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-bold uppercase tracking-wide ${classMap[status] ?? 'badge-waiting'}`}>
      {label[status] ?? status}
    </span>
  );
}

// ── Setup Banner ──────────────────────────────────────────────────────────────
function SetupBanner({ hasBarbers, hasServices, tenantSlug, onTabChange }: {
  hasBarbers: boolean; hasServices: boolean; tenantSlug: string; onTabChange: (tab: string) => void;
}) {
  const { t } = useLang();
  if (hasBarbers && hasServices) return null;
  const steps = [
    { done: hasBarbers, label: t('setupAddBarber'), tab: 'barbers' },
    { done: hasServices, label: t('setupAddService'), tab: 'services' },
  ];
  return (
    <Card className="border-2 border-primary/40 bg-primary/5 p-4">
      <div className="flex items-start gap-3">
        <Sparkles className="h-5 w-5 text-primary shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <div className="font-black uppercase text-sm tracking-wide">{t('setupBannerTitle')}</div>
          <p className="text-muted-foreground text-xs mt-0.5 mb-3">{t('setupBannerDesc')}</p>
          <div className="flex flex-wrap gap-2">
            {steps.filter(s => !s.done).map(s => (
              <Button key={s.tab} size="sm"
                className="font-bold uppercase tracking-wide text-xs border-2"
                onClick={() => onTabChange(s.tab)}>
                <Plus className="h-3 w-3 mr-1" />{s.label}
              </Button>
            ))}
          </div>
        </div>
        <div className="shrink-0 text-xs font-bold text-muted-foreground">
          {steps.filter(s => s.done).length}/{steps.length}
        </div>
      </div>
    </Card>
  );
}

// ── Summary Cards ─────────────────────────────────────────────────────────────
function SummaryCards({ summary }: { summary: DashboardSummary }) {
  const { t } = useLang();
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {[
        { icon: Users, label: t('adminCustomersToday'), value: summary.customersToday ?? 0 },
        { icon: DollarSign, label: t('adminRevenueToday'), value: formatRupiah(summary.revenueToday ?? 0) },
        { icon: ListOrdered, label: t('adminActiveQueue'), value: summary.activeQueue ?? 0 },
      ].map(({ icon: Icon, label, value }) => (
        <Card key={label} className="border-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <Icon className="h-4 w-4" />{label}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black">{value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ── Queue Live Tab ─────────────────────────────────────────────────────────────
function QueueLiveTab({ items, stats, tenantSlug, isPaused, onRefresh }: {
  items: QueueItemPopulated[]; stats: QueueStats; tenantSlug: string; isPaused: boolean; onRefresh: () => void;
}) {
  const { t } = useLang();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [pauseLoading, setPauseLoading] = useState(false);

  async function togglePause() {
    setPauseLoading(true);
    try {
      const endpoint = isPaused ? 'resume' : 'pause';
      const res = await fetch(`/api/tenants/${tenantSlug}/queue/${endpoint}`, {
        method: 'POST', headers: { ...adminAuthHeaders(tenantSlug) },
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error?.message ?? t('error')); return; }
      toast.success(isPaused ? t('queueResumeSuccess') : t('queuePauseSuccess'));
      onRefresh();
    } catch { toast.error(t('error')); }
    finally { setPauseLoading(false); }
  }

  async function action(queueItemId: string, endpoint: string, body?: object) {
    setLoadingId(queueItemId);
    try {
      const res = await fetch(`/api/tenants/${tenantSlug}/queue/${queueItemId}/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...adminAuthHeaders(tenantSlug) },
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error?.message ?? t('error')); return; }
      // If start action returns a WA link, show a toast with a clickable link
      const waLink = data.data?.waLink ?? data.waLink;
      if (endpoint === 'start' && waLink) {
        toast(t('queueNotifyWA'), {
          action: { label: t('queueOpenWA'), onClick: () => window.open(waLink, '_blank') },
          duration: 8000,
        });
      } else {
        toast.success(t('queueUpdated'));
      }
      onRefresh();
    } catch { toast.error(t('error')); }
    finally { setLoadingId(null); }
  }

  const activeItems = items.filter((i) => i.status === 'WAITING' || i.status === 'IN_SERVICE');
  const doneItems = items.filter((i) => i.status === 'DONE' || i.status === 'CANCELLED');

  return (
    <div className="space-y-6">
      {/* Pause/Resume + stats row */}
      <div className="flex items-center gap-3">
        <div className="grid grid-cols-4 gap-2 text-center flex-1">
          {[
            { label: t('statusWaiting'), value: stats.waiting },
            { label: t('statusInService'), value: stats.inService },
            { label: t('queueEstWait'), value: `~${stats.estWaitMinutes}m` },
            { label: t('queueActiveBarbers'), value: stats.activeBarbers },
          ].map((s) => (
            <Card key={s.label} className="border-2 p-2">
              <div className="text-xl font-black">{s.value}</div>
              <div className="text-xs text-muted-foreground font-bold uppercase tracking-wide">{s.label}</div>
            </Card>
          ))}
        </div>
        <Button
          variant={isPaused ? 'default' : 'outline'}
          className={`font-bold uppercase tracking-wide text-xs border-2 shrink-0 ${isPaused ? '' : 'text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground'}`}
          disabled={pauseLoading}
          onClick={togglePause}
        >
          {pauseLoading ? <RefreshCw className="h-3 w-3 animate-spin mr-1" /> : isPaused ? <Play className="h-3 w-3 mr-1" /> : <Pause className="h-3 w-3 mr-1" />}
          {isPaused ? t('queueResume') : t('queuePause')}
        </Button>
      </div>

      {isPaused && (
        <Card className="border-2 border-destructive/40 bg-destructive/5 p-3 flex items-center gap-3">
          <Pause className="h-4 w-4 text-destructive shrink-0" />
          <div>
            <div className="font-black text-sm text-destructive uppercase tracking-wide">{t('queuePaused')}</div>
            <div className="text-xs text-muted-foreground">{t('queuePausedDesc')}</div>
          </div>
        </Card>
      )}


      <div>
        <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground mb-3">
          {t('queueActiveCount')} ({activeItems.length})
        </h3>
        {activeItems.length === 0 ? (
          <Card className="border-2 p-8 text-center text-muted-foreground">
            <ListOrdered className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p className="font-bold text-sm">{t('queueNoActive')}</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {activeItems.map((item) => (
              <Card key={item.id} className="border-2 p-4">
                <div className="flex items-start gap-4">
                  <div className="text-3xl font-black w-14 shrink-0 text-center">
                    {String(item.ticketNumber).padStart(3, '0')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-black">{item.customer.name}</span>
                      <StatusBadge status={item.status} />
                    </div>
                    <div className="text-sm text-muted-foreground">{item.service.name} · {formatRupiah(item.service?.priceIDR ?? 0)}</div>
                    <div className="text-sm text-muted-foreground">{t('barber')}: {item.barber?.name ?? '—'}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {t('queueEnteredAt')}: {formatTime(item.createdAt)}
                      {item.calledAt ? ` · ${t('queueStartedAt')}: ${formatTime(item.calledAt)}` : ''}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 shrink-0">
                    {item.status === 'WAITING' && (
                      <Button size="sm" className="font-bold uppercase tracking-wide text-xs"
                        disabled={loadingId === item.id} onClick={() => action(item.id, 'start')}>
                        {loadingId === item.id ? <RefreshCw className="h-3 w-3 animate-spin" /> : <><Play className="h-3 w-3 mr-1" />{t('queueActionStart')}</>}
                      </Button>
                    )}
                    {item.status === 'IN_SERVICE' && (
                      <Button size="sm" className="font-bold uppercase tracking-wide text-xs"
                        disabled={loadingId === item.id} onClick={() => action(item.id, 'complete', { isPaid: true, totalAmountIDR: item.service?.priceIDR ?? 0 })}>
                        {loadingId === item.id ? <RefreshCw className="h-3 w-3 animate-spin" /> : <><CheckCircle className="h-3 w-3 mr-1" />{t('queueActionDone')}</>}
                      </Button>
                    )}
                    <Button size="sm" variant="outline" className="font-bold uppercase tracking-wide text-xs border-2"
                      disabled={loadingId === item.id} onClick={() => action(item.id, 'cancel')}>
                      <XCircle className="h-3 w-3 mr-1" />{t('queueActionCancel')}
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {doneItems.length > 0 && (
        <div>
          <Separator className="my-4" />
          <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground mb-3">
            {t('queueHistory')} ({doneItems.length})
          </h3>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {['#', t('name'), t('service'), t('price'), t('status'), t('time')].map((h) => (
                    <TableHead key={h} className="font-black uppercase text-xs tracking-wider">{h}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {doneItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-black">{String(item.ticketNumber).padStart(3, '0')}</TableCell>
                    <TableCell className="font-medium">{item.customer.name}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{item.service.name}</TableCell>
                    <TableCell className="font-bold text-sm">{formatRupiah(item.service?.priceIDR ?? 0)}</TableCell>
                    <TableCell><StatusBadge status={item.status} /></TableCell>
                    <TableCell className="text-muted-foreground text-sm">{item.completedAt ? formatTime(item.completedAt) : '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Bookings Tab ──────────────────────────────────────────────────────────────
function BookingsTab({ bookings, tenantSlug, onRefresh }: {
  bookings: BookingPopulated[]; tenantSlug: string; onRefresh: () => void;
}) {
  const { t } = useLang();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  async function bookingAction(bookingId: string, endpoint: string): Promise<{ waLink?: string } | null> {
    setLoadingId(bookingId);
    try {
      const res = await fetch(`/api/tenants/${tenantSlug}/bookings/${bookingId}/${endpoint}`, {
        method: 'POST', headers: { ...adminAuthHeaders(tenantSlug) },
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error?.message ?? t('error')); return null; }
      onRefresh();
      return data;
    } catch { toast.error(t('error')); return null; }
    finally { setLoadingId(null); }
  }

  const today = new Date().toISOString().slice(0, 10);
  const upcoming = bookings.filter((b) => b.status !== 'DONE' && b.status !== 'CANCELLED');
  const past = bookings.filter((b) => b.status === 'DONE' || b.status === 'CANCELLED');
  const displayed = showAll ? bookings : bookings.filter((b) => (b.scheduledDate ?? '').startsWith(today) || b.status === 'UPCOMING');

  if (bookings.length === 0) return (
    <Card className="border-2 p-8 text-center text-muted-foreground">
      <CalendarDays className="h-8 w-8 mx-auto mb-2 opacity-40" />
      <p className="font-bold text-sm">{t('bookingsNoData')}</p>
    </Card>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-3 text-sm font-bold text-muted-foreground">
          <span>{upcoming.length} {t('bookingsUpcoming')}</span>
          <span>·</span>
          <span>{past.length} {t('bookingsPastLabel')}</span>
        </div>
        <Button variant="outline" size="sm" className="border-2 font-bold uppercase text-xs tracking-wide"
          onClick={() => setShowAll((v) => !v)}>
          {showAll ? <><ChevronUp className="h-3 w-3 mr-1" />{t('bookingsTodayOnly')}</> : <><ChevronDown className="h-3 w-3 mr-1" />{t('bookingsShowAll')}</>}
        </Button>
      </div>
      <div className="space-y-3">
        {displayed.length === 0 && <Card className="border-2 p-6 text-center text-muted-foreground"><p className="font-bold text-sm">{t('bookingsNoData')}</p></Card>}
        {displayed.map((b) => {
          // Support both Go backend (scheduledDate/scheduledTime) and legacy (startAt) formats
          const scheduledDatetime = b.scheduledDate && b.scheduledTime
            ? `${b.scheduledDate}T${b.scheduledTime}:00`
            : '';
          const startDate = scheduledDatetime ? new Date(scheduledDatetime) : new Date();
          const dateStr = startDate.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' });
          const timeStr = b.scheduledTime ?? startDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false });
          const isActive = b.status !== 'DONE' && b.status !== 'CANCELLED';
          const isLoading = loadingId === b.id;
          return (
            <Card key={b.id} className={`border-2 p-4 ${!isActive ? 'opacity-60' : ''}`}>
              <div className="flex items-start gap-3">
                <div className="shrink-0 text-center border-2 border-border rounded-lg p-2 min-w-[60px]">
                  <div className="text-xs font-bold text-muted-foreground uppercase">{dateStr}</div>
                  <div className="text-lg font-black leading-none mt-0.5">{timeStr}</div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-black">{b.customer.name}</span>
                    <StatusBadge status={b.status} />
                  </div>
                  <div className="text-sm text-muted-foreground">{b.service.name} · {formatRupiah(b.service?.priceIDR ?? 0)}</div>
                  <div className="text-sm text-muted-foreground">{t('barber')}: {b.barber?.name ?? '—'}</div>
                  <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                    <MessageCircle className="h-3 w-3" /><span>{b.customer.phoneRaw ?? b.customer.phoneNormalized ?? ''}</span>
                  </div>
                </div>
              </div>
              {isActive && (
                <div className="flex gap-2 mt-3 pt-3 border-t border-border">
                  <Button size="sm" className="flex-1 font-bold uppercase tracking-wide text-xs" disabled={isLoading}
                    onClick={async () => {
                      const result = await bookingAction(b.id, 'confirm');
                      if (result?.waLink) { window.open(result.waLink, '_blank', 'noopener'); toast.success(t('bookingsConfirmed')); }
                      else if (result) toast.success(t('bookingsConfirmed'));
                    }}>
                    {isLoading ? <RefreshCw className="h-3 w-3 animate-spin" /> : <><MessageCircle className="h-3 w-3 mr-1" />{t('bookingsConfirmWA')}</>}
                  </Button>
                  <Button size="sm" variant="outline" className="font-bold uppercase tracking-wide text-xs border-2" disabled={isLoading}
                    onClick={async () => { const r = await bookingAction(b.id, 'complete'); if (r) toast.success(t('bookingsCompleted')); }}>
                    <CheckCircle className="h-3 w-3 mr-1" />{t('bookingsComplete')}
                  </Button>
                  <Button size="sm" variant="outline" className="font-bold uppercase tracking-wide text-xs border-2" disabled={isLoading}
                    onClick={async () => { const r = await bookingAction(b.id, 'cancel'); if (r) toast.success(t('bookingsCancelled')); }}>
                    <XCircle className="h-3 w-3 mr-1" />{t('bookingsCancel')}
                  </Button>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ── Barbers Tab ───────────────────────────────────────────────────────────────
function BarbersTab({ barbers, barberStats, tenantSlug, onRefresh }: {
  barbers: Barber[]; barberStats: BarberStats[]; tenantSlug: string; onRefresh: () => void;
}) {
  const { t } = useLang();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [addName, setAddName] = useState('');
  const [adding, setAdding] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const statsMap = Object.fromEntries(barberStats.map((s) => [s.barber?.id, s]));

  async function toggleBarber(barberId: string) {
    setLoadingId(barberId);
    try {
      const res = await fetch(`/api/tenants/${tenantSlug}/barbers/${barberId}/toggle`, {
        method: 'POST', headers: { ...adminAuthHeaders(tenantSlug) },
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error?.message ?? t('error')); return; }
      toast.success(`${data.barber.name} ${data.barber.isActive ? t('barbersToggled') : t('barbersToggledOff')}`);
      onRefresh();
    } catch { toast.error(t('error')); }
    finally { setLoadingId(null); }
  }

  async function handleAdd() {
    if (!addName.trim()) return;
    setAdding(true);
    try {
      const res = await fetch(`/api/tenants/${tenantSlug}/barbers`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...adminAuthHeaders(tenantSlug) },
        body: JSON.stringify({ name: addName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error?.message ?? t('error')); return; }
      toast.success(t('barbersAdded'));
      setAddName('');
      onRefresh();
    } catch { toast.error(t('error')); }
    finally { setAdding(false); }
  }

  async function handleEdit(barberId: string) {
    if (!editName.trim()) return;
    setLoadingId(barberId);
    try {
      const res = await fetch(`/api/tenants/${tenantSlug}/barbers/${barberId}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json', ...adminAuthHeaders(tenantSlug) },
        body: JSON.stringify({ name: editName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error?.message ?? t('error')); return; }
      toast.success(t('barbersUpdated'));
      setEditId(null);
      onRefresh();
    } catch { toast.error(t('error')); }
    finally { setLoadingId(null); }
  }

  async function handleDelete(barberId: string, name: string) {
    if (!confirm(`${t('barbersDeleteConfirm')} (${name})?`)) return;
    setLoadingId(barberId);
    try {
      const res = await fetch(`/api/tenants/${tenantSlug}/barbers/${barberId}`, { method: 'DELETE', headers: { ...adminAuthHeaders(tenantSlug) } });
      if (!res.ok) { const d = await res.json(); toast.error(d.error?.message ?? t('error')); return; }
      toast.success(t('barbersDeleted'));
      onRefresh();
    } catch { toast.error(t('error')); }
    finally { setLoadingId(null); }
  }

  return (
    <div className="space-y-4">
      {/* Add barber */}
      <Card className="border-2 p-4">
        <div className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-3">{t('barbersAddNew')}</div>
        <div className="flex gap-2">
          <Input value={addName} onChange={(e) => setAddName(e.target.value)} placeholder={t('barbersNamePlaceholder')}
            className="border-2 font-medium" onKeyDown={(e) => e.key === 'Enter' && handleAdd()} />
          <Button className="font-bold uppercase tracking-wide text-xs border-2" disabled={adding || !addName.trim()} onClick={handleAdd}>
            {adding ? <RefreshCw className="h-3 w-3 animate-spin" /> : <><Plus className="h-3 w-3 mr-1" />{t('add')}</>}
          </Button>
        </div>
      </Card>

      {/* Barber list */}
      {barbers.map((barber) => {
        const stats = statsMap[barber.id];
        const isLoading = loadingId === barber.id;
        const isEditing = editId === barber.id;
        return (
          <Card key={barber.id} className="border-2 p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full border-2 border-border bg-muted flex items-center justify-center font-black text-lg shrink-0">
                {barber.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                {isEditing ? (
                  <div className="flex gap-2">
                    <Input value={editName} onChange={(e) => setEditName(e.target.value)}
                      className="border-2 font-medium h-8 text-sm" autoFocus
                      onKeyDown={(e) => { if (e.key === 'Enter') handleEdit(barber.id); if (e.key === 'Escape') setEditId(null); }} />
                    <Button size="sm" className="h-8 font-bold text-xs" onClick={() => handleEdit(barber.id)} disabled={isLoading}>
                      {isLoading ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                    </Button>
                    <Button size="sm" variant="outline" className="h-8 font-bold text-xs border-2" onClick={() => setEditId(null)}>{t('cancel')}</Button>
                  </div>
                ) : (
                  <>
                    <div className="font-black">{barber.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {t('barbersServedToday')}: {stats?.servedToday ?? 0} {t('barbersCustomers')} · {formatRupiah(stats?.revenueToday ?? 0)}
                    </div>
                  </>
                )}
              </div>
              {!isEditing && (
                <div className="flex items-center gap-1.5 shrink-0">
                  <Button variant={barber.isActive ? 'default' : 'outline'} size="sm"
                    className="font-bold uppercase text-xs tracking-wide border-2 min-w-[90px]"
                    disabled={isLoading} onClick={() => toggleBarber(barber.id)}>
                    {isLoading ? <RefreshCw className="h-3 w-3 animate-spin" /> :
                      barber.isActive ? <><ToggleRight className="h-3.5 w-3.5 mr-1" />{t('active')}</> :
                        <><ToggleLeft className="h-3.5 w-3.5 mr-1" />{t('inactive')}</>}
                  </Button>
                  <Button variant="outline" size="sm" className="border-2 h-8 w-8 p-0"
                    onClick={() => { setEditId(barber.id); setEditName(barber.name); }}>
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button variant="outline" size="sm" className="border-2 h-8 w-8 p-0 text-destructive hover:text-destructive"
                    disabled={isLoading} onClick={() => handleDelete(barber.id, barber.name)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}

// ── Services Tab ──────────────────────────────────────────────────────────────
function ServicesTab({ services, tenantSlug, onRefresh }: {
  services: Service[]; tenantSlug: string; onRefresh: () => void;
}) {
  const { t } = useLang();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', priceIdr: '', durationMin: '' });
  const [editForm, setEditForm] = useState({ name: '', priceIdr: '', durationMin: '' });

  async function handleAdd() {
    const price = parseInt(form.priceIdr);
    const dur = parseInt(form.durationMin);
    if (!form.name.trim() || isNaN(price) || isNaN(dur)) { toast.error(t('error')); return; }
    setAdding(true);
    try {
      const res = await fetch(`/api/tenants/${tenantSlug}/services`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...adminAuthHeaders(tenantSlug) },
        body: JSON.stringify({ name: form.name.trim(), priceIDR: price, durationMin: dur }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error?.message ?? t('error')); return; }
      toast.success(t('servicesAdded'));
      setForm({ name: '', priceIdr: '', durationMin: '' });
      onRefresh();
    } catch { toast.error(t('error')); }
    finally { setAdding(false); }
  }

  async function handleEdit(serviceId: string) {
    const price = parseInt(editForm.priceIdr);
    const dur = parseInt(editForm.durationMin);
    if (!editForm.name.trim() || isNaN(price) || isNaN(dur)) return;
    setLoadingId(serviceId);
    try {
      const res = await fetch(`/api/tenants/${tenantSlug}/services/${serviceId}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json', ...adminAuthHeaders(tenantSlug) },
        body: JSON.stringify({ name: editForm.name.trim(), priceIDR: price, durationMin: dur }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error?.message ?? t('error')); return; }
      toast.success(t('servicesUpdated'));
      setEditId(null);
      onRefresh();
    } catch { toast.error(t('error')); }
    finally { setLoadingId(null); }
  }

  async function handleDelete(serviceId: string, name: string) {
    if (!confirm(`${t('servicesDeleteConfirm')} (${name})?`)) return;
    setLoadingId(serviceId);
    try {
      const res = await fetch(`/api/tenants/${tenantSlug}/services/${serviceId}`, { method: 'DELETE', headers: { ...adminAuthHeaders(tenantSlug) } });
      if (!res.ok) { const d = await res.json(); toast.error(d.error?.message ?? t('error')); return; }
      toast.success(t('servicesDeleted'));
      onRefresh();
    } catch { toast.error(t('error')); }
    finally { setLoadingId(null); }
  }

  return (
    <div className="space-y-4">
      {/* Add form */}
      <Card className="border-2 p-4">
        <div className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-3">{t('servicesAddNew')}</div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-2">
          <div className="sm:col-span-1">
            <Label className="text-xs font-bold uppercase tracking-wider">{t('servicesNameLabel')}</Label>
            <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder={t('servicesNamePlaceholder')} className="border-2 font-medium mt-1" />
          </div>
          <div>
            <Label className="text-xs font-bold uppercase tracking-wider">{t('servicesPriceLabel')}</Label>
            <Input type="number" value={form.priceIdr} onChange={(e) => setForm((f) => ({ ...f, priceIdr: e.target.value }))}
              placeholder="35000" className="border-2 font-medium mt-1" />
          </div>
          <div>
            <Label className="text-xs font-bold uppercase tracking-wider">{t('servicesDurationLabel')}</Label>
            <Input type="number" value={form.durationMin} onChange={(e) => setForm((f) => ({ ...f, durationMin: e.target.value }))}
              placeholder="20" className="border-2 font-medium mt-1" />
          </div>
        </div>
        <Button className="font-bold uppercase tracking-wide text-xs w-full sm:w-auto"
          disabled={adding || !form.name.trim()} onClick={handleAdd}>
          {adding ? <RefreshCw className="h-3 w-3 animate-spin mr-1" /> : <Plus className="h-3 w-3 mr-1" />}
          {t('servicesAddNew')}
        </Button>
      </Card>

      {/* Service list */}
      {services.map((svc) => {
        const isLoading = loadingId === svc.id;
        const isEditing = editId === svc.id;
        return (
          <Card key={svc.id} className="border-2 p-4">
            {isEditing ? (
              <div className="space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="sm:col-span-1">
                    <Label className="text-xs font-bold">{t('servicesNameLabel')}</Label>
                    <Input value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                      className="border-2 font-medium mt-1 h-8 text-sm" />
                  </div>
                  <div>
                    <Label className="text-xs font-bold">{t('servicesPriceLabel')}</Label>
                    <Input type="number" value={editForm.priceIdr} onChange={(e) => setEditForm((f) => ({ ...f, priceIdr: e.target.value }))}
                      className="border-2 font-medium mt-1 h-8 text-sm" />
                  </div>
                  <div>
                    <Label className="text-xs font-bold">{t('servicesDurationLabel')}</Label>
                    <Input type="number" value={editForm.durationMin} onChange={(e) => setEditForm((f) => ({ ...f, durationMin: e.target.value }))}
                      className="border-2 font-medium mt-1 h-8 text-sm" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" className="font-bold text-xs" onClick={() => handleEdit(svc.id)} disabled={isLoading}>
                    {isLoading ? <RefreshCw className="h-3 w-3 animate-spin" /> : <><Save className="h-3 w-3 mr-1" />{t('save')}</>}
                  </Button>
                  <Button size="sm" variant="outline" className="font-bold text-xs border-2" onClick={() => setEditId(null)}>{t('cancel')}</Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="font-black">{svc.name}</div>
                  <div className="text-sm text-muted-foreground">{formatRupiah(svc.priceIDR ?? 0)} · {svc.durationMin} {t('minutes')}</div>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <Button variant="outline" size="sm" className="border-2 h-8 w-8 p-0"
                    onClick={() => { setEditId(svc.id); setEditForm({ name: svc.name, priceIdr: String(svc.priceIDR ?? 0), durationMin: String(svc.durationMin) }); }}>
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button variant="outline" size="sm" className="border-2 h-8 w-8 p-0 text-destructive hover:text-destructive"
                    disabled={isLoading} onClick={() => handleDelete(svc.id, svc.name)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}

// ── Customers Tab ─────────────────────────────────────────────────────────────
function CustomersTab({ customers }: { customers: Customer[] }) {
  const { t } = useLang();
  if (customers.length === 0) return (
    <Card className="border-2 p-8 text-center text-muted-foreground">
      <Users className="h-8 w-8 mx-auto mb-2 opacity-40" />
      <p className="font-bold text-sm">{t('customersNoData')}</p>
    </Card>
  );
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            {[t('name'), t('phone'), t('customersVisitCount'), t('customersLastVisit')].map((h) => (
              <TableHead key={h} className="font-black uppercase text-xs tracking-wider">{h}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {customers.map((c) => (
            <TableRow key={c.id}>
              <TableCell className="font-bold">{c.name}</TableCell>
              <TableCell className="text-muted-foreground text-sm">{c.phoneRaw ?? c.phoneNormalized ?? ''}</TableCell>
              <TableCell>
                <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold bg-secondary text-secondary-foreground">
                  {c.visitCount}x
                </span>
              </TableCell>
              <TableCell className="text-muted-foreground text-sm">
                {c.lastVisitAt ? formatDateTime(c.lastVisitAt) : '—'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// ── Settings Tab ──────────────────────────────────────────────────────────────
function SettingsTab({ tenant, tenantSlug, onRefresh }: {
  tenant: Tenant; tenantSlug: string; onRefresh: () => void;
}) {
  const { t } = useLang();
  const [form, setForm] = useState({
    name: tenant.name,
    address: tenant.address ?? '',
    phone: tenant.phone ?? '',
    openTime: tenant.openTime ?? '09:00',
    closeTime: tenant.closeTime ?? '20:00',
  });
  const [saving, setSaving] = useState(false);
  const [pinForm, setPinForm] = useState({ currentPin: '', newPin: '', confirmPin: '' });
  const [pinSaving, setPinSaving] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  const queueUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/${tenantSlug}/queue`
    : `/${tenantSlug}/queue`;

  useEffect(() => {
    import('qrcode').then((QRCode) => {
      QRCode.toDataURL(queueUrl, { width: 200, margin: 2 }).then(setQrDataUrl);
    });
  }, [queueUrl]);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/tenants/${tenantSlug}/settings`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json', ...adminAuthHeaders(tenantSlug) },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error?.message ?? t('error')); return; }
      toast.success(t('settingsSaved'));
      onRefresh();
    } catch { toast.error(t('error')); }
    finally { setSaving(false); }
  }

  async function handleChangePin() {
    if (!pinForm.currentPin || !pinForm.newPin || !pinForm.confirmPin) return;
    if (pinForm.newPin !== pinForm.confirmPin) { toast.error(t('onboardPinMismatch')); return; }
    setPinSaving(true);
    try {
      const res = await fetch(`/api/tenants/${tenantSlug}/auth/change-pin`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...adminAuthHeaders(tenantSlug) },
        body: JSON.stringify(pinForm),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error?.message ?? t('error')); return; }
      toast.success(t('settingsPinChanged'));
      setPinForm({ currentPin: '', newPin: '', confirmPin: '' });
    } catch { toast.error(t('error')); }
    finally { setPinSaving(false); }
  }

  function handleDownloadQR() {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `${tenantSlug}-qr.png`;
    a.click();
  }

  function handleCopyLink() {
    navigator.clipboard.writeText(queueUrl).then(() => toast.success(t('settingsCopied')));
  }

  return (
    <div className="space-y-4 max-w-lg">
      {/* Shop info */}
      <Card className="border-2 p-6 space-y-4">
        <h3 className="font-black uppercase tracking-widest text-sm">{t('settingsTitle')}</h3>
        {[
          { key: 'name', label: t('settingsShopName'), placeholder: 'Cugo Barbershop' },
          { key: 'address', label: t('settingsAddress'), placeholder: 'Jl. Sudirman No. 12, Jakarta' },
          { key: 'phone', label: t('settingsPhone'), placeholder: '08123456789' },
        ].map(({ key, label, placeholder }) => (
          <div key={key} className="space-y-1.5">
            <Label className="font-black uppercase text-xs tracking-wider">{label}</Label>
            <Input value={form[key as keyof typeof form]}
              onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
              placeholder={placeholder} className="border-2 font-medium" />
          </div>
        ))}
        <div className="grid grid-cols-2 gap-3">
          {[
            { key: 'openTime', label: t('settingsOpenHour') },
            { key: 'closeTime', label: t('settingsCloseHour') },
          ].map(({ key, label }) => (
            <div key={key} className="space-y-1.5">
              <Label className="font-black uppercase text-xs tracking-wider">{label}</Label>
              <input type="time" value={form[key as keyof typeof form]}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                className="w-full h-10 px-3 rounded-lg border-2 border-border bg-background text-foreground font-medium text-sm focus:outline-none focus:border-primary" />
            </div>
          ))}
        </div>
        <Button className="w-full font-bold uppercase tracking-wide" onClick={handleSave} disabled={saving}>
          {saving ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
          {t('save')}
        </Button>
      </Card>

      {/* Change PIN */}
      <Card className="border-2 p-6 space-y-4">
        <h3 className="font-black uppercase tracking-widest text-sm flex items-center gap-2">
          <Lock className="h-4 w-4" />{t('settingsChangePinTitle')}
        </h3>
        {[
          { key: 'currentPin', label: t('settingsCurrentPin') },
          { key: 'newPin', label: t('settingsNewPin') },
          { key: 'confirmPin', label: t('settingsConfirmNewPin') },
        ].map(({ key, label }) => (
          <div key={key} className="space-y-1.5">
            <Label className="font-black uppercase text-xs tracking-wider">{label}</Label>
            <Input
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={pinForm[key as keyof typeof pinForm]}
              onChange={(e) => setPinForm((f) => ({ ...f, [key]: e.target.value.replace(/\D/g, '') }))}
              placeholder="••••"
              className="border-2 font-medium"
            />
          </div>
        ))}
        <Button className="w-full font-bold uppercase tracking-wide" onClick={handleChangePin} disabled={pinSaving || !pinForm.currentPin || !pinForm.newPin || !pinForm.confirmPin}>
          {pinSaving ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Lock className="h-4 w-4 mr-2" />}
          {t('settingsChangePinTitle')}
        </Button>
      </Card>

      {/* QR Code */}
      <Card className="border-2 p-6 space-y-4">
        <h3 className="font-black uppercase tracking-widest text-sm flex items-center gap-2">
          <QrCode className="h-4 w-4" />{t('settingsQRTitle')}
        </h3>
        <p className="text-xs text-muted-foreground">{t('settingsQRDesc')}</p>
        <div className="flex flex-col items-center gap-3">
          {qrDataUrl ? (
            <img src={qrDataUrl} alt="QR Code" className="w-40 h-40 rounded-lg border-2 border-border" />
          ) : (
            <div className="w-40 h-40 rounded-lg border-2 border-border flex items-center justify-center">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}
          <div className="w-full space-y-2">
            <div className="flex items-center gap-2 bg-muted rounded-lg px-3 py-2 border-2 border-border">
              <span className="text-xs font-medium flex-1 truncate text-muted-foreground">{queueUrl}</span>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 font-bold uppercase tracking-wide text-xs border-2" onClick={handleCopyLink}>
                <Copy className="h-3 w-3 mr-1" />{t('settingsCopyLink')}
              </Button>
              <Button className="flex-1 font-bold uppercase tracking-wide text-xs" onClick={handleDownloadQR} disabled={!qrDataUrl}>
                <Download className="h-3 w-3 mr-1" />{t('settingsQRDownload')}
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

// ── Reports Tab ───────────────────────────────────────────────────────────────
function ReportsTab({ stats }: { stats: WeeklyStats | null }) {
  const { t } = useLang();
  if (!stats) return <div className="text-center py-8 text-muted-foreground text-sm">{t('loading')}</div>;

  const maxRevenue = Math.max(...stats.last7Days.map((d) => d.revenue ?? 0), 1);

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: t('reportsTotalRevenue'), value: formatRupiah(stats.totalRevenue) },
          { label: t('reportsTotalCustomers'), value: stats.totalCustomers },
          { label: t('reportsAvgPerDay'), value: formatRupiah(Math.round(stats.totalRevenue / 7)) },
        ].map(({ label, value }) => (
          <Card key={label} className="border-2 p-3 text-center">
            <div className="text-lg font-black">{value}</div>
            <div className="text-xs text-muted-foreground font-bold uppercase tracking-wide mt-0.5">{label}</div>
          </Card>
        ))}
      </div>

      {/* Bar chart — 7 days */}
      <Card className="border-2 p-4">
        <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-4">{t('reportsLast7Days')}</h3>
        <div className="flex items-end gap-2 h-32">
          {stats.last7Days.map((d) => {
            const rev = d.revenue ?? 0;
            const pct = maxRevenue > 0 ? (rev / maxRevenue) * 100 : 0;
            const isToday = d.date === new Date().toISOString().slice(0, 10);
            const dayLabel = d.date?.slice(5) ?? '';
            return (
              <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                <div className="text-xs font-bold text-muted-foreground w-full text-center truncate" title={formatRupiah(rev)}>
                  {rev > 0 ? `${Math.round(rev / 1000)}k` : '—'}
                </div>
                <div className="w-full flex flex-col justify-end" style={{ height: '80px' }}>
                  <div
                    className={`w-full rounded-sm transition-all ${isToday ? 'bg-primary' : 'bg-primary/30'}`}
                    style={{ height: `${Math.max(pct, rev > 0 ? 4 : 0)}%` }}
                  />
                </div>
                <div className={`text-xs font-bold ${isToday ? 'text-primary' : 'text-muted-foreground'}`}>{dayLabel}</div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Top Barbers */}
      {stats.topBarbers.length > 0 && (
        <Card className="border-2 p-4">
          <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-3">{t('reportsTopBarbers')}</h3>
          <div className="space-y-2">
            {stats.topBarbers.map((b, i) => {
              const bName = b.barber?.name ?? '—';
              const bKey = b.barber?.id ?? String(i);
              const bServed = b.servedToday ?? 0;
              const bRevenue = b.revenueToday ?? 0;
              const topServed = stats.topBarbers[0]?.servedToday ?? 1;
              return (
              <div key={bKey} className="flex items-center gap-3">
                <div className="text-lg font-black w-6 text-muted-foreground">#{i + 1}</div>
                <div className="flex-1">
                  <div className="font-bold text-sm">{bName}</div>
                  <div className="text-xs text-muted-foreground">{bServed} {t('reportsServed')} · {formatRupiah(bRevenue)}</div>
                </div>
                <div className="h-2 w-24 bg-secondary rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full" style={{ width: `${(bServed / (topServed || 1)) * 100}%` }} />
                </div>
              </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Top Services */}
      {stats.topServices.length > 0 && (
        <Card className="border-2 p-4">
          <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-3">{t('reportsTopServices')}</h3>
          <div className="space-y-2">
            {stats.topServices.map((s, i) => {
              const sName = s.service?.name ?? '—';
              const sKey = s.service?.id ?? String(i);
              const sCount = s.count ?? 0;
              const sRevenue = s.revenue ?? 0;
              const topCount = stats.topServices[0]?.count ?? 1;
              return (
              <div key={sKey} className="flex items-center gap-3">
                <div className="text-lg font-black w-6 text-muted-foreground">#{i + 1}</div>
                <div className="flex-1">
                  <div className="font-bold text-sm">{sName}</div>
                  <div className="text-xs text-muted-foreground">{sCount}x · {formatRupiah(sRevenue)}</div>
                </div>
                <div className="h-2 w-24 bg-secondary rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full" style={{ width: `${(sCount / (topCount || 1)) * 100}%` }} />
                </div>
              </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function AdminPage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant: slug } = use(params);
  const { t } = useLang();

  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [shopName, setShopName] = useState('Dashboard');
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [queueData, setQueueData] = useState<QueueData | null>(null);
  const [bookings, setBookings] = useState<BookingPopulated[]>([]);
  const [dashData, setDashData] = useState<DashboardData | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [weeklyStats, setWeeklyStats] = useState<WeeklyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [activeTab, setActiveTab] = useState('queue');

  // Auth: get token from localStorage
  function getAuthHeaders(): HeadersInit {
    if (typeof window === 'undefined') return {};
    const token = localStorage.getItem(`admin_token_${slug}`);
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  const fetchAll = useCallback(async () => {
    try {
      const headers = getAuthHeaders();
      const [tenantRes, queueRes, bookingsRes, dashRes, customersRes, statsRes] = await Promise.all([
        fetch(`/api/tenants/${slug}`, { headers }),
        fetch(`/api/tenants/${slug}/queue`, { headers }),
        fetch(`/api/tenants/${slug}/bookings?all=1`, { headers }),
        fetch(`/api/tenants/${slug}/dashboard/today`, { headers }),
        fetch(`/api/tenants/${slug}/customers`, { headers }),
        fetch(`/api/tenants/${slug}/dashboard/stats`, { headers }),
      ]);
      // Redirect to login on 401
      if ([dashRes, customersRes, statsRes].some(r => r.status === 401)) {
        window.location.href = `/${slug}/admin/login`;
        return;
      }
      if (tenantRes.ok) {
        const d = await tenantRes.json();
        setTenant(d.data?.tenant ?? d.tenant);
        setShopName(d.data?.tenant?.name ?? d.tenant?.name ?? 'Dashboard');
        setBarbers(d.data?.barbers ?? d.barbers ?? []);
        setServices(d.data?.services ?? d.services ?? []);
      }
      if (queueRes.ok) { const d = await queueRes.json(); setQueueData(d.data ?? d); }
      if (bookingsRes.ok) { const d = await bookingsRes.json(); setBookings(d.data ?? d.items ?? []); }
      if (dashRes.ok) { const d = await dashRes.json(); setDashData(d.data ?? d); }
      if (customersRes.ok) { const d = await customersRes.json(); setCustomers(d.data ?? d.customers ?? []); }
      if (statsRes.ok) { const d = await statsRes.json(); setWeeklyStats(d.data ?? d); }
      setLastRefresh(new Date());
    } catch { toast.error(t('error')); }
    finally { setLoading(false); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, t]);

  useEffect(() => {
    fetchAll();
    // SSE for real-time queue updates
    let es: EventSource | null = null;
    try {
      es = new EventSource(`/api/tenants/${slug}/queue/stream`);
      es.onmessage = (e) => {
        try {
          const event = JSON.parse(e.data);
          if (event.type === 'QUEUE_UPDATE') {
            setQueueData({ stats: event.stats, items: event.items });
            setLastRefresh(new Date());
          }
        } catch {}
      };
      es.onerror = () => {
        // Fallback to polling if SSE fails
        es?.close();
        const interval = setInterval(fetchAll, 15_000);
        return () => clearInterval(interval);
      };
    } catch {
      const interval = setInterval(fetchAll, 15_000);
      return () => clearInterval(interval);
    }
    return () => es?.close();
  }, [fetchAll, slug]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );

  const today = new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background border-b-2 border-border">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href={`/${slug}/queue`} className="text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <Scissors className="h-5 w-5 text-primary" strokeWidth={2.5} />
            <div>
              <div className="font-black text-sm uppercase tracking-tight leading-none">{shopName}</div>
              <div className="text-xs text-muted-foreground">{t('adminDashboard')}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground hidden sm:block">
              {lastRefresh.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
            </span>
            <Button variant="outline" size="icon" className="border-2" onClick={fetchAll} title={t('refresh')}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            <LangToggle />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-bold text-muted-foreground capitalize">{today}</span>
        </div>

        <SetupBanner
          hasBarbers={barbers.length > 0}
          hasServices={services.length > 0}
          tenantSlug={slug}
          onTabChange={setActiveTab}
        />

        {dashData && <SummaryCards summary={dashData} />}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full border-2 border-border bg-background h-auto p-1 gap-1 grid grid-cols-7">
            {[
              { value: 'queue', icon: ListOrdered, label: t('tabQueue'), badge: queueData?.items.filter((i) => i.status === 'WAITING' || i.status === 'IN_SERVICE').length },
              { value: 'bookings', icon: CalendarDays, label: t('tabBookings') },
              { value: 'barbers', icon: Scissors, label: t('tabBarbers') },
              { value: 'services', icon: Settings, label: t('tabServices') },
              { value: 'customers', icon: Users, label: t('tabCustomers') },
              { value: 'reports', icon: BarChart3, label: t('tabReports') },
              { value: 'settings', icon: Settings, label: t('tabSettings') },
            ].map(({ value, icon: Icon, label, badge }) => (
              <TabsTrigger key={value} value={value}
                className="font-bold uppercase text-[10px] tracking-wide data-[state=active]:bg-primary data-[state=active]:text-primary-foreground flex-col sm:flex-row gap-0.5 py-2 px-1">
                <Icon className="h-3 w-3" />
                <span className="hidden sm:inline">{label}</span>
                {badge !== undefined && badge > 0 && <span className="ml-0.5 text-[9px] font-black opacity-80">{badge}</span>}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="queue" className="mt-4">
            {queueData ? <QueueLiveTab items={queueData.items} stats={queueData.stats} tenantSlug={slug} isPaused={queueData.stats.isPaused ?? tenant?.isQueuePaused ?? false} onRefresh={fetchAll} /> :
              <Card className="border-2 p-8 text-center text-muted-foreground">{t('loading')}</Card>}
          </TabsContent>
          <TabsContent value="bookings" className="mt-4">
            <BookingsTab bookings={bookings} tenantSlug={slug} onRefresh={fetchAll} />
          </TabsContent>
          <TabsContent value="barbers" className="mt-4">
            <BarbersTab barbers={barbers} barberStats={dashData?.barberStats ?? []} tenantSlug={slug} onRefresh={fetchAll} />
          </TabsContent>
          <TabsContent value="services" className="mt-4">
            <ServicesTab services={services} tenantSlug={slug} onRefresh={fetchAll} />
          </TabsContent>
          <TabsContent value="customers" className="mt-4">
            <CustomersTab customers={customers} />
          </TabsContent>
          <TabsContent value="reports" className="mt-4">
            <ReportsTab stats={weeklyStats} />
          </TabsContent>
          <TabsContent value="settings" className="mt-4">
            {tenant && <SettingsTab tenant={tenant} tenantSlug={slug} onRefresh={fetchAll} />}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
