/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';
import * as bcrypt from 'bcrypt';
import { getModelToken } from '@nestjs/mongoose';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);

  // Obtener modelos
  const MunicipalityModel = app.get(getModelToken('Municipality'));
  const UserModel = app.get(getModelToken('User'));
  const CiudadanoModel = app.get(getModelToken('Ciudadano'));
  const ReporteModel = app.get(getModelToken('Reporte'));

  console.log('🌱 Iniciando seed de datos de prueba...\n');

  try {
    // 0️⃣ LIMPIAR DATOS EXISTENTES
    console.log('🧹 Limpiando datos existentes de "La Perla"...');
    const existingMunicipio = await MunicipalityModel.findOne({
      nombre: 'La Perla',
    });

    if (existingMunicipio) {
      // Delete related data
      await ReporteModel.deleteMany({ municipioId: existingMunicipio._id });
      await CiudadanoModel.deleteMany({ municipioId: existingMunicipio._id });
      await UserModel.deleteMany({ municipioId: existingMunicipio._id });
      await MunicipalityModel.deleteOne({ _id: existingMunicipio._id });
      console.log('✅ Datos existentes eliminados\n');
    } else {
      console.log('✅ No hay datos existentes\n');
    }

    // Also clean up any orphaned reportes with null folio
    await ReporteModel.deleteMany({ folio: null });
    console.log('✅ Reportes huérfanos eliminados\n');

    // 1️⃣ CREAR MUNICIPIO
    console.log('📍 Creando municipio...');
    const municipio = await MunicipalityModel.create({
      nombre: 'La Perla',
      estado: 'Veracruz',
      clave: 'LA_PERLA',
      claveInegi: '30092',
      poblacion: 15000,
      activo: true,
      config: {
        modulos: {
          dif: true,
          predial: false,
          catastro: true,
          reportes: true,
          citas: false,
        },
        stripe: {
          accountId: '',
          enabled: true,
        },
        features: {
          mfa: false,
          whatsappNotifications: false,
        },
      },
      contactoEmail: 'contacto@laperla.gob.mx',
      contactoTelefono: '228-123-4567',
      direccion: 'Palacio Municipal s/n, Centro, La Perla, Veracruz',
    });
    console.log(
      `✅ Municipio creado: ${municipio.nombre} (${municipio._id})\n`,
    );

    // 2️⃣ CREAR USUARIOS POR DEPARTAMENTO
    console.log('👥 Creando usuarios...');
    const passwordHash = await bcrypt.hash('Password123!', 10);

    const usuarios = [
      {
        nombre: 'SAGIM Super Admin',
        email: 'superadmin@sagim.mx',
        password: passwordHash,
        rol: 'SUPER_ADMIN',
        municipioId: municipio._id,
        activo: true,
      },
      {
        nombre: 'Admin Municipal',
        email: 'admin@laperla.gob.mx',
        password: passwordHash,
        rol: 'ADMIN',
        municipioId: municipio._id,
        activo: true,
      },
      {
        nombre: 'Juan Pérez',
        email: 'tesoreria@laperla.gob.mx',
        password: passwordHash,
        rol: 'TESORERIA',
        municipioId: municipio._id,
        activo: true,
      },
      {
        nombre: 'María González',
        email: 'dif@laperla.gob.mx',
        password: passwordHash,
        rol: 'DIF',
        municipioId: municipio._id,
        activo: true,
      },
      {
        nombre: 'Carlos Hernández',
        email: 'catastro@laperla.gob.mx',
        password: passwordHash,
        rol: 'CATASTRO',
        municipioId: municipio._id,
        activo: true,
      },
      {
        nombre: 'Presidente Municipal',
        email: 'presidente@laperla.gob.mx',
        password: passwordHash,
        rol: 'PRESIDENTE',
        municipioId: municipio._id,
        activo: true,
      },
    ];

    const usuariosCreados = await UserModel.insertMany(usuarios);
    console.log(`✅ ${usuariosCreados.length} usuarios creados:`);
    usuariosCreados.forEach((u) => console.log(`   - ${u.email} (${u.rol})`));
    console.log('');

    // 3️⃣ CREAR CIUDADANOS
    console.log('🧑 Creando ciudadanos...');
    const ciudadanos = [
      {
        nombre: 'Roberto',
        apellidoPaterno: 'Martínez',
        apellidoMaterno: 'López',
        curp: 'MALR850315HVZRPB01',
        telefono: '2281234567',
        email: 'roberto.martinez@gmail.com',
        domicilio: 'Calle Hidalgo #123, La Perla',
        localidad: 'Cabecera Municipal',
        municipioId: municipio._id,
        verificado: true,
      },
      {
        nombre: 'Ana',
        apellidoPaterno: 'Sánchez',
        apellidoMaterno: 'Rivera',
        curp: 'SARA920820MVZNNN08',
        telefono: '2289876543',
        email: 'ana.sanchez@hotmail.com',
        domicilio: 'Av. Juárez #456, La Perla',
        localidad: 'Cabecera Municipal',
        municipioId: municipio._id,
        verificado: true,
      },
      {
        nombre: 'Luis',
        apellidoPaterno: 'Torres',
        apellidoMaterno: 'García',
        curp: 'TOGL780505HVERRS02',
        telefono: '2285551234',
        email: 'luis.torres@outlook.com',
        domicilio: 'Calle 5 de Mayo #789, Ranchería',
        localidad: 'San Miguel Pilancón',
        municipioId: municipio._id,
        verificado: false,
      },
    ];

    const ciudadanosCreados = await CiudadanoModel.insertMany(ciudadanos);
    console.log(`✅ ${ciudadanosCreados.length} ciudadanos creados:`);
    ciudadanosCreados.forEach((c) =>
      console.log(`   - ${c.nombre} ${c.apellidoPaterno} (${c.email})`),
    );
    console.log('');

    // 4️⃣ CREAR REPORTES
    console.log('📋 Creando reportes...');
    const reportes = [
      {
        municipioId: municipio._id,
        tipo: 'BACHE',
        descripcion: 'Bache grande en la calle Hidalgo esquina con Morelos',
        ubicacion: {
          direccion: 'Calle Hidalgo #200',
          coordenadas: {
            latitud: 19.1738,
            longitud: -96.1342,
          },
        },
        estado: 'PENDIENTE',
        folio: `REP-2601-${Math.floor(1000 + Math.random() * 9000)}`,
      },
      {
        municipioId: municipio._id,
        tipo: 'ALUMBRADO',
        descripcion: 'Poste sin luz en Av. Juárez',
        ubicacion: {
          direccion: 'Av. Juárez #500',
          coordenadas: {
            latitud: 19.1745,
            longitud: -96.1355,
          },
        },
        estado: 'EN_PROCESO',
        folio: `REP-2601-${Math.floor(1000 + Math.random() * 9000)}`,
      },
      {
        municipioId: municipio._id,
        tipo: 'BASURA',
        descripcion: 'Acumulación de basura en la esquina',
        ubicacion: {
          direccion: 'Calle 5 de Mayo #100',
          coordenadas: {
            latitud: 19.172,
            longitud: -96.133,
          },
        },
        estado: 'PENDIENTE',
        folio: `REP-2601-${Math.floor(1000 + Math.random() * 9000)}`,
      },
      {
        municipioId: municipio._id,
        tipo: 'AGUA',
        descripcion: 'Fuga de agua en la calle principal',
        ubicacion: {
          direccion: 'Calle Principal s/n',
          coordenadas: {
            latitud: 19.175,
            longitud: -96.136,
          },
        },
        estado: 'ATENDIDO',
        folio: `REP-2601-${Math.floor(1000 + Math.random() * 9000)}`,
        comentario: 'Reparación realizada por Obras Públicas',
        fechaAtencion: new Date('2026-01-25'),
      },
      {
        municipioId: municipio._id,
        tipo: 'OTRO',
        descripcion: 'Árbol caído bloqueando la calle',
        ubicacion: {
          direccion: 'Calle Independencia #300',
          coordenadas: {
            latitud: 19.1755,
            longitud: -96.1365,
          },
        },
        estado: 'EN_PROCESO',
        folio: `REP-2601-${Math.floor(1000 + Math.random() * 9000)}`,
      },
    ];

    const reportesCreados = await ReporteModel.insertMany(reportes);
    console.log(`✅ ${reportesCreados.length} reportes creados:`);
    reportesCreados.forEach((r) =>
      console.log(
        `   - ${r.tipo}: ${r.descripcion.substring(0, 40)}... (${r.estado})`,
      ),
    );
    console.log('');

    // ✅ RESUMEN FINAL
    console.log('🎉 Seed completado exitosamente!\n');
    console.log('📊 RESUMEN:');
    console.log(`   - Municipio: ${municipio.nombre}`);
    console.log(`   - Usuarios: ${usuariosCreados.length}`);
    console.log(`   - Ciudadanos: ${ciudadanosCreados.length}`);
    console.log(`   - Reportes: ${reportesCreados.length}\n`);

    console.log('🔑 CREDENCIALES DE ACCESO:');
    console.log('   Email: superadmin@sagim.mx (SUPER_ADMIN)');
    console.log('   Email: admin@laperla.gob.mx (ADMIN)');
    console.log('   Email: tesoreria@laperla.gob.mx (TESORERIA)');
    console.log('   Email: dif@laperla.gob.mx (DIF)');
    console.log('   Email: catastro@laperla.gob.mx (CATASTRO)');
    console.log('   Email: presidente@laperla.gob.mx (PRESIDENTE)');
    console.log('   Password: Password123!\n');
  } catch (error) {
    console.error('❌ Error en el seed:', error);
  } finally {
    await app.close();
  }
}

bootstrap();
