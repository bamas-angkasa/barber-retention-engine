import { NextRequest, NextResponse } from 'next/server';
import { getTenantBySlug, updateService, deleteService } from '@/lib/mockStore';
import { z } from 'zod';

const UpdateServiceSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  priceIdr: z.number().int().positive().optional(),
  durationMin: z.number().int().min(5).max(300).optional(),
});

function err(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ tenant: string; serviceId: string }> }
) {
  const { tenant: slug, serviceId } = await params;
  const tenantInfo = getTenantBySlug(slug);
  if (!tenantInfo) return err('TENANT_NOT_FOUND', 'Not found', 404);

  let body: unknown;
  try { body = await req.json(); } catch { return err('INVALID_JSON', 'Invalid JSON', 400); }

  const parsed = UpdateServiceSchema.safeParse(body);
  if (!parsed.success) return err('VALIDATION_ERROR', parsed.error.issues.map((e: { message: string }) => e.message).join(', '), 422);

  try {
    const service = updateService(tenantInfo.tenant.id, serviceId, parsed.data);
    return NextResponse.json({ service });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'INTERNAL_ERROR';
    return err(msg, msg, msg === 'SERVICE_NOT_FOUND' ? 404 : 500);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ tenant: string; serviceId: string }> }
) {
  const { tenant: slug, serviceId } = await params;
  const tenantInfo = getTenantBySlug(slug);
  if (!tenantInfo) return err('TENANT_NOT_FOUND', 'Not found', 404);

  try {
    deleteService(tenantInfo.tenant.id, serviceId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'INTERNAL_ERROR';
    return err(msg, msg, msg === 'SERVICE_NOT_FOUND' ? 404 : 500);
  }
}
