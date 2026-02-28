import { NextRequest, NextResponse } from 'next/server';
import { getTenantBySlug, getAvailableSlots } from '@/lib/mockStore';
import { GetSlotsQuerySchema } from '@/lib/schemas';

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
  const parsed = GetSlotsQuerySchema.safeParse(searchParams);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: parsed.error.issues.map((e: { message: string }) => e.message).join(', ') } },
      { status: 422 }
    );
  }

  const slots = getAvailableSlots(
    tenantInfo.tenant.id,
    parsed.data.date,
    parsed.data.barberId ?? null,
    parsed.data.serviceId
  );

  return NextResponse.json({ slots });
}
