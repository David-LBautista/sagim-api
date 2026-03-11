import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';
import { Model } from 'mongoose';
import { getModelToken } from '@nestjs/mongoose';
import { CategoriaServicio } from '@/modules/catalogos/schemas/categoria-servicio.schema';
import { AREA_POR_CATEGORIA } from './09-tesoreria-servicios.seed';

/**
 * Seed 10: Catálogo de categorías de servicios municipales
 * Genera un documento por cada entrada de AREA_POR_CATEGORIA del seed 09.
 * Idempotente: usa upsert por nombre.
 */
export async function seedCategoriasServicios(app?: any) {
  const shouldClose = !app;
  if (!app) {
    app = await NestFactory.createApplicationContext(AppModule);
  }

  try {
    const categoriaModel = app.get(
      getModelToken(CategoriaServicio.name),
    ) as Model<CategoriaServicio>;

    console.log('🗂️  [10] Seeding Categorías de Servicios Municipales...\n');

    let insertados = 0;
    let actualizados = 0;
    let sinCambios = 0;

    const entradas = Object.entries(AREA_POR_CATEGORIA);

    for (let i = 0; i < entradas.length; i++) {
      const [nombre, areaResponsable] = entradas[i];

      const result = await categoriaModel.updateOne(
        { nombre },
        {
          $set: {
            areaResponsable,
            orden: i + 1,
            activo: true,
          },
        },
        { upsert: true },
      );

      if (result.upsertedCount > 0) {
        insertados++;
        console.log(`   ✅ CREADA: ${nombre} → ${areaResponsable}`);
      } else if (result.modifiedCount > 0) {
        actualizados++;
        console.log(`   🔄 ACTUALIZADA: ${nombre}`);
      } else {
        sinCambios++;
        console.log(`   ⏭️  SIN CAMBIOS: ${nombre}`);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ Categorías de servicios configuradas:');
    console.log(`   ✅ Insertadas : ${insertados}`);
    console.log(`   🔄 Actualizadas: ${actualizados}`);
    console.log(`   ⏭️  Sin cambios : ${sinCambios}`);
    console.log(`   📦 Total       : ${entradas.length}`);
    console.log('='.repeat(60) + '\n');

    return { insertados, actualizados, sinCambios, total: entradas.length };
  } catch (error) {
    console.error('❌ Error en seed de categorías de servicios:', error);
    throw error;
  } finally {
    if (shouldClose) {
      await app.close();
    }
  }
}

if (require.main === module) {
  seedCategoriasServicios();
}
