import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Ciudadano, CiudadanoSchema } from './schemas/ciudadano.schema';
import { CiudadanosController } from './ciudadanos.controller';
import { CiudadanosService } from './ciudadanos.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Ciudadano.name, schema: CiudadanoSchema },
    ]),
  ],
  controllers: [CiudadanosController],
  providers: [CiudadanosService],
  exports: [CiudadanosService],
})
export class CiudadanosModule {}
