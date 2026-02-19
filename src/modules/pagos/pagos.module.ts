import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PagosController } from './pagos.controller';
import { PagosService } from './pagos.service';
import { Pago, PagoSchema } from './schemas/pago.schema';
import { OrdenPago, OrdenPagoSchema } from './schemas/orden-pago.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Pago.name, schema: PagoSchema },
      { name: OrdenPago.name, schema: OrdenPagoSchema },
    ]),
  ],
  controllers: [PagosController],
  providers: [PagosService],
  exports: [PagosService],
})
export class PagosModule {}
