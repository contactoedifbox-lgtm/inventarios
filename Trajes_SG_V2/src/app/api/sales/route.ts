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
 * Crea una solicitud de compra mediante la función RPC create_sale(),
 * que valida (tipo, disponibilidad, propiedad) + inserta + reserva el
 * traje en UNA SOLA TRANSACCIÓN atómica de PostgreSQL.
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
    .select('role')
    .eq('id', user.id)
    .single();

  if (!requesterProfile || (requesterProfile.role !== 'approved' && requesterProfile.role !== 'super_admin')) {
    return NextResponse.json({ ok: false, error: 'Tu cuenta no está aprobada' }, { status: 403 });
  }

  const admin = createAdminClient();

  // Creación transaccional: validaciones + insert + update en una sola llamada
  const { data: saleId, error: rpcError } = await admin.rpc('create_sale', {
    p_costume_id: input.costume_id,
    p_buyer_id: user.id,
    p_first_name: input.first_name,
    p_last_name: input.last_name,
    p_rut: input.rut,
    p_phone: input.phone,
    p_email: input.email,
  });

  if (rpcError) {
    const message = rpcError.message.split('\n')[0] ?? 'No se pudo crear la solicitud';
    return NextResponse.json({ ok: false, error: message }, { status: 409 });
  }

  // Datos para la notificación al dueño (fuera de la transacción)
  const { data: costume } = await admin
    .from('costumes')
    .select('owner_id, price, size, year')
    .eq('id', input.costume_id)
    .single();

  if (costume) {
    const [{ data: owner }, { data: ownerAuth }] = await Promise.all([
      admin.from('profiles').select('full_name').eq('id', costume.owner_id).single(),
      admin.auth.admin.getUserById(costume.owner_id),
    ]);

    if (ownerAuth.user?.email) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
      await sendSaleRequest(ownerAuth.user.email, {
        ownerName: owner?.full_name ?? 'Integrante',
        buyerFullName: `${input.first_name} ${input.last_name}`,
        buyerRut: input.rut,
        buyerPhone: input.phone,
        buyerEmail: input.email,
        costumeSummary: `Traje talla ${costume.size} (${costume.year})`,
        price: costume.price,
        dashboardUrl: `${appUrl}/venta`,
      });
    }
  }

  return NextResponse.json({ ok: true, sale_id: saleId });
}