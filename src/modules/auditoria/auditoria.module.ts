import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuditoriaController } from './auditoria.controller';
import { AuditoriaService } from './auditoria.service';
import { AuditLog, AuditLogSchema } from './schemas/audit-log.schema';
import { AuditInterceptor } from './interceptors/audit.interceptor';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AuditLog.name, schema: AuditLogSchema },
    ]),
  ],
  controllers: [AuditoriaController],
  providers: [AuditoriaService, AuditInterceptor],
  exports: [AuditoriaService, AuditInterceptor], // Exportar para uso en otros módulos
})
export class AuditoriaModule {}
