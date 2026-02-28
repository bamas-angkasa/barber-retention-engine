import { NextRequest, NextResponse } from 'next/server';
import { getTenantBySlug } from '@/lib/mockStore';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ tenant: string }> }
) {
  const { tenant: slug } = await params;
  const result = getTenantBySlug(slug);

  if (!result) {
    return NextResponse.json(
      { error: { code: 'TENANT_NOT_FOUND', message: `Tenant '${slug}' not found` } },
      { status: 404 }
    );
  }

  return NextResponse.json(result);
}
