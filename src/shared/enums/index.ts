// User roles
export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN', // Administrador global del sistema SAGIM
  ADMIN_MUNICIPIO = 'ADMIN_MUNICIPIO', // Administrador municipal (acceso a todos los módulos del municipio)
  OPERATIVO = 'OPERATIVO', // Usuario operativo (acceso a un módulo específico)
}

// Report types
export enum ReportType {
  BASURA = 'BASURA',
  ALUMBRADO = 'ALUMBRADO',
  BACHE = 'BACHE',
  AGUA = 'AGUA',
  DRENAJE = 'DRENAJE',
  OTRO = 'OTRO',
}

// Report status
export enum ReportStatus {
  PENDIENTE = 'PENDIENTE',
  EN_PROCESO = 'EN_PROCESO',
  ATENDIDO = 'ATENDIDO',
  RECHAZADO = 'RECHAZADO',
}

// Property use types
export enum PropertyUse {
  HABITACIONAL = 'HABITACIONAL',
  COMERCIAL = 'COMERCIAL',
  INDUSTRIAL = 'INDUSTRIAL',
  MIXTO = 'MIXTO',
  AGRICOLA = 'AGRICOLA',
}

// Appointment status
export enum AppointmentStatus {
  PENDIENTE = 'PENDIENTE',
  CONFIRMADA = 'CONFIRMADA',
  COMPLETADA = 'COMPLETADA',
  CANCELADA = 'CANCELADA',
}

// Payment concepts
export enum PaymentConcept {
  PREDIAL = 'PREDIAL',
  AGUA = 'AGUA',
  MULTA = 'MULTA',
  LICENCIA = 'LICENCIA',
  TRAMITE = 'TRAMITE',
  OTRO = 'OTRO',
}

// Payment status
export enum PaymentStatus {
  PENDIENTE = 'PENDIENTE',
  PAGADO = 'PAGADO',
  CANCELADO = 'CANCELADO',
  REEMBOLSADO = 'REEMBOLSADO',
}

// Notification types
export enum NotificationType {
  EMAIL = 'EMAIL',
  PUSH = 'PUSH',
  SMS = 'SMS',
  WHATSAPP = 'WHATSAPP',
}

// Audit action types
export enum AuditAction {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  PAYMENT = 'PAYMENT',
  EXPORT = 'EXPORT',
}
