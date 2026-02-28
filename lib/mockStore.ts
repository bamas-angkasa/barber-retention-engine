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
  DailyRevenue,
  ServiceStats,
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

export function listBookings(tenantId: string, date?: string, all?: boolean): BookingPopulated[] {
  return store.bookings
    .filter((b) => {
      if (b.tenantId !== tenantId) return false;
      if (all) return true;
      const targetDate = date ?? todayISO();
      return b.startAt.startsWith(targetDate);
    })
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

// ── Booking CRUD ──────────────────────────────────────────────────────────────

/** Slot step in minutes */
const SLOT_STEP = 30;
/** Operating hours */
const OPEN_HOUR = 9;
const CLOSE_HOUR = 20;

export interface TimeSlot {
  time: string;       // "HH:MM"
  available: boolean;
  barberId?: string | null;
}

/**
 * Return all 30-min slots for a date.
 * A slot is unavailable if the requested barber (or ANY barber when barberId is null)
 * has an overlapping booking that is not CANCELLED.
 */
export function getAvailableSlots(
  tenantId: string,
  date: string,
  barberId?: string | null,
  serviceId?: string
): TimeSlot[] {
  const service = serviceId
    ? store.services.find((s) => s.id === serviceId && s.tenantId === tenantId)
    : null;
  const durationMin = service?.durationMin ?? SLOT_STEP;

  const dayBookings = store.bookings.filter(
    (b) =>
      b.tenantId === tenantId &&
      b.startAt.startsWith(date) &&
      b.status !== 'CANCELLED'
  );

  const slots: TimeSlot[] = [];
  for (let h = OPEN_HOUR; h < CLOSE_HOUR; h++) {
    for (let m = 0; m < 60; m += SLOT_STEP) {
      const slotStart = h * 60 + m;
      const slotEnd = slotStart + durationMin;
      if (slotEnd > CLOSE_HOUR * 60) break;

      const hh = String(h).padStart(2, '0');
      const mm = String(m).padStart(2, '0');
      const time = `${hh}:${mm}`;

      // Check overlap: slot[start,end) overlaps booking[bStart,bEnd)
      const conflicts = dayBookings.filter((b) => {
        // Match barber: if barberId specified check that barber, else check all
        if (barberId && b.barberId && b.barberId !== barberId) return false;

        const bDate = date;
        const bStartStr = b.startAt.startsWith(bDate) ? b.startAt.slice(11, 16) : null;
        const bEndStr = b.endAt.startsWith(bDate) ? b.endAt.slice(11, 16) : null;
        if (!bStartStr || !bEndStr) return false;

        const [bSh, bSm] = bStartStr.split(':').map(Number);
        const [bEh, bEm] = bEndStr.split(':').map(Number);
        const bStart = bSh * 60 + bSm;
        const bEnd = bEh * 60 + bEm;

        return slotStart < bEnd && slotEnd > bStart;
      });

      slots.push({ time, available: conflicts.length === 0 });
    }
  }
  return slots;
}

export interface CreateBookingInput {
  customer: { name: string; phone: string };
  serviceId: string;
  barberId?: string | null;
  date: string;
  startTime: string; // "HH:MM"
}

export function createBooking(
  tenantId: string,
  input: CreateBookingInput
): BookingPopulated {
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

  const barberId = input.barberId ?? null;
  if (barberId) {
    const barber = store.barbers.find((b) => b.id === barberId && b.tenantId === tenantId);
    if (!barber) throw new Error('BARBER_NOT_FOUND');
  }

  // Build ISO datetimes
  const [sh, sm] = input.startTime.split(':').map(Number);
  const startAt = new Date(`${input.date}T${input.startTime}:00`);
  const endAt = new Date(startAt.getTime() + service.durationMin * 60 * 1000);

  // Check slot still available
  const conflicting = store.bookings.find((b) => {
    if (b.tenantId !== tenantId) return false;
    if (b.status === 'CANCELLED') return false;
    if (barberId && b.barberId && b.barberId !== barberId) return false;
    if (!b.startAt.startsWith(input.date)) return false;
    const bStart = new Date(b.startAt).getTime();
    const bEnd = new Date(b.endAt).getTime();
    return startAt.getTime() < bEnd && endAt.getTime() > bStart;
  });
  if (conflicting) throw new Error('SLOT_TAKEN');

  void sh; void sm; // suppress unused warning

  const newBooking: Booking = {
    id: `book_${uid()}`,
    tenantId,
    customerId: customer.id,
    barberId,
    serviceId: input.serviceId,
    startAt: startAt.toISOString(),
    endAt: endAt.toISOString(),
    status: 'UPCOMING',
    priceIdr: service.priceIdr,
  };
  store.bookings.push(newBooking);

  return populateBooking(newBooking);
}

export function confirmBooking(
  tenantId: string,
  bookingId: string
): { booking: BookingPopulated; waLink: string } {
  const booking = store.bookings.find(
    (b) => b.id === bookingId && b.tenantId === tenantId
  );
  if (!booking) throw new Error('BOOKING_NOT_FOUND');
  if (booking.status === 'CANCELLED') throw new Error('INVALID_STATUS_TRANSITION');
  if (booking.status === 'DONE') throw new Error('INVALID_STATUS_TRANSITION');

  booking.status = 'UPCOMING'; // re-confirm if needed (already upcoming = confirmed)

  const populated = populateBooking(booking);
  const tenant = store.tenants.find((t) => t.id === tenantId)!;

  // Format date & time for WA message
  const startDate = new Date(booking.startAt);
  const dateStr = startDate.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const timeStr = startDate.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const msg = [
    `Halo *${populated.customer.name}*! 👋`,
    ``,
    `Booking kamu di *${tenant.name}* sudah *DIKONFIRMASI* ✅`,
    ``,
    `📋 Detail Booking:`,
    `• Layanan  : ${populated.service.name}`,
    `• Barber   : ${populated.barber?.name ?? 'Barber mana saja'}`,
    `• Tanggal  : ${dateStr}`,
    `• Jam      : ${timeStr} WIB`,
    `• Harga    : Rp ${populated.service.priceIdr.toLocaleString('id-ID')}`,
    ``,
    `Mohon hadir *10 menit sebelum* jadwal ya. Sampai jumpa! 💈`,
    ``,
    `_${tenant.name}_`,
    tenant.address ? `_${tenant.address}_` : '',
  ]
    .filter(Boolean)
    .join('\n');

  // Normalize phone: remove leading 0, add 62
  const rawPhone = populated.customer.phone.replace(/\D/g, '');
  const waPhone = rawPhone.startsWith('0')
    ? '62' + rawPhone.slice(1)
    : rawPhone.startsWith('62')
    ? rawPhone
    : '62' + rawPhone;

  const waLink = `https://wa.me/${waPhone}?text=${encodeURIComponent(msg)}`;

  return { booking: populated, waLink };
}

export function cancelBookingById(
  tenantId: string,
  bookingId: string
): BookingPopulated {
  const booking = store.bookings.find(
    (b) => b.id === bookingId && b.tenantId === tenantId
  );
  if (!booking) throw new Error('BOOKING_NOT_FOUND');
  if (booking.status === 'DONE' || booking.status === 'CANCELLED')
    throw new Error('INVALID_STATUS_TRANSITION');

  booking.status = 'CANCELLED';
  return populateBooking(booking);
}

export function completeBookingById(
  tenantId: string,
  bookingId: string
): BookingPopulated {
  const booking = store.bookings.find(
    (b) => b.id === bookingId && b.tenantId === tenantId
  );
  if (!booking) throw new Error('BOOKING_NOT_FOUND');
  if (booking.status === 'CANCELLED') throw new Error('INVALID_STATUS_TRANSITION');
  if (booking.status === 'DONE') throw new Error('INVALID_STATUS_TRANSITION');

  booking.status = 'DONE';

  // Update customer stats
  const customer = store.customers.find((c) => c.id === booking.customerId);
  if (customer) {
    customer.lastVisitAt = new Date().toISOString();
    customer.visitCount += 1;
  }

  return populateBooking(booking);
}

// ── Services CRUD ─────────────────────────────────────────────────────────────

export function addService(
  tenantId: string,
  input: { name: string; priceIdr: number; durationMin: number }
): Service {
  const s: Service = {
    id: `svc_${uid()}`,
    tenantId,
    name: input.name,
    priceIdr: input.priceIdr,
    durationMin: input.durationMin,
  };
  store.services.push(s);
  return s;
}

export function updateService(
  tenantId: string,
  serviceId: string,
  input: Partial<{ name: string; priceIdr: number; durationMin: number }>
): Service {
  const s = store.services.find((x) => x.id === serviceId && x.tenantId === tenantId);
  if (!s) throw new Error('SERVICE_NOT_FOUND');
  if (input.name !== undefined) s.name = input.name;
  if (input.priceIdr !== undefined) s.priceIdr = input.priceIdr;
  if (input.durationMin !== undefined) s.durationMin = input.durationMin;
  return s;
}

export function deleteService(tenantId: string, serviceId: string): void {
  const idx = store.services.findIndex((x) => x.id === serviceId && x.tenantId === tenantId);
  if (idx === -1) throw new Error('SERVICE_NOT_FOUND');
  store.services.splice(idx, 1);
}

// ── Barbers CRUD ──────────────────────────────────────────────────────────────

export function addBarber(tenantId: string, input: { name: string }): Barber {
  const b: Barber = {
    id: `barber_${uid()}`,
    tenantId,
    name: input.name,
    isActive: true,
  };
  store.barbers.push(b);
  return b;
}

export function updateBarber(
  tenantId: string,
  barberId: string,
  input: Partial<{ name: string; isActive: boolean }>
): Barber {
  const b = store.barbers.find((x) => x.id === barberId && x.tenantId === tenantId);
  if (!b) throw new Error('BARBER_NOT_FOUND');
  if (input.name !== undefined) b.name = input.name;
  if (input.isActive !== undefined) b.isActive = input.isActive;
  return b;
}

export function deleteBarber(tenantId: string, barberId: string): void {
  const idx = store.barbers.findIndex((x) => x.id === barberId && x.tenantId === tenantId);
  if (idx === -1) throw new Error('BARBER_NOT_FOUND');
  store.barbers.splice(idx, 1);
}

// ── Tenant Settings ───────────────────────────────────────────────────────────

export function updateTenantSettings(
  tenantId: string,
  input: Partial<{ name: string; address: string; phone: string; openHour: string; closeHour: string }>
): Tenant {
  const t = store.tenants.find((x) => x.id === tenantId);
  if (!t) throw new Error('TENANT_NOT_FOUND');
  if (input.name !== undefined) t.name = input.name;
  if (input.address !== undefined) t.address = input.address;
  if (input.phone !== undefined) t.phone = input.phone;
  if (input.openHour !== undefined) t.openHour = input.openHour;
  if (input.closeHour !== undefined) t.closeHour = input.closeHour;
  return t;
}

// ── Weekly Stats ──────────────────────────────────────────────────────────────

export function getWeeklyStats(tenantId: string): {
  daily: DailyRevenue[];
  topBarbers: BarberStats[];
  topServices: ServiceStats[];
  totalRevenue: number;
  totalCustomers: number;
} {
  const days: DailyRevenue[] = [];
  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const label = dayLabels[d.getDay()];

    const dayItems = store.queueItems.filter(
      (q) =>
        q.tenantId === tenantId &&
        q.status === 'DONE' &&
        q.paymentStatus === 'PAID' &&
        (q.completedAt?.startsWith(dateStr) ?? q.createdAt.startsWith(dateStr))
    );

    days.push({
      date: dateStr,
      label,
      revenueIdr: dayItems.reduce((s, q) => s + q.priceIdr, 0),
      customerCount: new Set(dayItems.map((q) => q.customerId)).size,
    });
  }

  // Top barbers
  const doneItems = store.queueItems.filter(
    (q) => q.tenantId === tenantId && q.status === 'DONE' && q.paymentStatus === 'PAID'
  );

  const barberMap = new Map<string, { name: string; count: number; revenue: number }>();
  for (const item of doneItems) {
    if (!item.barberId) continue;
    const barber = store.barbers.find((b) => b.id === item.barberId);
    if (!barber) continue;
    const cur = barberMap.get(item.barberId) ?? { name: barber.name, count: 0, revenue: 0 };
    cur.count += 1;
    cur.revenue += item.priceIdr;
    barberMap.set(item.barberId, cur);
  }
  const topBarbers: BarberStats[] = [...barberMap.entries()]
    .map(([id, v]) => ({ barberId: id, barberName: v.name, servedCount: v.count, revenueIdr: v.revenue }))
    .sort((a, b) => b.servedCount - a.servedCount)
    .slice(0, 5);

  // Top services
  const serviceMap = new Map<string, { name: string; count: number; revenue: number }>();
  for (const item of doneItems) {
    const svc = store.services.find((s) => s.id === item.serviceId);
    if (!svc) continue;
    const cur = serviceMap.get(item.serviceId) ?? { name: svc.name, count: 0, revenue: 0 };
    cur.count += 1;
    cur.revenue += item.priceIdr;
    serviceMap.set(item.serviceId, cur);
  }
  const topServices: ServiceStats[] = [...serviceMap.entries()]
    .map(([id, v]) => ({ serviceId: id, serviceName: v.name, count: v.count, revenueIdr: v.revenue }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    daily: days,
    topBarbers,
    topServices,
    totalRevenue: days.reduce((s, d) => s + d.revenueIdr, 0),
    totalCustomers: days.reduce((s, d) => s + d.customerCount, 0),
  };
}
