export interface Tenant {
  id: string;
  slug: string;
  name: string;
  logoUrl?: string;
  address?: string;
  phone?: string;
  openHour?: string;  // "HH:MM" e.g. "09:00"
  closeHour?: string; // "HH:MM" e.g. "20:00"
}

export interface Barber {
  id: string;
  tenantId: string;
  name: string;
  avatarUrl?: string;
  isActive: boolean;
}

export interface Service {
  id: string;
  tenantId: string;
  name: string;
  priceIdr: number;
  durationMin: number;
}

export interface Customer {
  id: string;
  tenantId: string;
  name: string;
  phone: string;
  lastVisitAt?: string | null;
  visitCount: number;
}

export type QueueStatus = 'WAITING' | 'IN_SERVICE' | 'DONE' | 'CANCELLED';
export type PaymentStatus = 'UNPAID' | 'PAID';

export interface QueueItem {
  id: string;
  tenantId: string;
  customerId: string;
  barberId?: string | null;
  serviceId: string;
  status: QueueStatus;
  queueNumber: number;
  createdAt: string;
  startedAt?: string | null;
  completedAt?: string | null;
  paymentStatus: PaymentStatus;
  priceIdr: number;
}

export interface QueueItemPopulated extends QueueItem {
  customer: Customer;
  barber?: Barber | null;
  service: Service;
}

export type BookingStatus = 'UPCOMING' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED';

export interface Booking {
  id: string;
  tenantId: string;
  customerId: string;
  barberId?: string | null;
  serviceId: string;
  startAt: string;
  endAt: string;
  status: BookingStatus;
  priceIdr: number;
}

export interface BookingPopulated extends Booking {
  customer: Customer;
  barber?: Barber | null;
  service: Service;
}

export interface QueueStats {
  waitingCount: number;
  inServiceCount: number;
  estimatedWaitMin: number;
  activeBarbers: number;
}

export interface DashboardSummary {
  customersToday: number;
  revenueTodayIdr: number;
  activeQueueCount: number;
}

export interface BarberStats {
  barberId: string;
  barberName: string;
  servedCount: number;
  revenueIdr: number;
}

export interface DailyRevenue {
  date: string;       // "YYYY-MM-DD"
  label: string;      // "Mon", "Tue", etc.
  revenueIdr: number;
  customerCount: number;
}

export interface ServiceStats {
  serviceId: string;
  serviceName: string;
  count: number;
  revenueIdr: number;
}
