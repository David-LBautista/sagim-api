import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuditoriaService } from '../auditoria.service';
import { AuditAction, AuditModule } from '../schemas/audit-log.schema';

/**
 * Interceptor para auditoría automática
 * Se aplica a controladores específicos con @UseInterceptors(AuditInterceptor)
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly auditoriaService: AuditoriaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, user, body } = request;
    const ip = request.ip || request.connection?.remoteAddress;
    const userAgent = request.headers['user-agent'];

    // Solo auditar si hay usuario autenticado
    if (!user || !user.sub) {
      return next.handle();
    }

    // No auditar las consultas de auditoría (evitar loop infinito)
    if (url.includes('/auditoria/')) {
      return next.handle();
    }

    const municipioId = user.municipioId || body?.municipioId;
    const userId = user.sub;
    const userRole = user.rol;

    // Determinar módulo y acción basado en la URL
    const { modulo, accion, entidad } = this.parseUrlToAudit(url, method);

    // Capturar el estado "antes" (solo para UPDATE/DELETE)
    const dataAntes = accion === AuditAction.UPDATE ? { ...body } : undefined;

    return next.handle().pipe(
      tap({
        next: (response) => {
          // Capturar el estado "después"
          const dataDespues =
            accion === AuditAction.UPDATE ? response : undefined;

          // Crear log de auditoría de forma asíncrona (no bloquea la respuesta)
          this.auditoriaService
            .createLog(
              {
                modulo,
                accion,
                entidad,
                entidadId: response?._id || response?.id || body?.id,
                cambios:
                  dataAntes || dataDespues
                    ? {
                        antes: dataAntes,
                        despues: dataDespues,
                      }
                    : undefined,
                descripcion: this.generateDescription(
                  accion,
                  entidad,
                  response,
                ),
              },
              userId,
              userRole,
              municipioId,
              ip,
              userAgent,
            )
            .catch((err) => {
              // Log error pero no interrumpe el flujo
              console.error('Error creando log de auditoría:', err);
            });
        },
        error: (error) => {
          // También auditar errores críticos
          console.error('Error en operación auditada:', error);
        },
      }),
    );
  }

  /**
   * Parsear URL para determinar módulo, acción y entidad
   */
  private parseUrlToAudit(
    url: string,
    method: string,
  ): { modulo: AuditModule; accion: AuditAction; entidad: string } {
    // Mapeo de rutas a módulos
    let modulo: AuditModule = AuditModule.DIF; // Default
    let entidad = 'Registro';

    if (url.includes('/dif/')) {
      modulo = AuditModule.DIF;
      if (url.includes('/apoyos')) entidad = 'Apoyo';
      if (url.includes('/beneficiarios')) entidad = 'Beneficiario';
    } else if (url.includes('/tesoreria/')) {
      modulo = AuditModule.TESORERIA;
      if (url.includes('/servicios')) entidad = 'ServicioCobro';
      if (url.includes('/ordenes-pago')) entidad = 'OrdenPago';
    } else if (url.includes('/pagos/')) {
      modulo = AuditModule.PAGOS;
      entidad = 'Pago';
    } else if (url.includes('/catastro/')) {
      modulo = AuditModule.CATASTRO;
      entidad = 'Predio';
    } else if (url.includes('/reportes/')) {
      modulo = AuditModule.REPORTES;
      entidad = 'Reporte';
    } else if (url.includes('/ciudadanos/')) {
      modulo = AuditModule.CIUDADANOS;
      entidad = 'Ciudadano';
    } else if (url.includes('/users/')) {
      modulo = AuditModule.USUARIOS;
      entidad = 'Usuario';
    } else if (url.includes('/auth/')) {
      modulo = AuditModule.AUTH;
      entidad = 'Sesion';
    }

    // Determinar acción basada en método HTTP
    let accion: AuditAction;
    switch (method) {
      case 'POST':
        accion = url.includes('/login')
          ? AuditAction.LOGIN
          : AuditAction.CREATE;
        break;
      case 'PUT':
      case 'PATCH':
        accion = AuditAction.UPDATE;
        break;
      case 'DELETE':
        accion = AuditAction.DELETE;
        break;
      case 'GET':
        accion =
          url.includes('/export') || url.includes('/download')
            ? AuditAction.EXPORT
            : AuditAction.VIEW;
        break;
      default:
        accion = AuditAction.VIEW;
    }

    return { modulo, accion, entidad };
  }

  /**
   * Generar descripción legible de la acción
   */
  private generateDescription(
    accion: AuditAction,
    entidad: string,
    response: any,
  ): string {
    const acciones: Record<AuditAction, string> = {
      [AuditAction.CREATE]: 'creó',
      [AuditAction.UPDATE]: 'actualizó',
      [AuditAction.DELETE]: 'eliminó',
      [AuditAction.VIEW]: 'consultó',
      [AuditAction.LOGIN]: 'inició sesión',
      [AuditAction.LOGOUT]: 'cerró sesión',
      [AuditAction.EXPORT]: 'exportó',
      [AuditAction.DOWNLOAD]: 'descargó',
    };

    const nombre = response?.nombre || response?.folio || response?.id || '';
    return `Usuario ${acciones[accion]} ${entidad} ${nombre}`.trim();
  }
}
