import type {
  Tenant,
  Barber,
  Service,
  Customer,
  QueueItem,
  QueueItemPopulated,
  QueueStats,
  Booking,
  BookingPopulated,
  DashboardSummary,
  BarberStats,
} from './types';

// ── Helpers ───────────────────────────────────────────────────────────────────

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function hoursAgo(h: number): string {
  return new Date(Date.now() - h * 60 * 60 * 1000).toISOString();
}

function todayAt(hhmm: string): string {
  const [hh, mm] = hhmm.split(':').map(Number);
  const d = new Date();
  d.setHours(hh, mm, 0, 0);
  return d.toISOString();
}

function tomorrowAt(hhmm: string): string {
  const [hh, mm] = hhmm.split(':').map(Number);
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(hh, mm, 0, 0);
  return d.toISOString();
}

// ── In-memory store ───────────────────────────────────────────────────────────

interface Store {
  tenants: Tenant[];
  barbers: Barber[];
  services: Service[];
  customers: Customer[];
  queueItems: QueueItem[];
  bookings: Booking[];
}

// ── Seed data ─────────────────────────────────────────────────────────────────

const TENANT_ID = 'tenant_cugo';

const SEED_TENANTS: Tenant[] = [
  {
    id: TENANT_ID,
    slug: 'cugo',
    name: 'Cugo Barbershop',
    address: 'Jl. Sudirman No. 12, Jakarta',
    phone: '021-5555-1234',
  },
];

const SEED_BARBERS: Barber[] = [
  { id: 'barber_1', tenantId: TENANT_ID, name: 'Arief Aji Saputra', isActive: true },
  { id: 'barber_2', tenantId: TENANT_ID, name: 'Budi Santoso', isActive: true },
  { id: 'barber_3', tenantId: TENANT_ID, name: 'Cahyo Wibowo', isActive: false },
];

const SEED_SERVICES: Service[] = [
  { id: 'svc_1', tenantId: TENANT_ID, name: 'Reguler Haircut', priceIdr: 35000, durationMin: 20 },
  { id: 'svc_2', tenantId: TENANT_ID, name: 'Haircut + Shave', priceIdr: 55000, durationMin: 35 },
  { id: 'svc_3', tenantId: TENANT_ID, name: 'Fade + Styling', priceIdr: 65000, durationMin: 40 },
  { id: 'svc_4', tenantId: TENANT_ID, name: 'Kids Haircut', priceIdr: 25000, durationMin: 15 },
];

const SEED_CUSTOMERS: Customer[] = [
  {
    id: 'cust_1',
    tenantId: TENANT_ID,
    name: 'Rizki Hartono',
    phone: '08111111111',
    lastVisitAt: hoursAgo(5),
    visitCount: 8,
  },
  {
    id: 'cust_2',
    tenantId: TENANT_ID,
    name: 'Dimas Wijaya',
    phone: '08222222222',
    lastVisitAt: hoursAgo(10),
    visitCount: 3,
  },
  {
    id: 'cust_3',
    tenantId: TENANT_ID,
    name: 'Farhan Aziz',
    phone: '08333333333',
    lastVisitAt: hoursAgo(2),
    visitCount: 12,
  },
  {
    id: 'cust_4',
    tenantId: TENANT_ID,
    name: 'Gilang Nugraha',
    phone: '08444444444',
    lastVisitAt: null,
    visitCount: 0,
  },
  {
    id: 'cust_5',
    tenantId: TENANT_ID,
    name: 'Hendra Kusuma',
    phone: '08555555555',
    lastVisitAt: hoursAgo(48),
    visitCount: 5,
  },
];

