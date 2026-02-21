import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';
import { Model } from 'mongoose';
import { getModelToken } from '@nestjs/mongoose';
import { User } from '@/modules/users/schemas/user.schema';
import { UserRole } from '@/shared/enums';
import * as bcrypt from 'bcrypt';

/**
 * Seed 05: Super Admin
 * Idempotente: Usa upsert para no duplicar
 */
export async function seedSuperAdmin(app?: any) {
  const shouldClose = !app;
  if (!app) {
    app = await NestFactory.createApplicationContext(AppModule);
  }

  try {
    const userModel = app.get(getModelToken(User.name)) as Model<User>;

    console.log('👤 [05] Seeding Super Admin...\n');

    const email = 'superadmin@sagim.mx';
    const password = 'SuperAdmin123!';
    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await userModel.updateOne(
      { email },
      {
        $set: {
          nombre: 'David Lucas Bautista',
          password: hashedPassword,
          rol: UserRole.SUPER_ADMIN,
          activo: true,
          telefono: '2721010707',
        },
      },
      { upsert: true },
    );

    if (result.upsertedCount > 0) {
      console.log(`✅ Super Admin CREADO`);
      console.log(`   📧 Email: ${email}`);
      console.log(`   🔑 Password: ${password}`);
    } else if (result.modifiedCount > 0) {
      console.log(`🔄 Super Admin ACTUALIZADO`);
      console.log(`   📧 Email: ${email}`);
    } else {
      console.log(`⏭️  Super Admin ya existe (SIN CAMBIOS)`);
      console.log(`   📧 Email: ${email}`);
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ Super Admin configurado correctamente');
    console.log('='.repeat(60) + '\n');

    return {
      insertados: result.upsertedCount,
      actualizados: result.modifiedCount,
    };
  } catch (error) {
    console.error('❌ Error en seed de super admin:', error);
    throw error;
  } finally {
    if (shouldClose) {
      await app.close();
    }
  }
}

// Permitir ejecución directa
if (require.main === module) {
  seedSuperAdmin();
}
