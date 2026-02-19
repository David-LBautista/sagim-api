import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CatastroController } from './catastro.controller';
import { CatastroService } from './catastro.service';
import { Predio, PredioSchema } from './schemas/predio.schema';
import { Cita, CitaSchema } from './schemas/cita.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Predio.name, schema: PredioSchema },
      { name: Cita.name, schema: CitaSchema },
    ]),
  ],
  controllers: [CatastroController],
  providers: [CatastroService],
  exports: [CatastroService],
})
export class CatastroModule {}
