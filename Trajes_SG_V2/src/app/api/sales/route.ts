import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { contactInfoSchema } from '@/lib/validations/auth.schema';
import { sendSaleRequest } from '@/lib/email/sender';
import { rateLimit } from '@/lib/rate-limit';
import { getClientIp } from '@/lib/audit';
import { RATE_LIMITS } from '@/config/constants';

const createSaleSchema = contactInfoSchema.extend({
  costume_id: z.string().uuid(),
});

/**
 * POST /api/sales
 * Crea una solicitud de compra directamente en la tabla sales
 */
export async function POST(request: NextRequest) {
  const ip = getClientIp() ?? 'unknown';
  const rl = await rateLimit(`sales:${ip}`, RATE_LIMITS.rentals.limit, RATE_LIMITS.rentals.windowSeconds);
  if (!rl.success) {
    return NextResponse.json({ ok: false, error: 'Demasiadas solicitudes. Intenta más tarde.' }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'JSON inválido' }, { status: 400 });
  }

  const parsed = createSaleSchema.safeParse(body);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0];
    return NextResponse.json(
      { ok: false, error: firstError ? `${firstError.path.join('.')}: ${firstError.message}` : 'Datos inválidos' },
      { status: 400 },
    );
  }

  const input = parsed.data;

  const supabase = createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: 'Debes iniciar sesión' }, { status: 401 });
  }

  const { data: requesterProfile } = await supabase
    .from('profiles')
    .select('role, nombres, apellidos, email')
    .eq('id', user.id)
    .single();

  if (!requesterProfile || (requesterProfile.role !== 'approved' && requesterProfile.role !== 'super_admin' && requesterProfile.role !== 'propietario' && requesterProfile.role !== 'arrendatario')) {
    return NextResponse.json({ ok: false, error: 'Tu cuenta no está aprobada' }, { status: 403 });
  }

  const admin = createAdminClient();

  // Obtener datos del traje
  const { data: costume, error: costumeError } = await admin
    .from('costumes')
    .select('owner_id, price, size, year, status, is_sold, type')
    .eq('id', input.costume_id)
    .single();

  if (costumeError || !costume) {
    return NextResponse.json({ ok: false, error: 'Traje no encontrado' }, { status: 404 });
  }

  // Validar que el traje esté disponible para venta
  if (costume.status !== 'Disponible' || costume.is_sold) {
    return NextResponse.json({ ok: false, error: 'El traje ya no está disponible para venta' }, { status: 409 });
  }

  if (costume.type !== 'sale' && costume.type !== 'ambos') {
    return NextResponse.json({ ok: false, error: 'Este traje no está en venta' }, { status: 409 });
  }

  if (costume.owner_id === user.id) {
    return NextResponse.json({ ok: false, error: 'No puedes comprar tu propio traje' }, { status: 409 });
  }

  // Crear la solicitud de compra directamente
  const { data: sale, error: insertError } = await admin
    .from('sales')
    .insert({
      costume_id: input.costume_id,
      buyer_id: user.id,
      first_name: input.first_name,
      last_name: input.last_name,
      rut: input.rut,
      phone: input.phone,
      email: input.email,
      status: 'reservado',
    })
    .select()
    .single();

  if (insertError) {
    return NextResponse.json({ ok: false, error: insertError.message }, { status: 500 });
  }

  // Actualizar estado del traje a reservado
  await admin
    .from('costumes')
    .update({ status: 'Reservado' })
    .eq('id', input.costume_id);

  // Notificar al dueño
  const { data: owner, error: ownerError } = await admin
    .from('profiles')
    .select('email, full_name')
    .eq('id', costume.owner_id)
    .single();

  if (!ownerError && owner?.email) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
    await sendSaleRequest(owner.email, {
      ownerName: owner.full_name || 'Propietario',
      buyerFullName: `${input.first_name} ${input.last_name}`.trim(),
      buyerRut: input.rut,
      buyerPhone: input.phone,
      buyerEmail: input.email,
      costumeSummary: `Traje talla ${costume.size} (${costume.year})`,
      price: costume.price,
      dashboardUrl: `${appUrl}/venta`,
    });
  }

  return NextResponse.json({ ok: true, sale_id: sale.id });
}
