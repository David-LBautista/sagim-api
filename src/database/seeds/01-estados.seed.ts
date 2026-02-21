import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';
import { Model } from 'mongoose';
import { getModelToken } from '@nestjs/mongoose';
import { Estado } from '@/modules/catalogos/schemas/estado.schema';

/**
 * Seed 01: Estados de la República Mexicana
 * Idempotente: Usa upsert para no duplicar
 */
export async function seedEstados(app?: any) {
  const shouldClose = !app;
  if (!app) {
    app = await NestFactory.createApplicationContext(AppModule);
  }

  try {
    const estadoModel = app.get(getModelToken(Estado.name)) as Model<Estado>;

    console.log('📍 [01] Seeding Estados...\n');

    const estados = [
      { clave: 'AGS', nombre: 'Aguascalientes', activo: true },
      { clave: 'BC', nombre: 'Baja California', activo: true },
      { clave: 'BCS', nombre: 'Baja California Sur', activo: true },
      { clave: 'CAM', nombre: 'Campeche', activo: true },
      { clave: 'CHIS', nombre: 'Chiapas', activo: true },
      { clave: 'CHIH', nombre: 'Chihuahua', activo: true },
      { clave: 'CDMX', nombre: 'Ciudad de México', activo: true },
      { clave: 'COAH', nombre: 'Coahuila', activo: true },
      { clave: 'COL', nombre: 'Colima', activo: true },
      { clave: 'DGO', nombre: 'Durango', activo: true },
      { clave: 'GTO', nombre: 'Guanajuato', activo: true },
      { clave: 'GRO', nombre: 'Guerrero', activo: true },
      { clave: 'HGO', nombre: 'Hidalgo', activo: true },
      { clave: 'JAL', nombre: 'Jalisco', activo: true },
      { clave: 'MEX', nombre: 'México', activo: true },
      { clave: 'MICH', nombre: 'Michoacán', activo: true },
      { clave: 'MOR', nombre: 'Morelos', activo: true },
      { clave: 'NAY', nombre: 'Nayarit', activo: true },
      { clave: 'NL', nombre: 'Nuevo León', activo: true },
      { clave: 'OAX', nombre: 'Oaxaca', activo: true },
      { clave: 'PUE', nombre: 'Puebla', activo: true },
      { clave: 'QRO', nombre: 'Querétaro', activo: true },
      { clave: 'QROO', nombre: 'Quintana Roo', activo: true },
      { clave: 'SLP', nombre: 'San Luis Potosí', activo: true },
      { clave: 'SIN', nombre: 'Sinaloa', activo: true },
      { clave: 'SON', nombre: 'Sonora', activo: true },
      { clave: 'TAB', nombre: 'Tabasco', activo: true },
      { clave: 'TAMPS', nombre: 'Tamaulipas', activo: true },
      { clave: 'TLAX', nombre: 'Tlaxcala', activo: true },
      { clave: 'VER', nombre: 'Veracruz', activo: true },
      { clave: 'YUC', nombre: 'Yucatán', activo: true },
      { clave: 'ZAC', nombre: 'Zacatecas', activo: true },
    ];

    let insertados = 0;
    let actualizados = 0;

    for (const estado of estados) {
      const result = await estadoModel.updateOne(
        { clave: estado.clave },
        {
          $set: {
            nombre: estado.nombre,
            activo: true,
          },
        },
        { upsert: true },
      );

      if (result.upsertedCount > 0) {
        console.log(`✅ ${estado.clave} - ${estado.nombre} (CREADO)`);
        insertados++;
      } else if (result.modifiedCount > 0) {
        console.log(`🔄 ${estado.clave} - ${estado.nombre} (ACTUALIZADO)`);
        actualizados++;
      } else {
        console.log(`⏭️  ${estado.clave} - ${estado.nombre} (SIN CAMBIOS)`);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log(`✅ Creados: ${insertados}`);
    console.log(`🔄 Actualizados: ${actualizados}`);
    console.log(
      `⏭️  Sin cambios: ${estados.length - insertados - actualizados}`,
    );
    console.log('='.repeat(60) + '\n');

    return { insertados, actualizados, total: estados.length };
  } catch (error) {
    console.error('❌ Error en seed de estados:', error);
    throw error;
  } finally {
    if (shouldClose) {
      await app.close();
    }
  }
}

// Permitir ejecución directa
if (require.main === module) {
  seedEstados();
}