function makeSeedQueue(): QueueItem[] {
  return [
    {
      id: 'q_1',
      tenantId: TENANT_ID,
      customerId: 'cust_1',
      barberId: 'barber_1',
      serviceId: 'svc_1',
      status: 'DONE',
      queueNumber: 1,
      createdAt: hoursAgo(4),
      startedAt: hoursAgo(3.5),
      completedAt: hoursAgo(3),
      paymentStatus: 'PAID',
      priceIdr: 35000,
    },
    {
      id: 'q_2',
      tenantId: TENANT_ID,
      customerId: 'cust_2',
      barberId: 'barber_2',
      serviceId: 'svc_2',
      status: 'DONE',
      queueNumber: 2,
      createdAt: hoursAgo(3),
      startedAt: hoursAgo(2.5),
      completedAt: hoursAgo(2),
      paymentStatus: 'PAID',
      priceIdr: 55000,
    },
    {
      id: 'q_3',
      tenantId: TENANT_ID,
      customerId: 'cust_3',
      barberId: 'barber_1',
      serviceId: 'svc_3',
      status: 'IN_SERVICE',
      queueNumber: 3,
      createdAt: hoursAgo(1.5),
      startedAt: hoursAgo(0.5),
      completedAt: null,
      paymentStatus: 'UNPAID',
      priceIdr: 65000,
    },
    {
      id: 'q_4',
      tenantId: TENANT_ID,
      customerId: 'cust_4',
      barberId: null,
      serviceId: 'svc_1',
      status: 'WAITING',
      queueNumber: 4,
      createdAt: hoursAgo(0.5),
      startedAt: null,
      completedAt: null,
      paymentStatus: 'UNPAID',
      priceIdr: 35000,
    },
    {
      id: 'q_5',
      tenantId: TENANT_ID,
      customerId: 'cust_5',
      barberId: 'barber_2',
      serviceId: 'svc_4',
      status: 'WAITING',
      queueNumber: 5,
      createdAt: hoursAgo(0.3),
      startedAt: null,
      completedAt: null,
      paymentStatus: 'UNPAID',
      priceIdr: 25000,
    },
  ];
}

function makeSeedBookings(): Booking[] {
  return [
    {
      id: 'book_1',
      tenantId: TENANT_ID,
      customerId: 'cust_1',
      barberId: 'barber_1',
      serviceId: 'svc_2',
      startAt: todayAt('14:00'),
      endAt: todayAt('14:35'),
      status: 'UPCOMING',
      priceIdr: 55000,
    },
    {
      id: 'book_2',
      tenantId: TENANT_ID,
      customerId: 'cust_3',
      barberId: 'barber_2',
      serviceId: 'svc_3',
      startAt: todayAt('15:00'),
      endAt: todayAt('15:40'),
      status: 'UPCOMING',
      priceIdr: 65000,
    },
    {
      id: 'book_3',
      tenantId: TENANT_ID,
      customerId: 'cust_2',
      barberId: null,
      serviceId: 'svc_1',
      startAt: tomorrowAt('10:00'),
      endAt: tomorrowAt('10:20'),
      status: 'UPCOMING',
      priceIdr: 35000,
    },
    {
      id: 'book_4',
      tenantId: TENANT_ID,
      customerId: 'cust_5',
      barberId: 'barber_1',
      serviceId: 'svc_1',
      startAt: todayAt('16:00'),
      endAt: todayAt('16:20'),
      status: 'UPCOMING',
      priceIdr: 35000,
    },
  ];
}

// ── Module-level store (Vercel-safe, no globals/ESM deps) ─────────────────────
// Each cold start re-seeds. State persists within the same serverless instance.

const store: Store = {
  tenants: [...SEED_TENANTS],
  barbers: [...SEED_BARBERS],
  services: [...SEED_SERVICES],
  customers: [...SEED_CUSTOMERS],
  queueItems: makeSeedQueue(),
  bookings: makeSeedBookings(),
};

// ── Internal helpers ──────────────────────────────────────────────────────────

function populateQueueItem(item: QueueItem): QueueItemPopulated {
  const customer = store.customers.find((c) => c.id === item.customerId)!;
  const barber = item.barberId ? store.barbers.find((b) => b.id === item.barberId) ?? null : null;
  const service = store.services.find((s) => s.id === item.serviceId)!;
  return { ...item, customer, barber, service };
}

