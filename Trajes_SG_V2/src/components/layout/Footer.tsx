import { siteConfig } from '@/config/site';

export function Footer() {
  return (
    <footer className="border-t bg-brand-dark text-brand-light">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-8 sm:flex-row sm:px-6">
        <p className="text-sm">
          &copy; {new Date().getFullYear()} {siteConfig.name}. Todos los derechos reservados.
        </p>
        <p className="text-sm text-brand-gold">Arriendo y venta de trajes de caporales</p>
      </div>
    </footer>
  );
}
