import { NextRequest, NextResponse } from 'next/server';
import { getTenantBySlug, listCustomers } from '@/lib/mockStore';

export async function GET(
  _req: NextRequest,
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

  const customers = listCustomers(tenantInfo.tenant.id);
  return NextResponse.json({ customers });
}
