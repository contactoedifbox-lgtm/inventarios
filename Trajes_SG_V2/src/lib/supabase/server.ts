import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/types/database.types';

/**
 * Cliente Supabase para Server Components y Route Handlers.
 * Lee/escribe la sesión desde las cookies de la request.
 *
 * NOTA Next 14: `cookies()` es síncrono. Si migras a Next 15,
 * convierte esta función a `async` y usa `await cookies()`.
 */
export function createClient() {
  const cookieStore = cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Llamado desde un Server Component: las cookies no se pueden
            // escribir aquí; el middleware se encarga de refrescar la sesión.
          }
        },
      },
    },
  );
}