import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';
import { Model } from 'mongoose';
import { getModelToken } from '@nestjs/mongoose';
import { Modulo } from '@/modules/modulos/schemas/modulo.schema';

async function run() {
  const app = await NestFactory.createApplicationContext(AppModule);

  try {
    const moduloModel = app.get(getModelToken(Modulo.name)) as Model<Modulo>;

    const result = await moduloModel.updateOne(
      { nombre: 'REGISTRO_CIVIL' },
      {
        $set: {
          descripcion: 'Módulo de Registro Civil',
          activo: true,
        },
      },
      { upsert: true },
    );

    if (result.upsertedCount > 0) {
      console.log('✅ REGISTRO_CIVIL creado correctamente');
    } else if (result.modifiedCount > 0) {
      console.log('🔄 REGISTRO_CIVIL actualizado');
    } else {
      console.log('⏭️  REGISTRO_CIVIL ya existía, sin cambios');
    }
  } finally {
    await app.close();
  }
}

run().catch((err) => {
  console.error('❌ Error:', err);
  process.exit(1);
});
