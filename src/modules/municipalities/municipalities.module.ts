import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  Municipality,
  MunicipalitySchema,
} from './schemas/municipality.schema';
import { Programa, ProgramaSchema } from '../dif/schemas/programa.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { Modulo, ModuloSchema } from '../modulos/schemas/modulo.schema';
import { MunicipalitiesController } from './municipalities.controller';
import { MunicipalitiesPublicoController } from './municipalities-publico.controller';
import { MunicipalitiesService } from './municipalities.service';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { TransparenciaModule } from '../transparencia/transparencia.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Municipality.name, schema: MunicipalitySchema },
      { name: Programa.name, schema: ProgramaSchema },
      { name: User.name, schema: UserSchema },
      { name: Modulo.name, schema: ModuloSchema },
    ]),
    CloudinaryModule,
    TransparenciaModule,
  ],
  controllers: [MunicipalitiesController, MunicipalitiesPublicoController],
  providers: [MunicipalitiesService],
  exports: [MongooseModule],
})
export class MunicipalitiesModule {}
