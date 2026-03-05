import { NextRequest, NextResponse } from 'next/server';
import { getTenantBySlug, getWeeklyStats } from '@/lib/mockStore';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ tenant: string }> }
) {
  const { tenant: slug } = await params;
  const tenantInfo = getTenantBySlug(slug);
  if (!tenantInfo) return NextResponse.json({ error: { code: 'TENANT_NOT_FOUND', message: 'Not found' } }, { status: 404 });
  const stats = getWeeklyStats(tenantInfo.tenant.id);
  return NextResponse.json(stats);
}
