import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '@/common/decorators/public.decorator';
import { UserRole } from '@/shared/enums';

/**
 * Guard to ensure users can only access data from their municipality
 * SUPER_ADMIN can access all municipalities
 */
@Injectable()
export class MunicipalityGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      return false;
    }

    // SUPER_ADMIN can access all municipalities
    if (user.rol === UserRole.SUPER_ADMIN) {
      return true;
    }

    // Check if municipioId in request body or params matches user's municipality
    const bodyMunicipioId = request.body?.municipioId;
    const paramsMunicipioId = request.params?.municipioId;
    const queryMunicipioId = request.query?.municipioId;

    const requestMunicipioId =
      bodyMunicipioId || paramsMunicipioId || queryMunicipioId;

    // If no municipioId in request, it's ok (will be added by interceptor)
    if (!requestMunicipioId) {
      return true;
    }

    // Check if user's municipality matches request municipality
    // Convert both to string to handle ObjectId vs String comparison
    const userMunicipioStr = user.municipioId?.toString();
    const requestMunicipioStr = requestMunicipioId?.toString();

    if (requestMunicipioStr !== userMunicipioStr) {
      throw new ForbiddenException(
        'No puede acceder a datos de otro municipio',
      );
    }

    return true;
  }
}
