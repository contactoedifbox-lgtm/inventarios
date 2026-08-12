import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { ROUTES } from '@/config/constants';

/** Layout del panel admin: exige sesión y rol 'super_admin' o 'maestro' (defensa en profundidad). */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
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

  // Permitir super_admin y maestro
  if (!profile || (profile.role !== 'super_admin' && profile.role !== 'maestro')) {
    redirect(ROUTES.dashboard.arriendo);
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6">{children}</main>
      <Footer />
    </div>
  );
}
