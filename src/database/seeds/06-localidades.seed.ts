import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';
import { Model } from 'mongoose';
import { getModelToken } from '@nestjs/mongoose';
import { Localidad } from '@/modules/catalogos/schemas/localidad.schema';
import { Municipality } from '@/modules/municipalities/schemas/municipality.schema';

/**
 * Seed 06: Localidades de La Perla, Veracruz
 * 
 * Características:
 * ✅ Idempotente - Puede ejecutarse múltiples veces
 * ✅ Upsert pattern - No duplica registros
 * ✅ Normalizado - Sigue el estándar de los demás seeds
 * 
 * Uso:
 *   npm run seed:localidades
 *   
 * ⚠️ Requisitos:
 *   - El municipio "La Perla" debe existir en la BD
 *   - Ejecutar primero: npm run seed (o seed:initial)
 */
export async function seedLocalidades(appContext?: any) {
  const app = appContext || (await NestFactory.createApplicationContext(AppModule));

  try {
    const localidadModel = app.get(
      getModelToken(Localidad.name),
    ) as Model<Localidad>;
    const municipalityModel = app.get(
      getModelToken(Municipality.name),
    ) as Model<Municipality>;

    console.log('🏘️  [06] Seeding Localidades de La Perla...\n');

    // ==================== BUSCAR MUNICIPIO ====================
    
    const laPerla = await municipalityModel.findOne({ nombre: 'La Perla' });

    if (!laPerla) {
      console.log('⚠️  Municipio "La Perla" no encontrado.');
      console.log('💡 Ejecuta primero: npm run seed (o crea el municipio)\n');
      return {
        insertados: 0,
        actualizados: 0,
        total: 0,
        error: 'Municipio no encontrado',
      };
    }

    console.log(`📍 Municipio: ${laPerla.nombre} (${laPerla._id})\n`);

    // ==================== LOCALIDADES ====================

    const localidadesData = [
      'La Perla',
      'Chilapa',
      'La Ciénaga',
      'Barrio de San Miguel',
      'Metlac Hernández (Metlac Primero)',
      'Tuzantla',
      'Agua Escondida',
      'El Zapote',
      'Cruz de Chocamán',
      'La Lagunilla',
      'Papalotla',
      'Macuilácatl Grande',
      'Villa Hermosa',
      'Cumbre del Español',
      'Metlac Solano (Metlac Segundo)',
      'Tejocote',
      'Chilapilla',
      'La Malvilla',
      'La Cuchilla',
      'La Coyotera',
      'El Lindero',
      'Xometla',
      'Los Fresnos',
      'La Golondrina',
      'San Lorenzo',
      'San Miguel Chinela',
      'Rancho Viejo',
      'San Martín',
      'Los Abeles',
      'El Comal',
      'Tlamanixco Chico',
      'Yerbabuena',
      'El Paso',
      'El Arenal',
      'El Mirador',
      'La Mesa',
      'El Progreso',
      'El Porvenir',
      'El Ocote',
      'El Durazno',
      'El Encino',
      'El Capulín',
      'La Palma',
      'El Carmen',
      'Santa Cruz',
      'San José',
      'San Antonio',
      'La Joya',
      'El Potrero',
    ];

    console.log(`📝 Procesando ${localidadesData.length} localidades...\n`);

    let insertados = 0;
    let actualizados = 0;

    // ==================== UPSERT IDEMPOTENTE ====================

    for (const nombreLocalidad of localidadesData) {
      const result = await localidadModel.updateOne(
        { 
          municipioId: laPerla._id, 
          nombre: nombreLocalidad 
        },
        {
          $set: {
            municipioId: laPerla._id,
            nombre: nombreLocalidad,
            activo: true,
            // Campos opcionales se pueden agregar aquí
            // clave: null,
            // poblacion: null,
            // codigoPostal: null,
          },
        },
        { upsert: true },
      );

      if (result.upsertedCount > 0) {
        console.log(`✅ CREADO     - ${nombreLocalidad}`);
        insertados++;
      } else if (result.modifiedCount > 0) {
        console.log(`🔄 ACTUALIZADO - ${nombreLocalidad}`);
        actualizados++;
      } else {
        console.log(`⏭️  SIN CAMBIOS - ${nombreLocalidad}`);
      }
    }

    console.log('\n' + '-'.repeat(60));
    console.log('📊 Resumen del Seed 06 - Localidades');
    console.log('-'.repeat(60));
    console.log(`✅ Insertados:     ${insertados}`);
    console.log(`🔄 Actualizados:   ${actualizados}`);
    console.log(`⏭️  Sin cambios:    ${localidadesData.length - insertados - actualizados}`);
    console.log(`📍 Total:          ${localidadesData.length}`);
    console.log(`🗂️  Municipio:      ${laPerla.nombre}`);
    console.log('-'.repeat(60) + '\n');

    return {
      insertados,
      actualizados,
      total: localidadesData.length,
      municipio: laPerla.nombre,
    };
  } catch (error) {
    console.error('\n❌ Error en Seed 06 - Localidades:', error.message);
    throw error;
  } finally {
    if (!appContext) {
      await app.close();
    }
  }
}

// Ejecución standalone
if (require.main === module) {
  seedLocalidades()
    .then(() => {
      console.log('✅ Seed 06 completado\n');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error fatal:', error);
      process.exit(1);
    });
}
