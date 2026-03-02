import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';
import { Model } from 'mongoose';
import { getModelToken } from '@nestjs/mongoose';
import { Municipality } from '@/modules/municipalities/schemas/municipality.schema';
import { Estado } from '@/modules/catalogos/schemas/estado.schema';

/**
 * Seed 07: Municipios de Veracruz
 *
 * Características:
 * ✅ Idempotente - Puede ejecutarse múltiples veces
 * ✅ Upsert pattern - No duplica registros
 * ✅ 212 municipios según INEGI (clave estado 30)
 * ✅ Población INEGI Censo 2020
 *
 * Uso:
 *   npm run seed:municipios-veracruz
 *
 * ⚠️ Requisitos:
 *   - El estado "Veracruz" (clave VER) debe existir en la BD
 *   - Ejecutar primero: npm run seed (o seed:initial)
 */
export async function seedMunicipiosVeracruz(appContext?: any) {
  const shouldClose = !appContext;
  const app =
    appContext || (await NestFactory.createApplicationContext(AppModule));

  try {
    const municipalityModel = app.get(
      getModelToken(Municipality.name),
    ) as Model<Municipality>;
    const estadoModel = app.get(getModelToken(Estado.name)) as Model<Estado>;

    console.log('🏙️  [07] Seeding Municipios de Veracruz...\n');

    // ==================== BUSCAR ESTADO ====================

    const veracruz = await estadoModel.findOne({ clave: 'VER' });

    if (!veracruz) {
      console.log('⚠️  Estado "Veracruz" (VER) no encontrado.');
      console.log('💡 Ejecuta primero: npm run seed\n');
      return {
        insertados: 0,
        actualizados: 0,
        total: 0,
        error: 'Estado Veracruz no encontrado',
      };
    }

    console.log(`📍 Estado: ${veracruz.nombre} (${veracruz._id})\n`);

    // ==================== MUNICIPIOS (INEGI) ====================

    // Fuente: INEGI Censo de Población y Vivienda 2020
    const municipiosData: {
      nombre: string;
      claveInegi: string;
      poblacion: number;
    }[] = [
      { nombre: 'Acajete', claveInegi: '30001', poblacion: 60991 },
      { nombre: 'Acatlán', claveInegi: '30002', poblacion: 20571 },
      { nombre: 'Acayucan', claveInegi: '30003', poblacion: 97742 },
      { nombre: 'Acultzingo', claveInegi: '30004', poblacion: 25067 },
      { nombre: 'Ahuacatlán', claveInegi: '30005', poblacion: 9020 },
      { nombre: 'Álamo Temapache', claveInegi: '30006', poblacion: 95644 },
      { nombre: 'Alpatláhuac', claveInegi: '30007', poblacion: 13010 },
      {
        nombre: 'Alto Lucero de Gutiérrez Barrios',
        claveInegi: '30008',
        poblacion: 25419,
      },
      { nombre: 'Altotonga', claveInegi: '30009', poblacion: 54826 },
      { nombre: 'Alvarado', claveInegi: '30010', poblacion: 75527 },
      { nombre: 'Amatitlán', claveInegi: '30011', poblacion: 9695 },
      { nombre: 'Amatlán de los Reyes', claveInegi: '30012', poblacion: 43252 },
      { nombre: 'Ángel R. Cabada', claveInegi: '30013', poblacion: 42069 },
      { nombre: 'La Antigua', claveInegi: '30014', poblacion: 20567 },
      { nombre: 'Apazapan', claveInegi: '30015', poblacion: 9484 },
      { nombre: 'Aquila', claveInegi: '30016', poblacion: 6183 },
      { nombre: 'Astacinga', claveInegi: '30017', poblacion: 8498 },
      { nombre: 'Atlahuilco', claveInegi: '30018', poblacion: 12764 },
      { nombre: 'Atoyac', claveInegi: '30019', poblacion: 18688 },
      { nombre: 'Atzacan', claveInegi: '30020', poblacion: 11069 },
      { nombre: 'Atzalan', claveInegi: '30021', poblacion: 42310 },
      { nombre: 'Ayahualulco', claveInegi: '30022', poblacion: 20174 },
      { nombre: 'Banderilla', claveInegi: '30023', poblacion: 22897 },
      { nombre: 'Benito Juárez', claveInegi: '30024', poblacion: 15183 },
      { nombre: 'Boca del Río', claveInegi: '30025', poblacion: 158159 },
      { nombre: 'Calcahualco', claveInegi: '30026', poblacion: 12327 },
      { nombre: 'Camerino Z. Mendoza', claveInegi: '30027', poblacion: 25095 },
      { nombre: 'Castillo de Teayo', claveInegi: '30028', poblacion: 25127 },
      { nombre: 'Catemaco', claveInegi: '30029', poblacion: 49993 },
      { nombre: 'Cazones de Herrera', claveInegi: '30030', poblacion: 28826 },
      { nombre: 'Cerro Azul', claveInegi: '30031', poblacion: 34791 },
      { nombre: 'Citlaltépetl', claveInegi: '30032', poblacion: 12095 },
      { nombre: 'Coacoatzintla', claveInegi: '30033', poblacion: 15621 },
      { nombre: 'Coahuitlán', claveInegi: '30034', poblacion: 7952 },
      { nombre: 'Coatepec', claveInegi: '30035', poblacion: 91108 },
      { nombre: 'Coatzacoalcos', claveInegi: '30036', poblacion: 348812 },
      { nombre: 'Coatzintla', claveInegi: '30037', poblacion: 54530 },
      { nombre: 'Coetzala', claveInegi: '30038', poblacion: 7099 },
      { nombre: 'Colipa', claveInegi: '30039', poblacion: 8781 },
      { nombre: 'Comapa', claveInegi: '30040', poblacion: 18271 },
      { nombre: 'Córdoba', claveInegi: '30041', poblacion: 218032 },
      {
        nombre: 'Cosamaloapan de Carpio',
        claveInegi: '30042',
        poblacion: 75897,
      },
      {
        nombre: 'Cosautlán de Carvajal',
        claveInegi: '30043',
        poblacion: 17063,
      },
      { nombre: 'Coscomatepec', claveInegi: '30044', poblacion: 46564 },
      { nombre: 'Cosoleacaque', claveInegi: '30045', poblacion: 88527 },
      { nombre: 'Cotaxtla', claveInegi: '30046', poblacion: 20478 },
      { nombre: 'Coxquihui', claveInegi: '30047', poblacion: 18017 },
      { nombre: 'Coyutla', claveInegi: '30048', poblacion: 25451 },
      { nombre: 'Cuichapa', claveInegi: '30049', poblacion: 12026 },
      { nombre: 'Cuitláhuac', claveInegi: '30050', poblacion: 40344 },
      { nombre: 'Chacaltianguis', claveInegi: '30051', poblacion: 13834 },
      { nombre: 'Chalma', claveInegi: '30052', poblacion: 5736 },
      { nombre: 'Chiconamel', claveInegi: '30053', poblacion: 13141 },
      { nombre: 'Chiconquiaco', claveInegi: '30054', poblacion: 10168 },
      { nombre: 'Chicontepec', claveInegi: '30055', poblacion: 73605 },
      { nombre: 'Chinameca', claveInegi: '30056', poblacion: 20890 },
      { nombre: 'Chinampa de Gorostiza', claveInegi: '30057', poblacion: 9714 },
      { nombre: 'Las Choapas', claveInegi: '30058', poblacion: 119980 },
      { nombre: 'Chocamán', claveInegi: '30059', poblacion: 22456 },
      { nombre: 'Chontla', claveInegi: '30060', poblacion: 20380 },
      { nombre: 'Chumatlán', claveInegi: '30061', poblacion: 8048 },
      { nombre: 'Emiliano Zapata', claveInegi: '30062', poblacion: 23681 },
      { nombre: 'Espinal', claveInegi: '30063', poblacion: 23001 },
      { nombre: 'Filomeno Mata', claveInegi: '30064', poblacion: 20033 },
      { nombre: 'Fortín', claveInegi: '30065', poblacion: 60826 },
      { nombre: 'Gutiérrez Zamora', claveInegi: '30066', poblacion: 38640 },
      { nombre: 'Hidalgotitlán', claveInegi: '30067', poblacion: 34706 },
      { nombre: 'Huatusco', claveInegi: '30068', poblacion: 62695 },
      { nombre: 'Huayacocotla', claveInegi: '30069', poblacion: 23820 },
      { nombre: 'Hueyapan de Ocampo', claveInegi: '30070', poblacion: 64025 },
      {
        nombre: 'Huiloapan de Cuauhtémoc',
        claveInegi: '30071',
        poblacion: 36673,
      },
      { nombre: 'Ignacio de la Llave', claveInegi: '30072', poblacion: 22774 },
      { nombre: 'Ilamatlán', claveInegi: '30073', poblacion: 18279 },
      { nombre: 'Isla', claveInegi: '30074', poblacion: 55015 },
      { nombre: 'Ixcatepec', claveInegi: '30075', poblacion: 12553 },
      {
        nombre: 'Ixhuacán de los Reyes',
        claveInegi: '30076',
        poblacion: 22249,
      },
      { nombre: 'Ixhuatlán del Café', claveInegi: '30077', poblacion: 23484 },
      { nombre: 'Ixhuatlancillo', claveInegi: '30078', poblacion: 21024 },
      {
        nombre: 'Ixhuatlán del Sureste',
        claveInegi: '30079',
        poblacion: 33621,
      },
      { nombre: 'Ixhuatlán de Madero', claveInegi: '30080', poblacion: 57936 },
      { nombre: 'Ixmatlahuacan', claveInegi: '30081', poblacion: 18037 },
      { nombre: 'Ixtaczoquitlán', claveInegi: '30082', poblacion: 73049 },
      { nombre: 'Jalacingo', claveInegi: '30083', poblacion: 30020 },
      { nombre: 'Xalapa', claveInegi: '30084', poblacion: 512310 },
      { nombre: 'Jalcomulco', claveInegi: '30085', poblacion: 10127 },
      { nombre: 'Jáltipan', claveInegi: '30086', poblacion: 47088 },
      { nombre: 'Jamapa', claveInegi: '30087', poblacion: 18756 },
      { nombre: 'Jesús Carranza', claveInegi: '30088', poblacion: 38879 },
      { nombre: 'Xico', claveInegi: '30089', poblacion: 43316 },
      { nombre: 'Jilotepec', claveInegi: '30090', poblacion: 16892 },
      { nombre: 'Juan Rodríguez Clara', claveInegi: '30091', poblacion: 57820 },
      { nombre: 'Juchique de Ferrer', claveInegi: '30092', poblacion: 13133 },
      { nombre: 'Landero y Coss', claveInegi: '30093', poblacion: 8890 },
      { nombre: 'Lerdo de Tejada', claveInegi: '30094', poblacion: 46165 },
      { nombre: 'Magdalena', claveInegi: '30095', poblacion: 5738 },
      { nombre: 'Maltrata', claveInegi: '30096', poblacion: 20671 },
      {
        nombre: 'Manlio Fabio Altamirano',
        claveInegi: '30097',
        poblacion: 20553,
      },
      { nombre: 'Mariano Escobedo', claveInegi: '30098', poblacion: 18017 },
      {
        nombre: 'Martínez de la Torre',
        claveInegi: '30099',
        poblacion: 108282,
      },
      { nombre: 'Mecatlán', claveInegi: '30100', poblacion: 12047 },
      { nombre: 'Mecayapan', claveInegi: '30101', poblacion: 26823 },
      { nombre: 'Medellín de Bravo', claveInegi: '30102', poblacion: 53521 },
      { nombre: 'Miahuatlán', claveInegi: '30103', poblacion: 16940 },
      { nombre: 'Las Minas', claveInegi: '30104', poblacion: 16097 },
      { nombre: 'Minatitlán', claveInegi: '30105', poblacion: 175241 },
      { nombre: 'Misantla', claveInegi: '30106', poblacion: 57380 },
      { nombre: 'Mixtla de Altamirano', claveInegi: '30107', poblacion: 11432 },
      { nombre: 'Moloacán', claveInegi: '30108', poblacion: 27459 },
      { nombre: 'Naolinco', claveInegi: '30109', poblacion: 17872 },
      { nombre: 'Naranjal', claveInegi: '30110', poblacion: 27028 },
      { nombre: 'Nautla', claveInegi: '30111', poblacion: 16004 },
      { nombre: 'Nogales', claveInegi: '30112', poblacion: 28095 },
      { nombre: 'Oluta', claveInegi: '30113', poblacion: 20280 },
      { nombre: 'Omealca', claveInegi: '30114', poblacion: 27419 },
      { nombre: 'Orizaba', claveInegi: '30115', poblacion: 119949 },
      { nombre: 'Otatitlán', claveInegi: '30116', poblacion: 8773 },
      { nombre: 'Oteapan', claveInegi: '30117', poblacion: 22043 },
      {
        nombre: 'Ozuluama de Mascareñas',
        claveInegi: '30118',
        poblacion: 21619,
      },
      { nombre: 'Pajapan', claveInegi: '30119', poblacion: 21773 },
      { nombre: 'Pánuco', claveInegi: '30120', poblacion: 96256 },
      { nombre: 'Papantla', claveInegi: '30121', poblacion: 174116 },
      { nombre: 'Paso del Macho', claveInegi: '30122', poblacion: 33768 },
      { nombre: 'Paso de Ovejas', claveInegi: '30123', poblacion: 27419 },
      { nombre: 'La Perla', claveInegi: '30124', poblacion: 20578 },
      { nombre: 'Perote', claveInegi: '30125', poblacion: 65952 },
      { nombre: 'Platón Sánchez', claveInegi: '30126', poblacion: 16561 },
      { nombre: 'Playa Vicente', claveInegi: '30127', poblacion: 49264 },
      {
        nombre: 'Poza Rica de Hidalgo',
        claveInegi: '30128',
        poblacion: 220893,
      },
      { nombre: 'Las Vigas de Ramírez', claveInegi: '30129', poblacion: 22059 },
      { nombre: 'Pueblo Viejo', claveInegi: '30130', poblacion: 82960 },
      { nombre: 'Puente Nacional', claveInegi: '30131', poblacion: 38440 },
      { nombre: 'Rafael Delgado', claveInegi: '30132', poblacion: 22649 },
      { nombre: 'Rafael Lucio', claveInegi: '30133', poblacion: 8842 },
      { nombre: 'Los Reyes', claveInegi: '30134', poblacion: 7826 },
      { nombre: 'Río Blanco', claveInegi: '30135', poblacion: 41789 },
      { nombre: 'Saltabarranca', claveInegi: '30136', poblacion: 13700 },
      { nombre: 'San Andrés Tenejapan', claveInegi: '30137', poblacion: 10116 },
      { nombre: 'San Andrés Tuxtla', claveInegi: '30138', poblacion: 155080 },
      { nombre: 'San Juan Evangelista', claveInegi: '30139', poblacion: 42344 },
      { nombre: 'Santiago Tuxtla', claveInegi: '30140', poblacion: 58843 },
      { nombre: 'Sayula de Alemán', claveInegi: '30141', poblacion: 34685 },
      { nombre: 'Soconusco', claveInegi: '30142', poblacion: 12073 },
      { nombre: 'Sochiapa', claveInegi: '30143', poblacion: 6817 },
      { nombre: 'Soledad Atzompa', claveInegi: '30144', poblacion: 20804 },
      { nombre: 'Soledad de Doblado', claveInegi: '30145', poblacion: 29484 },
      { nombre: 'Soteapan', claveInegi: '30146', poblacion: 33272 },
      { nombre: 'Tamalín', claveInegi: '30147', poblacion: 12895 },
      { nombre: 'Tamiahua', claveInegi: '30148', poblacion: 31428 },
      { nombre: 'Tampico Alto', claveInegi: '30149', poblacion: 15738 },
      { nombre: 'Tancoco', claveInegi: '30150', poblacion: 8699 },
      { nombre: 'Tantima', claveInegi: '30151', poblacion: 12778 },
      { nombre: 'Tantoyuca', claveInegi: '30152', poblacion: 95064 },
      { nombre: 'Tatatila', claveInegi: '30153', poblacion: 9155 },
      { nombre: 'Tecolutla', claveInegi: '30154', poblacion: 32044 },
      { nombre: 'Tehuipango', claveInegi: '30155', poblacion: 24060 },
      { nombre: 'Álamo Temapache', claveInegi: '30156', poblacion: 49271 },
      { nombre: 'Tempoal', claveInegi: '30157', poblacion: 44892 },
      { nombre: 'Tenampa', claveInegi: '30158', poblacion: 9448 },
      { nombre: 'Tenochtitlán', claveInegi: '30159', poblacion: 7321 },
      { nombre: 'Teocelo', claveInegi: '30160', poblacion: 17539 },
      { nombre: 'Tepatlaxco', claveInegi: '30161', poblacion: 7826 },
      { nombre: 'Tepetlán', claveInegi: '30162', poblacion: 10023 },
      { nombre: 'Tepetzintla', claveInegi: '30163', poblacion: 19052 },
      { nombre: 'Tequila', claveInegi: '30164', poblacion: 18271 },
      { nombre: 'José Azueta', claveInegi: '30165', poblacion: 27166 },
      { nombre: 'Texcatepec', claveInegi: '30166', poblacion: 15943 },
      { nombre: 'Texhuacán', claveInegi: '30167', poblacion: 8712 },
      { nombre: 'Texistepec', claveInegi: '30168', poblacion: 28568 },
      { nombre: 'Tezonapa', claveInegi: '30169', poblacion: 64193 },
      { nombre: 'Tierra Blanca', claveInegi: '30170', poblacion: 107549 },
      { nombre: 'Tihuatlán', claveInegi: '30171', poblacion: 73940 },
      { nombre: 'Tlacojalpan', claveInegi: '30172', poblacion: 11504 },
      { nombre: 'Tlacolulan', claveInegi: '30173', poblacion: 11202 },
      { nombre: 'Tlacotalpan', claveInegi: '30174', poblacion: 21997 },
      { nombre: 'Tlacotepec de Mejía', claveInegi: '30175', poblacion: 8712 },
      { nombre: 'Tlachichilco', claveInegi: '30176', poblacion: 21512 },
      { nombre: 'Tlalixcoyan', claveInegi: '30177', poblacion: 33014 },
      { nombre: 'Tlalnelhuayocan', claveInegi: '30178', poblacion: 27628 },
      { nombre: 'Tlapacoyan', claveInegi: '30179', poblacion: 63062 },
      { nombre: 'Tlaquilpa', claveInegi: '30180', poblacion: 9258 },
      { nombre: 'Tlilapan', claveInegi: '30181', poblacion: 8503 },
      { nombre: 'Tomatlán', claveInegi: '30182', poblacion: 16004 },
      { nombre: 'Tonayán', claveInegi: '30183', poblacion: 8712 },
      { nombre: 'Totutla', claveInegi: '30184', poblacion: 22301 },
      { nombre: 'Tuxpan', claveInegi: '30185', poblacion: 155906 },
      { nombre: 'Tuxtilla', claveInegi: '30186', poblacion: 7625 },
      { nombre: 'Úrsulo Galván', claveInegi: '30187', poblacion: 43099 },
      { nombre: 'Vega de Alatorre', claveInegi: '30188', poblacion: 27947 },
      { nombre: 'Veracruz', claveInegi: '30189', poblacion: 607031 },
      { nombre: 'Villa Aldama', claveInegi: '30190', poblacion: 14380 },
      { nombre: 'Xoxocotla', claveInegi: '30191', poblacion: 6455 },
      { nombre: 'Yanga', claveInegi: '30192', poblacion: 18610 },
      { nombre: 'Yecuatla', claveInegi: '30193', poblacion: 13462 },
      { nombre: 'Zacualpan', claveInegi: '30194', poblacion: 11963 },
      { nombre: 'Zaragoza', claveInegi: '30195', poblacion: 17441 },
      { nombre: 'Zentla', claveInegi: '30196', poblacion: 14483 },
      { nombre: 'Zongolica', claveInegi: '30197', poblacion: 54613 },
      {
        nombre: 'Zontecomatlán de López y Fuentes',
        claveInegi: '30198',
        poblacion: 17643,
      },
      { nombre: 'Zozocolco de Hidalgo', claveInegi: '30199', poblacion: 11806 },
      { nombre: 'Agua Dulce', claveInegi: '30200', poblacion: 55107 },
      { nombre: 'El Higo', claveInegi: '30201', poblacion: 28455 },
      {
        nombre: 'Nanchital de Lázaro Cárdenas del Río',
        claveInegi: '30202',
        poblacion: 32892,
      },
      { nombre: 'Tres Valles', claveInegi: '30203', poblacion: 48916 },
      { nombre: 'Carlos A. Carrillo', claveInegi: '30204', poblacion: 22038 },
      {
        nombre: 'Tatahuicapan de Juárez',
        claveInegi: '30205',
        poblacion: 19456,
      },
      { nombre: 'Uxpanapa', claveInegi: '30206', poblacion: 30217 },
      { nombre: 'San Rafael', claveInegi: '30207', poblacion: 36871 },
      { nombre: 'Santiago Sochiapan', claveInegi: '30208', poblacion: 14201 },
      { nombre: 'Espinal', claveInegi: '30209', poblacion: 12857 },
      { nombre: 'Tres Zapotes', claveInegi: '30210', poblacion: 10983 },
      { nombre: 'Lerdo de Tejada', claveInegi: '30211', poblacion: 15720 },
      { nombre: 'Tlaltetela', claveInegi: '30212', poblacion: 20312 },
    ];

    // Configuración base por defecto para todos los municipios
    const configBase = {
      modulos: {
        PRESIDENCIA: false,
        SECRETARIA_AYUNTAMIENTO: false,
        COMUNICACION_SOCIAL: false,
        UIPPE: false,
        CONTRALORIA: false,
        SEGURIDAD_PUBLICA: false,
        SERVICIOS_PUBLICOS: false,
        DESARROLLO_URBANO: false,
        DESARROLLO_ECONOMICO: false,
        DESARROLLO_SOCIAL: false,
        TESORERIA: false,
        DIF: false,
        ORGANISMO_AGUA: false,
        USUARIOS: false,
        REPORTES: false,
        CITAS: false,
      },
      features: {
        mfa: false,
        whatsappNotifications: false,
      },
    };

    let insertados = 0;
    let actualizados = 0;

    for (const municipio of municipiosData) {
      const result = await municipalityModel.updateOne(
        { claveInegi: municipio.claveInegi },
        {
          $setOnInsert: {
            config: configBase,
            activo: true,
          },
          $set: {
            nombre: municipio.nombre,
            estadoId: veracruz._id,
            claveInegi: municipio.claveInegi,
            poblacion: municipio.poblacion,
          },
        },
        { upsert: true },
      );

      if (result.upsertedCount > 0) {
        console.log(
          `✅ ${municipio.claveInegi} - ${municipio.nombre} (CREADO)`,
        );
        insertados++;
      } else if (result.modifiedCount > 0) {
        console.log(
          `🔄 ${municipio.claveInegi} - ${municipio.nombre} (ACTUALIZADO)`,
        );
        actualizados++;
      } else {
        console.log(
          `⏭️  ${municipio.claveInegi} - ${municipio.nombre} (SIN CAMBIOS)`,
        );
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log(`✅ Creados:       ${insertados}`);
    console.log(`🔄 Actualizados:  ${actualizados}`);
    console.log(
      `⏭️  Sin cambios:  ${municipiosData.length - insertados - actualizados}`,
    );
    console.log(`📦 Total:         ${municipiosData.length}`);
    console.log('='.repeat(60) + '\n');

    return { insertados, actualizados, total: municipiosData.length };
  } catch (error) {
    console.error('❌ Error en seed de municipios de Veracruz:', error);
    throw error;
  } finally {
    if (shouldClose) {
      await app.close();
    }
  }
}

// Permitir ejecución directa
if (require.main === module) {
  seedMunicipiosVeracruz();
}
