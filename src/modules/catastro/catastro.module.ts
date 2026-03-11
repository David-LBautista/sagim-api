import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CatastroController } from './catastro.controller';
import { CatastroService } from './catastro.service';
import { Predio, PredioSchema } from './schemas/predio.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Predio.name, schema: PredioSchema }]),
  ],
  controllers: [CatastroController],
  providers: [CatastroService],
  exports: [CatastroService],
})
export class CatastroModule {}
