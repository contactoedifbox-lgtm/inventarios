// ============================================================================
// Edge Function: admin-usuarios
// LankaPets v2.0
// Alta y gestion de perfiles. Solo invocable por un Maestro autenticado.
// Usa la clave secret para crear usuarios en Auth y escribir perfiles.
// ============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
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

  if (!supabaseUrl || !serviceKey) {
    return json({ error: 'Configuracion del servidor incompleta' }, 500);
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  // Verifica el JWT del llamador.
  const token = (req.headers.get('Authorization') ?? '').replace('Bearer ', '');
  const { data: userData, error: userError } = await supabase.auth.getUser(token);

  if (userError || !userData?.user) {
    return json({ error: 'No autenticado' }, 401);
  }

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('rol, activo')
    .eq('id', userData.user.id)
    .maybeSingle();

  if (!perfil || perfil.rol !== 'maestro' || !perfil.activo) {
    return json({ error: 'Solo un Maestro puede administrar usuarios' }, 403);
  }

  let body: Record<string, any>;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Cuerpo invalido' }, 400);
  }

  const accion = String(body?.accion ?? '');

  if (accion === 'crear_usuario') {
    const { email, password, nombre_completo, rol } = body;

    if (!email || !password || !nombre_completo) {
      return json({ error: 'Faltan datos del usuario' }, 400);
    }

    const rolFinal = rol === 'maestro' ? 'maestro' : rol === 'cliente' ? 'cliente' : 'vendedor';

    // ¿Ya existia una ficha de cliente con ese email? (para no borrar una real)
    const { data: fichaPrevia } = await supabase
      .from('clientes')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    const { data: creado, error: errorCrear } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (errorCrear || !creado?.user) {
      return json({ error: errorCrear?.message ?? 'No se pudo crear el usuario' }, 400);
    }

    // El trigger en auth.users crea un perfil 'cliente' y una ficha de cliente.
    // Para roles de personal reemplazamos el perfil (delete + insert, porque el
    // trigger de proteccion bloquea el UPDATE de rol) y quitamos la ficha creada.
    if (rolFinal !== 'cliente') {
      await supabase.from('perfiles').delete().eq('id', creado.user.id);

      const { error: errorPerfil } = await supabase.from('perfiles').insert({
        id: creado.user.id,
        nombre_completo,
        rol: rolFinal,
        activo: true,
      });

      if (errorPerfil) {
        return json({ error: errorPerfil.message }, 400);
      }

      if (!fichaPrevia) {
        await supabase.from('clientes').delete().eq('email', email);
      }
    } else {
      // Cliente: el trigger ya creo el perfil; si no, lo creamos aqui.
      const { data: perfilExistente } = await supabase
        .from('perfiles')
        .select('id')
        .eq('id', creado.user.id)
        .maybeSingle();

      if (!perfilExistente) {
        const { error: errorPerfil } = await supabase.from('perfiles').insert({
          id: creado.user.id,
          nombre_completo,
          rol: 'cliente',
          activo: true,
        });

        if (errorPerfil) {
          return json({ error: errorPerfil.message }, 400);
        }
      }
    }

    return json({ id: creado.user.id }, 201);
  }

  if (accion === 'actualizar_rol') {
    const { id, rol } = body;
    if (!id || !rol) return json({ error: 'Faltan datos' }, 400);

    const { error } = await supabase
      .from('perfiles')
      .update({ rol })
      .eq('id', id);

    if (error) return json({ error: error.message }, 400);
    return json({ ok: true });
  }

  if (accion === 'cambiar_estado') {
    const { id, activo } = body;
    if (!id || typeof activo !== 'boolean') return json({ error: 'Faltan datos' }, 400);

    const { error } = await supabase
      .from('perfiles')
      .update({ activo })
      .eq('id', id);

    if (error) return json({ error: error.message }, 400);
    return json({ ok: true });
  }

  // Crea la cuenta de un profesional con una contrasena temporal y le envia un
  // correo para que fije su propia contrasena.
  if (accion === 'invitar_usuario') {
    const { email, nombre_completo, rol, redirectTo } = body;

    if (!email || !nombre_completo) {
      return json({ error: 'Faltan datos del usuario' }, 400);
    }

    const rolFinal = rol === 'maestro' ? 'maestro' : rol === 'cliente' ? 'cliente' : 'vendedor';

    const { data: fichaPrevia } = await supabase
      .from('clientes')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    const passwordTemporal = `${crypto.randomUUID()}Aa1!`;

    const { data: creado, error: errorCrear } = await supabase.auth.admin.createUser({
      email,
      password: passwordTemporal,
      email_confirm: true,
    });

    if (errorCrear || !creado?.user) {
      return json({ error: errorCrear?.message ?? 'No se pudo crear el usuario' }, 400);
    }

    if (rolFinal !== 'cliente') {
      await supabase.from('perfiles').delete().eq('id', creado.user.id);

      const { error: errorPerfil } = await supabase.from('perfiles').insert({
        id: creado.user.id,
        nombre_completo,
        rol: rolFinal,
        activo: true,
      });

      if (errorPerfil) {
        return json({ error: errorPerfil.message }, 400);
      }

      if (!fichaPrevia) {
        await supabase.from('clientes').delete().eq('email', email);
      }
    }

    // Envia el correo para que el usuario fije su propia contrasena.
    const { error: errorReset } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectTo || undefined,
    });

    return json(
      {
        id: creado.user.id,
        correo_enviado: !errorReset,
        error_correo: errorReset?.message ?? null,
      },
      201,
    );
  }

  return json({ error: 'Accion no soportada' }, 400);
});
