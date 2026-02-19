import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ModulosController } from './modulos.controller';
import { ModulosService } from './modulos.service';
import { Modulo, ModuloSchema } from './schemas/modulo.schema';
import {
  Municipality,
  MunicipalitySchema,
} from '@/modules/municipalities/schemas/municipality.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Modulo.name, schema: ModuloSchema },
      { name: Municipality.name, schema: MunicipalitySchema },
    ]),
  ],
  controllers: [ModulosController],
  providers: [ModulosService],
})
export class ModulosModule {}
