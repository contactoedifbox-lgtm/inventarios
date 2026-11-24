import { createHashRouter, Navigate } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { RequireAuth } from '@/components/layout/RequireAuth';
import { LoginPage } from '@/features/auth/LoginPage';
import { RegistroPage } from '@/features/auth/RegistroPage';
import { EstablecerClavePage } from '@/features/auth/EstablecerClavePage';
import { DashboardPage } from '@/features/dashboard/DashboardPage';
import { InventarioPage } from '@/features/inventario/InventarioPage';
import { ReservasPage } from '@/features/reservas/ReservasPage';
import { VentasPage } from '@/features/ventas/VentasPage';
import { ClientesPage } from '@/features/clientes/ClientesPage';
import { AgendaPage } from '@/features/agenda/AgendaPage';
import { ReportesPage } from '@/features/reportes/ReportesPage';
import { PersonalPage } from '@/features/personal/PersonalPage';
import { MisDatosPage } from '@/features/clientes/MisDatosPage';
import { ReservaPublicaPage } from '@/features/publico/ReservaPublicaPage';

/**
 * HashRouter porque GitHub Pages no tiene fallback de SPA: el hash evita
 * errores 404 al recargar una ruta interna.
 *
 * Roles:
 *  - maestro: todo
 *  - vendedor: inicio, inventario, ventas, clientes, agenda, reportes
 *  - cliente: inicio, inventario y agenda (sin costos ni datos de terceros)
 */
export const router = createHashRouter([
  { path: '/login', element: <LoginPage /> },
  { path: '/registro', element: <RegistroPage /> },
  { path: '/establecer-clave', element: <EstablecerClavePage /> },
  { path: '/reservar', element: <ReservaPublicaPage /> },
  {
    path: '/',
    element: (
      <RequireAuth>
        <AppShell />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'inventario', element: <InventarioPage /> },
      {
        path: 'reservas',
        element: (
          <RequireAuth roles={['maestro', 'vendedor']}>
            <ReservasPage />
          </RequireAuth>
        ),
      },
      {
        path: 'ventas',
        element: (
          <RequireAuth roles={['maestro', 'vendedor']}>
            <VentasPage />
          </RequireAuth>
        ),
      },
      {
        path: 'clientes',
        element: (
          <RequireAuth roles={['maestro', 'vendedor']}>
            <ClientesPage />
          </RequireAuth>
        ),
      },
      { path: 'agenda', element: <AgendaPage /> },
      {
        path: 'reportes',
        element: (
          <RequireAuth roles={['maestro', 'vendedor']}>
            <ReportesPage />
          </RequireAuth>
        ),
      },
      {
        path: 'personal',
        element: (
          <RequireAuth roles={['maestro']}>
            <PersonalPage />
          </RequireAuth>
        ),
      },
      {
        path: 'mis-datos',
        element: (
          <RequireAuth roles={['cliente']}>
            <MisDatosPage />
          </RequireAuth>
        ),
      },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]);
