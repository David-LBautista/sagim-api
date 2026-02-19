export const CONSTANTS = {
  // JWT
  JWT_ACCESS_TOKEN_EXPIRATION: '15m',
  JWT_REFRESH_TOKEN_EXPIRATION: '7d',

  // Pagination
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,

  // File upload
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/jpg'],
  ALLOWED_DOCUMENT_TYPES: ['application/pdf'],

  // CURP validation
  CURP_REGEX: /^[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]\d$/,

  // Email validation
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,

  // Phone validation (Mexico)
  PHONE_REGEX: /^(\d{10}|\d{12})$/,

  // Clave catastral pattern
  CLAVE_CATASTRAL_REGEX: /^[A-Z0-9-]{5,20}$/,

  // Stripe
  STRIPE_CURRENCY: 'MXN',
  STRIPE_MIN_AMOUNT: 50, // 50 pesos
};

export const ERROR_MESSAGES = {
  UNAUTHORIZED: 'No autorizado',
  FORBIDDEN: 'No tiene permisos para realizar esta acción',
  NOT_FOUND: 'Recurso no encontrado',
  MUNICIPALITY_NOT_FOUND: 'Municipio no encontrado',
  USER_NOT_FOUND: 'Usuario no encontrado',
  CITIZEN_NOT_FOUND: 'Ciudadano no encontrado',
  INVALID_CREDENTIALS: 'Credenciales inválidas',
  INVALID_TOKEN: 'Token inválido',
  TOKEN_EXPIRED: 'Token expirado',
  EMAIL_ALREADY_EXISTS: 'El email ya está registrado',
  CURP_ALREADY_EXISTS: 'El CURP ya está registrado',
  INVALID_CURP: 'CURP inválido',
  INVALID_EMAIL: 'Email inválido',
  INVALID_PHONE: 'Teléfono inválido',
  PAYMENT_FAILED: 'Error al procesar el pago',
  FILE_TOO_LARGE: 'El archivo es demasiado grande',
  INVALID_FILE_TYPE: 'Tipo de archivo no permitido',
};

export const SUCCESS_MESSAGES = {
  CREATED: 'Creado exitosamente',
  UPDATED: 'Actualizado exitosamente',
  DELETED: 'Eliminado exitosamente',
  PAYMENT_SUCCESS: 'Pago procesado exitosamente',
  EMAIL_SENT: 'Email enviado exitosamente',
};
