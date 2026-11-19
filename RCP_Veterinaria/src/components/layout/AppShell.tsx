import { useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth, type Rol } from '@/features/auth/AuthProvider';

interface Enlace {
  to: string;
  label: string;
  end?: boolean;
  roles: Rol[];
}

const ENLACES: Enlace[] = [
  { to: '/', label: 'Inicio', end: true, roles: ['maestro', 'vendedor', 'cliente'] },
  { to: '/inventario', label: 'Inventario', roles: ['maestro', 'vendedor', 'cliente'] },
  { to: '/ventas', label: 'Ventas', roles: ['maestro', 'vendedor'] },
  { to: '/clientes', label: 'Clientes', roles: ['maestro', 'vendedor'] },
  { to: '/agenda', label: 'Agenda', roles: ['maestro', 'vendedor', 'cliente'] },
  { to: '/reportes', label: 'Reportes', roles: ['maestro', 'vendedor'] },
  { to: '/personal', label: 'Personal', roles: ['maestro'] },
  { to: '/mis-datos', label: 'Mis datos', roles: ['cliente'] },
];

const ETIQUETA_ROL: Record<Rol, string> = {
  maestro: 'Maestro',
  vendedor: 'Vendedor',
  cliente: 'Cliente',
};

const LOGO = `${import.meta.env.BASE_URL}logo-lanka.jpeg`;

export function AppShell() {
  const { perfil, cerrarSesion, modoRecuperacion } = useAuth();
  const navigate = useNavigate();

  // Si el usuario llego por un enlace de recuperacion/invitacion, lo llevamos a
  // definir su contrasena.
  useEffect(() => {
    if (modoRecuperacion) {
      navigate('/establecer-clave', { replace: true });
    }
  }, [modoRecuperacion, navigate]);

  const enlaces = ENLACES.filter((enlace) => perfil && enlace.roles.includes(perfil.rol));

  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-40 border-b border-line bg-surface/95 shadow-sm backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-surface shadow-sm ring-1 ring-line">
              <img
                src={LOGO}
                alt="Lanka Pet Care"
                className="h-10 w-10 rounded-full object-cover"
              />
            </span>
            <div className="leading-tight">
              <span className="block text-xl font-bold tracking-tight text-brand-700">Lanka</span>
              <span className="block text-xs uppercase tracking-[0.18em] text-muted">
                Pet Care
              </span>
            </div>
          </div>

          <nav className="hidden items-center gap-1 md:flex">
            {enlaces.map((enlace) => (
              <NavLink
                key={enlace.to}
                to={enlace.to}
                end={enlace.end}
                className={({ isActive }) =>
                  `rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-brand-50 text-brand-700 shadow-sm ring-1 ring-brand-100'
                      : 'text-muted hover:bg-brand-50 hover:text-brand-700'
                  }`
                }
              >
                {enlace.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-semibold text-ink">
                {perfil?.nombre_completo ?? 'Sin perfil'}
              </p>
              <p className="text-xs uppercase tracking-wide text-muted">
                {perfil ? ETIQUETA_ROL[perfil.rol] : '-'}
              </p>
            </div>
            <button type="button" className="btn-secondary" onClick={() => void cerrarSesion()}>
              Salir
            </button>
          </div>
        </div>

        <nav className="flex gap-1 overflow-x-auto border-t border-line px-4 py-2 md:hidden">
          {enlaces.map((enlace) => (
            <NavLink
              key={enlace.to}
              to={enlace.to}
              end={enlace.end}
              className={({ isActive }) =>
                `whitespace-nowrap rounded-xl px-3 py-1.5 text-sm ${
                  isActive ? 'bg-brand-50 text-brand-700' : 'text-muted'
                }`
              }
            >
              {enlace.label}
            </NavLink>
          ))}
        </nav>

        <div className="h-0.5 w-full bg-gradient-to-r from-brand-600 via-brand-400 to-accent-600" />
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">
        <Outlet />
      </main>

      <footer className="border-t border-line bg-surface py-3 text-center text-xs text-muted">
        Lanka Pet Care · Gestion veterinaria
      </footer>
    </div>
  );
}
