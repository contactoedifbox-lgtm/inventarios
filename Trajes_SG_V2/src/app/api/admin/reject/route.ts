import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { verifyApprovalSignature } from '@/lib/approval-token';
import { sendAccountRejected } from '@/lib/email/sender';
import { logAdminAction, getClientIp } from '@/lib/audit';
import { rateLimit } from '@/lib/rate-limit';
import { AuditAction } from '@/types/enums';
import { RATE_LIMITS, STORAGE_BUCKETS } from '@/config/constants';

function htmlResponse(title: string, message: string, ok: boolean): NextResponse {
  const color = ok ? '#2e7d32' : '#d62828';
  const html = `<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"><title>${title} — Caporales San Gabriel</title>
<meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="font-family:system-ui,sans-serif;background:#fafafa;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;">
  <div style="background:#fff;border:1px solid #eee;border-top:4px solid ${color};border-radius:12px;padding:40px;max-width:480px;text-align:center;box-shadow:0 4px 20px rgba(0,0,0,.06);">
    <h1 style="color:${color};font-size:24px;margin:0 0 12px;">${title}</h1>
    <p style="color:#444;line-height:1.6;margin:0;">${message}</p>
    <p style="color:#888;font-size:13px;margin-top:24px;">Caporales San Gabriel — ya puedes cerrar esta ventana.</p>
  </div>
</body>
</html>`;
  return new NextResponse(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

/**
 * GET /api/admin/reject?token=UUID&sig=HMAC&reason=...
 * Rechaza al usuario objetivo: role='rejected' + motivo, marca el token
 * como usado, elimina la imagen del carnet del storage y envía email.
 */
export async function GET(request: NextRequest) {
  const ip = getClientIp() ?? 'unknown';
  const rl = await rateLimit(`reject:${ip}`, RATE_LIMITS.approval.limit, RATE_LIMITS.approval.windowSeconds);
  if (!rl.success) {
    return htmlResponse('Demasiados intentos', 'Has superado el límite de solicitudes. Intenta más tarde.', false);
  }

  const token = request.nextUrl.searchParams.get('token');
  const sig = request.nextUrl.searchParams.get('sig');
  const reason = request.nextUrl.searchParams.get('reason') ?? 'No se cumplieron los requisitos de verificación de identidad.';

  if (!token || !sig || !verifyApprovalSignature(token, sig)) {
    return htmlResponse('Enlace inválido', 'El enlace de rechazo no es válido o fue alterado.', false);
  }

  const admin = createAdminClient();

  const { data: tokenRow, error: tokenError } = await admin
    .from('approval_tokens')
    .select('*')
    .eq('token', token)
    .eq('action', 'reject')
    .eq('used', false)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();

  if (tokenError || !tokenRow) {
    return htmlResponse(
      'Enlace expirado o ya utilizado',
      'Este enlace de rechazo ya fue utilizado o expiró. Gestiona al usuario desde el panel de administración.',
      false,
    );
  }

  // Rechazar al usuario
  const { data: profile, error: updateError } = await admin
    .from('profiles')
    .update({ role: 'rejected', rejection_reason: reason })
    .eq('id', tokenRow.target_user_id)
    .select('full_name, id_card_path')
    .single();

  if (updateError) {
    return htmlResponse('Error interno', `No se pudo rechazar al usuario: ${updateError.message}`, false);
  }

  // Marcar token como usado
  await admin.from('approval_tokens').update({ used: true }).eq('token', token);

  // Eliminar la imagen del carnet del storage (dato sensible)
  if (profile?.id_card_path) {
    await admin.storage.from(STORAGE_BUCKETS.idCards).remove([profile.id_card_path]);
    await admin
      .from('profiles')
      .update({ id_card_path: null })
      .eq('id', tokenRow.target_user_id);
  }

  // Email al usuario con el motivo
  const { data: authData } = await admin.auth.admin.getUserById(tokenRow.target_user_id);
  if (authData.user?.email) {
    await sendAccountRejected(authData.user.email, profile?.full_name ?? 'Integrante', reason);
  }

  // Auditoría
  const { data: superAdmin } = await admin
    .from('profiles')
    .select('id')
    .eq('role', 'super_admin')
    .limit(1)
    .maybeSingle();

  await logAdminAction({
    adminId: superAdmin?.id ?? tokenRow.target_user_id,
    action: AuditAction.UserRejected,
    targetUserId: tokenRow.target_user_id,
    details: { via: 'email_token', token, reason },
  });

  return htmlResponse(
    'Usuario rechazado',
    `La solicitud de <strong>${profile?.full_name ?? 'el usuario'}</strong> fue rechazada y su carnet fue eliminado del sistema. Se le notificó por correo electrónico.`,
    true,
  );
}
