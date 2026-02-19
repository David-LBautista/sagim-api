import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { getTenantScope } from '../helpers/tenant-scope.helper';

/**
 * Decorator que inyecta el scope de tenant basado en el rol del usuario
 *
 * Uso en controllers:
 * @Get()
 * findAll(@TenantScope() scope: any) {
 *   return this.service.find(scope);
 * }
 *
 * Retorna:
 * - SUPER_ADMIN: {} (sin filtro, ve todo)
 * - Otros roles: { municipioId: 'xxx' } (solo su municipio)
 */
export const TenantScope = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new Error('Usuario no autenticado');
    }

    return getTenantScope(user.rol, user.municipioId);
  },
);
