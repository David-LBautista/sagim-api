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
import {
  UnidadMedida,
  UnidadMedidaSchema,
} from './schemas/unidad-medida.schema';
import {
  TipoMovimiento,
  TipoMovimientoSchema,
} from './schemas/tipo-movimiento.schema';
import {
  GrupoVulnerable,
  GrupoVulnerableSchema,
} from './schemas/grupo-vulnerable.schema';
import { TipoApoyo, TipoApoyoSchema } from './schemas/tipo-apoyo.schema';
import { Localidad, LocalidadSchema } from './schemas/localidad.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Estado.name, schema: EstadoSchema },
      { name: MunicipioCatalogo.name, schema: MunicipioCatalogoSchema },
      { name: Rol.name, schema: RolSchema },
      { name: UnidadMedida.name, schema: UnidadMedidaSchema },
      { name: TipoMovimiento.name, schema: TipoMovimientoSchema },
      { name: GrupoVulnerable.name, schema: GrupoVulnerableSchema },
      { name: TipoApoyo.name, schema: TipoApoyoSchema },
      { name: Localidad.name, schema: LocalidadSchema },
    ]),
  ],
  controllers: [CatalogosController],
  providers: [CatalogosService],
  exports: [MongooseModule],
})
export class CatalogosModule {}
