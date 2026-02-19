import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';
import { Model, Types } from 'mongoose';
import { getModelToken } from '@nestjs/mongoose';
import * as bcrypt from 'bcrypt';
import { User, UserDocument } from '../../modules/users/schemas/user.schema';
import {
  Municipality,
  MunicipalityDocument,
} from '../../modules/municipalities/schemas/municipality.schema';
import {
  Programa,
  ProgramaDocument,
} from '../../modules/dif/schemas/programa.schema';
import {
  Beneficiario,
  BeneficiarioDocument,
} from '../../modules/dif/schemas/beneficiario.schema';
import {
  Inventario,
  InventarioDocument,
} from '../../modules/dif/schemas/inventario.schema';
import { Apoyo, ApoyoDocument } from '../../modules/dif/schemas/apoyo.schema';
import {
  MovimientoInventario,
  MovimientoInventarioDocument,
} from '../../modules/dif/schemas/movimiento-inventario.schema';
import {
  Reporte,
  ReporteDocument,
} from '../../modules/reportes/schemas/reporte.schema';
import {
  Ciudadano,
  CiudadanoDocument,
} from '../../modules/ciudadanos/schemas/ciudadano.schema';
import {
  Predio,
  PredioDocument,
} from '../../modules/catastro/schemas/predio.schema';
import { Cita, CitaDocument } from '../../modules/catastro/schemas/cita.schema';
import {
  OrdenPago,
  OrdenPagoDocument,
} from '../../modules/pagos/schemas/orden-pago.schema';
import { Pago, PagoDocument } from '../../modules/pagos/schemas/pago.schema';
import {
  ServicioCobro,
  ServicioCobroDocument,
} from '../../modules/tesoreria/schemas/servicio-cobro.schema';
import {
  AuditLog,
  AuditLogDocument,
} from '../../modules/auditoria/schemas/audit-log.schema';
import {
  Modulo,
  ModuloDocument,
} from '../../modules/modulos/schemas/modulo.schema';
import {
  Estado,
  EstadoDocument,
} from '../../modules/catalogos/schemas/estado.schema';
import {
  MunicipioCatalogo,
  MunicipioCatalogoDocument,
} from '../../modules/catalogos/schemas/municipio-catalogo.schema';
import { Rol, RolDocument } from '../../modules/catalogos/schemas/rol.schema';
import { UserRole } from '../../shared/enums';

