/**
 * Migración: Backfill areaResponsable en pagos_ordenes
 *
 * Actualiza todas las órdenes que tienen areaResponsable vacío/null
 * tomando el valor del servicio asociado en tesoreria_servicios_cobro.
 *
 * Ejecución:
 *   npx ts-node -r tsconfig-paths/register src/database/seeds/migrate-ordenes-area-responsable.ts
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';
import { Connection } from 'mongoose';
import { getConnectionToken } from '@nestjs/mongoose';

async function migrate() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error'],
  });

  try {
    const connection = app.get(getConnectionToken()) as Connection;
    const ordenesCol = connection.collection('pagos_ordenes');
    const serviciosCol = connection.collection('tesoreria_servicios_cobro');

    console.log(
      '\n🔄  Iniciando backfill de areaResponsable en pagos_ordenes...\n',
    );

    // Buscar órdenes sin areaResponsable o con valor vacío
    const ordenesSinArea = await ordenesCol
      .find({
        tipo: 'interna',
        $or: [
          { areaResponsable: { $exists: false } },
          { areaResponsable: null },
          { areaResponsable: '' },
        ],
      })
      .toArray();

    console.log(`📦  Órdenes sin areaResponsable: ${ordenesSinArea.length}`);

    if (ordenesSinArea.length === 0) {
      console.log('✅  Nada que migrar.\n');
      return;
    }

    let actualizadas = 0;
    let sinServicio = 0;

    for (const orden of ordenesSinArea) {
      if (!orden.servicioId) {
        sinServicio++;
        continue;
      }

      const servicio = await serviciosCol.findOne({ _id: orden.servicioId });

      if (!servicio) {
        sinServicio++;
        continue;
      }

      // Prioridad: areaResponsable del servicio > categoria del servicio
      const area = servicio.areaResponsable || servicio.categoria || null;

      if (!area) {
        sinServicio++;
        continue;
      }

      await ordenesCol.updateOne(
        { _id: orden._id },
        { $set: { areaResponsable: area } },
      );

      actualizadas++;
      console.log(`   ✅  Orden ${orden.folio ?? orden._id} → ${area}`);
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊  Resultado del backfill:');
    console.log(`   ✅  Actualizadas    : ${actualizadas}`);
    console.log(`   ⚠️   Sin servicio    : ${sinServicio}`);
    console.log(`   📦  Total procesadas: ${ordenesSinArea.length}`);
    console.log('='.repeat(60) + '\n');
  } catch (err) {
    console.error('❌  Error durante la migración:', err);
    throw err;
  } finally {
    await app.close();
  }
}

migrate();
