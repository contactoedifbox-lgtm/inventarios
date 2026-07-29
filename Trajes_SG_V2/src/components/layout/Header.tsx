'use client';

import Link from 'next/link';
import { LogOut, User } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Navigation } from '@/components/layout/Navigation';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { siteConfig } from '@/config/site';
import { ROUTES } from '@/config/constants';

export function Header() {
  const { profile, isAuthenticated, isSuperAdmin, signOut } = useAuth();

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-6">
          <Link href={ROUTES.home} className="flex items-center gap-2">
            <span className="text-lg font-bold tracking-tight text-brand-red">
              {siteConfig.name}
            </span>
          </Link>
          {isAuthenticated && (
            <div className="hidden md:block">
              <Navigation isAdmin={isSuperAdmin} />
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isAuthenticated ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2">
                  <User className="h-4 w-4" />
                  <span className="hidden sm:inline">{profile?.full_name ?? 'Cuenta'}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Mi cuenta</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href={ROUTES.dashboard.perfil}>Perfil</Link>
                </DropdownMenuItem>
                {isSuperAdmin && (
                  <DropdownMenuItem asChild>
                    <Link href={ROUTES.admin.home}>Panel Admin</Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => void signOut()} className="text-destructive">
                  <LogOut className="h-4 w-4" />
                  Cerrar sesión
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link href={ROUTES.login}>Ingresar</Link>
              </Button>
              <Button variant="brand" size="sm" asChild>
                <Link href={ROUTES.register}>Registrarse</Link>
              </Button>
            </>
          )}
        </div>
      </div>
      {isAuthenticated && (
        <div className="border-t px-4 py-2 md:hidden">
          <Navigation isAdmin={isSuperAdmin} />
        </div>
      )}
    </header>
  );
}
