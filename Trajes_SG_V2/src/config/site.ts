export const siteConfig = {
  name: process.env.NEXT_PUBLIC_SITE_NAME ?? 'Caporales San Gabriel',
  description:
    'Plataforma oficial de arriendo y venta de trajes de la agrupación Caporales San Gabriel.',
  url: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
  links: {
    login: '/login',
    register: '/register',
    arriendo: '/arriendo',
    venta: '/venta',
    perfil: '/perfil',
    admin: '/admin',
  },
} as const;

export type SiteConfig = typeof siteConfig;