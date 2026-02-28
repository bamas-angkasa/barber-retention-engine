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
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { ThemeToggle } from '@/components/theme-toggle';
import { formatRupiah, formatTime, formatDateTime, formatDate } from '@/lib/utils';
import type {
  Barber,
  BarberStats,
  BookingPopulated,
  Customer,
  DashboardSummary,
  QueueItemPopulated,
  QueueStats,
} from '@/lib/types';

// ── Types ─────────────────────────────────────────────────────────────────────

interface QueueData {
  stats: QueueStats;
  items: QueueItemPopulated[];
}

interface DashboardData {
  summary: DashboardSummary;
  barberStats: BarberStats[];
}

// ── Status Badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const classMap: Record<string, string> = {
    WAITING: 'badge-waiting',
    IN_SERVICE: 'badge-inservice',
    DONE: 'badge-done',
    CANCELLED: 'badge-cancelled',
    UPCOMING: 'badge-waiting',
    IN_PROGRESS: 'badge-inservice',
  };
  const label: Record<string, string> = {
    WAITING: 'Menunggu',
    IN_SERVICE: 'Dilayani',
    DONE: 'Selesai',
    CANCELLED: 'Batal',
    UPCOMING: 'Upcoming',
    IN_PROGRESS: 'Berlangsung',
  };
  return (
    <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-bold uppercase tracking-wide ${classMap[status] ?? 'badge-waiting'}`}>
      {label[status] ?? status}
    </span>
  );
}

// ── Summary Cards ─────────────────────────────────────────────────────────────

function SummaryCards({ summary }: { summary: DashboardSummary }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <Card className="border-2">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <Users className="h-4 w-4" /> Pelanggan Hari Ini
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-black">{summary.customersToday}</div>
        </CardContent>
      </Card>
      <Card className="border-2">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <DollarSign className="h-4 w-4" /> Pendapatan Hari Ini
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-black">{formatRupiah(summary.revenueTodayIdr)}</div>
        </CardContent>
      </Card>
      <Card className="border-2">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <ListOrdered className="h-4 w-4" /> Antrian Aktif
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-black">{summary.activeQueueCount}</div>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Queue Live Tab ─────────────────────────────────────────────────────────────

function QueueLiveTab({
  items,
  stats,
  tenantSlug,
  onRefresh,
}: {
  items: QueueItemPopulated[];
  stats: QueueStats;
  tenantSlug: string;
  onRefresh: () => void;
}) {
  const [loadingId, setLoadingId] = useState<string | null>(null);

  async function action(queueItemId: string, endpoint: string, body?: object) {
    setLoadingId(queueItemId);
    try {
      const res = await fetch(`/api/tenants/${tenantSlug}/queue/${queueItemId}/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error?.message ?? 'Aksi gagal');
        return;
      }
      toast.success('Status antrian diperbarui');
      onRefresh();
    } catch {
      toast.error('Terjadi kesalahan');
    } finally {
      setLoadingId(null);
    }
  }

  const activeItems = items.filter((i) => i.status === 'WAITING' || i.status === 'IN_SERVICE');
  const doneItems = items.filter((i) => i.status === 'DONE' || i.status === 'CANCELLED');

  return (
    <div className="space-y-6">
      {/* Live stats mini bar */}
      <div className="grid grid-cols-4 gap-2 text-center">
        {[
          { label: 'Menunggu', value: stats.waitingCount },
          { label: 'Dilayani', value: stats.inServiceCount },
          { label: 'Est. Tunggu', value: `~${stats.estimatedWaitMin}m` },
          { label: 'Barber Aktif', value: stats.activeBarbers },
        ].map((s) => (
          <Card key={s.label} className="border-2 p-2">
            <div className="text-xl font-black">{s.value}</div>
            <div className="text-xs text-muted-foreground font-bold uppercase tracking-wide">{s.label}</div>
          </Card>
        ))}
      </div>

      {/* Active queue */}
      <div>
        <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground mb-3">
          Antrian Aktif ({activeItems.length})
        </h3>
        {activeItems.length === 0 ? (
          <Card className="border-2 p-8 text-center text-muted-foreground">
            <ListOrdered className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p className="font-bold text-sm">Tidak ada antrian aktif</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {activeItems.map((item) => (
              <Card key={item.id} className="border-2 p-4">
                <div className="flex items-start gap-4">
                  <div className="text-3xl font-black w-14 shrink-0 text-center">
                    {String(item.queueNumber).padStart(3, '0')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-black">{item.customer.name}</span>
                      <StatusBadge status={item.status} />
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {item.service.name} · {formatRupiah(item.priceIdr)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Barber: {item.barber?.name ?? '—'}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Masuk: {formatTime(item.createdAt)}
                      {item.startedAt ? ` · Mulai: ${formatTime(item.startedAt)}` : ''}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 shrink-0">
                    {item.status === 'WAITING' && (
                      <Button
                        size="sm"
                        className="font-bold uppercase tracking-wide text-xs"
                        disabled={loadingId === item.id}
                        onClick={() => action(item.id, 'start')}
                      >
                        {loadingId === item.id ? (
                          <RefreshCw className="h-3 w-3 animate-spin" />
                        ) : (
                          <><Play className="h-3 w-3 mr-1" />Mulai</>
                        )}
                      </Button>
                    )}
                    {item.status === 'IN_SERVICE' && (
                      <Button
                        size="sm"
                        className="font-bold uppercase tracking-wide text-xs"
                        disabled={loadingId === item.id}
                        onClick={() => action(item.id, 'complete', { paymentStatus: 'PAID' })}
                      >
                        {loadingId === item.id ? (
                          <RefreshCw className="h-3 w-3 animate-spin" />
                        ) : (
                          <><CheckCircle className="h-3 w-3 mr-1" />Selesai & Bayar</>
                        )}
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className="font-bold uppercase tracking-wide text-xs border-2"
                      disabled={loadingId === item.id}
                      onClick={() => action(item.id, 'cancel')}
                    >
                      <XCircle className="h-3 w-3 mr-1" />Batal
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Done/cancelled history */}
      {doneItems.length > 0 && (
        <div>
          <Separator className="my-4" />
          <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground mb-3">
            Riwayat Hari Ini ({doneItems.length})
          </h3>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-black uppercase text-xs tracking-wider">#</TableHead>
                  <TableHead className="font-black uppercase text-xs tracking-wider">Nama</TableHead>
                  <TableHead className="font-black uppercase text-xs tracking-wider">Layanan</TableHead>
                  <TableHead className="font-black uppercase text-xs tracking-wider">Harga</TableHead>
                  <TableHead className="font-black uppercase text-xs tracking-wider">Status</TableHead>
                  <TableHead className="font-black uppercase text-xs tracking-wider">Selesai</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {doneItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-black">{String(item.queueNumber).padStart(3, '0')}</TableCell>
                    <TableCell className="font-medium">{item.customer.name}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{item.service.name}</TableCell>
                    <TableCell className="font-bold text-sm">{formatRupiah(item.priceIdr)}</TableCell>
                    <TableCell><StatusBadge status={item.status} /></TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {item.completedAt ? formatTime(item.completedAt) : '—'}
                    </TableCell>
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

function BookingsTab({
  bookings,
  tenantSlug,
  onRefresh,
}: {
  bookings: BookingPopulated[];
  tenantSlug: string;
  onRefresh: () => void;
}) {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  async function bookingAction(
    bookingId: string,
    endpoint: string
  ): Promise<{ waLink?: string } | null> {
    setLoadingId(bookingId);
    try {
      const res = await fetch(
        `/api/tenants/${tenantSlug}/bookings/${bookingId}/${endpoint}`,
        { method: 'POST' }
      );
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error?.message ?? 'Aksi gagal');
        return null;
      }
      onRefresh();
      return data;
    } catch {
      toast.error('Terjadi kesalahan');
      return null;
    } finally {
      setLoadingId(null);
    }
  }

  async function handleConfirm(bookingId: string) {
    const result = await bookingAction(bookingId, 'confirm');
    if (result?.waLink) {
      window.open(result.waLink, '_blank', 'noopener');
      toast.success('Booking dikonfirmasi! WhatsApp dibuka untuk kirim notifikasi.');
    } else if (result) {
      toast.success('Booking dikonfirmasi');
    }
  }

  async function handleComplete(bookingId: string) {
    const result = await bookingAction(bookingId, 'complete');
    if (result) toast.success('Booking selesai');
  }

  async function handleCancel(bookingId: string) {
    const result = await bookingAction(bookingId, 'cancel');
    if (result) toast.success('Booking dibatalkan');
  }

  const today = new Date().toISOString().slice(0, 10);
  const upcoming = bookings.filter(
    (b) => b.status !== 'CANCELLED' && b.status !== 'DONE'
  );
  const past = bookings.filter((b) => b.status === 'DONE' || b.status === 'CANCELLED');
  const displayed = showAll ? bookings : bookings.filter((b) => b.startAt.startsWith(today) || b.status === 'UPCOMING');

  if (bookings.length === 0) {
    return (
      <Card className="border-2 p-8 text-center text-muted-foreground">
        <CalendarDays className="h-8 w-8 mx-auto mb-2 opacity-40" />
        <p className="font-bold text-sm">Tidak ada booking</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter toggle */}
      <div className="flex items-center justify-between">
        <div className="flex gap-3 text-sm font-bold text-muted-foreground">
          <span>{upcoming.length} upcoming</span>
          <span>·</span>
          <span>{past.length} selesai/batal</span>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="border-2 font-bold uppercase text-xs tracking-wide"
          onClick={() => setShowAll((v) => !v)}
        >
          {showAll ? (
            <><ChevronUp className="h-3 w-3 mr-1" />Hari ini saja</>
          ) : (
            <><ChevronDown className="h-3 w-3 mr-1" />Semua booking</>
          )}
        </Button>
      </div>

      {/* Booking cards */}
      <div className="space-y-3">
        {displayed.length === 0 && (
          <Card className="border-2 p-6 text-center text-muted-foreground">
            <p className="font-bold text-sm">Tidak ada booking untuk ditampilkan</p>
          </Card>
        )}
        {displayed.map((b) => {
          const startDate = new Date(b.startAt);
          const dateStr = startDate.toLocaleDateString('id-ID', {
            weekday: 'short', day: 'numeric', month: 'short',
          });
          const timeStr = startDate.toLocaleTimeString('id-ID', {
            hour: '2-digit', minute: '2-digit', hour12: false,
          });
          const isActive = b.status !== 'DONE' && b.status !== 'CANCELLED';
          const isLoading = loadingId === b.id;

          return (
            <Card key={b.id} className={`border-2 p-4 ${!isActive ? 'opacity-60' : ''}`}>
              <div className="flex items-start gap-3">
                {/* Time block */}
                <div className="shrink-0 text-center border-2 border-border rounded-lg p-2 min-w-[60px]">
                  <div className="text-xs font-bold text-muted-foreground uppercase">{dateStr}</div>
                  <div className="text-lg font-black leading-none mt-0.5">{timeStr}</div>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-black">{b.customer.name}</span>
                    <StatusBadge status={b.status} />
                  </div>
                  <div className="text-sm text-muted-foreground mt-0.5">
                    {b.service.name} · {formatRupiah(b.priceIdr)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Barber: {b.barber?.name ?? 'Mana saja'}
                  </div>
                  <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                    <MessageCircle className="h-3 w-3" />
                    <span>{b.customer.phone}</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              {isActive && (
                <div className="flex gap-2 mt-3 pt-3 border-t border-border">
                  <Button
                    size="sm"
                    className="flex-1 font-bold uppercase tracking-wide text-xs"
                    disabled={isLoading}
                    onClick={() => handleConfirm(b.id)}
                  >
                    {isLoading ? (
                      <RefreshCw className="h-3 w-3 animate-spin" />
                    ) : (
                      <>
                        <MessageCircle className="h-3 w-3 mr-1" />
                        Konfirmasi + WA
                      </>
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="font-bold uppercase tracking-wide text-xs border-2"
                    disabled={isLoading}
                    onClick={() => handleComplete(b.id)}
                  >
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Selesai
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="font-bold uppercase tracking-wide text-xs border-2"
                    disabled={isLoading}
                    onClick={() => handleCancel(b.id)}
                  >
                    <XCircle className="h-3 w-3 mr-1" />
                    Batal
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

function BarbersTab({
  barbers,
  barberStats,
  tenantSlug,
  onRefresh,
}: {
  barbers: Barber[];
  barberStats: BarberStats[];
  tenantSlug: string;
  onRefresh: () => void;
}) {
  const [loadingId, setLoadingId] = useState<string | null>(null);

  async function toggleBarber(barberId: string) {
    setLoadingId(barberId);
    try {
      const res = await fetch(`/api/tenants/${tenantSlug}/barbers/${barberId}/toggle`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error?.message ?? 'Gagal mengubah status barber');
        return;
      }
      toast.success(`${data.barber.name} ${data.barber.isActive ? 'diaktifkan' : 'dinonaktifkan'}`);
      onRefresh();
    } catch {
      toast.error('Terjadi kesalahan');
    } finally {
      setLoadingId(null);
    }
  }

  const statsMap = Object.fromEntries(barberStats.map((s) => [s.barberId, s]));

  return (
    <div className="space-y-3">
      {barbers.map((barber) => {
        const stats = statsMap[barber.id];
        const isLoading = loadingId === barber.id;
        return (
          <Card key={barber.id} className="border-2 p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full border-2 border-border flex items-center justify-center text-lg font-black select-none bg-muted">
                  {barber.name.charAt(0)}
                </div>
                <div>
                  <div className="font-black">{barber.name}</div>
                  <div className="text-sm text-muted-foreground flex items-center gap-3">
                    <span>Hari ini: {stats?.servedCount ?? 0} pelanggan</span>
                    <span>{formatRupiah(stats?.revenueIdr ?? 0)}</span>
                  </div>
                </div>
              </div>
              <Button
                variant={barber.isActive ? 'default' : 'outline'}
                size="sm"
                className="font-bold uppercase text-xs tracking-wide border-2 min-w-[100px]"
                disabled={isLoading}
                onClick={() => toggleBarber(barber.id)}
              >
                {isLoading ? (
                  <RefreshCw className="h-3 w-3 animate-spin" />
                ) : barber.isActive ? (
                  <><ToggleRight className="h-4 w-4 mr-1" />Aktif</>
                ) : (
                  <><ToggleLeft className="h-4 w-4 mr-1" />Nonaktif</>
                )}
              </Button>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

// ── Customers Tab ─────────────────────────────────────────────────────────────

function CustomersTab({ customers }: { customers: Customer[] }) {
  if (customers.length === 0) {
    return (
      <Card className="border-2 p-8 text-center text-muted-foreground">
        <Users className="h-8 w-8 mx-auto mb-2 opacity-40" />
        <p className="font-bold text-sm">Belum ada pelanggan</p>
      </Card>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="font-black uppercase text-xs tracking-wider">Nama</TableHead>
            <TableHead className="font-black uppercase text-xs tracking-wider">No. HP</TableHead>
            <TableHead className="font-black uppercase text-xs tracking-wider">Kunjungan</TableHead>
            <TableHead className="font-black uppercase text-xs tracking-wider">Terakhir</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {customers.map((c) => (
            <TableRow key={c.id}>
              <TableCell className="font-bold">{c.name}</TableCell>
              <TableCell className="text-muted-foreground text-sm">{c.phone}</TableCell>
              <TableCell>
                <Badge variant="secondary" className="font-bold">
                  {c.visitCount}x
                </Badge>
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

// ── Main Dashboard ────────────────────────────────────────────────────────────

export default function AdminPage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant: slug } = use(params);

  const [shopName, setShopName] = useState('Dashboard');
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [queueData, setQueueData] = useState<QueueData | null>(null);
  const [bookings, setBookings] = useState<BookingPopulated[]>([]);
  const [dashData, setDashData] = useState<DashboardData | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const fetchAll = useCallback(async () => {
    try {
      const [tenantRes, queueRes, bookingsRes, dashRes, customersRes] = await Promise.all([
        fetch(`/api/tenants/${slug}`),
        fetch(`/api/tenants/${slug}/queue`),
        fetch(`/api/tenants/${slug}/bookings?all=1`),
        fetch(`/api/tenants/${slug}/dashboard/today`),
        fetch(`/api/tenants/${slug}/customers`),
      ]);

      if (tenantRes.ok) {
        const d = await tenantRes.json();
        setShopName(d.tenant.name);
        setBarbers(d.barbers);
      }
      if (queueRes.ok) setQueueData(await queueRes.json());
      if (bookingsRes.ok) {
        const d = await bookingsRes.json();
        setBookings(d.items);
      }
      if (dashRes.ok) setDashData(await dashRes.json());
      if (customersRes.ok) {
        const d = await customersRes.json();
        setCustomers(d.customers);
      }
      setLastRefresh(new Date());
    } catch {
      toast.error('Gagal memuat data');
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 15_000);
    return () => clearInterval(interval);
  }, [fetchAll]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const today = new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

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
              <div className="text-xs text-muted-foreground">Owner Dashboard</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground hidden sm:block">
              Refresh: {lastRefresh.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="border-2"
              onClick={fetchAll}
              title="Refresh semua data"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Date */}
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-bold text-muted-foreground capitalize">{today}</span>
        </div>

        {/* Summary cards */}
        {dashData && <SummaryCards summary={dashData.summary} />}

        {/* Tabs */}
        <Tabs defaultValue="queue">
          <TabsList className="w-full border-2 border-border bg-background h-auto p-1 gap-1 grid grid-cols-4">
            <TabsTrigger
              value="queue"
              className="font-bold uppercase text-xs tracking-wide data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <ListOrdered className="h-3.5 w-3.5 mr-1" />
              <span className="hidden sm:inline">Queue</span>
              <span className="sm:hidden">Q</span>
              {queueData && (
                <span className="ml-1 text-[10px] font-black opacity-70">
                  {queueData.items.filter((i) => i.status === 'WAITING' || i.status === 'IN_SERVICE').length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="bookings"
              className="font-bold uppercase text-xs tracking-wide data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <CalendarDays className="h-3.5 w-3.5 mr-1" />
              <span className="hidden sm:inline">Bookings</span>
              <span className="sm:hidden">Bk</span>
            </TabsTrigger>
            <TabsTrigger
              value="barbers"
              className="font-bold uppercase text-xs tracking-wide data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <Scissors className="h-3.5 w-3.5 mr-1" />
              <span className="hidden sm:inline">Barbers</span>
              <span className="sm:hidden">Ba</span>
            </TabsTrigger>
            <TabsTrigger
              value="customers"
              className="font-bold uppercase text-xs tracking-wide data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <Users className="h-3.5 w-3.5 mr-1" />
              <span className="hidden sm:inline">Customers</span>
              <span className="sm:hidden">Cu</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="queue" className="mt-4">
            {queueData ? (
              <QueueLiveTab
                items={queueData.items}
                stats={queueData.stats}
                tenantSlug={slug}
                onRefresh={fetchAll}
              />
            ) : (
              <Card className="border-2 p-8 text-center text-muted-foreground">Memuat antrian…</Card>
            )}
          </TabsContent>

          <TabsContent value="bookings" className="mt-4">
            <BookingsTab bookings={bookings} tenantSlug={slug} onRefresh={fetchAll} />
          </TabsContent>

          <TabsContent value="barbers" className="mt-4">
            <BarbersTab
              barbers={barbers}
              barberStats={dashData?.barberStats ?? []}
              tenantSlug={slug}
              onRefresh={fetchAll}
            />
          </TabsContent>

          <TabsContent value="customers" className="mt-4">
            <CustomersTab customers={customers} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
