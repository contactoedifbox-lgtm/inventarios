import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { ROUTES } from '@/config/constants';

/**
 * Layout del área autenticada: exige sesión y rol 'approved' o 'super_admin' o 'maestro' o 'propietario' o 'arrendatario'.
 * El middleware ya filtra; esto es defensa en profundidad del lado del servidor.
 */
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect(ROUTES.login);

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  // Roles permitidos en el dashboard
  const allowedRoles = ['approved', 'super_admin', 'maestro', 'propietario', 'arrendatario'];

  if (!profile || !allowedRoles.includes(profile.role)) {
    redirect(ROUTES.pendingReview);
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6">{children}</main>
      <Footer />
    </div>
  );
}
