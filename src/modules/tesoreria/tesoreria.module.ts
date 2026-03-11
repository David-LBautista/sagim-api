import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TesoreriaController } from './tesoreria.controller';
import { TesoreriaService } from './tesoreria.service';
import {
  ServicioCobro,
  ServicioCobroSchema,
} from './schemas/servicio-cobro.schema';
import { OrdenPago, OrdenPagoSchema } from '../pagos/schemas/orden-pago.schema';
import { Pago, PagoSchema } from '../pagos/schemas/pago.schema';
import { PagoCaja, PagoCajaSchema } from './schemas/pago-caja.schema';
import {
  Municipality,
  MunicipalitySchema,
} from '../municipalities/schemas/municipality.schema';
import {
  Ciudadano,
  CiudadanoSchema,
} from '../ciudadanos/schemas/ciudadano.schema';
import { S3Module } from '../s3/s3.module';
import { Counter, CounterSchema } from '../dif/schemas/counter.schema';
import { PdfModule } from '../shared/pdf/pdf.module';
import { NotificacionesModule } from '../notificaciones/notificaciones.module';
import { DashboardModule } from '../dashboard/dashboard.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ServicioCobro.name, schema: ServicioCobroSchema },
      { name: OrdenPago.name, schema: OrdenPagoSchema },
      { name: Pago.name, schema: PagoSchema },
      { name: PagoCaja.name, schema: PagoCajaSchema },
      { name: Municipality.name, schema: MunicipalitySchema },
      { name: Ciudadano.name, schema: CiudadanoSchema },
      { name: Counter.name, schema: CounterSchema },
    ]),
    S3Module,
    PdfModule,
    NotificacionesModule,
    DashboardModule,
  ],
  controllers: [TesoreriaController],
  providers: [TesoreriaService],
  exports: [TesoreriaService],
})
export class TesoreriaModule {}
