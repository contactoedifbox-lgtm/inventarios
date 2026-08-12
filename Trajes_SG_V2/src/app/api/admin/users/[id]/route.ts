import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { adminUserActionSchema } from '@/lib/validations/user.schema';
import { sendWelcomeApproved, sendAccountRejected, sendAccountSuspended } from '@/lib/email/sender';
import { logAdminAction, getClientIp } from '@/lib/audit';
import { rateLimit } from '@/lib/rate-limit';
import { AuditAction } from '@/types/enums';
import { RATE_LIMITS, STORAGE_BUCKETS } from '@/config/constants';

interface RouteContext {
  params: { id: string };
}

/**
 * PATCH /api/admin/users/[id]
 * Acciones del super admin sobre usuarios (desde el panel):
 * approve | reject | suspend | reactivate | delete
 * Todas registran auditoría y envían el email transaccional correspondiente.
 */
export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const ip = getClientIp() ?? 'unknown';
  const rl = await rateLimit(`admin-users:${ip}`, RATE_LIMITS.api.limit, RATE_LIMITS.api.windowSeconds);
  if (!rl.success) {
    return NextResponse.json({ ok: false, error: 'Demasiadas solicitudes' }, { status: 429 });
  }

  // Solo super admin o maestro
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

  const isAdmin = requesterProfile?.role === 'super_admin' || requesterProfile?.role === 'maestro';

  if (!isAdmin) {
    return NextResponse.json({ ok: false, error: 'Solo el administrador puede realizar esta acción' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'JSON inválido' }, { status: 400 });
  }

  const parsed = adminUserActionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: 'Acción inválida' }, { status: 400 });
  }

  const targetUserId = params.id;
  const { action } = parsed.data;
  const reason = 'reason' in parsed.data ? parsed.data.reason : undefined;

  if (targetUserId === user.id && action !== 'approve') {
    return NextResponse.json({ ok: false, error: 'No puedes aplicar esta acción sobre tu propia cuenta' }, { status: 409 });
  }

  const admin = createAdminClient();

  const { data: target, error: targetError } = await admin
    .from('profiles')
    .select('full_name, nombres, apellidos, id_card_path, carnet_frontal_url, carnet_trasera_url, role')
    .eq('id', targetUserId)
    .single();

  if (targetError || !target) {
    return NextResponse.json({ ok: false, error: 'Usuario no encontrado' }, { status: 404 });
  }

  const { data: targetAuth } = await admin.auth.admin.getUserById(targetUserId);
  const targetEmail = targetAuth.user?.email;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const fullName = target.full_name || `${target.nombres || ''} ${target.apellidos || ''}`.trim() || 'Usuario';

  switch (action) {
    case 'approve': {
      const { error } = await admin
        .from('profiles')
        .update({ role: 'approved' })
        .eq('id', targetUserId);
      if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

      // Invalidar tokens pendientes
      await admin
        .from('approval_tokens')
        .update({ used: true })
        .eq('target_user_id', targetUserId)
        .eq('used', false);

      if (targetEmail) {
        await sendWelcomeApproved(targetEmail, fullName, `${appUrl}/login`);
      }

      await logAdminAction({
        adminId: user.id,
        action: AuditAction.UserApproved,
        targetUserId,
        details: { via: 'admin_panel' },
      });
      break;
    }

    case 'reject': {
      const { error } = await admin
        .from('profiles')
        .update({ role: 'rejected', rejection_reason: reason ?? null })
        .eq('id', targetUserId);
      if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

      // Eliminar fotos del carnet (datos sensibles)
      if (target.id_card_path) {
        await admin.storage.from(STORAGE_BUCKETS.idCards).remove([target.id_card_path]);
        await admin.from('profiles').update({ id_card_path: null }).eq('id', targetUserId);
      }

      if (targetEmail) {
        await sendAccountRejected(targetEmail, fullName, reason ?? 'Sin motivo especificado');
      }

      await logAdminAction({
        adminId: user.id,
        action: AuditAction.UserRejected,
        targetUserId,
        details: { via: 'admin_panel', reason },
      });
      break;
    }

    case 'suspend': {
      const { error } = await admin
        .from('profiles')
        .update({
          role: 'suspended',
          suspended_reason: reason ?? null,
          suspended_at: new Date().toISOString(),
        })
        .eq('id', targetUserId);
      if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

      if (targetEmail) {
        await sendAccountSuspended(targetEmail, fullName, reason ?? 'Sin motivo especificado');
      }

      await logAdminAction({
        adminId: user.id,
        action: AuditAction.UserSuspended,
        targetUserId,
        details: { reason },
      });
      break;
    }

    case 'reactivate': {
      const { error } = await admin
        .from('profiles')
        .update({ role: 'approved', suspended_reason: null, suspended_at: null, rejection_reason: null })
        .eq('id', targetUserId);
      if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

      await logAdminAction({
        adminId: user.id,
        action: AuditAction.UserReactivated,
        targetUserId,
        details: {},
      });
      break;
    }

    case 'delete': {
      // Eliminar de auth.users (profiles cae en cascada)
      const { error } = await admin.auth.admin.deleteUser(targetUserId);
      if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

      await logAdminAction({
        adminId: user.id,
        action: AuditAction.UserDeleted,
        targetUserId,
        details: { deleted_name: fullName },
      });
      break;
    }
  }

  return NextResponse.json({ ok: true });
}