async function seed() {
  console.log('🌱 Iniciando seed de datos...');

  const app = await NestFactory.createApplicationContext(AppModule);

  // Obtener todos los modelos
  const userModel = app.get<Model<UserDocument>>(getModelToken(User.name));
  const municipalityModel = app.get<Model<MunicipalityDocument>>(
    getModelToken(Municipality.name),
  );
  const programaModel = app.get<Model<ProgramaDocument>>(
    getModelToken(Programa.name),
  );
  const beneficiarioModel = app.get<Model<BeneficiarioDocument>>(
    getModelToken(Beneficiario.name),
  );
  const inventarioModel = app.get<Model<InventarioDocument>>(
    getModelToken(Inventario.name),
  );
  const apoyoModel = app.get<Model<ApoyoDocument>>(getModelToken(Apoyo.name));
  const movimientoInventarioModel = app.get<
    Model<MovimientoInventarioDocument>
  >(getModelToken(MovimientoInventario.name));
  const reporteModel = app.get<Model<ReporteDocument>>(
    getModelToken(Reporte.name),
  );
  const ciudadanoModel = app.get<Model<CiudadanoDocument>>(
    getModelToken(Ciudadano.name),
  );
  const predioModel = app.get<Model<PredioDocument>>(
    getModelToken(Predio.name),
  );
  const citaModel = app.get<Model<CitaDocument>>(getModelToken(Cita.name));
  const ordenPagoModel = app.get<Model<OrdenPagoDocument>>(
    getModelToken(OrdenPago.name),
  );
  const pagoModel = app.get<Model<PagoDocument>>(getModelToken(Pago.name));
  const servicioCobroModel = app.get<Model<ServicioCobroDocument>>(
    getModelToken(ServicioCobro.name),
  );
  const auditLogModel = app.get<Model<AuditLogDocument>>(
    getModelToken(AuditLog.name),
  );
  const moduloModel = app.get<Model<ModuloDocument>>(
    getModelToken(Modulo.name),
  );
  const estadoModel = app.get<Model<EstadoDocument>>(
    getModelToken(Estado.name),
  );
  const municipioCatalogoModel = app.get<Model<MunicipioCatalogoDocument>>(
    getModelToken(MunicipioCatalogo.name),
  );
  const rolModel = app.get<Model<RolDocument>>(getModelToken(Rol.name));

  try {
    console.log('🗑️  Limpiando base de datos...');

    // Vaciar todas las colecciones
    await Promise.all([
      auditLogModel.deleteMany({}),
      pagoModel.deleteMany({}),
      ordenPagoModel.deleteMany({}),
      servicioCobroModel.deleteMany({}),
      citaModel.deleteMany({}),
      predioModel.deleteMany({}),
      movimientoInventarioModel.deleteMany({}),
      apoyoModel.deleteMany({}),
      inventarioModel.deleteMany({}),
      beneficiarioModel.deleteMany({}),
      programaModel.deleteMany({}),
      reporteModel.deleteMany({}),
      ciudadanoModel.deleteMany({}),
      userModel.deleteMany({}),
      municipalityModel.deleteMany({}),
      moduloModel.deleteMany({}),
      estadoModel.deleteMany({}),
      municipioCatalogoModel.deleteMany({}),
      rolModel.deleteMany({}),
    ]);

    console.log('✅ Base de datos limpiada completamente');

    // Crear roles del sistema
    const roles = [
      {
        nombre: 'SUPER_ADMIN',
        descripcion:
          'Administrador global del sistema SAGIM con acceso completo a todos los municipios y módulos',
        activo: true,
      },
      {
        nombre: 'ADMIN_MUNICIPIO',
        descripcion:
          'Administrador municipal con acceso completo a todos los módulos de su municipio',
        activo: true,
      },
      {
        nombre: 'OPERATIVO',
        descripcion:
          'Usuario operativo con acceso limitado a un módulo específico de su municipio',
        activo: true,
      },
    ];

    await rolModel.insertMany(roles);

    console.log('✅ Roles del sistema creados (3 roles)');

    const hashedPassword = await bcrypt.hash('SuperAdmin123!', 10);

    await userModel.create({
      nombre: 'David Lucas Bautista',
      email: 'superadmin@sagim.mx',
      password: hashedPassword,
      rol: UserRole.SUPER_ADMIN,
      activo: true,
      telefono: '2721010707',
    });

    console.log('✅ Super Admin creado');

    // Crear módulos del sistema
    const modulos = [
      {
        nombre: 'PRESIDENCIA',
        descripcion: 'Módulo de Presidencia Municipal',
        activo: true,
      },
      {
        nombre: 'SECRETARIA_AYUNTAMIENTO',
        descripcion: 'Módulo de Secretaría del Ayuntamiento',
        activo: true,
      },
      {
        nombre: 'COMUNICACION_SOCIAL',
        descripcion: 'Módulo de Comunicación Social',
        activo: true,
      },
      {
        nombre: 'UIPPE',
        descripcion:
          'Módulo de Unidad de Información, Planeación, Programación y Evaluación',
        activo: true,
      },
      {
        nombre: 'CONTRALORIA',
        descripcion: 'Módulo de Contraloría Municipal',
        activo: true,
      },
      {
        nombre: 'SEGURIDAD_PUBLICA',
        descripcion: 'Módulo de Seguridad Pública',
        activo: true,
      },
      {
        nombre: 'SERVICIOS_PUBLICOS',
        descripcion: 'Módulo de Servicios Públicos',
        activo: true,
      },
      {
        nombre: 'DESARROLLO_URBANO',
        descripcion: 'Módulo de Desarrollo Urbano',
        activo: true,
      },
      {
        nombre: 'DESARROLLO_ECONOMICO',
        descripcion: 'Módulo de Desarrollo Económico',
        activo: true,
      },
      {
        nombre: 'DESARROLLO_SOCIAL',
        descripcion: 'Módulo de Desarrollo Social',
        activo: true,
      },
      {
        nombre: 'TESORERIA',
        descripcion: 'Módulo de Tesorería Municipal',
        activo: true,
      },
      {
        nombre: 'DIF',
        descripcion: 'Módulo de Sistema DIF Municipal',
        activo: true,
      },
      {
        nombre: 'ORGANISMO_AGUA',
        descripcion: 'Módulo de Organismo Operador de Agua',
        activo: true,
      },
      {
        nombre: 'USUARIOS',
        descripcion: 'Módulo de Gestión de Usuarios',
        activo: true,
      },
      {
        nombre: 'MUNICIPIOS',
        descripcion: 'Módulo de Gestión de Municipios',
        activo: true,
      },
      {
        nombre: 'REPORTES',
        descripcion: 'Módulo de Reportes Ciudadanos',
        activo: true,
      },
      {
        nombre: 'CITAS',
        descripcion: 'Módulo de Gestión de Citas',
        activo: true,
      },
    ];

    await moduloModel.insertMany(modulos);

    console.log('✅ Módulos del sistema creados');

    // Crear catálogo de estados de la República Mexicana
    const estados = [
      { clave: 'AGS', nombre: 'Aguascalientes', activo: true },
      { clave: 'BC', nombre: 'Baja California', activo: true },
      { clave: 'BCS', nombre: 'Baja California Sur', activo: true },
      { clave: 'CAM', nombre: 'Campeche', activo: true },
      { clave: 'CHIS', nombre: 'Chiapas', activo: true },
      { clave: 'CHIH', nombre: 'Chihuahua', activo: true },
      { clave: 'CDMX', nombre: 'Ciudad de México', activo: true },
      { clave: 'COAH', nombre: 'Coahuila', activo: true },
      { clave: 'COL', nombre: 'Colima', activo: true },
      { clave: 'DGO', nombre: 'Durango', activo: true },
      { clave: 'GTO', nombre: 'Guanajuato', activo: true },
      { clave: 'GRO', nombre: 'Guerrero', activo: true },
      { clave: 'HGO', nombre: 'Hidalgo', activo: true },
      { clave: 'JAL', nombre: 'Jalisco', activo: true },
      { clave: 'MEX', nombre: 'México', activo: true },
      { clave: 'MICH', nombre: 'Michoacán', activo: true },
      { clave: 'MOR', nombre: 'Morelos', activo: true },
      { clave: 'NAY', nombre: 'Nayarit', activo: true },
      { clave: 'NL', nombre: 'Nuevo León', activo: true },
      { clave: 'OAX', nombre: 'Oaxaca', activo: true },
      { clave: 'PUE', nombre: 'Puebla', activo: true },
      { clave: 'QRO', nombre: 'Querétaro', activo: true },
      { clave: 'QROO', nombre: 'Quintana Roo', activo: true },
      { clave: 'SLP', nombre: 'San Luis Potosí', activo: true },
      { clave: 'SIN', nombre: 'Sinaloa', activo: true },
      { clave: 'SON', nombre: 'Sonora', activo: true },
      { clave: 'TAB', nombre: 'Tabasco', activo: true },
      { clave: 'TAMPS', nombre: 'Tamaulipas', activo: true },
      { clave: 'TLAX', nombre: 'Tlaxcala', activo: true },
      { clave: 'VER', nombre: 'Veracruz', activo: true },
      { clave: 'YUC', nombre: 'Yucatán', activo: true },
      { clave: 'ZAC', nombre: 'Zacatecas', activo: true },
    ];

    const estadosCreados = await estadoModel.insertMany(estados);

    console.log('✅ Catálogo de estados creado (32 estados)');

    // Obtener el ObjectId de Veracruz para los municipios
    const veracruzEstado = estadosCreados.find((e) => e.clave === 'VER');

    if (!veracruzEstado) {
      throw new Error('Estado de Veracruz no encontrado');
    }

    // Crear catálogo de municipios de Veracruz
    const municipiosVeracruz = [
      { nombre: 'Acajete', poblacion: 9701 },
      { nombre: 'Acatlán', poblacion: 3441 },
      { nombre: 'Acayucan', poblacion: 80815 },
      { nombre: 'Actopan', poblacion: 41742 },
      { nombre: 'Acula', poblacion: 5253 },
      { nombre: 'Acultzingo', poblacion: 23100 },
      { nombre: 'Agua Dulce', poblacion: 44104 },
      { nombre: 'Álamo Temapache', poblacion: 107270 },
      { nombre: 'Alpatláhuac', poblacion: 10338 },
      { nombre: 'Alto Lucero de Gutiérrez Barrios', poblacion: 29432 },
      { nombre: 'Altotonga', poblacion: 61565 },
      { nombre: 'Alvarado', poblacion: 57035 },
      { nombre: 'Amatitlán', poblacion: 12000 },
      { nombre: 'Naranjos Amatlán', poblacion: 75933 },
      { nombre: 'Amatlán de los Reyes', poblacion: 25000 },
      { nombre: 'Ángel R. Cabada', poblacion: 27219 },
      { nombre: 'La Antigua', poblacion: 23916 },
      { nombre: 'Apazapan', poblacion: 10342 },
      { nombre: 'Aquila', poblacion: 1978 },
      { nombre: 'Astacinga', poblacion: 4823 },
      { nombre: 'Atlahuilco', poblacion: 8969 },
      { nombre: 'Atoyac', poblacion: 45312 },
      { nombre: 'Atzacan', poblacion: 15847 },
      { nombre: 'Atzalan', poblacion: 16048 },
      { nombre: 'Tlaltetela', poblacion: 36181 },
      { nombre: 'Ayahualulco', poblacion: 20678 },
      { nombre: 'Banderilla', poblacion: 47219 },
      { nombre: 'Benito Juárez', poblacion: 12543 },
      { nombre: 'Boca del Río', poblacion: 144550 },
      { nombre: 'Calcahualco', poblacion: 17229 },
      { nombre: 'Camerino Z. Mendoza', poblacion: 51105 },
      { nombre: 'Carrillo Puerto', poblacion: 9753 },
      { nombre: 'Catemaco', poblacion: 55477 },
      { nombre: 'Cazones de Herrera', poblacion: 24421 },
      { nombre: 'Cerro Azul', poblacion: 42210 },
      { nombre: 'Citlaltépetl', poblacion: 8093 },
      { nombre: 'Coacoatzintla', poblacion: 10254 },
      { nombre: 'Coahuitlán', poblacion: 10216 },
      { nombre: 'Coatepec', poblacion: 119012 },
      { nombre: 'Coatzacoalcos', poblacion: 310698 },
      { nombre: 'Coatzintla', poblacion: 79423 },
      { nombre: 'Coetzala', poblacion: 2355 },
      { nombre: 'Colipa', poblacion: 11675 },
      { nombre: 'Comapa', poblacion: 30117 },
      { nombre: 'Córdoba', poblacion: 204721 },
      { nombre: 'Cosamaloapan de Carpio', poblacion: 92725 },
      { nombre: 'Cosautlán de Carvajal', poblacion: 16167 },
      { nombre: 'Coscomatepec', poblacion: 46978 },
      { nombre: 'Cosoleacaque', poblacion: 117725 },
      { nombre: 'Cotaxtla', poblacion: 31230 },
      { nombre: 'Coxquihui', poblacion: 7400 },
      { nombre: 'Coyutla', poblacion: 25411 },
      { nombre: 'Cuichapa', poblacion: 12074 },
      { nombre: 'Cuitláhuac', poblacion: 5560 },
      { nombre: 'Chacaltianguis', poblacion: 13196 },
      { nombre: 'Chalma', poblacion: 12207 },
      { nombre: 'Chiconamel', poblacion: 8308 },
      { nombre: 'Chiconquiaco', poblacion: 15223 },
      { nombre: 'Chicontepec', poblacion: 112345 },
      { nombre: 'Chinameca', poblacion: 25074 },
      { nombre: 'Chinampa de Gorostiza', poblacion: 7349 },
      { nombre: 'Chocamán', poblacion: 9125 },
      { nombre: 'Chontla', poblacion: 28508 },
      { nombre: 'Chumatlán', poblacion: 10432 },
      { nombre: 'Emiliano Zapata', poblacion: 85489 },
      { nombre: 'Espinal', poblacion: 16043 },
      { nombre: 'Filomeno Mata', poblacion: 12808 },
      { nombre: 'Fortín', poblacion: 101865 },
      { nombre: 'Gutiérrez Zamora', poblacion: 37012 },
      { nombre: 'Hidalgotitlán', poblacion: 23456 },
      { nombre: 'Huayacocotla', poblacion: 16490 },
      { nombre: 'Hueyapan de Ocampo', poblacion: 23719 },
      { nombre: 'Ilamatlán', poblacion: 9240 },
      { nombre: 'Isla', poblacion: 8422 },
      { nombre: 'Ixcatepec', poblacion: 14623 },
      { nombre: 'Ixhuacán de los Reyes', poblacion: 14427 },
      { nombre: 'Ixhuatlán del Café', poblacion: 24970 },
      { nombre: 'Ixhuatlán del Sureste', poblacion: 30372 },
      { nombre: 'Ixhuatlán de Madero', poblacion: 87543 },
      { nombre: 'Ixmatlahuacan', poblacion: 12234 },
      { nombre: 'Ixtaczoquitlán', poblacion: 120127 },
      { nombre: 'Jalacingo', poblacion: 34560 },
      { nombre: 'Jamapa', poblacion: 11132 },
      { nombre: 'Jesús Carranza', poblacion: 23458 },
      { nombre: 'Jilotepec', poblacion: 54216 },
      { nombre: 'Juan Rodríguez Clara', poblacion: 74865 },
      { nombre: 'Juchique de Ferrer', poblacion: 8769 },
      { nombre: 'Landero y Coss', poblacion: 1543 },
      { nombre: 'La Perla', poblacion: 14478 },
      { nombre: 'Las Minas', poblacion: 2934 },
      { nombre: 'Las Vigas de Ramírez', poblacion: 9103 },
      { nombre: 'Los Reyes', poblacion: 8752 },
      { nombre: 'Magdalena', poblacion: 2334 },
      { nombre: 'Maltrata', poblacion: 22012 },
      { nombre: 'Manlio Fabio Altamirano', poblacion: 23918 },
      { nombre: 'Mariano Escobedo', poblacion: 19514 },
      { nombre: 'Martínez de la Torre', poblacion: 15583 },
      { nombre: 'Mecayapan', poblacion: 15768 },
      { nombre: 'Mecatlán', poblacion: 4881 },
      { nombre: 'Mezcalama', poblacion: 6302 },
      { nombre: 'Mixtla de Altamirano', poblacion: 19234 },
      { nombre: 'Moloacán', poblacion: 56987 },
      { nombre: 'Naolinco de Victoria', poblacion: 40658 },
      { nombre: 'Naranjal', poblacion: 10386 },
      { nombre: 'Nautla', poblacion: 22645 },
      { nombre: 'Nogales', poblacion: 81003 },
      { nombre: 'Oluta', poblacion: 15987 },
      { nombre: 'Omealca', poblacion: 9823 },
      { nombre: 'Orizaba', poblacion: 123182 },
      { nombre: 'Otatitlán', poblacion: 10219 },
      { nombre: 'Oteapan', poblacion: 10343 },
      { nombre: 'Ozuluama de Mascareñas', poblacion: 11899 },
      { nombre: 'Pajapan', poblacion: 23940 },
      { nombre: 'Pánuco', poblacion: 187263 },
      { nombre: 'Papantla', poblacion: 159124 },
      { nombre: 'Pascual Ortiz Rubio', poblacion: 5834 },
      { nombre: 'Paso de Ovejas', poblacion: 20234 },
      { nombre: 'Paso del Macho', poblacion: 17125 },
      { nombre: 'Perote', poblacion: 77153 },
      { nombre: 'Platón Sánchez', poblacion: 32344 },
      { nombre: 'Playa Vicente', poblacion: 29301 },
      { nombre: 'Poza Rica de Hidalgo', poblacion: 189457 },
      { nombre: 'Presidio', poblacion: 9234 },
      { nombre: 'Pueblo Viejo', poblacion: 105345 },
      { nombre: 'Puente Nacional', poblacion: 14023 },
      { nombre: 'Rafael Delgado', poblacion: 12456 },
      { nombre: 'Rafael Lucio', poblacion: 10098 },
      { nombre: 'Saltabarranca', poblacion: 18543 },
      { nombre: 'San Andrés Tuxtla', poblacion: 178847 },
      { nombre: 'San Juan Evangelista', poblacion: 11532 },
      { nombre: 'Santiago Tuxtla', poblacion: 45287 },
      { nombre: 'Santiago Sochiapan', poblacion: 12214 },
      { nombre: 'Sayula de Alemán', poblacion: 31905 },
      { nombre: 'Sochiapa', poblacion: 9345 },
      { nombre: 'Soledad Atzompa', poblacion: 12876 },
      { nombre: 'Soledad de Doblado', poblacion: 15892 },
      { nombre: 'Soteapan', poblacion: 12123 },
      { nombre: 'Tamalín', poblacion: 15423 },
      { nombre: 'Tamiahua', poblacion: 61845 },
      { nombre: 'Tancoco', poblacion: 25423 },
      { nombre: 'Tantoyuca', poblacion: 101743 },
      { nombre: 'Tatatila', poblacion: 12045 },
      { nombre: 'Tecolutla', poblacion: 29588 },
      { nombre: 'Tehuipango', poblacion: 20434 },
      { nombre: 'Tempoal de Sánchez', poblacion: 35211 },
      { nombre: 'Tenampa', poblacion: 15322 },
      { nombre: 'Teocelo', poblacion: 9671 },
      { nombre: 'Tepatlaxco', poblacion: 10486 },
      { nombre: 'Tihuatlán', poblacion: 80234 },
      { nombre: 'Tlacojalpan', poblacion: 9032 },
      { nombre: 'Tlacolulan', poblacion: 15012 },
      { nombre: 'Tlacotalpan', poblacion: 15436 },
      { nombre: 'Tlalixcoyan', poblacion: 18421 },
      { nombre: 'Tlapacoyan', poblacion: 34211 },
      { nombre: 'Tuxpan', poblacion: 143362 },
      { nombre: 'Ursulo Galván', poblacion: 12876 },
      { nombre: 'Vega de Alatorre', poblacion: 20987 },
      { nombre: 'Veracruz', poblacion: 607209 },
      { nombre: 'Villa Aldama', poblacion: 15098 },
      { nombre: 'Xalapa', poblacion: 488531 },
      { nombre: 'Yanga', poblacion: 18876 },
      { nombre: 'Zaragoza', poblacion: 11899 },
    ].map((municipio) => ({
      ...municipio,
      estadoId: veracruzEstado._id,
      activo: true,
    }));

    await municipioCatalogoModel.insertMany(municipiosVeracruz);

    console.log(
      '✅ Catálogo de municipios de Veracruz creado (170 municipios)',
    );
    console.log('\n📧 Credenciales de acceso:');
    console.log('   Email: superadmin@sagim.gob.mx');
    console.log('   Password: SuperAdmin123!');
    console.log('\n👥 Roles del sistema:');
    console.log('   • SUPER_ADMIN - Acceso global a todos los municipios');
    console.log(
      '   • ADMIN_MUNICIPIO - Acceso completo a su municipio (todos los módulos)',
    );
    console.log(
      '   • OPERATIVO - Acceso limitado a un módulo específico de su municipio',
    );
    console.log(
      '\n🎯 El Super Admin puede gestionar todos los municipios del sistema\n',
    );
  } catch (error) {
    console.error('\n❌ Error durante el seed:', error);
    console.error('\n📋 Stack trace:', error.stack);
  } finally {
    await app.close();
  }
}

seed()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
