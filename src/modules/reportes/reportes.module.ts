import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ReportesService } from './reportes.service';
import { ReportesController } from './reportes.controller';
import { Reporte, ReporteSchema } from './schemas/reporte.schema';
import { Counter, CounterSchema } from '@/modules/dif/schemas/counter.schema';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Reporte.name, schema: ReporteSchema },
      { name: Counter.name, schema: CounterSchema },
    ]),
    CloudinaryModule,
  ],
  controllers: [ReportesController],
  providers: [ReportesService],
  exports: [ReportesService],
})
export class ReportesModule {}
