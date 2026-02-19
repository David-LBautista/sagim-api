import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { UserRole } from '@/shared/enums';

/**
 * Interceptor to automatically add municipioId to request body
 * for non-SUPER_ADMIN users
 */
@Injectable()
export class MunicipalityInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Only apply to authenticated requests
    if (!user) {
      return next.handle();
    }

    // Skip for auth endpoints and DTOs that don't accept municipioId
    const path = request.route?.path || request.url;
    const skipPaths = [
      'login',
      'register',
      'refresh',
      'generar-orden',
      'orden',
      '/dif/',
      '/programas',
      '/beneficiarios',
      '/apoyos',
    ];
    if (skipPaths.some((p) => path.includes(p))) {
      return next.handle();
    }

    // SUPER_ADMIN can specify any municipioId
    if (user.rol === UserRole.SUPER_ADMIN) {
      return next.handle();
    }

    // For POST and PATCH requests, add municipioId if not present
    if (['POST', 'PATCH', 'PUT'].includes(request.method)) {
      if (request.body && !request.body.municipioId) {
        request.body.municipioId = user.municipioId;
      }
    }

    // For GET requests, add municipioId to query if not present
    if (request.method === 'GET') {
      if (!request.query.municipioId) {
        request.query.municipioId = user.municipioId;
      }
    }

    return next.handle();
  }
}
