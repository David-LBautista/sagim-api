import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DashboardController } from './dashboard.controller';
import { DashboardAuditoriaController } from './dashboard-auditoria.controller';
import { DashboardService } from './dashboard.service';
import { Pago, PagoSchema } from '@/modules/pagos/schemas/pago.schema';
import {
  OrdenPago,
  OrdenPagoSchema,
} from '@/modules/pagos/schemas/orden-pago.schema';
import {
  ServicioCobro,
  ServicioCobroSchema,
} from '@/modules/tesoreria/schemas/servicio-cobro.schema';
import { Apoyo, ApoyoSchema } from '@/modules/dif/schemas/apoyo.schema';
import { AuditoriaModule } from '@/modules/auditoria/auditoria.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Pago.name, schema: PagoSchema },
      { name: OrdenPago.name, schema: OrdenPagoSchema },
      { name: ServicioCobro.name, schema: ServicioCobroSchema },
      { name: Apoyo.name, schema: ApoyoSchema },
    ]),
    AuditoriaModule, // Importar para usar AuditoriaService
  ],
  controllers: [DashboardController, DashboardAuditoriaController],
  providers: [DashboardService],
})
export class DashboardModule {}
