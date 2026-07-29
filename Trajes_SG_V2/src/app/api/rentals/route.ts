import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { contactInfoSchema } from '@/lib/validations/auth.schema';
import { sendRentRequest } from '@/lib/email/sender';
import { rateLimit } from '@/lib/rate-limit';
import { getClientIp } from '@/lib/audit';
import { RATE_LIMITS } from '@/config/constants';

const createRentalSchema = contactInfoSchema.extend({
  costume_id: z.string().uuid(),
  event_id: z.string().uuid(),
});

/**
 * POST /api/rentals
 * Crea una solicitud de arriendo mediante la función RPC create_rental(),
 * que ejecuta TODAS las validaciones (disponibilidad, pertenencia al
 * evento, límites global y por usuario) + el insert + el cambio de estado
 * del traje en UNA SOLA TRANSACCIÓN atómica de PostgreSQL.
 */
export async function POST(request: NextRequest) {
  const ip = getClientIp() ?? 'unknown';
  const rl = await rateLimit(`rentals:${ip}`, RATE_LIMITS.rentals.limit, RATE_LIMITS.rentals.windowSeconds);
  if (!rl.success) {
    return NextResponse.json({ ok: false, error: 'Demasiadas solicitudes. Intenta más tarde.' }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'JSON inválido' }, { status: 400 });
  }

  const parsed = createRentalSchema.safeParse(body);
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
  const { data: rentalId, error: rpcError } = await admin.rpc('create_rental', {
    p_costume_id: input.costume_id,
    p_renter_id: user.id,
    p_first_name: input.first_name,
    p_last_name: input.last_name,
    p_rut: input.rut,
    p_phone: input.phone,
    p_email: input.email,
    p_event_id: input.event_id,
  });

  if (rpcError) {
    // Los RAISE EXCEPTION de la función llegan en rpcError.message
    const message = rpcError.message.includes('raise_exception')
      ? rpcError.message
      : (rpcError.message.split('\n')[0] ?? 'No se pudo crear la solicitud');
    return NextResponse.json({ ok: false, error: message }, { status: 409 });
  }

  // Datos para la notificación al dueño (fuera de la transacción)
  const { data: costume } = await admin
    .from('costumes')
    .select('owner_id, price, size, year')
    .eq('id', input.costume_id)
    .single();

  const { data: event } = await admin
    .from('events')
    .select('name, event_date')
    .eq('id', input.event_id)
    .single();

  if (costume && event) {
    const [{ data: owner }, { data: ownerAuth }] = await Promise.all([
      admin.from('profiles').select('full_name').eq('id', costume.owner_id).single(),
      admin.auth.admin.getUserById(costume.owner_id),
    ]);

    if (ownerAuth.user?.email) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
      await sendRentRequest(ownerAuth.user.email, {
        ownerName: owner?.full_name ?? 'Integrante',
        renterFullName: `${input.first_name} ${input.last_name}`,
        renterRut: input.rut,
        renterPhone: input.phone,
        renterEmail: input.email,
        costumeSummary: `Traje talla ${costume.size} (${costume.year})`,
        eventName: event.name,
        eventDate: event.event_date,
        price: costume.price,
        dashboardUrl: `${appUrl}/arriendo`,
      });
    }
  }

  return NextResponse.json({ ok: true, rental_id: rentalId });
}