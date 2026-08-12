/** Constantes globales de la aplicación */

// ---------- Paginación ----------
export const DEFAULT_PAGE_SIZE = 10;
export const MAX_PAGE_SIZE = 50;

// ---------- Storage buckets ----------
export const STORAGE_BUCKETS = {
  idCards: 'id-cards',
  vouchers: 'vouchers',
  costumeImages: 'costume-images',
} as const;

// ---------- Imágenes ----------
export const MAX_IMAGE_SIZE_BYTES = 1 * 1024 * 1024; // 1 MB (post-compresión)
export const MAX_COSTUME_IMAGES = 5;
export const ACCEPTED_IMAGE_TYPES = 'image/jpeg,image/png,image/webp';

// ---------- Tokens de aprobación ----------
export const APPROVAL_TOKEN_EXPIRY_DAYS = 7;
export const SIGNED_URL_EXPIRY_SECONDS = 60 * 60 * 24; // 24 horas

// ---------- Rate limiting ----------
export const RATE_LIMITS = {
  api: { limit: 30, windowSeconds: 60 }, // API general
  auth: { limit: 5, windowSeconds: 60 }, // login/register
  approval: { limit: 10, windowSeconds: 60 }, // enlaces de aprobación
  rentals: { limit: 10, windowSeconds: 60 }, // solicitudes de arriendo/compra
} as const;

// ---------- Rutas ----------
export const ROUTES = {
  home: '/',
  login: '/login',
  register: '/register',
  pendingReview: '/cuenta-en-revision',
  dashboard: {
    arriendo: '/arriendo',
    venta: '/venta',
    perfil: '/perfil',
  },
  admin: {
    home: '/admin',
    usuarios: '/admin/usuarios',
    eventos: '/admin/eventos',
    auditoria: '/admin/auditoria',
  },
} as const;

// ---------- Roles de App A ----------
export const ROLES = {
  MAESTRO: 'maestro',
  PROPIETARIO: 'propietario',
  ARRENDATARIO: 'arrendatario',
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  SUSPENDED: 'suspended',
  SUPER_ADMIN: 'super_admin',
} as const;

// Roles permitidos en el dashboard
export const ALLOWED_DASHBOARD_ROLES = [
  ROLES.APPROVED,
  ROLES.SUPER_ADMIN,
  ROLES.MAESTRO,
  ROLES.PROPIETARIO,
  ROLES.ARRENDATARIO,
];

// Roles permitidos en admin
export const ALLOWED_ADMIN_ROLES = [
  ROLES.SUPER_ADMIN,
  ROLES.MAESTRO,
];

// ---------- Estados de la cola de arriendo (App A) ----------
export const QUEUE_STATUS = {
  VERIFICANDO: 'Verificando disponibilidad',
  PENDIENTE_PAGO: 'Pendiente de pago',
  SELECCIONADO: 'Seleccionado',
  RECHAZADO: 'Rechazado',
  COMPLETADO: 'Completado',
  EXPIRADO: 'Expirado',
  CANCELADO: 'Cancelado',
} as const;

// ---------- Estados de traje (App A) ----------
export const SUIT_STATUS = {
  DISPONIBLE: 'Disponible',
  VERIFICANDO: 'Verificando disponibilidad',
  PENDIENTE_PAGO: 'Pendiente de pago',
  RESERVADO: 'Reservado',
  ARRENDADO: 'Arrendado',
  VENDIDO: 'Vendido',
} as const;

// ---------- Tipos de listing (App A) ----------
export const LISTING_TYPES = {
  ARRIENDO: 'arriendo',
  VENTA: 'venta',
  AMBOS: 'ambos',
} as const;
