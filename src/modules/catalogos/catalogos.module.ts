import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CatalogosController } from './catalogos.controller';
import { CatalogosService } from './catalogos.service';
import { Estado, EstadoSchema } from './schemas/estado.schema';
import {
  MunicipioCatalogo,
  MunicipioCatalogoSchema,
} from './schemas/municipio-catalogo.schema';
import { Rol, RolSchema } from './schemas/rol.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Estado.name, schema: EstadoSchema },
      { name: MunicipioCatalogo.name, schema: MunicipioCatalogoSchema },
      { name: Rol.name, schema: RolSchema },
    ]),
  ],
  controllers: [CatalogosController],
  providers: [CatalogosService],
  exports: [MongooseModule],
})
export class CatalogosModule {}
