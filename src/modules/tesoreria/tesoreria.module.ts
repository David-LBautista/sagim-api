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

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ServicioCobro.name, schema: ServicioCobroSchema },
      { name: OrdenPago.name, schema: OrdenPagoSchema },
      { name: Pago.name, schema: PagoSchema },
    ]),
  ],
  controllers: [TesoreriaController],
  providers: [TesoreriaService],
  exports: [TesoreriaService],
})
export class TesoreriaModule {}
