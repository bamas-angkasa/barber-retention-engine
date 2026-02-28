import { NextRequest, NextResponse } from 'next/server';
import { getTenantBySlug, updateBarber, deleteBarber } from '@/lib/mockStore';
import { z } from 'zod';

const UpdateBarberSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  isActive: z.boolean().optional(),
});

function err(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ tenant: string; barberId: string }> }
) {
  const { tenant: slug, barberId } = await params;
  const tenantInfo = getTenantBySlug(slug);
  if (!tenantInfo) return err('TENANT_NOT_FOUND', 'Not found', 404);

  let body: unknown;
  try { body = await req.json(); } catch { return err('INVALID_JSON', 'Invalid JSON', 400); }

  const parsed = UpdateBarberSchema.safeParse(body);
  if (!parsed.success) return err('VALIDATION_ERROR', parsed.error.issues.map((e: { message: string }) => e.message).join(', '), 422);

  try {
    const barber = updateBarber(tenantInfo.tenant.id, barberId, parsed.data);
    return NextResponse.json({ barber });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'INTERNAL_ERROR';
    return err(msg, msg, msg === 'BARBER_NOT_FOUND' ? 404 : 500);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ tenant: string; barberId: string }> }
) {
  const { tenant: slug, barberId } = await params;
  const tenantInfo = getTenantBySlug(slug);
  if (!tenantInfo) return err('TENANT_NOT_FOUND', 'Not found', 404);

  try {
    deleteBarber(tenantInfo.tenant.id, barberId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'INTERNAL_ERROR';
    return err(msg, msg, msg === 'BARBER_NOT_FOUND' ? 404 : 500);
  }
}
