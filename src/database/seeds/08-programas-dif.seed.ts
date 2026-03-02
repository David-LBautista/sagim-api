import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';
import { Model } from 'mongoose';
import { getModelToken } from '@nestjs/mongoose';
import { Programa } from '@/modules/dif/schemas/programa.schema';

/**
 * Seed 08: Programas DIF Municipales
 * Catálogo base de programas sociales — idempotente (upsert por clave)
 * municipioId = null → programas de catálogo global, disponibles para todos los municipios
 */

interface ProgramaSeed {
  clave: string;
  nombre: string;
  descripcion: string;
  nivel: 'municipal' | 'estatal' | 'federal';
  categoria: string;
  tiposApoyo: string[];
}

const PROGRAMAS: ProgramaSeed[] = [
  {
    clave: 'DESPENSAS_DIF',
    nombre: 'Despensas DIF Municipal',
    descripcion:
      'Apoyo alimentario mediante entrega de despensas básicas y especiales a familias en situación de vulnerabilidad.',
    nivel: 'municipal',
    categoria: 'Alimentación',
    tiposApoyo: [
      'Despensa básica',
      'Despensa especial (adulto mayor / discapacidad)',
      'Paquete alimentario emergente',
    ],
  },
  {
    clave: 'ALIMENTACION_ESCOLAR',
    nombre: 'Alimentación Escolar',
    descripcion:
      'Programa estatal de apoyo alimentario a niñas y niños en edad escolar mediante desayunos fríos o calientes.',
    nivel: 'estatal',
    categoria: 'Alimentación',
    tiposApoyo: ['Desayuno frío', 'Desayuno caliente'],
  },
  {
    clave: 'APOYOS_FUNCIONALES',
    nombre: 'Apoyos Funcionales',
    descripcion:
      'Entrega de ayudas técnicas y apoyos funcionales para personas con discapacidad o movilidad reducida.',
    nivel: 'estatal',
    categoria: 'Discapacidad / Salud',
    tiposApoyo: ['Silla de ruedas', 'Bastón', 'Andadera', 'Muletas'],
  },
  {
    clave: 'APOYOS_MEDICOS',
    nombre: 'Apoyos Médicos',
    descripcion:
      'Apoyo para acceso a servicios de salud, medicamentos, estudios clínicos y atención médica especializada.',
    nivel: 'municipal',
    categoria: 'Salud',
    tiposApoyo: [
      'Medicamentos',
      'Estudios médicos',
      'Lentes graduados',
      'Pasajes médicos',
    ],
  },
  {
    clave: 'APOYOS_ECONOMICOS_EMERGENTES',
    nombre: 'Apoyos Económicos Emergentes',
    descripcion:
      'Apoyo económico directo a familias en situación de emergencia o desastre natural.',
    nivel: 'municipal',
    categoria: 'Asistencia social',
    tiposApoyo: ['Apoyo económico directo', 'Apoyo por contingencia'],
  },
  {
    clave: 'APOYOS_FUNERARIOS',
    nombre: 'Apoyos Funerarios',
    descripcion:
      'Apoyo económico o en especie para gastos funerarios de familias en situación de vulnerabilidad.',
    nivel: 'municipal',
    categoria: 'Asistencia social',
    tiposApoyo: ['Apoyo funerario'],
  },
  {
    clave: 'PRIMERA_INFANCIA',
    nombre: 'Atención a la Primera Infancia',
    descripcion:
      'Programa estatal de apoyo a niñas y niños de 0 a 3 años (1000 días de vida) y sus familias.',
    nivel: 'estatal',
    categoria: 'Infancia',
    tiposApoyo: ['Apoyo alimentario 1000 días', 'Paquete de cuidado infantil'],
  },
  {
    clave: 'ADULTOS_MAYORES',
    nombre: 'Atención a Adultos Mayores',
    descripcion:
      'Programa de atención integral a adultos mayores en situación de vulnerabilidad o abandono.',
    nivel: 'municipal',
    categoria: 'Adulto mayor',
    tiposApoyo: ['Apoyo alimentario', 'Kit de abrigo', 'Atención psicológica'],
  },
  {
    clave: 'MEJORAMIENTO_VIVIENDA',
    nombre: 'Mejoramiento de Vivienda',
    descripcion:
      'Apoyo en material de construcción para mejoramiento de vivienda de familias en pobreza.',
    nivel: 'estatal',
    categoria: 'Desarrollo comunitario',
    tiposApoyo: ['Láminas', 'Pintura', 'Material básico de construcción'],
  },
  {
    clave: 'PROYECTOS_PRODUCTIVOS',
    nombre: 'Proyectos Productivos',
    descripcion:
      'Apoyo para el desarrollo de emprendimientos y proyectos productivos en comunidades vulnerables.',
    nivel: 'estatal',
    categoria: 'Desarrollo económico',
    tiposApoyo: ['Apoyo para emprendimiento', 'Paquetes productivos'],
  },
];

export async function seedProgramasDif(app?: any) {
  const shouldClose = !app;
  if (!app) {
    app = await NestFactory.createApplicationContext(AppModule);
  }

  try {
    const programaModel = app.get(
      getModelToken(Programa.name),
    ) as Model<Programa>;

    console.log('🏛️  [08] Seeding Programas DIF...\n');

    let insertados = 0;
    let actualizados = 0;
    let sinCambios = 0;

    for (const programa of PROGRAMAS) {
      const result = await programaModel.updateOne(
        { clave: programa.clave },
        {
          $set: {
            nombre: programa.nombre,
            descripcion: programa.descripcion,
            nivel: programa.nivel,
            categoria: programa.categoria,
            tiposApoyo: programa.tiposApoyo,
            activo: true,
          },
          $setOnInsert: {
            municipioId: null,
            presupuestoAnual: 0,
          },
        },
        { upsert: true },
      );

      if (result.upsertedCount > 0) {
        insertados++;
        console.log(`   ✅ CREADO: ${programa.nombre} [${programa.nivel}]`);
      } else if (result.modifiedCount > 0) {
        actualizados++;
        console.log(`   🔄 ACTUALIZADO: ${programa.nombre}`);
      } else {
        sinCambios++;
        console.log(`   ⏭️  SIN CAMBIOS: ${programa.nombre}`);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ Programas DIF configurados:');
    console.log(`   ✅ Insertados : ${insertados}`);
    console.log(`   🔄 Actualizados: ${actualizados}`);
    console.log(`   ⏭️  Sin cambios : ${sinCambios}`);
    console.log(`   📦 Total       : ${PROGRAMAS.length}`);
    console.log('='.repeat(60) + '\n');

    return { insertados, actualizados, sinCambios, total: PROGRAMAS.length };
  } catch (error) {
    console.error('❌ Error en seed de programas DIF:', error);
    throw error;
  } finally {
    if (shouldClose) {
      await app.close();
    }
  }
}

// Permitir ejecución directa
if (require.main === module) {
  seedProgramasDif();
}
