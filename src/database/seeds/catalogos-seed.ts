import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';
import { Model } from 'mongoose';
import { getModelToken } from '@nestjs/mongoose';
import {
  Programa,
  ProgramaDocument,
} from '../../modules/dif/schemas/programa.schema';
import {
  UnidadMedida,
  UnidadMedidaDocument,
} from '../../modules/dif/schemas/unidad-medida.schema';

/**
 * Seed para catálogos del sistema SAGIM
 * Este seed crea:
 * - Programas sociales estándar del DIF (catálogos globales)
 * - Unidades de medida
 */

async function seedCatalogos() {
  console.log('🌱 Iniciando seed de catálogos...');

  const app = await NestFactory.createApplicationContext(AppModule);

  const programaModel = app.get<Model<ProgramaDocument>>(
    getModelToken(Programa.name),
  );
  const unidadMedidaModel = app.get<Model<UnidadMedidaDocument>>(
    getModelToken(UnidadMedida.name),
  );

  try {
    // =====================================================
    // 1. UNIDADES DE MEDIDA
    // =====================================================
    console.log('\n📏 Creando catálogo de unidades de medida...');

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

    let totalUnidadesCreadas = 0;

    for (const unidadData of unidadesMedida) {
      const existente = await unidadMedidaModel.findOne({
        clave: unidadData.clave,
      });

      if (existente) {
        console.log(`   ⏭️  Ya existe: ${unidadData.clave} - ${unidadData.nombre}`);
        continue;
      }

      const unidad = new unidadMedidaModel({
        clave: unidadData.clave,
        nombre: unidadData.nombre,
        activo: true,
      });

      await unidad.save();
      totalUnidadesCreadas++;
      console.log(`   ✅ Creada: ${unidadData.clave} - ${unidadData.nombre}`);
    }

    console.log(
      `\n✅ Unidades de medida: ${totalUnidadesCreadas} creadas, ${unidadesMedida.length} total`,
    );

    // =====================================================
    // 2. PROGRAMAS SOCIALES
    // =====================================================
    console.log('\n📋 Creando catálogo de programas sociales...');

    const programasCatalogo = [
      {
        nombre: 'Despensas para Familias Vulnerables',
        descripcion:
          'Programa de apoyo alimentario mediante entrega de despensas a familias en situación de vulnerabilidad social y económica.',
      },
      {
        nombre: 'Apoyo a Personas con Discapacidad',
        descripcion:
          'Programa integral para personas con discapacidad que incluye entrega de aparatos funcionales, terapias y apoyo psicológico.',
      },
      {
        nombre: 'Atención Médica y Medicamentos',
        descripcion:
          'Programa de salud que proporciona consultas médicas, medicamentos gratuitos y estudios de laboratorio a población sin seguridad social.',
      },
      {
        nombre: 'Útiles y Uniformes Escolares',
        descripcion:
          'Apoyo educativo mediante entrega de paquetes de útiles escolares y uniformes a estudiantes de familias de escasos recursos.',
      },
      {
        nombre: 'Apoyo Económico a Adultos Mayores',
        descripcion:
          'Programa de apoyo económico mensual para adultos mayores de 65 años en situación de vulnerabilidad sin pensión.',
      },
      {
        nombre: 'Apoyo Funcional (Sillas, Bastones, Muletas)',
        descripcion:
          'Entrega de aparatos funcionales como sillas de ruedas, andaderas, bastones, muletas y otros apoyos ortopédicos.',
      },
      {
        nombre: 'Desayunos Escolares',
        descripcion:
          'Programa de alimentación escolar que proporciona desayunos nutritivos a niños de educación básica en escuelas públicas.',
      },
      {
        nombre: 'Atención a la Mujer',
        descripcion:
          'Programa integral de atención a mujeres en situación de violencia, incluyendo apoyo psicológico, legal y refugio temporal.',
      },
      {
        nombre: 'Apoyo Alimentario a Albergues',
        descripcion:
          'Suministro de despensas y alimentos preparados a casas hogar, albergues y asilos del municipio.',
      },
      {
        nombre: 'Rehabilitación y Terapias',
        descripcion:
          'Servicios de rehabilitación física, terapia ocupacional y de lenguaje para personas con discapacidad o en recuperación.',
      },
    ];

    let totalProgramasCreados = 0;

    // Crear programas globales (sin municipioId)
    for (const programaData of programasCatalogo) {
      // Verificar si el programa ya existe
      const existente = await programaModel.findOne({
        nombre: programaData.nombre,
        municipioId: { $exists: false },
      });

      if (existente) {
        console.log(`   ⏭️  Ya existe: ${programaData.nombre}`);
        continue;
      }

      // Crear programa global
      const programa = new programaModel({
        nombre: programaData.nombre,
        descripcion: programaData.descripcion,
        fechaInicio: new Date(2026, 0, 1), // 1 de enero 2026
        activo: true,
      });

      await programa.save();
      totalProgramasCreados++;
      console.log(`   ✅ Creado: ${programaData.nombre}`);
    }

    console.log(
      `\n✅ Programas sociales: ${totalProgramasCreados} creados, ${programasCatalogo.length} total`,
    );

    // =====================================================
    // RESUMEN FINAL
    // =====================================================
    console.log('\n' + '='.repeat(50));
    console.log('📊 RESUMEN DE CATÁLOGOS CREADOS');
    console.log('='.repeat(50));
    console.log(`📏 Unidades de medida: ${unidadesMedida.length}`);
    console.log(`📋 Programas sociales: ${programasCatalogo.length}`);
    console.log('='.repeat(50));
  } catch (error) {
    console.error('❌ Error en el seed de catálogos:', error);
    throw error;
  } finally {
    await app.close();
  }
}

// Ejecutar seed
seedCatalogos()
  .then(() => {
    console.log('🎉 Seed de catálogos finalizado exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Error fatal en seed:', error);
    process.exit(1);
  });
