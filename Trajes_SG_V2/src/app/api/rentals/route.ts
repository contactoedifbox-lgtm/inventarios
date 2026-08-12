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
 * Crea una solicitud de arriendo mediante la función RPC create_rental_request(),
 * que ejecuta TODAS las validaciones (disponibilidad, cola, etc.)
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
    .select('role, nombres, apellidos, email')
    .eq('id', user.id)
    .single();

  if (!requesterProfile || (requesterProfile.role !== 'approved' && requesterProfile.role !== 'super_admin' && requesterProfile.role !== 'propietario' && requesterProfile.role !== 'arrendatario')) {
    return NextResponse.json({ ok: false, error: 'Tu cuenta no está aprobada' }, { status: 403 });
  }

  const admin = createAdminClient();

  // Obtener datos del traje y su dueño
  const { data: costume, error: costumeError } = await admin
    .from('costumes')
    .select('owner_id, owner_name, price, size, year, title')
    .eq('id', input.costume_id)
    .single();

  if (costumeError || !costume) {
    return NextResponse.json({ ok: false, error: 'Traje no encontrado' }, { status: 404 });
  }

  const { data: event, error: eventError } = await admin
    .from('events')
    .select('name, event_date')
    .eq('id', input.event_id)
    .single();

  if (eventError || !event) {
    return NextResponse.json({ ok: false, error: 'Evento no encontrado' }, { status: 404 });
  }

  // Crear solicitud en la cola usando create_rental_request
  const { data: requestId, error: rpcError } = await admin.rpc('create_rental_request', {
    p_suit_id: input.costume_id,
    p_renter_id: user.id,
    p_renter_name: `${input.first_name} ${input.last_name}`.trim(),
    p_renter_email: input.email,
    p_owner_id: costume.owner_id,
    p_owner_name: costume.owner_name || 'Propietario',
    p_event_name: event.name,
    p_action_type: 'Arriendo',
  });

  if (rpcError) {
    const message = rpcError.message.split('\n')[0] ?? 'No se pudo crear la solicitud';
    return NextResponse.json({ ok: false, error: message }, { status: 409 });
  }

  // Notificar al dueño del traje
  const { data: owner, error: ownerError } = await admin
    .from('profiles')
    .select('email, full_name')
    .eq('id', costume.owner_id)
    .single();

  if (!ownerError && owner?.email) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
    await sendRentRequest(owner.email, {
      ownerName: owner.full_name || 'Propietario',
      renterFullName: `${input.first_name} ${input.last_name}`.trim(),
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

  return NextResponse.json({ ok: true, rental_id: requestId });
}
