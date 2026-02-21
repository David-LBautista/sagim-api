import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';
import { Model } from 'mongoose';
import { getModelToken } from '@nestjs/mongoose';
import { Rol } from '@/modules/catalogos/schemas/rol.schema';

/**
 * Seed 02: Roles del sistema
 * Idempotente: Usa upsert para no duplicar
 */
export async function seedRoles(app?: any) {
  const shouldClose = !app;
  if (!app) {
    app = await NestFactory.createApplicationContext(AppModule);
  }

  try {
    const rolModel = app.get(getModelToken(Rol.name)) as Model<Rol>;

    console.log('👥 [02] Seeding Roles del sistema...\n');

    const roles = [
      {
        nombre: 'SUPER_ADMIN',
        descripcion:
          'Administrador global del sistema SAGIM con acceso completo a todos los municipios y módulos',
      },
      {
        nombre: 'ADMIN_MUNICIPIO',
        descripcion:
          'Administrador municipal con acceso completo a todos los módulos de su municipio',
      },
      {
        nombre: 'OPERATIVO',
        descripcion:
          'Usuario operativo con acceso limitado a un módulo específico de su municipio',
      },
    ];

    let insertados = 0;
    let actualizados = 0;

    for (const rol of roles) {
      const result = await rolModel.updateOne(
        { nombre: rol.nombre },
        {
          $set: {
            descripcion: rol.descripcion,
            activo: true,
          },
        },
        { upsert: true },
      );

      if (result.upsertedCount > 0) {
        console.log(`✅ ${rol.nombre} (CREADO)`);
        insertados++;
      } else if (result.modifiedCount > 0) {
        console.log(`🔄 ${rol.nombre} (ACTUALIZADO)`);
        actualizados++;
      } else {
        console.log(`⏭️  ${rol.nombre} (SIN CAMBIOS)`);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log(`✅ Creados: ${insertados}`);
    console.log(`🔄 Actualizados: ${actualizados}`);
    console.log(`⏭️  Sin cambios: ${roles.length - insertados - actualizados}`);
    console.log('='.repeat(60) + '\n');

    return { insertados, actualizados, total: roles.length };
  } catch (error) {
    console.error('❌ Error en seed de roles:', error);
    throw error;
  } finally {
    if (shouldClose) {
      await app.close();
    }
  }
}

// Permitir ejecución directa
if (require.main === module) {
  seedRoles();
}
