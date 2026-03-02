import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DifReportesController } from './dif-reportes.controller';
import { DifReportesService } from './dif-reportes.service';
import { Apoyo, ApoyoSchema } from '@/modules/dif/schemas/apoyo.schema';
import {
  Beneficiario,
  BeneficiarioSchema,
} from '@/modules/dif/schemas/beneficiario.schema';
import {
  Inventario,
  InventarioSchema,
} from '@/modules/dif/schemas/inventario.schema';
import {
  MovimientoInventario,
  MovimientoInventarioSchema,
} from '@/modules/dif/schemas/movimiento-inventario.schema';
import {
  Municipality,
  MunicipalitySchema,
} from '@/modules/municipalities/schemas/municipality.schema';
import { S3Module } from '@/modules/s3/s3.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Apoyo.name, schema: ApoyoSchema },
      { name: Beneficiario.name, schema: BeneficiarioSchema },
      { name: Inventario.name, schema: InventarioSchema },
      { name: MovimientoInventario.name, schema: MovimientoInventarioSchema },
      { name: Municipality.name, schema: MunicipalitySchema },
    ]),
    S3Module,
  ],
  controllers: [DifReportesController],
  providers: [DifReportesService],
  exports: [DifReportesService],
})
export class DifReportesModule {}
