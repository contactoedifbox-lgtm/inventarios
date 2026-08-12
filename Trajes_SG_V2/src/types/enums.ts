export enum UserRole {
  SuperAdmin = 'super_admin',
  Maestro = 'maestro',
  Propietario = 'propietario',
  Arrendatario = 'arrendatario',
  Pending = 'pending',
  Approved = 'approved',
  Rejected = 'rejected',
  Suspended = 'suspended',
}

export enum CostumeType {
  Rent = 'rent',
  Sale = 'sale',
  Ambos = 'ambos',
}

export enum CostumeStatus {
  Disponible = 'Disponible',
  VerificandoDisponibilidad = 'Verificando disponibilidad',
  PendienteDePago = 'Pendiente de pago',
  Reservado = 'Reservado',
  Arrendado = 'Arrendado',
  Vendido = 'Vendido',
}

export enum ListingType {
  Arriendo = 'arriendo',
  Venta = 'venta',
  Ambos = 'ambos',
}

export enum AuditAction {
  UserApproved = 'user_approved',
  UserRejected = 'user_rejected',
  UserSuspended = 'user_suspended',
  UserReactivated = 'user_reactivated',
  UserDeleted = 'user_deleted',
  EventCreated = 'event_created',
  EventUpdated = 'event_updated',
  EventDeleted = 'event_deleted',
  RentalConfirmed = 'rental_confirmed',
  SaleConfirmed = 'sale_confirmed',
  CarnetViewed = 'carnet_viewed',
}

export enum RentalStatus {
  Reservado = 'reservado',
  Arrendado = 'arrendado',
}

export enum SaleStatus {
  Reservado = 'reservado',
  Completado = 'completado',
}

export enum ApprovalTokenAction {
  Approve = 'approve',
  Reject = 'reject',
}

export enum QueueStatus {
  VerificandoDisponibilidad = 'Verificando disponibilidad',
  PendienteDePago = 'Pendiente de pago',
  Seleccionado = 'Seleccionado',
  Rechazado = 'Rechazado',
  Completado = 'Completado',
  Expirado = 'Expirado',
  Cancelado = 'Cancelado',
}

export enum EmailType {
  SolicitudArriendo = 'solicitud_arriendo',
  ConfirmacionDisponibilidad = 'confirmacion_disponibilidad',
  RechazoDisponibilidad = 'rechazo_disponibilidad',
  TransferenciaRealizada = 'transferencia_realizada',
  PagoConfirmado = 'pago_confirmado',
  ArrendadoAOtro = 'arrendado_a_otro',
  LiberacionNoPago = 'liberacion_no_pago',
  TrajeLiberado = 'traje_liberado',
  ArriendoCancelado = 'arriendo_cancelado',
  SolicitudRegistro = 'solicitud_registro',
  RegistroAprobado = 'registro_aprobado',
  RegistroRechazado = 'registro_rechazado',
}

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  [UserRole.SuperAdmin]: 'Super Administrador',
  [UserRole.Maestro]: 'Maestro',
  [UserRole.Propietario]: 'Propietario',
  [UserRole.Arrendatario]: 'Arrendatario',
  [UserRole.Pending]: 'Pendiente',
  [UserRole.Approved]: 'Aprobado',
  [UserRole.Rejected]: 'Rechazado',
  [UserRole.Suspended]: 'Suspendido',
};

export const COSTUME_STATUS_LABELS: Record<CostumeStatus, string> = {
  [CostumeStatus.Disponible]: 'Disponible',
  [CostumeStatus.VerificandoDisponibilidad]: 'Verificando disponibilidad',
  [CostumeStatus.PendienteDePago]: 'Pendiente de pago',
  [CostumeStatus.Reservado]: 'Reservado',
  [CostumeStatus.Arrendado]: 'Arrendado',
  [CostumeStatus.Vendido]: 'Vendido',
};

export const COSTUME_TYPE_LABELS: Record<CostumeType, string> = {
  [CostumeType.Rent]: 'Arriendo',
  [CostumeType.Sale]: 'Venta',
  [CostumeType.Ambos]: 'Arriendo y Venta',
};

export const LISTING_TYPE_LABELS: Record<ListingType, string> = {
  [ListingType.Arriendo]: 'Solo Arriendo',
  [ListingType.Venta]: 'Solo Venta',
  [ListingType.Ambos]: 'Arriendo y Venta',
};
