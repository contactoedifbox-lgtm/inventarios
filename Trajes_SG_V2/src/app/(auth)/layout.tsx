import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { ROUTES } from '@/config/constants';
import { siteConfig } from '@/config/site';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-muted">
      <Header />
      <main className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <div className="rounded-xl border bg-card p-6 shadow sm:p-8">{children}</div>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            <Link href={ROUTES.home} className="hover:text-brand-red">
              &larr; Volver a {siteConfig.name}
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
