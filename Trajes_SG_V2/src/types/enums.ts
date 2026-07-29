export enum UserRole {
  SuperAdmin = 'super_admin',
  Pending = 'pending',
  Approved = 'approved',
  Rejected = 'rejected',
  Suspended = 'suspended',
}

export enum CostumeType {
  Rent = 'rent',
  Sale = 'sale',
}

export enum CostumeStatus {
  Disponible = 'disponible',
  Reservado = 'reservado',
  Arrendado = 'arrendado',
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

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  [UserRole.SuperAdmin]: 'Administrador',
  [UserRole.Pending]: 'Pendiente',
  [UserRole.Approved]: 'Aprobado',
  [UserRole.Rejected]: 'Rechazado',
  [UserRole.Suspended]: 'Suspendido',
};

export const COSTUME_STATUS_LABELS: Record<CostumeStatus, string> = {
  [CostumeStatus.Disponible]: 'Disponible',
  [CostumeStatus.Reservado]: 'Reservado',
  [CostumeStatus.Arrendado]: 'Arrendado',
};

export const COSTUME_TYPE_LABELS: Record<CostumeType, string> = {
  [CostumeType.Rent]: 'Arriendo',
  [CostumeType.Sale]: 'Venta',
};