import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DifController } from './dif.controller';
import { DifService } from './dif.service';
import {
  Beneficiario,
  BeneficiarioSchema,
} from './schemas/beneficiario.schema';
import { Programa, ProgramaSchema } from './schemas/programa.schema';
import { Apoyo, ApoyoSchema } from './schemas/apoyo.schema';
import { Inventario, InventarioSchema } from './schemas/inventario.schema';
import {
  MovimientoInventario,
  MovimientoInventarioSchema,
} from './schemas/movimiento-inventario.schema';
import { Counter, CounterSchema } from './schemas/counter.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Beneficiario.name, schema: BeneficiarioSchema },
      { name: Programa.name, schema: ProgramaSchema },
      { name: Apoyo.name, schema: ApoyoSchema },
      { name: Inventario.name, schema: InventarioSchema },
      { name: MovimientoInventario.name, schema: MovimientoInventarioSchema },
      { name: Counter.name, schema: CounterSchema },
    ]),
  ],
  controllers: [DifController],
  providers: [DifService],
  exports: [DifService],
})
export class DifModule {}
