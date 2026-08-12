import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { Database } from '@/types/database.types';

/**
 * Middleware de protección de rutas:
 * - Refresca la sesión de Supabase en cada request (cookies)
 * - /arriendo, /venta, /perfil  → requieren sesión + rol permitido
 * - /admin/*                    → requieren sesión + rol 'super_admin' o 'maestro'
 * - /login, /register           → redirigen al dashboard si ya hay sesión
 * - /cuenta-en-revision         → requiere sesión (usuarios pendientes)
 */

const PROTECTED_PREFIXES = ['/arriendo', '/venta', '/perfil'];
const ADMIN_PREFIX = '/admin';
const AUTH_ROUTES = ['/login', '/register'];
const PENDING_ROUTE = '/cuenta-en-revision';

// Roles permitidos en el dashboard
const ALLOWED_DASHBOARD_ROLES = ['approved', 'super_admin', 'maestro', 'propietario', 'arrendatario'];
// Roles permitidos en admin
const ALLOWED_ADMIN_ROLES = ['super_admin', 'maestro'];

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  const isProtected = PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  const isAdminRoute = pathname.startsWith(ADMIN_PREFIX);
  const isAuthRoute = AUTH_ROUTES.some((route) => pathname.startsWith(route));
  const isPendingRoute = pathname.startsWith(PENDING_ROUTE);

  // Sin sesión: proteger rutas privadas
  if (!user && (isProtected || isAdminRoute || isPendingRoute)) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  // Con sesión: resolver rol del perfil
  let role: string | null = null;
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    role = profile?.role ?? null;
  }

  // Usuarios logueados no deben ver login/register
  if (user && isAuthRoute) {
    const url = request.nextUrl.clone();
    if (role === 'super_admin' || role === 'maestro') {
      url.pathname = '/admin';
    } else if (role && ALLOWED_DASHBOARD_ROLES.includes(role)) {
      url.pathname = '/arriendo';
    } else {
      url.pathname = PENDING_ROUTE;
    }
    url.search = '';
    return NextResponse.redirect(url);
  }

  // Rutas de usuario aprobado
  if (user && isProtected) {
    if (!role || !ALLOWED_DASHBOARD_ROLES.includes(role)) {
      const url = request.nextUrl.clone();
      url.pathname = PENDING_ROUTE;
      url.search = '';
      return NextResponse.redirect(url);
    }
  }

  // Rutas de administración
  if (user && isAdminRoute && !ALLOWED_ADMIN_ROLES.includes(role || '')) {
    const url = request.nextUrl.clone();
    url.pathname = role && ALLOWED_DASHBOARD_ROLES.includes(role) ? '/arriendo' : PENDING_ROUTE;
    url.search = '';
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Aplica a todo excepto estáticos e imágenes optimizadas.
     * Las API routes hacen su propia verificación (defensa en profundidad).
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
