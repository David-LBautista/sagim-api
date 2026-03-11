import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import {
  CitaConfiguracion,
  CitaConfiguracionSchema,
} from './schemas/cita-configuracion.schema';
import { Cita, CitaSchema } from './schemas/cita.schema';
import { CitaBloqueo, CitaBloqueoSchema } from './schemas/cita-bloqueo.schema';
import {
  Municipality,
  MunicipalitySchema,
} from '../municipalities/schemas/municipality.schema';
import {
  Ciudadano,
  CiudadanoSchema,
} from '../ciudadanos/schemas/ciudadano.schema';
import { Counter, CounterSchema } from '../dif/schemas/counter.schema';
import { NotificacionesModule } from '../notificaciones/notificaciones.module';

import { CitasService } from './citas.service';
import { CitasPublicoController } from './controllers/citas-publico.controller';
import { CitasController } from './controllers/citas.controller';
import { CitasConfiguracionController } from './controllers/citas-configuracion.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CitaConfiguracion.name, schema: CitaConfiguracionSchema },
      { name: Cita.name, schema: CitaSchema },
      { name: CitaBloqueo.name, schema: CitaBloqueoSchema },
      { name: Municipality.name, schema: MunicipalitySchema },
      { name: Ciudadano.name, schema: CiudadanoSchema },
      { name: Counter.name, schema: CounterSchema },
    ]),
    NotificacionesModule,
  ],
  controllers: [
    CitasPublicoController,
    CitasConfiguracionController,
    CitasController,
  ],
  providers: [CitasService],
  exports: [CitasService, MongooseModule],
})
export class CitasModule {}
