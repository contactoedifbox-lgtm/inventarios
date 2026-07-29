import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { sendSaleConfirmed } from '@/lib/email/sender';
import { logAdminAction, getClientIp } from '@/lib/audit';
import { rateLimit } from '@/lib/rate-limit';
import { AuditAction } from '@/types/enums';
import { RATE_LIMITS } from '@/config/constants';

interface RouteContext {
  params: { id: string };
}

/**
 * PATCH /api/sales/[id]/confirm
 * El dueño confirma la venta: se invoca la función confirm_sale() de la
 * base de datos (sale.status='completado' + costume.is_sold=true),
 * se registra auditoría y se envía el email al comprador.
 */
export async function PATCH(_request: NextRequest, { params }: RouteContext) {
  const ip = getClientIp() ?? 'unknown';
  const rl = await rateLimit(`sale-confirm:${ip}`, RATE_LIMITS.api.limit, RATE_LIMITS.api.windowSeconds);
  if (!rl.success) {
    return NextResponse.json({ ok: false, error: 'Demasiadas solicitudes' }, { status: 429 });
  }

  const saleId = params.id;

  const supabase = createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: 'Debes iniciar sesión' }, { status: 401 });
  }

  const admin = createAdminClient();

  const { data: sale, error: saleError } = await admin
    .from('sales')
    .select('id, costume_id, buyer_id, first_name, email, status, voucher_path')
    .eq('id', saleId)
    .single();

  if (saleError || !sale) {
    return NextResponse.json({ ok: false, error: 'Solicitud no encontrada' }, { status: 404 });
  }

  if (sale.status !== 'reservado') {
    return NextResponse.json({ ok: false, error: 'Esta venta ya fue procesada' }, { status: 409 });
  }

  if (!sale.voucher_path) {
    return NextResponse.json(
      { ok: false, error: 'El comprador aún no sube su comprobante de pago' },
      { status: 409 },
    );
  }

  const { data: costume } = await admin
    .from('costumes')
    .select('id, owner_id, size, year, price')
    .eq('id', sale.costume_id)
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

  // Soft delete vía función de base de datos
  const { data: superAdmin } = await admin
    .from('profiles')
    .select('id')
    .eq('role', 'super_admin')
    .limit(1)
    .maybeSingle();

  const { error: rpcError } = await admin.rpc('confirm_sale', {
    p_sale_id: saleId,
    p_admin_id: isSuperAdmin ? user.id : (superAdmin?.id ?? user.id),
  });

  if (rpcError) {
    return NextResponse.json(
      { ok: false, error: `Error al confirmar la venta: ${rpcError.message}` },
      { status: 500 },
    );
  }

  // Auditoría
  await logAdminAction({
    adminId: isSuperAdmin ? user.id : (superAdmin?.id ?? user.id),
    action: AuditAction.SaleConfirmed,
    targetUserId: sale.buyer_id,
    details: { sale_id: saleId, costume_id: costume.id, confirmed_by: isOwner ? 'owner' : 'admin' },
  });

  // Email al comprador
  const { data: owner } = await admin
    .from('profiles')
    .select('full_name, phone')
    .eq('id', costume.owner_id)
    .single();

  await sendSaleConfirmed(sale.email, {
    buyerName: sale.first_name,
    costumeSummary: `Traje talla ${costume.size} (${costume.year})`,
    price: costume.price,
    ownerName: owner?.full_name ?? 'Integrante',
    ownerPhone: owner?.phone ?? '',
  });

  return NextResponse.json({ ok: true });
}
