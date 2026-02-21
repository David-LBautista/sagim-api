import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';
import { Model } from 'mongoose';
import { getModelToken } from '@nestjs/mongoose';
import { Modulo } from '@/modules/modulos/schemas/modulo.schema';

/**
 * Seed 03: Módulos del sistema
 * Idempotente: Usa upsert para no duplicar
 */
export async function seedModulos(app?: any) {
  const shouldClose = !app;
  if (!app) {
    app = await NestFactory.createApplicationContext(AppModule);
  }

  try {
    const moduloModel = app.get(getModelToken(Modulo.name)) as Model<Modulo>;

    console.log('📦 [03] Seeding Módulos del sistema...\n');

    const modulos = [
      { nombre: 'USUARIOS', descripcion: 'Gestión de usuarios del sistema' },
      { nombre: 'MUNICIPIOS', descripcion: 'Gestión de municipios' },
      { nombre: 'PRESIDENCIA', descripcion: 'Módulo de Presidencia Municipal' },
      {
        nombre: 'SECRETARIA_AYUNTAMIENTO',
        descripcion: 'Módulo de Secretaría del Ayuntamiento',
      },
      {
        nombre: 'COMUNICACION_SOCIAL',
        descripcion: 'Módulo de Comunicación Social',
      },
      {
        nombre: 'UIPPE',
        descripcion:
          'Unidad de Información, Planeación, Programación y Evaluación',
      },
      { nombre: 'CONTRALORIA', descripcion: 'Módulo de Contraloría Municipal' },
      {
        nombre: 'SEGURIDAD_PUBLICA',
        descripcion: 'Módulo de Seguridad Pública',
      },
      {
        nombre: 'SERVICIOS_PUBLICOS',
        descripcion: 'Módulo de Servicios Públicos',
      },
      {
        nombre: 'DESARROLLO_URBANO',
        descripcion: 'Módulo de Desarrollo Urbano',
      },
      {
        nombre: 'DESARROLLO_ECONOMICO',
        descripcion: 'Módulo de Desarrollo Económico',
      },
      {
        nombre: 'DESARROLLO_SOCIAL',
        descripcion: 'Módulo de Desarrollo Social',
      },
      { nombre: 'TESORERIA', descripcion: 'Módulo de Tesorería Municipal' },
      {
        nombre: 'DIF',
        descripcion: 'Sistema para el Desarrollo Integral de la Familia',
      },
      {
        nombre: 'ORGANISMO_AGUA',
        descripcion: 'Módulo del Organismo Operador de Agua',
      },
      { nombre: 'CATASTRO', descripcion: 'Módulo de Catastro Municipal' },
      {
        nombre: 'REPORTES',
        descripcion: 'Módulo de Reportes Ciudadanos (Sistema 311)',
      },
      { nombre: 'CITAS', descripcion: 'Módulo de Gestión de Citas' },
    ];

    let insertados = 0;
    let actualizados = 0;

    for (const modulo of modulos) {
      const result = await moduloModel.updateOne(
        { nombre: modulo.nombre },
        {
          $set: {
            descripcion: modulo.descripcion,
            activo: true,
          },
        },
        { upsert: true },
      );

      if (result.upsertedCount > 0) {
        console.log(`✅ ${modulo.nombre} (CREADO)`);
        insertados++;
      } else if (result.modifiedCount > 0) {
        console.log(`🔄 ${modulo.nombre} (ACTUALIZADO)`);
        actualizados++;
      } else {
        console.log(`⏭️  ${modulo.nombre} (SIN CAMBIOS)`);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log(`✅ Creados: ${insertados}`);
    console.log(`🔄 Actualizados: ${actualizados}`);
    console.log(`⏭️  Sin cambios: ${modulos.length - insertados - actualizados}`);
    console.log('='.repeat(60) + '\n');

    return { insertados, actualizados, total: modulos.length };
  } catch (error) {
    console.error('❌ Error en seed de módulos:', error);
    throw error;
  } finally {
    if (shouldClose) {
      await app.close();
    }
  }
}

// Permitir ejecución directa
if (require.main === module) {
  seedModulos();
}
