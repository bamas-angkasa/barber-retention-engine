import { NextRequest, NextResponse } from 'next/server';
import { getTenantBySlug, listBookings, createBooking } from '@/lib/mockStore';
import { GetBookingsQuerySchema, CreateBookingSchema } from '@/lib/schemas';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ tenant: string }> }
) {
  const { tenant: slug } = await params;
  const tenantInfo = getTenantBySlug(slug);
  if (!tenantInfo) {
    return NextResponse.json(
      { error: { code: 'TENANT_NOT_FOUND', message: `Tenant '${slug}' tidak ditemukan` } },
      { status: 404 }
    );
  }

  const searchParams = Object.fromEntries(req.nextUrl.searchParams.entries());
  const parsed = GetBookingsQuerySchema.safeParse(searchParams);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: parsed.error.issues.map((e: { message: string }) => e.message).join(', ') } },
      { status: 422 }
    );
  }

  const items = listBookings(tenantInfo.tenant.id, parsed.data.date, parsed.data.all === '1');
  return NextResponse.json({ items });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ tenant: string }> }
) {
  const { tenant: slug } = await params;
  const tenantInfo = getTenantBySlug(slug);
  if (!tenantInfo) {
    return NextResponse.json(
      { error: { code: 'TENANT_NOT_FOUND', message: `Tenant '${slug}' tidak ditemukan` } },
      { status: 404 }
    );
  }

  let body: unknown;
  try { body = await req.json(); }
  catch {
    return NextResponse.json(
      { error: { code: 'INVALID_JSON', message: 'Body harus JSON yang valid' } },
      { status: 400 }
    );
  }

  const parsed = CreateBookingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: parsed.error.issues.map((e: { message: string }) => e.message).join(', ') } },
      { status: 422 }
    );
  }

  try {
    const booking = createBooking(tenantInfo.tenant.id, parsed.data);
    return NextResponse.json({ booking }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'INTERNAL_ERROR';
    const status = msg === 'SLOT_TAKEN' ? 409 : msg === 'SERVICE_NOT_FOUND' || msg === 'BARBER_NOT_FOUND' ? 404 : 500;
    const message: Record<string, string> = {
      SLOT_TAKEN: 'Slot waktu sudah diambil, pilih waktu lain',
      SERVICE_NOT_FOUND: 'Layanan tidak ditemukan',
      BARBER_NOT_FOUND: 'Barber tidak ditemukan',
    };
    return NextResponse.json({ error: { code: msg, message: message[msg] ?? msg } }, { status });
  }
}