function populateBooking(booking: Booking): BookingPopulated {
  const customer = store.customers.find((c) => c.id === booking.customerId)!;
  const barber = booking.barberId
    ? store.barbers.find((b) => b.id === booking.barberId) ?? null
    : null;
  const service = store.services.find((s) => s.id === booking.serviceId)!;
  return { ...booking, customer, barber, service };
}

function computeStats(tenantId: string): QueueStats {
  const today = todayISO();
  const todayItems = store.queueItems.filter(
    (q) => q.tenantId === tenantId && q.createdAt.startsWith(today)
  );
  const waitingItems = todayItems.filter((q) => q.status === 'WAITING');
  const inServiceItems = todayItems.filter((q) => q.status === 'IN_SERVICE');
  const activeBarbers = store.barbers.filter(
    (b) => b.tenantId === tenantId && b.isActive
  ).length;

  const tenantServices = store.services.filter((s) => s.tenantId === tenantId);
  const avgDuration =
    tenantServices.length > 0
      ? tenantServices.reduce((sum, s) => sum + s.durationMin, 0) / tenantServices.length
      : 20;

  const estimatedWaitMin =
    activeBarbers > 0
      ? Math.ceil((waitingItems.length / activeBarbers) * avgDuration)
      : waitingItems.length * avgDuration;

  return {
    waitingCount: waitingItems.length,
    inServiceCount: inServiceItems.length,
    estimatedWaitMin,
    activeBarbers,
  };
}

// ── Public API ────────────────────────────────────────────────────────────────

export function getTenantBySlug(slug: string) {
  const tenant = store.tenants.find((t) => t.slug === slug);
  if (!tenant) return null;
  const barbers = store.barbers.filter((b) => b.tenantId === tenant.id);
  const services = store.services.filter((s) => s.tenantId === tenant.id);
  return { tenant, barbers, services };
}

export function listQueue(tenantId: string): { stats: QueueStats; items: QueueItemPopulated[] } {
  const today = todayISO();
  const items = store.queueItems
    .filter((q) => q.tenantId === tenantId && q.createdAt.startsWith(today))
    .sort((a, b) => a.queueNumber - b.queueNumber)
    .map((item) => populateQueueItem(item));
  const stats = computeStats(tenantId);
  return { stats, items };
}

export function joinQueue(
  tenantId: string,
  input: { customer: { name: string; phone: string }; serviceId: string; barberId?: string | null }
): { ticket: { queueNumber: number; item: QueueItemPopulated }; stats: QueueStats } {
  const today = todayISO();

  // Find or create customer
  let customer = store.customers.find(
    (c) => c.tenantId === tenantId && c.phone === input.customer.phone
  );
  if (!customer) {
    customer = {
      id: `cust_${uid()}`,
      tenantId,
      name: input.customer.name,
      phone: input.customer.phone,
      lastVisitAt: null,
      visitCount: 0,
    };
    store.customers.push(customer);
  }

  const service = store.services.find((s) => s.id === input.serviceId && s.tenantId === tenantId);
  if (!service) throw new Error('SERVICE_NOT_FOUND');

  const todayItems = store.queueItems.filter(
    (q) => q.tenantId === tenantId && q.createdAt.startsWith(today)
  );
  const queueNumber = todayItems.length + 1;

  const newItem: QueueItem = {
    id: `q_${uid()}`,
    tenantId,
    customerId: customer.id,
    barberId: input.barberId ?? null,
    serviceId: input.serviceId,
    status: 'WAITING',
    queueNumber,
    createdAt: new Date().toISOString(),
    startedAt: null,
    completedAt: null,
    paymentStatus: 'UNPAID',
    priceIdr: service.priceIdr,
  };
  store.queueItems.push(newItem);

  const stats = computeStats(tenantId);
  return { ticket: { queueNumber, item: populateQueueItem(newItem) }, stats };
}

