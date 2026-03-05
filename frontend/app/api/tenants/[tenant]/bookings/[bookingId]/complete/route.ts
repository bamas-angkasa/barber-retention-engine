import { NextRequest, NextResponse } from 'next/server';
import { getTenantBySlug, completeBookingById } from '@/lib/mockStore';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ tenant: string; bookingId: string }> }
) {
  const { tenant: slug, bookingId } = await params;
  const tenantInfo = getTenantBySlug(slug);
  if (!tenantInfo) {
    return NextResponse.json(
      { error: { code: 'TENANT_NOT_FOUND', message: `Tenant '${slug}' tidak ditemukan` } },
      { status: 404 }
    );
  }

  try {
    const booking = completeBookingById(tenantInfo.tenant.id, bookingId);
    return NextResponse.json({ booking });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'INTERNAL_ERROR';
    const status = msg === 'BOOKING_NOT_FOUND' ? 404 : msg === 'INVALID_STATUS_TRANSITION' ? 409 : 500;
    return NextResponse.json({ error: { code: msg, message: msg } }, { status });
  }
}
