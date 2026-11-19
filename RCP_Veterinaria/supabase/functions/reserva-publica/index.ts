// ============================================================================
// Edge Function: reserva-publica
// LankaPets v2.0
// Valida Cloudflare Turnstile, aplica rate limit y crea cliente, mascota y
// reserva mediante la RPC crear_reserva_publica (solo service_role).
// La clave secret NUNCA se expone al navegador.
// ============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const MAX_INTENTOS_POR_HORA = 3;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function sha256(texto: string): Promise<string> {
  const datos = new TextEncoder().encode(texto);
  const hash = await crypto.subtle.digest('SHA-256', datos);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return json({ error: 'Metodo no permitido' }, 405);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const turnstileSecret = Deno.env.get('TURNSTILE_SECRET_KEY');
  const ipSalt = Deno.env.get('IP_SALT') ?? 'lankapets';

  if (!supabaseUrl || !serviceKey) {
    return json({ error: 'Configuracion del servidor incompleta' }, 500);
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  let body: Record<string, any>;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Cuerpo invalido' }, 400);
  }

  const ip = (req.headers.get('x-forwarded-for') ?? 'desconocida').split(',')[0].trim();
  const ipHash = await sha256(`${ip}:${ipSalt}`);
  const emailNorm = String(body?.cliente?.email ?? '').trim().toLowerCase();
  const telefonoNorm = String(body?.cliente?.telefono ?? '').replace(/\D/g, '');

  async function registrarIntento(resultado: string) {
    await supabase.from('intentos_reserva_publica').insert({
      ip_hash: ipHash,
      email_norm: emailNorm || null,
      telefono_norm: telefonoNorm || null,
      resultado,
    });
  }

  // Rate limit: 3 intentos por hora por IP o email.
  const unaHoraAtras = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const filtro = emailNorm
    ? `ip_hash.eq.${ipHash},email_norm.eq.${emailNorm}`
    : `ip_hash.eq.${ipHash}`;

  const { count } = await supabase
    .from('intentos_reserva_publica')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', unaHoraAtras)
    .or(filtro);

  if ((count ?? 0) >= MAX_INTENTOS_POR_HORA) {
    await registrarIntento('rate_limited');
    return json({ error: 'Demasiados intentos. Intenta mas tarde.' }, 429);
  }

  // Verificacion anti-bot.
  if (!turnstileSecret) {
    return json({ error: 'Turnstile no configurado' }, 500);
  }

  const verificacion = await fetch(
    'https://challenges.cloudflare.com/turnstile/v0/siteverify',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        secret: turnstileSecret,
        response: String(body?.turnstile_token ?? ''),
        remoteip: ip,
      }),
    },
  );

  const resultadoTurnstile = await verificacion.json();

  if (!resultadoTurnstile.success) {
    await registrarIntento('turnstile_fallido');
    return json({ error: 'Verificacion anti-bot fallida' }, 400);
  }

  // Validaciones minimas de entrada.
  if (!body?.profesional_id || !body?.inicio || !body?.cliente || !body?.mascota) {
    await registrarIntento('datos_incompletos');
    return json({ error: 'Faltan datos obligatorios' }, 400);
  }

  const { data, error } = await supabase.rpc('crear_reserva_publica', {
    p_profesional_id: body.profesional_id,
    p_inicio: body.inicio,
    p_motivo: body.motivo ?? null,
    p_cliente: body.cliente,
    p_mascota: body.mascota,
  });

  if (error) {
    await registrarIntento('error');
    return json({ error: error.message }, 400);
  }

  await registrarIntento('ok');

  return json(
    {
      reserva_id: data?.reserva_id,
      token_gestion: data?.token_gestion,
    },
    201,
  );
});
