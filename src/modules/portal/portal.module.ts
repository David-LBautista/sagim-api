import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';

import {
  PortalConfiguracion,
  PortalConfiguracionSchema,
} from './schemas/portal-configuracion.schema';
import { PortalAviso, PortalAvisoSchema } from './schemas/portal-aviso.schema';
import {
  Municipality,
  MunicipalitySchema,
} from '../municipalities/schemas/municipality.schema';

import { PortalService } from './portal.service';
import { PortalPublicoController } from './controllers/portal-publico.controller';
import { PortalConfiguracionController } from './controllers/portal-configuracion.controller';

@Module({
  imports: [
    CloudinaryModule,
    MongooseModule.forFeature([
      { name: PortalConfiguracion.name, schema: PortalConfiguracionSchema },
      { name: PortalAviso.name, schema: PortalAvisoSchema },
      { name: Municipality.name, schema: MunicipalitySchema },
    ]),
  ],
  controllers: [PortalPublicoController, PortalConfiguracionController],
  providers: [PortalService],
  exports: [PortalService],
})
export class PortalModule {}
