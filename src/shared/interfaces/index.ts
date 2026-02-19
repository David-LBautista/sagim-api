import { Types } from 'mongoose';

export interface JwtPayload {
  sub: string; // user id
  email: string;
  municipioId: string | null;
  rol: string;
  iat?: number;
  exp?: number;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
  user: {
    id: string;
    email: string;
    nombre: string;
    rol: string;
    municipioId: string | null;
    activo: boolean;
  };
  municipio?: {
    nombre: string;
    logoUrl?: string;
  };
  modulos: string[];
  permisos: Record<string, string[]>;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface MunicipalityConfig {
  modulos: {
    PRESIDENCIA?: boolean;
    SECRETARIA_AYUNTAMIENTO?: boolean;
    COMUNICACION_SOCIAL?: boolean;
    UIPPE?: boolean;
    CONTRALORIA?: boolean;
    SEGURIDAD_PUBLICA?: boolean;
    SERVICIOS_PUBLICOS?: boolean;
    DESARROLLO_URBANO?: boolean;
    DESARROLLO_ECONOMICO?: boolean;
    DESARROLLO_SOCIAL?: boolean;
    TESORERIA?: boolean;
    DIF?: boolean;
    ORGANISMO_AGUA?: boolean;
    USUARIOS?: boolean;
    REPORTES?: boolean;
    CITAS?: boolean;
  };
  stripe?: {
    accountId: string;
    enabled: boolean;
  };
  features?: {
    mfa: boolean;
    whatsappNotifications: boolean;
  };
}

export interface Location {
  lat: number;
  lng: number;
}

export interface Address {
  localidad?: string;
  colonia?: string;
  calle?: string;
  numero?: string;
  codigoPostal?: string;
  referencias?: string;
}

export interface FileUpload {
  originalName: string;
  filename: string;
  mimetype: string;
  size: number;
  url: string;
  uploadedAt: Date;
}
