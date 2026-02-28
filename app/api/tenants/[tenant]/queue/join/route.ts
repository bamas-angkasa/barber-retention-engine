import { NextRequest, NextResponse } from 'next/server';
import { getTenantBySlug, joinQueue } from '@/lib/mockStore';
import { JoinQueueSchema } from '@/lib/schemas';

export async function POST(
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

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: { code: 'INVALID_JSON', message: 'Request body must be valid JSON' } },
      { status: 400 }
    );
  }

  const parsed = JoinQueueSchema.safeParse(body);
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
    const result = joinQueue(tenantInfo.tenant.id, parsed.data);
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    const code = message === 'SERVICE_NOT_FOUND' ? 'SERVICE_NOT_FOUND' : 'INTERNAL_ERROR';
    return NextResponse.json({ error: { code, message } }, { status: 400 });
  }
}
