import { UserRole } from '@/shared/enums';

/**
 * Helper para generar el scope de consulta según el rol del usuario
 * SUPER_ADMIN: sin filtro (ve todos los municipios)
 * ADMIN_MUNICIPIO y OPERATIVO: filtra por municipioId
 */
export function getTenantScope(rol: UserRole, municipioId?: string): any {
  // SUPER_ADMIN puede ver datos de todos los municipios
  if (rol === UserRole.SUPER_ADMIN) {
    return {};
  }

  // ADMIN_MUNICIPIO y OPERATIVO solo ven datos de su municipio
  if (!municipioId) {
    throw new Error(
      'municipioId requerido para usuarios ADMIN_MUNICIPIO y OPERATIVO',
    );
  }

  return { municipioId };
}

/**
 * Determina si el usuario debe tener municipioId forzado desde el token
 * SUPER_ADMIN: puede especificar cualquier municipio
 * ADMIN_MUNICIPIO y OPERATIVO: el municipioId se fuerza desde el token
 */
export function shouldForceMunicipioId(rol: UserRole): boolean {
  return rol !== UserRole.SUPER_ADMIN;
}
