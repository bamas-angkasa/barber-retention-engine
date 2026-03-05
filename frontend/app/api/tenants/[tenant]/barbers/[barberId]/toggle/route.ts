import { NextRequest, NextResponse } from 'next/server';
import { getTenantBySlug, toggleBarberActive } from '@/lib/mockStore';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ tenant: string; barberId: string }> }
) {
  const { tenant: slug, barberId } = await params;
  const tenantInfo = getTenantBySlug(slug);

  if (!tenantInfo) {
    return NextResponse.json(
      { error: { code: 'TENANT_NOT_FOUND', message: `Tenant '${slug}' not found` } },
      { status: 404 }
    );
  }

  try {
    const barber = toggleBarberActive(tenantInfo.tenant.id, barberId);
    return NextResponse.json({ barber });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      { error: { code: message, message } },
      { status: message === 'BARBER_NOT_FOUND' ? 404 : 500 }
    );
  }
}
