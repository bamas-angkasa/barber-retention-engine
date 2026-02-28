import { NextRequest, NextResponse } from 'next/server';
import { getTenantBySlug, updateTenantSettings } from '@/lib/mockStore';
import { z } from 'zod';

const UpdateSettingsSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  address: z.string().max(200).optional(),
  phone: z.string().max(20).optional(),
  openHour: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  closeHour: z.string().regex(/^\d{2}:\d{2}$/).optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ tenant: string }> }
) {
  const { tenant: slug } = await params;
  const tenantInfo = getTenantBySlug(slug);
  if (!tenantInfo) return NextResponse.json({ error: { code: 'TENANT_NOT_FOUND', message: 'Not found' } }, { status: 404 });
  return NextResponse.json({ tenant: tenantInfo.tenant });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ tenant: string }> }
) {
  const { tenant: slug } = await params;
  const tenantInfo = getTenantBySlug(slug);
  if (!tenantInfo) return NextResponse.json({ error: { code: 'TENANT_NOT_FOUND', message: 'Not found' } }, { status: 404 });

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: { code: 'INVALID_JSON', message: 'Invalid JSON' } }, { status: 400 }); }

  const parsed = UpdateSettingsSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: parsed.error.issues.map((e: { message: string }) => e.message).join(', ') } }, { status: 422 });

  const tenant = updateTenantSettings(tenantInfo.tenant.id, parsed.data);
  return NextResponse.json({ tenant });
}
