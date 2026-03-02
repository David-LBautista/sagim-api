import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';
import { Model } from 'mongoose';
import { getModelToken } from '@nestjs/mongoose';
import { ServicioCobro } from '@/modules/tesoreria/schemas/servicio-cobro.schema';

/**
 * Seed 09: Catálogo base de servicios cobrables municipales
 * Municipio: Veracruz, México — montos referenciales
 * municipioId = null → catálogo global, disponible para todos los municipios
 * Idempotente: usa upsert por clave
 */

interface ServicioCobrable {
  clave: string;
  nombre: string;
  descripcion: string;
  categoria: string;
  costo: number;
  montoVariable: boolean;
  requiereContribuyente: boolean;
  orden: number;
}

const SERVICIOS: ServicioCobrable[] = [
  // ── REGISTRO CIVIL ──────────────────────────────────────────────────
  {
    clave: 'ACTA_NACIMIENTO',
    nombre: 'Acta de Nacimiento',
    descripcion: 'Expedición de copia certificada de acta de nacimiento',
    categoria: 'Registro Civil',
    costo: 50,
    montoVariable: false,
    requiereContribuyente: false,
    orden: 1,
  },
  {
    clave: 'ACTA_MATRIMONIO',
    nombre: 'Acta de Matrimonio',
    descripcion: 'Expedición de copia certificada de acta de matrimonio',
    categoria: 'Registro Civil',
    costo: 80,
    montoVariable: false,
    requiereContribuyente: false,
    orden: 2,
  },
  {
    clave: 'ACTA_DEFUNCION',
    nombre: 'Acta de Defunción',
    descripcion: 'Expedición de copia certificada de acta de defunción',
    categoria: 'Registro Civil',
    costo: 50,
    montoVariable: false,
    requiereContribuyente: false,
    orden: 3,
  },
  {
    clave: 'ACTA_DIVORCIO',
    nombre: 'Acta de Divorcio',
    descripcion: 'Expedición de copia certificada de acta de divorcio',
    categoria: 'Registro Civil',
    costo: 80,
    montoVariable: false,
    requiereContribuyente: false,
    orden: 4,
  },
  {
    clave: 'CONSTANCIA_SOLTERIA',
    nombre: 'Constancia de Soltería',
    descripcion: 'Expedición de constancia de estado civil soltero',
    categoria: 'Registro Civil',
    costo: 100,
    montoVariable: false,
    requiereContribuyente: false,
    orden: 5,
  },
  {
    clave: 'RECTIFICACION_ACTA',
    nombre: 'Rectificación de Acta',
    descripcion: 'Trámite de rectificación de datos en acta del registro civil',
    categoria: 'Registro Civil',
    costo: 300,
    montoVariable: true,
    requiereContribuyente: false,
    orden: 6,
  },

  // ── PREDIAL ──────────────────────────────────────────────────────────
  {
    clave: 'PAGO_PREDIAL',
    nombre: 'Pago de Predial',
    descripcion: 'Pago anual del impuesto predial',
    categoria: 'Predial',
    costo: 0,
    montoVariable: true,
    requiereContribuyente: true,
    orden: 7,
  },
  {
    clave: 'PREDIAL_PRONTO_PAGO',
    nombre: 'Predial con Descuento Pronto Pago',
    descripcion: 'Pago de predial con descuento por pago en enero o febrero',
    categoria: 'Predial',
    costo: 0,
    montoVariable: true,
    requiereContribuyente: true,
    orden: 8,
  },
  {
    clave: 'REZAGO_PREDIAL',
    nombre: 'Rezago de Predial',
    descripcion: 'Pago de adeudos de predial de años anteriores',
    categoria: 'Predial',
    costo: 0,
    montoVariable: true,
    requiereContribuyente: true,
    orden: 9,
  },
  {
    clave: 'CERT_NO_ADEUDO_PREDIAL',
    nombre: 'Certificado de No Adeudo Predial',
    descripcion: 'Expedición de certificado de no adeudo de impuesto predial',
    categoria: 'Predial',
    costo: 150,
    montoVariable: false,
    requiereContribuyente: true,
    orden: 10,
  },

  // ── AGUA Y SANEAMIENTO ───────────────────────────────────────────────
  {
    clave: 'PAGO_AGUA',
    nombre: 'Pago de Agua Potable',
    descripcion: 'Pago de servicio de agua potable',
    categoria: 'Agua y Saneamiento',
    costo: 0,
    montoVariable: true,
    requiereContribuyente: true,
    orden: 11,
  },
  {
    clave: 'RECONEXION_AGUA',
    nombre: 'Reconexión de Servicio de Agua',
    descripcion: 'Reconexión de toma de agua suspendida por falta de pago',
    categoria: 'Agua y Saneamiento',
    costo: 250,
    montoVariable: false,
    requiereContribuyente: true,
    orden: 12,
  },
  {
    clave: 'INSTALACION_TOMA_AGUA',
    nombre: 'Instalación de Toma de Agua',
    descripcion: 'Instalación de nueva toma de agua potable',
    categoria: 'Agua y Saneamiento',
    costo: 1500,
    montoVariable: true,
    requiereContribuyente: true,
    orden: 13,
  },
  {
    clave: 'CERT_NO_ADEUDO_AGUA',
    nombre: 'Certificado de No Adeudo Agua',
    descripcion: 'Expedición de certificado de no adeudo de servicio de agua',
    categoria: 'Agua y Saneamiento',
    costo: 100,
    montoVariable: false,
    requiereContribuyente: true,
    orden: 14,
  },

  // ── LICENCIAS Y PERMISOS ─────────────────────────────────────────────
  {
    clave: 'LICENCIA_FUNCIONAMIENTO',
    nombre: 'Licencia de Funcionamiento',
    descripcion: 'Expedición de licencia de funcionamiento para negocio',
    categoria: 'Licencias y Permisos',
    costo: 500,
    montoVariable: true,
    requiereContribuyente: false,
    orden: 15,
  },
  {
    clave: 'RENOVACION_LICENCIA',
    nombre: 'Renovación de Licencia de Funcionamiento',
    descripcion: 'Renovación anual de licencia de funcionamiento',
    categoria: 'Licencias y Permisos',
    costo: 350,
    montoVariable: true,
    requiereContribuyente: false,
    orden: 16,
  },
  {
    clave: 'PERMISO_ANUNCIO',
    nombre: 'Permiso de Anuncio Publicitario',
    descripcion: 'Permiso para instalación de anuncio publicitario',
    categoria: 'Licencias y Permisos',
    costo: 400,
    montoVariable: true,
    requiereContribuyente: false,
    orden: 17,
  },
  {
    clave: 'PERMISO_USO_SUELO',
    nombre: 'Permiso de Uso de Suelo',
    descripcion: 'Constancia de uso de suelo permitido',
    categoria: 'Licencias y Permisos',
    costo: 300,
    montoVariable: false,
    requiereContribuyente: false,
    orden: 18,
  },
  {
    clave: 'PERMISO_CONSTRUCCION',
    nombre: 'Permiso de Construcción',
    descripcion:
      'Permiso para construcción o remodelación de inmueble (varía según m²)',
    categoria: 'Licencias y Permisos',
    costo: 0,
    montoVariable: true,
    requiereContribuyente: false,
    orden: 19,
  },
  {
    clave: 'PERMISO_SUBDIVISION',
    nombre: 'Permiso de Subdivisión',
    descripcion: 'Permiso para subdivisión de terreno',
    categoria: 'Licencias y Permisos',
    costo: 800,
    montoVariable: true,
    requiereContribuyente: false,
    orden: 20,
  },

  // ── SERVICIOS URBANOS ────────────────────────────────────────────────
  {
    clave: 'PAGO_RECOLECCION_BASURA',
    nombre: 'Pago de Recolección de Basura',
    descripcion: 'Pago anual del servicio de recolección de basura',
    categoria: 'Servicios Urbanos',
    costo: 200,
    montoVariable: false,
    requiereContribuyente: true,
    orden: 21,
  },
  {
    clave: 'LIMPIA_TERRENO_BALDIO',
    nombre: 'Limpia de Terreno Baldío',
    descripcion:
      'Servicio municipal de limpia de terreno baldío (varía según tamaño)',
    categoria: 'Servicios Urbanos',
    costo: 0,
    montoVariable: true,
    requiereContribuyente: false,
    orden: 22,
  },

  // ── PANTEÓN ──────────────────────────────────────────────────────────
  {
    clave: 'COMPRA_FOSA',
    nombre: 'Compra de Fosa',
    descripcion: 'Adquisición de fosa en panteón municipal',
    categoria: 'Panteón',
    costo: 2000,
    montoVariable: true,
    requiereContribuyente: false,
    orden: 23,
  },
  {
    clave: 'PERMISO_INHUMACION',
    nombre: 'Permiso de Inhumación',
    descripcion: 'Permiso para inhumación en panteón municipal',
    categoria: 'Panteón',
    costo: 300,
    montoVariable: false,
    requiereContribuyente: false,
    orden: 24,
  },
  {
    clave: 'PERMISO_EXHUMACION',
    nombre: 'Permiso de Exhumación',
    descripcion: 'Permiso para exhumación de restos en panteón municipal',
    categoria: 'Panteón',
    costo: 500,
    montoVariable: false,
    requiereContribuyente: false,
    orden: 25,
  },
  {
    clave: 'MANTENIMIENTO_FOSA',
    nombre: 'Mantenimiento de Fosa',
    descripcion: 'Servicio de mantenimiento y limpieza de fosa',
    categoria: 'Panteón',
    costo: 150,
    montoVariable: false,
    requiereContribuyente: false,
    orden: 26,
  },

  // ── CONSTANCIAS ──────────────────────────────────────────────────────
  {
    clave: 'CONSTANCIA_RESIDENCIA',
    nombre: 'Constancia de Residencia',
    descripcion: 'Expedición de constancia de residencia en el municipio',
    categoria: 'Constancias',
    costo: 50,
    montoVariable: false,
    requiereContribuyente: false,
    orden: 27,
  },
  {
    clave: 'CONSTANCIA_INGRESOS',
    nombre: 'Constancia de Ingresos',
    descripcion: 'Expedición de constancia de ingresos',
    categoria: 'Constancias',
    costo: 80,
    montoVariable: false,
    requiereContribuyente: false,
    orden: 28,
  },
  {
    clave: 'CERT_VECINDAD',
    nombre: 'Certificado de Vecindad',
    descripcion: 'Expedición de certificado de vecindad',
    categoria: 'Constancias',
    costo: 50,
    montoVariable: false,
    requiereContribuyente: false,
    orden: 29,
  },
  {
    clave: 'COPIAS_CERTIFICADAS',
    nombre: 'Copias Certificadas',
    descripcion: 'Expedición de copias certificadas de documentos municipales',
    categoria: 'Constancias',
    costo: 30,
    montoVariable: false,
    requiereContribuyente: false,
    orden: 30,
  },
];

