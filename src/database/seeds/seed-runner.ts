import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';
import { seedEstados } from './01-estados.seed';
import { seedRoles } from './02-roles.seed';
import { seedModulos } from './03-modulos.seed';
import { seedCatalogosBase } from './04-catalogos-base.seed';
import { seedSuperAdmin } from './05-super-admin.seed';
import { seedLocalidades } from './06-localidades.seed';

/**
 * Seed Runner - Ejecuta todos los seeds en orden
 * 
 * Características:
 * ✅ Idempotente - Puede ejecutarse múltiples veces
 * ✅ Versionado - Seeds numerados en orden de ejecución
 * ✅ Transaccional - Si falla uno, se detiene
 * ✅ Con resumen - Muestra estadísticas al final
 * 
 * Uso:
 *   npm run seed
 *   npm run seed:dev
 */
async function runAllSeeds() {
  console.log('\n' + '='.repeat(70));
  console.log('🌱 SAGIM - SEED RUNNER');
  console.log('='.repeat(70));
  console.log('Ejecutando seeds en orden...\n');

  const app = await NestFactory.createApplicationContext(AppModule);

  try {
    const startTime = Date.now();
    const results: any = {};

    // Seed 01: Estados
    results.estados = await seedEstados(app);

    // Seed 02: Roles
    results.roles = await seedRoles(app);

    // Seed 03: Módulos
    results.modulos = await seedModulos(app);

    // Seed 04: Catálogos base
    results.catalogos = await seedCatalogosBase(app);

    // Seed 05: Super Admin
    results.superAdmin = await seedSuperAdmin(app);

    // Seed 06: Localidades (opcional - requiere municipio)
    try {
      results.localidades = await seedLocalidades(app);
    } catch (error) {
      console.log('⚠️  Seed de localidades omitido (requiere municipio existente)\n');
      results.localidades = { insertados: 0, actualizados: 0, total: 0, error: error.message };
    }

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    // Resumen final
    console.log('\n' + '='.repeat(70));
    console.log('📊 RESUMEN GENERAL DE SEEDS');
    console.log('='.repeat(70));
    console.log(`\n📍 Estados:`);
    console.log(`   ✅ Creados: ${results.estados.insertados}`);
    console.log(`   🔄 Actualizados: ${results.estados.actualizados}`);
    
    console.log(`\n👥 Roles:`);
    console.log(`   ✅ Creados: ${results.roles.insertados}`);
    console.log(`   🔄 Actualizados: ${results.roles.actualizados}`);
    
    console.log(`\n📦 Módulos:`);
    console.log(`   ✅ Creados: ${results.modulos.insertados}`);
    console.log(`   🔄 Actualizados: ${results.modulos.actualizados}`);
    
    console.log(`\n📋 Catálogos base:`);
    console.log(`   📏 Unidades de medida: ${results.catalogos.unidadesMedida.insertados} creadas`);
    console.log(`   📦 Tipos de movimiento: ${results.catalogos.tiposMovimiento.insertados} creados`);
    console.log(`   👥 Grupos vulnerables: ${results.catalogos.gruposVulnerables.insertados} creados`);
    console.log(`   🎁 Tipos de apoyo: ${results.catalogos.tiposApoyo.insertados} creados`);
    
    console.log(`\n👤 Super Admin:`);
    console.log(`   ✅ Configurado correctamente`);
    console.log(`   📧 Email: superadmin@sagim.mx`);
    console.log(`   🔑 Password: SuperAdmin123!`);

    if (results.localidades && results.localidades.total > 0) {
      console.log(`\n🏘️  Localidades:`);
      console.log(`   ✅ Creadas: ${results.localidades.insertados}`);
      console.log(`   🔄 Actualizadas: ${results.localidades.actualizados}`);
      console.log(`   📍 Total: ${results.localidades.total}`);
      console.log(`   🗂️  Municipio: ${results.localidades.municipio || 'La Perla'}`);
    }

    console.log('\n' + '='.repeat(70));
    console.log(`✅ SEEDS COMPLETADOS EXITOSAMENTE en ${duration}s`);
    console.log('='.repeat(70));
    console.log('\n💡 Siguiente paso:');
    console.log('   1. Crea un municipio desde el panel de Super Admin');
    console.log('   2. O ejecuta el seed de municipios: npm run seed:municipios');
    console.log('   3. Inicia sesión con el Super Admin\n');
  } catch (error) {
    console.error('\n❌ ERROR DURANTE LA EJECUCIÓN DE SEEDS:', error);
    console.error('\n📋 Stack trace:', error.stack);
    process.exit(1);
  } finally {
    await app.close();
  }
}

// Ejecutar
runAllSeeds();
