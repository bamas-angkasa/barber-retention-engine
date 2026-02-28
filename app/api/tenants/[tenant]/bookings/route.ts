import { NextRequest, NextResponse } from 'next/server';
import { getTenantBySlug, listBookings } from '@/lib/mockStore';
import { GetBookingsQuerySchema } from '@/lib/schemas';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ tenant: string }> }
) {
  const { tenant: slug } = await params;
  const tenantInfo = getTenantBySlug(slug);

  if (!tenantInfo) {
    return NextResponse.json(
      { error: { code: 'TENANT_NOT_FOUND', message: `Tenant '${slug}' not found` } },
      { status: 404 }
    );
  }

  const searchParams = Object.fromEntries(req.nextUrl.searchParams.entries());
  const parsed = GetBookingsQuerySchema.safeParse(searchParams);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: 'VALIDATION_ERROR',
          message: parsed.error.issues.map((e: { message: string }) => e.message).join(', '),
        },
      },
      { status: 422 }
    );
  }

  const items = listBookings(tenantInfo.tenant.id, parsed.data.date);
  return NextResponse.json({ items });
}
