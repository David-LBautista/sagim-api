import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { ReportesService } from './reportes.service';
import { ReportesController } from './reportes.controller';
import { ReportesPublicoController } from './controllers/reportes-publico.controller';
import { Reporte, ReporteSchema } from './schemas/reporte.schema';
import {
  ReportesConfiguracion,
  ReportesConfiguracionSchema,
} from './schemas/reporte.schema';
import { Counter, CounterSchema } from '@/modules/dif/schemas/counter.schema';
import {
  Municipality,
  MunicipalitySchema,
} from '../municipalities/schemas/municipality.schema';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { NotificacionesModule } from '../notificaciones/notificaciones.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Reporte.name, schema: ReporteSchema },
      { name: ReportesConfiguracion.name, schema: ReportesConfiguracionSchema },
      { name: Municipality.name, schema: MunicipalitySchema },
      { name: Counter.name, schema: CounterSchema },
    ]),
    CloudinaryModule,
    NotificacionesModule,
  ],
  controllers: [ReportesPublicoController, ReportesController],
  providers: [ReportesService],
  exports: [ReportesService],
})
export class ReportesModule {}

