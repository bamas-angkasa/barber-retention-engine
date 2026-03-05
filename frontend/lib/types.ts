// ── Tenant ────────────────────────────────────────────────────────────────────

export interface Tenant {
  id: string;
  slug: string;
  name: string;
  address?: string;
  phone?: string;
  openTime: string;   // "HH:MM"
  closeTime: string;  // "HH:MM"
  isQueuePaused?: boolean;
}

// ── Barber ────────────────────────────────────────────────────────────────────

export interface Barber {
  id: string;
  tenantId: string;
  name: string;
  isActive: boolean;
}

// ── Service ───────────────────────────────────────────────────────────────────

export interface Service {
  id: string;
  tenantId: string;
  name: string;
  priceIDR: number;
  durationMin: number;
}

// ── Customer ──────────────────────────────────────────────────────────────────

export interface Customer {
  id: string;
  tenantId: string;
  name: string;
  phoneRaw: string;
  phoneNormalized: string;
  lastVisitAt?: string | null;
  visitCount: number;
}

// ── Queue ─────────────────────────────────────────────────────────────────────

export type QueueStatus = 'WAITING' | 'IN_SERVICE' | 'DONE' | 'CANCELLED';

export interface QueueItem {
  id: string;
  tenantId: string;
  customerId: string;
  barberId?: string | null;
  serviceId: string;
  status: QueueStatus;
  ticketNumber: number;
  ticketToken: string;
  createdAt: string;
  calledAt?: string | null;
  completedAt?: string | null;
  isPaid: boolean;
  totalAmountIDR: number;
}

export interface QueueItemPopulated extends QueueItem {
  customer: Customer;
  barber?: Barber | null;
  service: Service;
}

export interface QueueStats {
  waiting: number;
  inService: number;
  doneToday: number;
  activeBarbers: number;
  estWaitMinutes: number;
  isPaused?: boolean;
}

// ── Booking ───────────────────────────────────────────────────────────────────

export type BookingStatus = 'UPCOMING' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED';

export interface Booking {
  id: string;
  tenantId: string;
  customerId: string;
  barberId?: string | null;
  serviceId: string;
  scheduledDate: string;
  scheduledTime: string;
  ticketToken: string;
  status: BookingStatus;
  notes: string;
  createdAt: string;
  confirmedAt?: string | null;
  completedAt?: string | null;
}

export interface BookingPopulated extends Booking {
  customer: Customer;
  barber?: Barber | null;
  service: Service;
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

export interface DashboardSummary {
  customersToday: number;
  revenueToday: number;
  activeQueue: number;
}

export interface BarberStats {
  barber: Barber;
  servedToday: number;
  revenueToday: number;
}

export interface DailyRevenue {
  date: string;
  count: number;
  revenue: number;
}

export interface ServiceStats {
  service: Service;
  count: number;
  revenue: number;
}

// ── Compatibility helpers ─────────────────────────────────────────────────────
// Kept as trivial wrappers so existing call sites don't need updating.

export function normalizeStats(s: QueueStats): QueueStats {
  return s;
}

export function getTicketNumber(item: QueueItem): number {
  return item.ticketNumber;
}

export function getServicePrice(s: Service): number {
  return s.priceIDR;
}
