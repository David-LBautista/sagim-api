import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Inject,
  LoggerService,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

/**
 * Interceptor to log all requests and responses with audit information
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, body, user, ip } = request;

    // User information for audit
    const userId = user?.sub || 'anonymous';
    const userEmail = user?.email || 'anonymous';
    const municipioId = user?.municipioId || 'N/A';
    const userRole = user?.rol || 'N/A';

    const now = Date.now();

    // Sanitize body (remove passwords)
    const sanitizedBody = this.sanitizeBody(body);

    // Log request with full audit info
    const auditInfo = {
      method,
      url,
      userId,
      userEmail,
      municipioId,
      role: userRole,
      ip,
      body: sanitizedBody,
      timestamp: new Date().toISOString(),
    };

    this.logger.log(
      `📥 ${method} ${url} | User: ${userEmail} (${userId}) | Role: ${userRole} | Municipality: ${municipioId} | IP: ${ip}`,
      'HTTP-REQUEST',
    );

    if (Object.keys(sanitizedBody || {}).length > 0) {
      this.logger.log(
        `📦 Request Body: ${JSON.stringify(sanitizedBody)}`,
        'HTTP-REQUEST',
      );
    }

    return next.handle().pipe(
      tap({
        next: (data) => {
          const responseTime = Date.now() - now;
          this.logger.log(
            `✅ ${method} ${url} | ${responseTime}ms | User: ${userEmail} | Status: SUCCESS`,
            'HTTP-RESPONSE',
          );

          // Log important operations
          if (['POST', 'PATCH', 'PUT', 'DELETE'].includes(method)) {
            this.logger.log(
              `🔍 AUDIT: ${method} ${url} | User: ${userEmail} (${userId}) | Role: ${userRole} | Municipality: ${municipioId} | Duration: ${responseTime}ms`,
              'AUDIT',
            );
          }
        },
        error: (error) => {
          const responseTime = Date.now() - now;
          this.logger.error(
            `❌ ${method} ${url} | ${responseTime}ms | User: ${userEmail} | Error: ${error.message}`,
            error.stack,
            'HTTP-ERROR',
          );

          // Log security-relevant errors
          this.logger.error(
            `🚨 SECURITY: ${method} ${url} | User: ${userEmail} (${userId}) | Role: ${userRole} | Municipality: ${municipioId} | Error: ${error.message}`,
            '',
            'SECURITY',
          );
        },
      }),
    );
  }

  private sanitizeBody(body: any): any {
    if (!body) return {};

    const sanitized = { ...body };
    const sensitiveFields = ['password', 'refreshToken', 'token', 'secret'];

    sensitiveFields.forEach((field) => {
      if (sanitized[field]) {
        sanitized[field] = '***REDACTED***';
      }
    });

    return sanitized;
  }
}
