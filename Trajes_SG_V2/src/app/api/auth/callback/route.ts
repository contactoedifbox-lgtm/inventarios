import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/auth/callback?code=...&next=/ruta
 * Intercambia el código de autenticación (confirmación de email, magic link,
 * recuperación de contraseña) por una sesión y redirige según el rol.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next');

  if (code) {
    const supabase = createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        // Redirección explícita tiene prioridad si es segura (ruta interna)
        if (next && next.startsWith('/')) {
          return NextResponse.redirect(`${origin}${next}`);
        }

        if (profile?.role === 'super_admin') {
          return NextResponse.redirect(`${origin}/admin`);
        }
        if (profile?.role === 'approved') {
          return NextResponse.redirect(`${origin}/arriendo`);
        }
        return NextResponse.redirect(`${origin}/cuenta-en-revision`);
      }
    }
  }

  // Código inválido o error: volver al login
  return NextResponse.redirect(`${origin}/login`);
}
