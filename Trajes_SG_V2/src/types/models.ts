import type {
  AuditAction,
  CostumeStatus,
  CostumeType,
  ListingType,
  QueueStatus,
  RentalStatus,
  SaleStatus,
  UserRole,
  EmailType,
} from './enums';

// ---------- Perfil de usuario ----------
export interface Profile {
  id: string;
  full_name: string;
  nombres?: string;
  apellidos?: string;
  email?: string;
  rut: string;
  phone: string;
  address: string;
  city: string;
  id_card_path: string | null;
  carnet_frontal_url?: string;
  carnet_trasera_url?: string;
  agrupacion?: string;
  bank_details?: BankDetails;
  role: UserRole;
  rejection_reason: string | null;
  suspended_reason: string | null;
  suspended_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface BankDetails {
  tipoCuenta: string;
  banco: string;
  numeroCuenta: string;
  rut: string;
  correo: string;
  nombre: string;
}

/** Vista pública del perfil (datos no sensibles visibles en el catálogo) */
export interface PublicProfile {
  id: string;
  full_name: string;
  nombres?: string;
  apellidos?: string;
  city: string;
  agrupacion?: string;
}

// ---------- Evento ----------
export interface Event {
  id: string;
  name: string;
  event_date: string;
  max_global_rentals: number;
  max_user_rentals: number;
  is_archived: boolean;
  created_by: string;
  description?: string;
  created_at: string;
  updated_at: string;
  activeRentals?: number;
  totalRevenue?: number;
  preReservations?: number;
  requiredInventory?: number;
  status?: 'Activo' | 'Próximo' | 'Concluido';
  dateRange?: string;
  location?: string;
  imageUrl?: string;
}

// ---------- Traje ----------
export interface Costume {
  id: string;
  owner_id: string;
  type: CostumeType;
  listing_type: ListingType;
  year: string;
  size: string;
  boot_size: string;
  price: number;
  rental_price?: number;
  sale_price?: number;
  bank_info: string;
  image_paths: string[];
  status: CostumeStatus;
  is_sold: boolean;
  character_type?: string;
  bell_count?: number;
  includes_accessories?: boolean;
  agrupacion?: string;
  payment_confirmed?: boolean;
  availability_alert_user_ids?: string[];
  created_at: string;
  updated_at: string;
  rating?: number;
  ownerName?: string;
  title?: string;
  photos?: string[];
  eventIds?: string[];
  currentReservedBy?: string;
  currentRentedBy?: string;
  currentSoldTo?: string;
}

export interface CostumeEvent {
  costume_id: string;
  event_id: string;
}

/** Traje con datos públicos del dueño y eventos asociados (catálogo) */
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
  event_name?: string;
  voucher_path: string | null;
  status: RentalStatus;
  created_at: string;
  updated_at: string;
}

/** Arriendo con traje, evento y arrendatario */
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

/** Venta con traje y comprador */
export interface SaleWithDetails extends Sale {
  costume: Costume;
  buyer: PublicProfile;
}

// ---------- Cola de Arriendo ----------
export interface RentalQueue {
  id: string;
  suit_id: string;
  renter_id: string;
  renter_name: string;
  renter_email: string;
  renter_rating: number;
  owner_id: string;
  owner_name: string;
  event_name: string | null;
  action_type: 'Reserva' | 'Arriendo';
  status: QueueStatus;
  payment_deadline: string | null;
  order_index: number;
  created_at: string;
  updated_at: string;
}

// ---------- Correos del Sistema ----------
export interface SystemEmail {
  id: string;
  to_email: string;
  to_name: string;
  from_name: string;
  subject: string;
  body: string;
  type: EmailType;
  suit_id: string | null;
  suit_title: string | null;
  request_id: string | null;
  action_type: string | null;
  read: boolean;
  created_at: string;
}

// ---------- Solicitud de Evento ----------
export interface EventRequest {
  id: string;
  event_name: string;
  date: string;
  location: string;
  description: string | null;
  owner_id: string;
  owner_name: string;
  status: 'pendiente' | 'aprobado' | 'rechazado';
  created_at: string;
}

// ---------- Auditoría de Carnet ----------
export interface CarnetAccessLog {
  id: string;
  viewer_id: string;
  viewer_name: string;
  viewer_role: string;
  target_user_id: string;
  target_user_name: string;
  photo_type: 'frente' | 'trasera' | 'ambas';
  timestamp: string;
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

// ---------- Transacciones ----------
export interface SuitTransaction {
  id: string;
  suitId: string;
  suitTitle: string;
  suitPhoto: string;
  buyerOrRenterId: string;
  buyerOrRenterName: string;
  buyerOrRenterEmail?: string;
  ownerId: string;
  ownerName: string;
  type: 'Reserva' | 'Arriendo' | 'Compra';
  price: number;
  eventName?: string;
  transferReceiptUrl?: string;
  status: 'pendiente' | 'Activa' | 'Completada' | 'Cancelada' | 'Rechazada';
  createdAt: string;
  updatedAt?: string;
}

// ---------- Solicitud de Arriendo (App A style) ----------
export interface RentalRequest {
  id: string;
  suitId: string;
  suitTitle: string;
  suitPhoto: string;
  renterId: string;
  renterName: string;
  renterEmail: string;
  renterRating?: number;
  ownerId: string;
  ownerName: string;
  eventName?: string;
  actionType: 'Reserva' | 'Arriendo';
  status: QueueStatus;
  paymentDeadline?: string;
  createdAt: string;
  orderIndex: number;
}

// ---------- Suit (App A style) ----------
export interface CaporalSuit {
  id: string;
  title: string;
  ownerId: string;
  ownerName: string;
  characterType: string;
  suitSize: string;
  bootSize: string;
  bellCount: number;
  includesAccessories?: boolean;
  year: string;
  agrupacion: string;
  rentalPrice: number;
  salePrice?: number;
  listingType: ListingType;
  photos: string[];
  eventIds: string[];
  status: CostumeStatus;
  rating?: number;
  createdAt: string;
  currentReservedBy?: string;
  currentRentedBy?: string;
  currentSoldTo?: string;
  availabilityAlertUserIds?: string[];
  paymentConfirmed?: boolean;
}
