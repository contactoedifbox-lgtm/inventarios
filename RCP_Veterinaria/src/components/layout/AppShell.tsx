import { useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { etiquetaRol, useAuth, type Rol } from '@/features/auth/AuthProvider';

interface Enlace {
  to: string;
  label: string;
  end?: boolean;
  roles: Rol[];
}

const ENLACES: Enlace[] = [
  { to: '/', label: 'Inicio', end: true, roles: ['maestro', 'vendedor', 'cliente'] },
  { to: '/inventario', label: 'Inventario', roles: ['maestro', 'vendedor', 'cliente'] },
  { to: '/reservas', label: 'Reservas y encargos', roles: ['maestro', 'vendedor'] },
  { to: '/ventas', label: 'Ventas', roles: ['maestro', 'vendedor'] },
  { to: '/clientes', label: 'Clientes', roles: ['maestro', 'vendedor'] },
  { to: '/agenda', label: 'Agenda', roles: ['maestro', 'vendedor', 'cliente'] },
  { to: '/reportes', label: 'Reportes', roles: ['maestro', 'vendedor'] },
  { to: '/personal', label: 'Personal', roles: ['maestro'] },
  { to: '/mis-datos', label: 'Mis datos', roles: ['cliente'] },
];


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
      <header className="sticky top-0 z-40 border-b border-white/10 bg-gradient-to-r from-brand-700/95 via-brand-600/95 to-accent-600/95 text-white shadow-lg shadow-brand-900/20 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-2 md:gap-4 md:py-3">
          <div className="flex items-center gap-3 md:gap-4">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/10 shadow-md ring-1 ring-white/25 backdrop-blur-sm md:h-24 md:w-24">
              <img
                src={LOGO}
                alt="Lanka Pet Care"
                className="h-11 w-11 rounded-full object-cover md:h-20 md:w-20"
              />
            </span>
            <div className="leading-tight">
              <span className="block text-xl font-extrabold tracking-tight text-white drop-shadow-sm md:text-2xl">
                Lanka
              </span>
              <span className="block text-[10px] font-semibold uppercase tracking-[0.22em] text-white/80 md:text-xs">
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
                  `rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-all ${
                    isActive
                      ? 'bg-white/20 text-white shadow-sm ring-1 ring-white/30'
                      : 'text-white/80 hover:bg-white/10 hover:text-white'
                  }`
                }
              >
                {enlace.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-semibold text-white">
                {perfil?.nombre_completo ?? 'Sin perfil'}
              </p>
              <p className="text-xs uppercase tracking-wide text-white/70">
                {etiquetaRol(perfil)}
              </p>
            </div>
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-xl bg-white/10 px-3.5 py-2 text-sm font-semibold text-white ring-1 ring-white/25 transition hover:bg-white/20"
              onClick={() => void cerrarSesion()}
            >
              Salir
            </button>
          </div>
        </div>

        <nav className="flex gap-1 overflow-x-auto border-t border-white/10 px-4 py-2 md:hidden">
          {enlaces.map((enlace) => (
            <NavLink
              key={enlace.to}
              to={enlace.to}
              end={enlace.end}
              className={({ isActive }) =>
                `whitespace-nowrap rounded-xl px-3 py-1.5 text-sm font-semibold ${
                  isActive ? 'bg-white/20 text-white' : 'text-white/80'
                }`
              }
            >
              {enlace.label}
            </NavLink>
          ))}
        </nav>

        <div className="h-1 w-full bg-gradient-to-r from-accent-600 via-brand-400 to-brand-600" />
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
