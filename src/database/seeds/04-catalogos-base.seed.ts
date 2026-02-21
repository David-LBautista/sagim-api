import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';
import { Model } from 'mongoose';
import { getModelToken } from '@nestjs/mongoose';
import { UnidadMedida } from '@/modules/catalogos/schemas/unidad-medida.schema';
import { TipoMovimiento } from '@/modules/catalogos/schemas/tipo-movimiento.schema';
import { GrupoVulnerable } from '@/modules/catalogos/schemas/grupo-vulnerable.schema';
import { TipoApoyo } from '@/modules/catalogos/schemas/tipo-apoyo.schema';

/**
 * Seed 04: Catálogos base del sistema DIF
 * Idempotente: Usa upsert para no duplicar
 */
export async function seedCatalogosBase(app?: any) {
  const shouldClose = !app;
  if (!app) {
    app = await NestFactory.createApplicationContext(AppModule);
  }

  try {
    const unidadMedidaModel = app.get(
      getModelToken(UnidadMedida.name),
    ) as Model<UnidadMedida>;
    const tipoMovimientoModel = app.get(
      getModelToken(TipoMovimiento.name),
    ) as Model<TipoMovimiento>;
    const grupoVulnerableModel = app.get(
      getModelToken(GrupoVulnerable.name),
    ) as Model<GrupoVulnerable>;
    const tipoApoyoModel = app.get(
      getModelToken(TipoApoyo.name),
    ) as Model<TipoApoyo>;

    console.log('📋 [04] Seeding Catálogos base...\n');

    // ==================== UNIDADES DE MEDIDA ====================
    console.log('📏 Unidades de medida:\n');

    const unidadesMedida = [
      { clave: 'PZA', nombre: 'Pieza' },
      { clave: 'KG', nombre: 'Kilogramo' },
      { clave: 'LT', nombre: 'Litro' },
      { clave: 'CAJA', nombre: 'Caja' },
      { clave: 'PAQ', nombre: 'Paquete' },
      { clave: 'MT', nombre: 'Metro' },
      { clave: 'GR', nombre: 'Gramo' },
      { clave: 'ML', nombre: 'Mililitro' },
    ];

    let unidadesInsertadas = 0;
    let unidadesActualizadas = 0;

    for (const unidad of unidadesMedida) {
      const result = await unidadMedidaModel.updateOne(
        { clave: unidad.clave },
        {
          $set: {
            nombre: unidad.nombre,
            activo: true,
          },
        },
        { upsert: true },
      );

      if (result.upsertedCount > 0) {
        console.log(`  ✅ ${unidad.clave} - ${unidad.nombre} (CREADO)`);
        unidadesInsertadas++;
      } else if (result.modifiedCount > 0) {
        console.log(`  🔄 ${unidad.clave} - ${unidad.nombre} (ACTUALIZADO)`);
        unidadesActualizadas++;
      } else {
        console.log(`  ⏭️  ${unidad.clave} - ${unidad.nombre} (SIN CAMBIOS)`);
      }
    }

    // ==================== TIPOS DE MOVIMIENTO ====================
    console.log('\n📦 Tipos de movimiento de inventario:\n');

    const tiposMovimiento = [
      {
        clave: 'IN',
        nombre: 'Entrada',
        descripcion: 'Entrada de recursos al inventario',
      },
      {
        clave: 'OUT',
        nombre: 'Salida',
        descripcion: 'Salida de recursos del inventario',
      },
      {
        clave: 'AJUSTE',
        nombre: 'Ajuste',
        descripcion: 'Ajuste de inventario (corrección)',
      },
    ];

    let movimientosInsertados = 0;
    let movimientosActualizados = 0;

    for (const tipo of tiposMovimiento) {
      const result = await tipoMovimientoModel.updateOne(
        { clave: tipo.clave },
        {
          $set: {
            nombre: tipo.nombre,
            descripcion: tipo.descripcion,
            activo: true,
          },
        },
        { upsert: true },
      );

      if (result.upsertedCount > 0) {
        console.log(`  ✅ ${tipo.clave} - ${tipo.nombre} (CREADO)`);
        movimientosInsertados++;
      } else if (result.modifiedCount > 0) {
        console.log(`  🔄 ${tipo.clave} - ${tipo.nombre} (ACTUALIZADO)`);
        movimientosActualizados++;
      } else {
        console.log(`  ⏭️  ${tipo.clave} - ${tipo.nombre} (SIN CAMBIOS)`);
      }
    }

    // ==================== GRUPOS VULNERABLES ====================
    console.log('\n👥 Grupos vulnerables:\n');

    const gruposVulnerables = [
      {
        clave: 'ADULTO_MAYOR',
        nombre: 'Adulto Mayor',
        descripcion: 'Personas de 60 años o más',
      },
      {
        clave: 'DISCAPACIDAD',
        nombre: 'Personas con Discapacidad',
        descripcion: 'Personas con discapacidad física, mental o sensorial',
      },
      {
        clave: 'MADRE_SOLTERA',
        nombre: 'Madre Soltera',
        descripcion: 'Madres jefas de familia',
      },
      {
        clave: 'POBREZA_EXTREMA',
        nombre: 'Pobreza Extrema',
        descripcion: 'Familias en situación de pobreza extrema',
      },
      {
        clave: 'INDIGENA',
        nombre: 'Población Indígena',
        descripcion: 'Personas de comunidades indígenas',
      },
    ];

    let gruposInsertados = 0;
    let gruposActualizados = 0;

    for (const grupo of gruposVulnerables) {
      const result = await grupoVulnerableModel.updateOne(
        { clave: grupo.clave },
        {
          $set: {
            nombre: grupo.nombre,
            descripcion: grupo.descripcion,
            activo: true,
          },
        },
        { upsert: true },
      );

      if (result.upsertedCount > 0) {
        console.log(`  ✅ ${grupo.clave} (CREADO)`);
        gruposInsertados++;
      } else if (result.modifiedCount > 0) {
        console.log(`  🔄 ${grupo.clave} (ACTUALIZADO)`);
        gruposActualizados++;
      } else {
        console.log(`  ⏭️  ${grupo.clave} (SIN CAMBIOS)`);
      }
    }

    // ==================== TIPOS DE APOYO ====================
    console.log('\n🎁 Tipos de apoyo:\n');

    const tiposApoyo = [
      {
        clave: 'DESPENSA',
        nombre: 'Despensa',
        descripcion: 'Despensas con alimentos básicos',
      },
      {
        clave: 'ECONOMICO',
        nombre: 'Apoyo Económico',
        descripcion: 'Apoyo económico en efectivo',
      },
      {
        clave: 'MEDICAMENTO',
        nombre: 'Medicamento',
        descripcion: 'Medicamentos y material de curación',
      },
      {
        clave: 'APARATO_FUNCIONAL',
        nombre: 'Aparato Funcional',
        descripcion: 'Aparatos funcionales (sillas de ruedas, muletas, etc.)',
      },
      {
        clave: 'OTRO',
        nombre: 'Otro',
        descripcion: 'Otro tipo de apoyo',
      },
    ];

    let apoyosInsertados = 0;
    let apoyosActualizados = 0;

    for (const apoyo of tiposApoyo) {
      const result = await tipoApoyoModel.updateOne(
        { clave: apoyo.clave },
        {
          $set: {
            nombre: apoyo.nombre,
            descripcion: apoyo.descripcion,
            activo: true,
          },
        },
        { upsert: true },
      );

      if (result.upsertedCount > 0) {
        console.log(`  ✅ ${apoyo.clave} (CREADO)`);
        apoyosInsertados++;
      } else if (result.modifiedCount > 0) {
        console.log(`  🔄 ${apoyo.clave} (ACTUALIZADO)`);
        apoyosActualizados++;
      } else {
        console.log(`  ⏭️  ${apoyo.clave} (SIN CAMBIOS)`);
      }
    }

    // ==================== RESUMEN ====================
    console.log('\n' + '='.repeat(60));
    console.log('📊 RESUMEN DE CATÁLOGOS BASE');
    console.log('='.repeat(60));
    console.log(`📏 Unidades de medida: ${unidadesInsertadas} creadas, ${unidadesActualizadas} actualizadas`);
    console.log(`📦 Tipos de movimiento: ${movimientosInsertados} creados, ${movimientosActualizados} actualizados`);
    console.log(`👥 Grupos vulnerables: ${gruposInsertados} creados, ${gruposActualizados} actualizados`);
    console.log(`🎁 Tipos de apoyo: ${apoyosInsertados} creados, ${apoyosActualizados} actualizados`);
    console.log('='.repeat(60) + '\n');

    return {
      unidadesMedida: {
        insertados: unidadesInsertadas,
        actualizados: unidadesActualizadas,
      },
      tiposMovimiento: {
        insertados: movimientosInsertados,
        actualizados: movimientosActualizados,
      },
      gruposVulnerables: {
        insertados: gruposInsertados,
        actualizados: gruposActualizados,
      },
      tiposApoyo: { insertados: apoyosInsertados, actualizados: apoyosActualizados },
    };
  } catch (error) {
    console.error('❌ Error en seed de catálogos base:', error);
    throw error;
  } finally {
    if (shouldClose) {
      await app.close();
    }
  }
}

// Permitir ejecución directa
if (require.main === module) {
  seedCatalogosBase();
}