export function startQueue(
  tenantId: string,
  queueItemId: string
): { item: QueueItemPopulated; stats: QueueStats } {
  const item = store.queueItems.find((q) => q.id === queueItemId && q.tenantId === tenantId);
  if (!item) throw new Error('QUEUE_ITEM_NOT_FOUND');
  if (item.status !== 'WAITING') throw new Error('INVALID_STATUS_TRANSITION');

  item.status = 'IN_SERVICE';
  item.startedAt = new Date().toISOString();

  return { item: populateQueueItem(item), stats: computeStats(tenantId) };
}

export function completeQueue(
  tenantId: string,
  queueItemId: string,
  paymentStatus: 'PAID'
): { item: QueueItemPopulated; stats: QueueStats; customer: Customer } {
  const item = store.queueItems.find((q) => q.id === queueItemId && q.tenantId === tenantId);
  if (!item) throw new Error('QUEUE_ITEM_NOT_FOUND');
  if (item.status !== 'IN_SERVICE') throw new Error('INVALID_STATUS_TRANSITION');

  item.status = 'DONE';
  item.completedAt = new Date().toISOString();
  item.paymentStatus = paymentStatus;

  const customer = store.customers.find((c) => c.id === item.customerId)!;
  customer.lastVisitAt = new Date().toISOString();
  customer.visitCount += 1;

  return { item: populateQueueItem(item), stats: computeStats(tenantId), customer };
}

export function cancelQueue(
  tenantId: string,
  queueItemId: string
): { item: QueueItemPopulated; stats: QueueStats } {
  const item = store.queueItems.find((q) => q.id === queueItemId && q.tenantId === tenantId);
  if (!item) throw new Error('QUEUE_ITEM_NOT_FOUND');
  if (item.status === 'DONE' || item.status === 'CANCELLED')
    throw new Error('INVALID_STATUS_TRANSITION');

  item.status = 'CANCELLED';

  return { item: populateQueueItem(item), stats: computeStats(tenantId) };
}

export function listBookings(tenantId: string, date?: string): BookingPopulated[] {
  const targetDate = date ?? todayISO();
  return store.bookings
    .filter((b) => b.tenantId === tenantId && b.startAt.startsWith(targetDate))
    .sort((a, b) => a.startAt.localeCompare(b.startAt))
    .map((b) => populateBooking(b));
}

export function getDashboardToday(
  tenantId: string
): { summary: DashboardSummary; barberStats: BarberStats[] } {
  const today = todayISO();
  const todayItems = store.queueItems.filter(
    (q) => q.tenantId === tenantId && q.createdAt.startsWith(today)
  );

  const doneItems = todayItems.filter((q) => q.status === 'DONE' && q.paymentStatus === 'PAID');
  const revenueTodayIdr = doneItems.reduce((sum, q) => sum + q.priceIdr, 0);
  const customersToday = new Set(
    todayItems.filter((q) => q.status !== 'CANCELLED').map((q) => q.customerId)
  ).size;
  const activeQueueCount = todayItems.filter(
    (q) => q.status === 'WAITING' || q.status === 'IN_SERVICE'
  ).length;

  const barbers = store.barbers.filter((b) => b.tenantId === tenantId);
  const barberStats: BarberStats[] = barbers.map((barber) => {
    const barberDoneItems = doneItems.filter((q) => q.barberId === barber.id);
    return {
      barberId: barber.id,
      barberName: barber.name,
      servedCount: barberDoneItems.length,
      revenueIdr: barberDoneItems.reduce((sum, q) => sum + q.priceIdr, 0),
    };
  });

  return { summary: { customersToday, revenueTodayIdr, activeQueueCount }, barberStats };
}

export function listCustomers(tenantId: string): Customer[] {
  return store.customers
    .filter((c) => c.tenantId === tenantId)
    .sort((a, b) => (b.visitCount ?? 0) - (a.visitCount ?? 0));
}

export function toggleBarberActive(tenantId: string, barberId: string): Barber {
  const barber = store.barbers.find((b) => b.id === barberId && b.tenantId === tenantId);
  if (!barber) throw new Error('BARBER_NOT_FOUND');
  barber.isActive = !barber.isActive;
  return barber;
}
