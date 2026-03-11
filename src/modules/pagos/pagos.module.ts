import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PagosController } from './pagos.controller';
import { PagosService } from './pagos.service';
import { Pago, PagoSchema } from './schemas/pago.schema';
import { OrdenPago, OrdenPagoSchema } from './schemas/orden-pago.schema';
import {
  Municipality,
  MunicipalitySchema,
} from '@/modules/municipalities/schemas/municipality.schema';
import {
  Ciudadano,
  CiudadanoSchema,
} from '@/modules/ciudadanos/schemas/ciudadano.schema';
import {
  ServicioCobro,
  ServicioCobroSchema,
} from '@/modules/tesoreria/schemas/servicio-cobro.schema';
import { Counter, CounterSchema } from '@/modules/dif/schemas/counter.schema';
import { NotificacionesModule } from '@/modules/notificaciones/notificaciones.module';
import { PdfModule } from '@/modules/shared/pdf/pdf.module';
import { OrdenesExpiracionTask } from './tasks/ordenes-expiracion.task';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Pago.name, schema: PagoSchema },
      { name: OrdenPago.name, schema: OrdenPagoSchema },
      { name: Municipality.name, schema: MunicipalitySchema },
      { name: Ciudadano.name, schema: CiudadanoSchema },
      { name: ServicioCobro.name, schema: ServicioCobroSchema },
      { name: Counter.name, schema: CounterSchema },
    ]),
    NotificacionesModule,
    PdfModule,
  ],
  controllers: [PagosController],
  providers: [PagosService, OrdenesExpiracionTask],
  exports: [PagosService],
})
export class PagosModule {}