export const CATEGORIAS_SERVICIOS = [
  'Registro Civil',
  'Predial',
  'Agua y Saneamiento',
  'Licencias y Permisos',
  'Servicios Urbanos',
  'Panteón',
  'Constancias',
] as const;

export async function seedTesoreriaServicios(app?: any) {
  const shouldClose = !app;
  if (!app) {
    app = await NestFactory.createApplicationContext(AppModule);
  }

  try {
    const servicioModel = app.get(
      getModelToken(ServicioCobro.name),
    ) as Model<ServicioCobro>;

    console.log('🏦 [09] Seeding Servicios Cobrables de Tesorería...\n');

    let insertados = 0;
    let actualizados = 0;
    let sinCambios = 0;

    for (const servicio of SERVICIOS) {
      const result = await servicioModel.updateOne(
        { clave: servicio.clave },
        {
          $set: {
            nombre: servicio.nombre,
            descripcion: servicio.descripcion,
            categoria: servicio.categoria,
            costo: servicio.costo,
            montoVariable: servicio.montoVariable,
            requiereContribuyente: servicio.requiereContribuyente,
            orden: servicio.orden,
            activo: true,
          },
          $setOnInsert: {
            municipioId: null,
          },
        },
        { upsert: true },
      );

      if (result.upsertedCount > 0) {
        insertados++;
        console.log(`   ✅ CREADO: [${servicio.categoria}] ${servicio.nombre}`);
      } else if (result.modifiedCount > 0) {
        actualizados++;
        console.log(`   🔄 ACTUALIZADO: ${servicio.nombre}`);
      } else {
        sinCambios++;
        console.log(`   ⏭️  SIN CAMBIOS: ${servicio.nombre}`);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ Servicios cobrables configurados:');
    console.log(`   ✅ Insertados : ${insertados}`);
    console.log(`   🔄 Actualizados: ${actualizados}`);
    console.log(`   ⏭️  Sin cambios : ${sinCambios}`);
    console.log(`   📦 Total       : ${SERVICIOS.length}`);
    console.log('='.repeat(60) + '\n');

    return { insertados, actualizados, sinCambios, total: SERVICIOS.length };
  } catch (error) {
    console.error('❌ Error en seed de servicios de tesorería:', error);
    throw error;
  } finally {
    if (shouldClose) {
      await app.close();
    }
  }
}

// Permitir ejecución directa: npx ts-node -r tsconfig-paths/register src/database/seeds/09-tesoreria-servicios.seed.ts
if (require.main === module) {
  seedTesoreriaServicios();
}
