import type {
  AuditAction,
  CostumeStatus,
  CostumeType,
  RentalStatus,
  SaleStatus,
  UserRole,
} from './enums';

// ---------- Perfil de usuario ----------
export interface Profile {
  id: string;
  full_name: string;
  rut: string;
  phone: string;
  address: string;
  city: string;
  id_card_path: string | null;
  role: UserRole;
  rejection_reason: string | null;
  suspended_reason: string | null;
  suspended_at: string | null;
  created_at: string;
  updated_at: string;
}

/** Vista pública del perfil (datos no sensibles visibles en el catálogo). */
export interface PublicProfile {
  id: string;
  full_name: string;
  city: string;
}

// ---------- Evento ----------
export interface Event {
  id: string;
  name: string;
  event_date: string; // ISO date (YYYY-MM-DD)
  max_global_rentals: number;
  max_user_rentals: number;
  is_archived: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// ---------- Traje ----------
export interface Costume {
  id: string;
  owner_id: string;
  type: CostumeType;
  year: string;
  size: string;
  boot_size: string;
  price: number; // CLP
  bank_info: string;
  image_paths: string[];
  status: CostumeStatus;
  is_sold: boolean;
  created_at: string;
  updated_at: string;
}

export interface CostumeEvent {
  costume_id: string;
  event_id: string;
}

/** Traje con datos públicos del dueño y eventos asociados (catálogo). */
export interface CostumeWithOwner extends Costume {
  owner: PublicProfile;
  events: Event[];
}

// ---------- Arriendo ----------
export interface Rental {
  id: string;
  costume_id: string;
  renter_id: string;
  first_name: string;
  last_name: string;
  rut: string;
  phone: string;
  email: string;
  event_id: string;
  voucher_path: string | null;
  status: RentalStatus;
  created_at: string;
  updated_at: string;
}

/** Arriendo con traje, evento y arrendatario (panel del dueño / admin). */
export interface RentalWithDetails extends Rental {
  costume: Costume;
  event: Event;
  renter: PublicProfile;
}

// ---------- Venta ----------
export interface Sale {
  id: string;
  costume_id: string;
  buyer_id: string;
  first_name: string;
  last_name: string;
  rut: string;
  phone: string;
  email: string;
  voucher_path: string | null;
  status: SaleStatus;
  created_at: string;
  updated_at: string;
}

/** Venta con traje y comprador (panel del dueño / admin). */
export interface SaleWithDetails extends Sale {
  costume: Costume;
  buyer: PublicProfile;
}

// ---------- Auditoría ----------
export interface AuditLog {
  id: string;
  admin_id: string;
  action: AuditAction;
  target_user_id: string | null;
  details: Record<string, unknown>;
  ip_address: string | null;
  created_at: string;
}

export interface AuditLogWithAdmin extends AuditLog {
  admin: PublicProfile;
  target_user: PublicProfile | null;
}

// ---------- Token de aprobación ----------
export interface ApprovalToken {
  token: string;
  target_user_id: string;
  action: 'approve' | 'reject';
  used: boolean;
  expires_at: string;
  created_at: string;
}

// ---------- Paginación ----------
export interface PaginatedResult<T> {
  data: T[];
  count: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ---------- Filtros del catálogo ----------
export interface CostumeFilters {
  type?: CostumeType;
  status?: CostumeStatus;
  eventId?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}