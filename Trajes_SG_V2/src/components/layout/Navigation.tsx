'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { ROUTES } from '@/config/constants';

const links = [
  { href: ROUTES.dashboard.arriendo, label: 'Arriendo' },
  { href: ROUTES.dashboard.venta, label: 'Venta' },
  { href: ROUTES.dashboard.perfil, label: 'Mi Perfil' },
];

/** Navegación principal del área autenticada */
export function Navigation({ isAdmin = false }: { isAdmin?: boolean }) {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-1 sm:gap-2">
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={cn(
            'rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground',
            pathname.startsWith(link.href) ? 'bg-accent text-accent-foreground' : 'text-muted-foreground',
          )}
        >
          {link.label}
        </Link>
      ))}
      {isAdmin && (
        <Link
          href={ROUTES.admin.home}
          className={cn(
            'rounded-md px-3 py-2 text-sm font-semibold text-brand-red transition-colors hover:bg-brand-red/10',
            pathname.startsWith(ROUTES.admin.home) && 'bg-brand-red/10',
          )}
        >
          Admin
        </Link>
      )}
    </nav>
  );
}
