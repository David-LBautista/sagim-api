import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import {
  TransparenciaSeccion,
  TransparenciaSeccionSchema,
} from './schemas/transparencia.schema';
import { TransparenciaService } from './transparencia.service';
import { TransparenciaController } from './controllers/transparencia.controller';
import { TransparenciaPublicoController } from './controllers/transparencia-publico.controller';
import { S3Module } from '../s3/s3.module';
import { PortalModule } from '../portal/portal.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: TransparenciaSeccion.name, schema: TransparenciaSeccionSchema },
    ]),
    S3Module,
    PortalModule,
  ],
  providers: [TransparenciaService],
  controllers: [TransparenciaController, TransparenciaPublicoController],
  exports: [TransparenciaService],
})
export class TransparenciaModule {}
