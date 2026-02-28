import { NextRequest, NextResponse } from 'next/server';
import { getTenantBySlug, startQueue } from '@/lib/mockStore';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ tenant: string; queueItemId: string }> }
) {
  const { tenant: slug, queueItemId } = await params;
  const tenantInfo = getTenantBySlug(slug);

  if (!tenantInfo) {
    return NextResponse.json(
      { error: { code: 'TENANT_NOT_FOUND', message: `Tenant '${slug}' not found` } },
      { status: 404 }
    );
  }

  try {
    const result = startQueue(tenantInfo.tenant.id, queueItemId);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    const status =
      message === 'QUEUE_ITEM_NOT_FOUND'
        ? 404
        : message === 'INVALID_STATUS_TRANSITION'
        ? 409
        : 500;
    return NextResponse.json({ error: { code: message, message } }, { status });
  }
}
