'use client';

import Link from 'next/link';
import { Users, CalendarDays, ScrollText, Shirt, UserCheck } from 'lucide-react';
import { useAdminStats } from '@/hooks/useAdmin';
import { ROUTES } from '@/config/constants';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function AdminHomePage() {
  const { data: stats, isLoading } = useAdminStats();

  const cards = [
    {
      title: 'Usuarios pendientes',
      value: stats?.pendingUsers,
      icon: Users,
      href: ROUTES.admin.usuarios,
      highlight: true,
    },
    {
      title: 'Usuarios aprobados',
      value: stats?.approvedUsers,
      icon: UserCheck,
      href: ROUTES.admin.usuarios,
    },
    {
      title: 'Trajes publicados',
      value: stats?.totalCostumes,
      icon: Shirt,
      href: ROUTES.admin.home,
    },
    {
      title: 'Arriendos activos',
      value: stats?.activeRentals,
      icon: ScrollText,
      href: ROUTES.admin.auditoria,
    },
    {
      title: 'Eventos vigentes',
      value: stats?.totalEvents,
      icon: CalendarDays,
      href: ROUTES.admin.eventos,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Panel de administración</h1>
        <p className="text-sm text-muted-foreground">Resumen general de la plataforma.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <Link key={card.title} href={card.href}>
            <Card
              className={
                card.highlight && (card.value ?? 0) > 0
                  ? 'border-brand-orange bg-brand-orange/5 transition-colors hover:bg-brand-orange/10'
                  : 'transition-colors hover:bg-accent'
              }
            >
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
                <card.icon className="h-5 w-5 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <p className="text-3xl font-bold">{card.value ?? 0}</p>
                )}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Accesos rápidos</CardTitle>
          <CardDescription>Gestiona usuarios, eventos y revisa la auditoría.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Link
            href={ROUTES.admin.usuarios}
            className="rounded-md bg-brand-red px-4 py-2 text-sm font-medium text-white hover:bg-brand-red/90"
          >
            Gestionar usuarios
          </Link>
          <Link
            href={ROUTES.admin.eventos}
            className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent"
          >
            Gestionar eventos
          </Link>
          <Link
            href={ROUTES.admin.auditoria}
            className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent"
          >
            Ver auditoría
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
