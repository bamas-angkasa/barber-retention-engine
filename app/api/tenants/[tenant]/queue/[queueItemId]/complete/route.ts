import { NextRequest, NextResponse } from 'next/server';
import { getTenantBySlug, completeQueue } from '@/lib/mockStore';
import { CompleteQueueSchema } from '@/lib/schemas';

export async function POST(
  req: NextRequest,
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

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: { code: 'INVALID_JSON', message: 'Request body must be valid JSON' } },
      { status: 400 }
    );
  }

  const parsed = CompleteQueueSchema.safeParse(body);
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

  try {
    const result = completeQueue(tenantInfo.tenant.id, queueItemId, parsed.data.paymentStatus);
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
