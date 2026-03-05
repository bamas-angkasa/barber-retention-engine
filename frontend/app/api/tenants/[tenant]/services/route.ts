import { NextRequest, NextResponse } from 'next/server';
import { getTenantBySlug, addService } from '@/lib/mockStore';
import { z } from 'zod';

const CreateServiceSchema = z.object({
  name: z.string().min(1).max(100),
  priceIdr: z.number().int().positive(),
  durationMin: z.number().int().min(5).max(300),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ tenant: string }> }
) {
  const { tenant: slug } = await params;
  const tenantInfo = getTenantBySlug(slug);
  if (!tenantInfo) return NextResponse.json({ error: { code: 'TENANT_NOT_FOUND', message: 'Not found' } }, { status: 404 });

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: { code: 'INVALID_JSON', message: 'Invalid JSON' } }, { status: 400 }); }

  const parsed = CreateServiceSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: parsed.error.issues.map((e: { message: string }) => e.message).join(', ') } }, { status: 422 });

  const service = addService(tenantInfo.tenant.id, parsed.data);
  return NextResponse.json({ service }, { status: 201 });
}
