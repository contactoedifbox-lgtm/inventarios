import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { sendRentConfirmed } from '@/lib/email/sender';
import { logAdminAction, getClientIp } from '@/lib/audit';
import { rateLimit } from '@/lib/rate-limit';
import { AuditAction } from '@/types/enums';
import { RATE_LIMITS } from '@/config/constants';

interface RouteContext {
  params: { id: string };
}

/**
 * PATCH /api/rentals/[id]/confirm
 * El dueño del traje confirma el arriendo:
 * rental.status='arrendado' + costume.status='arrendado' + auditoría + email.
 */
export async function PATCH(_request: NextRequest, { params }: RouteContext) {
  const ip = getClientIp() ?? 'unknown';
  const rl = await rateLimit(`rental-confirm:${ip}`, RATE_LIMITS.api.limit, RATE_LIMITS.api.windowSeconds);
  if (!rl.success) {
    return NextResponse.json({ ok: false, error: 'Demasiadas solicitudes' }, { status: 429 });
  }

  const rentalId = params.id;

  const supabase = createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: 'Debes iniciar sesión' }, { status: 401 });
  }

  const admin = createAdminClient();

  // Rental + traje asociado
  const { data: rental, error: rentalError } = await admin
    .from('rentals')
    .select('id, costume_id, renter_id, first_name, email, status, event_id, voucher_path')
    .eq('id', rentalId)
    .single();

  if (rentalError || !rental) {
    return NextResponse.json({ ok: false, error: 'Solicitud no encontrada' }, { status: 404 });
  }

  if (rental.status !== 'reservado') {
    return NextResponse.json({ ok: false, error: 'Esta solicitud ya fue procesada' }, { status: 409 });
  }

  if (!rental.voucher_path) {
    return NextResponse.json(
      { ok: false, error: 'El arrendatario aún no sube su comprobante de pago' },
      { status: 409 },
    );
  }

  // Solo el dueño del traje (o super admin) puede confirmar
  const { data: costume } = await admin
    .from('costumes')
    .select('id, owner_id, size, year, status')
    .eq('id', rental.costume_id)
    .single();

  if (!costume) {
    return NextResponse.json({ ok: false, error: 'Traje no encontrado' }, { status: 404 });
  }

  const { data: requesterProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const isOwner = costume.owner_id === user.id;
  const isSuperAdmin = requesterProfile?.role === 'super_admin';

  if (!isOwner && !isSuperAdmin) {
    return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 403 });
  }

  // Confirmar arriendo
  const { error: rentalUpdateError } = await admin
    .from('rentals')
    .update({ status: 'arrendado' })
    .eq('id', rentalId);

  if (rentalUpdateError) {
    return NextResponse.json({ ok: false, error: rentalUpdateError.message }, { status: 500 });
  }

  await admin.from('costumes').update({ status: 'arrendado' }).eq('id', costume.id);

  // Auditoría
  const { data: superAdmin } = await admin
    .from('profiles')
    .select('id')
    .eq('role', 'super_admin')
    .limit(1)
    .maybeSingle();

  await logAdminAction({
    adminId: isSuperAdmin ? user.id : (superAdmin?.id ?? user.id),
    action: AuditAction.RentalConfirmed,
    targetUserId: rental.renter_id,
    details: { rental_id: rentalId, costume_id: costume.id, confirmed_by: isOwner ? 'owner' : 'admin' },
  });

  // Email al arrendatario
  const { data: event } = await admin
    .from('events')
    .select('name, event_date')
    .eq('id', rental.event_id)
    .single();

  const { data: owner } = await admin
    .from('profiles')
    .select('full_name, phone')
    .eq('id', costume.owner_id)
    .single();

  await sendRentConfirmed(rental.email, {
    renterName: rental.first_name,
    costumeSummary: `Traje talla ${costume.size} (${costume.year})`,
    eventName: event?.name ?? 'Evento',
    eventDate: event?.event_date ?? '',
    ownerName: owner?.full_name ?? 'Integrante',
    ownerPhone: owner?.phone ?? '',
  });

  return NextResponse.json({ ok: true });
}
