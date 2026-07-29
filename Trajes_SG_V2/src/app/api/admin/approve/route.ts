import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { verifyApprovalSignature } from '@/lib/approval-token';
import { sendWelcomeApproved } from '@/lib/email/sender';
import { logAdminAction, getClientIp } from '@/lib/audit';
import { rateLimit } from '@/lib/rate-limit';
import { AuditAction } from '@/types/enums';
import { RATE_LIMITS } from '@/config/constants';

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
 * GET /api/admin/approve?token=UUID&sig=HMAC
 * Aprueba al usuario objetivo del token: role='approved', marca el token
 * como usado, registra auditoría y envía el email de bienvenida.
 */
export async function GET(request: NextRequest) {
  const ip = getClientIp() ?? 'unknown';
  const rl = await rateLimit(`approve:${ip}`, RATE_LIMITS.approval.limit, RATE_LIMITS.approval.windowSeconds);
  if (!rl.success) {
    return htmlResponse('Demasiados intentos', 'Has superado el límite de solicitudes. Intenta más tarde.', false);
  }

  const token = request.nextUrl.searchParams.get('token');
  const sig = request.nextUrl.searchParams.get('sig');

  if (!token || !sig || !verifyApprovalSignature(token, sig)) {
    return htmlResponse('Enlace inválido', 'El enlace de aprobación no es válido o fue alterado.', false);
  }

  const admin = createAdminClient();

  // Buscar token vigente y no utilizado
  const { data: tokenRow, error: tokenError } = await admin
    .from('approval_tokens')
    .select('*')
    .eq('token', token)
    .eq('action', 'approve')
    .eq('used', false)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();

  if (tokenError || !tokenRow) {
    return htmlResponse(
      'Enlace expirado o ya utilizado',
      'Este enlace de aprobación ya fue utilizado o expiró (vigencia: 7 días). Revisa el panel de administración para gestionar al usuario manualmente.',
      false,
    );
  }

  // Aprobar al usuario
  const { error: updateError } = await admin
    .from('profiles')
    .update({ role: 'approved' })
    .eq('id', tokenRow.target_user_id);

  if (updateError) {
    return htmlResponse('Error interno', `No se pudo aprobar al usuario: ${updateError.message}`, false);
  }

  // Marcar token como usado
  await admin.from('approval_tokens').update({ used: true }).eq('token', token);

  // Obtener datos del usuario para el email de bienvenida
  const { data: profile } = await admin
    .from('profiles')
    .select('full_name')
    .eq('id', tokenRow.target_user_id)
    .single();

  const { data: authData } = await admin.auth.admin.getUserById(tokenRow.target_user_id);
  const userEmail = authData.user?.email;

  // Auditoría: el actor es el super admin (primer super_admin registrado)
  const { data: superAdmin } = await admin
    .from('profiles')
    .select('id')
    .eq('role', 'super_admin')
    .limit(1)
    .maybeSingle();

  await logAdminAction({
    adminId: superAdmin?.id ?? tokenRow.target_user_id,
    action: AuditAction.UserApproved,
    targetUserId: tokenRow.target_user_id,
    details: { via: 'email_token', token },
  });

  // Email de bienvenida
  if (userEmail) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
    await sendWelcomeApproved(userEmail, profile?.full_name ?? 'Integrante', `${appUrl}/login`);
  }

  return htmlResponse(
    'Usuario aprobado',
    `La cuenta de <strong>${profile?.full_name ?? 'el usuario'}</strong> fue aprobada correctamente. Se le notificó por correo electrónico.`,
    true,
  );
}
