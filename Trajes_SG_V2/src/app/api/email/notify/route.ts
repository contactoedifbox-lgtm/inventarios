import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { buildApprovalUrl } from '@/lib/approval-token';
import { sendNewRegistrationToAdmin } from '@/lib/email/sender';
import { rateLimit } from '@/lib/rate-limit';
import { getClientIp } from '@/lib/audit';
import { RATE_LIMITS, STORAGE_BUCKETS, SIGNED_URL_EXPIRY_SECONDS } from '@/config/constants';

const notifySchema = z.object({
  user_id: z.string().uuid(),
  type: z.literal('new_registration'),
});

/**
 * POST /api/email/notify
 * Llamado tras el registro: crea los tokens de aprobación/rechazo,
 * genera la URL firmada del carnet (24 h) y envía el email al super admin
 * con los datos del usuario y los botones APROBAR / RECHAZAR.
 * Solo el propio usuario recién registrado puede invocarla para sí mismo.
 */
export async function POST(request: NextRequest) {
  const ip = getClientIp() ?? 'unknown';
  const rl = await rateLimit(`notify:${ip}`, RATE_LIMITS.api.limit, RATE_LIMITS.api.windowSeconds);
  if (!rl.success) {
    return NextResponse.json({ ok: false, error: 'Demasiadas solicitudes' }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'JSON inválido' }, { status: 400 });
  }

  const parsed = notifySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: 'Payload inválido' }, { status: 400 });
  }

  const { user_id } = parsed.data;

  // Verificar que el solicitante es el mismo usuario autenticado
  const supabase = createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.id !== user_id) {
    return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 401 });
  }

  const admin = createAdminClient();

  // Perfil del usuario registrado
  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('*')
    .eq('id', user_id)
    .single();

  if (profileError || !profile) {
    return NextResponse.json({ ok: false, error: 'Perfil no encontrado' }, { status: 404 });
  }

  if (profile.role !== 'pending') {
    return NextResponse.json({ ok: true, message: 'El usuario ya fue procesado' });
  }

  // Invalidar tokens anteriores del usuario (re-envíos)
  await admin
    .from('approval_tokens')
    .update({ used: true })
    .eq('target_user_id', user_id)
    .eq('used', false);

  // Crear tokens de aprobar y rechazar
  const { data: tokens, error: tokensError } = await admin
    .from('approval_tokens')
    .insert([
      { target_user_id: user_id, action: 'approve' },
      { target_user_id: user_id, action: 'reject' },
    ])
    .select('token, action');

  if (tokensError || !tokens || tokens.length < 2) {
    return NextResponse.json(
      { ok: false, error: `Error al crear tokens: ${tokensError?.message ?? 'desconocido'}` },
      { status: 500 },
    );
  }

  const approveToken = tokens.find((t) => t.action === 'approve')?.token;
  const rejectToken = tokens.find((t) => t.action === 'reject')?.token;
  if (!approveToken || !rejectToken) {
    return NextResponse.json({ ok: false, error: 'Tokens incompletos' }, { status: 500 });
  }

  // URL firmada del carnet (válida 24 horas) - usar carnet_frontal_url si existe
  let idCardSignedUrl: string | null = null;
  if (profile.id_card_path) {
    const { data: signed } = await admin.storage
      .from(STORAGE_BUCKETS.idCards)
      .createSignedUrl(profile.id_card_path, SIGNED_URL_EXPIRY_SECONDS);
    idCardSignedUrl = signed?.signedUrl ?? null;
  }

  // Enviar email al super admin con todos los datos de App A
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const emailResult = await sendNewRegistrationToAdmin({
    fullName: profile.full_name || `${profile.nombres || ''} ${profile.apellidos || ''}`.trim(),
    rut: profile.rut || '',
    phone: profile.phone || '',
    email: profile.email || user.email || 'sin-correo',
    address: profile.address || '',
    city: profile.city || '',
    idCardSignedUrl,
    approveUrl: buildApprovalUrl('approve', approveToken),
    rejectUrl: buildApprovalUrl('reject', rejectToken),
  });

  return NextResponse.json({ ok: true, email_sent: emailResult.success });
}
