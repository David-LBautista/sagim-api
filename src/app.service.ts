import { Injectable, Inject, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

@Injectable()
export class AppService {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    private readonly configService: ConfigService,
  ) {}

  getInfo(): object {
    const environment = this.configService.get('NODE_ENV', 'development');
    const port = this.configService.get('PORT', 3000);

    this.logger.log('Getting API information', 'AppService');

    return {
      name: 'SAGIM API',
      version: '1.0.0',
      description: 'Sistema de Gestión Integral Municipal - Multi-Tenant API',
      environment,
      documentation: `http://localhost:${port}/api/docs`,
      features: [
        'Multi-tenant architecture',
        'JWT authentication with refresh tokens',
        'Role-based access control (RBAC)',
        'Winston logging with rotation',
        'Stripe Connect payments',
        'MongoDB with Mongoose',
        'Feature flags support',
        'Audit logs',
        'File uploads to S3',
      ],
      modules: [
        'Auth & Users',
        'Municipalities',
        'Citizens',
        'Reports & Complaints',
        'DIF - Social Programs',
        'Land Registry (Catastro)',
        'Payments (Predial, etc.)',
        'Notifications',
        'Audit Logs',
      ],
    };
  }
}
