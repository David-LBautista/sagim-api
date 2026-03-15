import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

// ═══════════════════════════════════════════════════════════════
// INTERFACES DEL CATÁLOGO
// ═══════════════════════════════════════════════════════════════

export interface SubseccionConfig {
  clave: string;
  titulo: string;
  orden: number;
}

export interface ObligacionConfig {
  clave: string;
  articulo: string;
  titulo: string;
  descripcion: string;
  areaResponsable: string;
  periodoActualizacion: string;
  notaPeriodo: string;
  ejerciciosHistorico: number;
  esEspecificaMunicipio: boolean;
  subsecciones: SubseccionConfig[];
}

// ═══════════════════════════════════════════════════════════════
// CATÁLOGO FIJO — OBLIGACIONES LEY 250 DE TRANSPARENCIA VERACRUZ
// Artículos 50 y 51 — Vigente desde 1 de julio de 2025
// ═══════════════════════════════════════════════════════════════

// ── OBLIGACIONES COMUNES — Artículo 50 ─────────────────────────
export const OBLIGACIONES_COMUNES: ObligacionConfig[] = [
  {
    clave: 'marco_normativo',
    articulo: 'Art. 50 Fracción I',
    titulo: 'Marco Normativo',
    descripcion:
      'Leyes, códigos, reglamentos, decretos de creación, manuales administrativos, reglas de operación, criterios y políticas aplicables.',
    areaResponsable: 'Secretaría del Ayuntamiento',
    periodoActualizacion: 'Trimestral',
    notaPeriodo: 'Información vigente',
    ejerciciosHistorico: 0,
    esEspecificaMunicipio: false,
    subsecciones: [
      {
        clave: 'normatividad_federal',
        titulo: 'Normatividad Federal',
        orden: 1,
      },
      {
        clave: 'normatividad_estatal',
        titulo: 'Normatividad Estatal',
        orden: 2,
      },
      { clave: 'normatividad_local', titulo: 'Normatividad Local', orden: 3 },
      { clave: 'manuales', titulo: 'Manuales Administrativos', orden: 4 },
    ],
  },
  {
    clave: 'estructura_organica',
    articulo: 'Art. 50 Fracción II',
    titulo: 'Estructura Orgánica Completa',
    descripcion:
      'Estructura orgánica que vincule atribuciones y responsabilidades de cada servidor público.',
    areaResponsable: 'Secretaría del Ayuntamiento',
    periodoActualizacion: 'Trimestral',
    notaPeriodo: 'Ejercicio en curso y ejercicio anterior',
    ejerciciosHistorico: 1,
    esEspecificaMunicipio: false,
    subsecciones: [
      { clave: 'estructura_organica', titulo: 'Estructura Orgánica', orden: 1 },
      { clave: 'organigrama', titulo: 'Organigrama', orden: 2 },
    ],
  },
  {
    clave: 'facultades_areas',
    articulo: 'Art. 50 Fracción III',
    titulo: 'Facultades de las Áreas Administrativas',
    descripcion: 'Facultades de cada área administrativa del municipio.',
    areaResponsable: 'Secretaría del Ayuntamiento',
    periodoActualizacion: 'Trimestral',
    notaPeriodo: 'Información vigente',
    ejerciciosHistorico: 0,
    esEspecificaMunicipio: false,
    subsecciones: [],
  },
  {
    clave: 'metas_objetivos',
    articulo: 'Art. 50 Fracción IV',
    titulo: 'Metas y Objetivos de las Áreas Administrativas',
    descripcion:
      'Metas y objetivos de las áreas conforme a sus programas operativos.',
    areaResponsable: 'Presidencia Municipal',
    periodoActualizacion: 'Anual',
    notaPeriodo:
      'Durante el primer trimestre del ejercicio en curso. Ejercicio en curso y seis ejercicios anteriores.',
    ejerciciosHistorico: 6,
    esEspecificaMunicipio: false,
    subsecciones: [],
  },
  {
    clave: 'indicadores_gestion',
    articulo: 'Art. 50 Fracción V',
    titulo: 'Indicadores de Gestión',
    descripcion:
      'Indicadores de gestión de interés público o trascendencia social y los que permitan rendir cuentas de objetivos y resultados.',
    areaResponsable: 'Presidencia Municipal',
    periodoActualizacion: 'Trimestral',
    notaPeriodo: 'Ejercicio en curso y seis ejercicios anteriores',
    ejerciciosHistorico: 6,
    esEspecificaMunicipio: false,
    subsecciones: [
      {
        clave: 'interes_publico',
        titulo: 'Indicadores de Interés Público',
        orden: 1,
      },
      {
        clave: 'indicadores_resultado',
        titulo: 'Indicadores de Resultados',
        orden: 2,
      },
    ],
  },
  {
    clave: 'directorio_servidores',
    articulo: 'Art. 50 Fracción VI',
    titulo: 'Directorio de Servidores Públicos',
    descripcion:
      'Nombre, cargo, nivel, fecha de alta, teléfono y correo de todos los servidores públicos.',
    areaResponsable: 'Contraloría',
    periodoActualizacion: 'Trimestral',
    notaPeriodo:
      'Ejercicio en curso y ejercicio anterior. 15 días hábiles después de alguna modificación.',
    ejerciciosHistorico: 1,
    esEspecificaMunicipio: false,
    subsecciones: [],
  },
  {
    clave: 'remuneraciones',
    articulo: 'Art. 50 Fracción VII',
    titulo: 'Remuneración de Servidores Públicos',
    descripcion:
      'Remuneración bruta y neta de todos los servidores públicos de base o confianza.',
    areaResponsable: 'Tesorería',
    periodoActualizacion: 'Trimestral',
    notaPeriodo: 'Ejercicio en curso y ejercicio anterior',
    ejerciciosHistorico: 1,
    esEspecificaMunicipio: false,
    subsecciones: [
      {
        clave: 'remuneraciones_brutas',
        titulo: 'Remuneraciones Brutas y Netas',
        orden: 1,
      },
      {
        clave: 'tabulador_sueldos',
        titulo: 'Tabulador de Sueldos y Salarios',
        orden: 2,
      },
    ],
  },
  {
    clave: 'viaticos_gastos_representacion',
    articulo: 'Art. 50 Fracción VIII',
    titulo: 'Gastos de Representación y Viáticos',
    descripcion:
      'Gastos de representación y viáticos e informes de comisiones correspondientes.',
    areaResponsable: 'Tesorería',
    periodoActualizacion: 'Trimestral',
    notaPeriodo: 'Ejercicio en curso y ejercicio anterior',
    ejerciciosHistorico: 1,
    esEspecificaMunicipio: false,
    subsecciones: [],
  },
  {
    clave: 'total_plazas',
    articulo: 'Art. 50 Fracción IX',
    titulo: 'Número Total de Plazas',
    descripcion:
      'Número total de plazas del personal de base y de confianza, especificando vacantes por nivel de puesto.',
    areaResponsable: 'Secretaría del Ayuntamiento',
    periodoActualizacion: 'Trimestral',
    notaPeriodo: 'Ejercicio en curso y ejercicio anterior',
    ejerciciosHistorico: 1,
    esEspecificaMunicipio: false,
    subsecciones: [
      {
        clave: 'plazas_vacantes_ocupadas',
        titulo: 'Plazas Vacantes y Ocupadas',
        orden: 1,
      },
      {
        clave: 'total_plazas_resumen',
        titulo: 'Total de Plazas — Resumen Global',
        orden: 2,
      },
    ],
  },
  {
    clave: 'contrataciones_honorarios',
    articulo: 'Art. 50 Fracción X',
    titulo: 'Contrataciones por Honorarios',
    descripcion:
      'Contratos de servicios profesionales por honorarios: nombre, servicios, monto y vigencia.',
    areaResponsable: 'Secretaría del Ayuntamiento',
    periodoActualizacion: 'Trimestral',
    notaPeriodo: 'Ejercicio en curso y ejercicio anterior',
    ejerciciosHistorico: 1,
    esEspecificaMunicipio: false,
    subsecciones: [],
  },
  {
    clave: 'declaraciones_patrimoniales',
    articulo: 'Art. 50 Fracción XI',
    titulo: 'Declaraciones Patrimoniales',
    descripcion:
      'Versiones públicas de las declaraciones patrimoniales de los servidores públicos obligados.',
    areaResponsable: 'Contraloría',
    periodoActualizacion: 'Trimestral',
    notaPeriodo: 'Ejercicio en curso y ejercicio anterior',
    ejerciciosHistorico: 1,
    esEspecificaMunicipio: false,
    subsecciones: [
      {
        clave: 'declaraciones_patrimoniales',
        titulo: 'Declaraciones de Situación Patrimonial',
        orden: 1,
      },
      {
        clave: 'declaraciones_fiscales',
        titulo: 'Declaraciones Fiscales',
        orden: 2,
      },
    ],
  },
  {
    clave: 'domicilio_ut',
    articulo: 'Art. 50 Fracción XII',
    titulo: 'Domicilio de la Unidad de Transparencia',
    descripcion: 'Domicilio, teléfono y correo de la Unidad de Transparencia.',
    areaResponsable: 'Unidad de Transparencia',
    periodoActualizacion: 'Trimestral',
    notaPeriodo: 'Ejercicio en curso y ejercicio anterior',
    ejerciciosHistorico: 1,
    esEspecificaMunicipio: false,
    subsecciones: [],
  },
  {
    clave: 'convocatorias_cargos',
    articulo: 'Art. 50 Fracción XIII',
    titulo: 'Convocatorias a Concursos para Cargos Públicos',
    descripcion:
      'Convocatorias a concursos para ocupar cargos públicos y sus resultados.',
    areaResponsable: 'Contraloría',
    periodoActualizacion: 'Trimestral',
    notaPeriodo: 'Ejercicio en curso y ejercicio anterior',
    ejerciciosHistorico: 1,
    esEspecificaMunicipio: false,
    subsecciones: [],
  },
  {
    clave: 'programas_subsidios',
    articulo: 'Art. 50 Fracción XIV',
    titulo: 'Programas de Subsidios, Estímulos y Apoyos',
    descripcion:
      'Programas de transferencia, servicios, infraestructura social y subsidio, incluyendo padrón de beneficiarios.',
    areaResponsable: 'DIF Municipal',
    periodoActualizacion: 'Trimestral',
    notaPeriodo: 'Ejercicio en curso y dos ejercicios anteriores',
    ejerciciosHistorico: 2,
    esEspecificaMunicipio: false,
    subsecciones: [
      { clave: 'programas_sociales', titulo: 'Programas Sociales', orden: 1 },
      {
        clave: 'padron_beneficiarios',
        titulo: 'Padrón de Beneficiarios',
        orden: 2,
      },
    ],
  },
  {
    clave: 'condiciones_trabajo',
    articulo: 'Art. 50 Fracción XV',
    titulo: 'Condiciones Generales de Trabajo y Sindicatos',
    descripcion:
      'Condiciones generales de trabajo, contratos o convenios laborales y recursos entregados a sindicatos.',
    areaResponsable: 'Secretaría del Ayuntamiento',
    periodoActualizacion: 'Trimestral',
    notaPeriodo:
      'Normatividad vigente. Recursos a sindicatos: ejercicio en curso y dos ejercicios anteriores.',
    ejerciciosHistorico: 2,
    esEspecificaMunicipio: false,
    subsecciones: [
      {
        clave: 'normatividad_laboral',
        titulo: 'Normatividad Laboral',
        orden: 1,
      },
      {
        clave: 'recursos_sindicatos',
        titulo: 'Recursos Públicos a Sindicatos',
        orden: 2,
      },
    ],
  },
  {
    clave: 'informacion_curricular',
    articulo: 'Art. 50 Fracción XVI',
    titulo: 'Información Curricular y Sanciones',
    descripcion:
      'Información curricular desde jefatura de departamento hasta titular. Sanciones administrativas firmes.',
    areaResponsable: 'Secretaría del Ayuntamiento',
    periodoActualizacion: 'Trimestral',
    notaPeriodo: 'Ejercicio en curso y ejercicio anterior',
    ejerciciosHistorico: 1,
    esEspecificaMunicipio: false,
    subsecciones: [],
  },
  {
    clave: 'sanciones_administrativas',
    articulo: 'Art. 50 Fracción XVII',
    titulo: 'Sanciones Administrativas Definitivas',
    descripcion:
      'Listado de servidores públicos con sanciones administrativas definitivas.',
    areaResponsable: 'Contraloría',
    periodoActualizacion: 'Trimestral',
    notaPeriodo:
      'Ejercicio en curso y dos ejercicios anteriores (solo inhabilitaciones)',
    ejerciciosHistorico: 2,
    esEspecificaMunicipio: false,
    subsecciones: [],
  },
  {
    clave: 'servicios_tramites',
    articulo: 'Art. 50 Fracción XVIII',
    titulo: 'Servicios y Trámites',
    descripcion:
      'Servicios y trámites que ofrece el municipio incluyendo requisitos.',
    areaResponsable: 'Secretaría del Ayuntamiento',
    periodoActualizacion: 'Trimestral',
    notaPeriodo: 'Información vigente',
    ejerciciosHistorico: 0,
    esEspecificaMunicipio: false,
    subsecciones: [
      { clave: 'servicios', titulo: 'Servicios', orden: 1 },
      { clave: 'tramites', titulo: 'Trámites', orden: 2 },
    ],
  },
  {
    clave: 'informacion_financiera',
    articulo: 'Art. 50 Fracción XIX',
    titulo: 'Información Financiera',
    descripcion:
      'Presupuesto asignado e informes del ejercicio trimestral del gasto.',
    areaResponsable: 'Tesorería',
    periodoActualizacion: 'Trimestral',
    notaPeriodo:
      'Ejercicio en curso y seis ejercicios anteriores. Presupuesto anual: primeros 30 días del año.',
    ejerciciosHistorico: 6,
    esEspecificaMunicipio: false,
    subsecciones: [
      {
        clave: 'presupuesto_anual',
        titulo: 'Presupuesto Anual Asignado',
        orden: 1,
      },
      {
        clave: 'ejercicio_egresos',
        titulo: 'Ejercicio de los Egresos Presupuestarios',
        orden: 2,
      },
    ],
  },
  {
    clave: 'deuda_publica',
    articulo: 'Art. 50 Fracción XX',
    titulo: 'Deuda Pública',
    descripcion: 'Información relativa a la deuda pública del municipio.',
    areaResponsable: 'Tesorería',
    periodoActualizacion: 'Trimestral',
    notaPeriodo:
      'Ejercicio en curso y seis ejercicios anteriores. Instrumentos jurídicos anteriores vigentes.',
    ejerciciosHistorico: 6,
    esEspecificaMunicipio: false,
    subsecciones: [],
  },
  {
    clave: 'comunicacion_social',
    articulo: 'Art. 50 Fracción XXI',
    titulo: 'Gastos de Comunicación Social y Publicidad Oficial',
    descripcion:
      'Montos destinados a comunicación social y publicidad oficial: tipo de medio, proveedores, número de contrato y concepto.',
    areaResponsable: 'Comunicación Social',
    periodoActualizacion: 'Trimestral',
    notaPeriodo: 'Ejercicio en curso y ejercicio anterior',
    ejerciciosHistorico: 1,
    esEspecificaMunicipio: false,
    subsecciones: [
      {
        clave: 'programa_comunicacion',
        titulo: 'Programa Anual de Comunicación Social',
        orden: 1,
      },
      {
        clave: 'gastos_publicidad',
        titulo: 'Gastos de Publicidad Oficial',
        orden: 2,
      },
    ],
  },
  {
    clave: 'auditorias',
    articulo: 'Art. 50 Fracción XXII',
    titulo: 'Auditorías al Ejercicio Presupuestal',
    descripcion:
      'Informes de resultados de auditorías y aclaraciones correspondientes.',
    areaResponsable: 'Contraloría',
    periodoActualizacion: 'Trimestral',
    notaPeriodo: 'Ejercicio en curso y dos ejercicios anteriores',
    ejerciciosHistorico: 2,
    esEspecificaMunicipio: false,
    subsecciones: [],
  },
  {
    clave: 'estados_financieros',
    articulo: 'Art. 50 Fracción XXIII',
    titulo: 'Estados Financieros',
    descripcion: 'Resultado de la dictaminación de los estados financieros.',
    areaResponsable: 'Tesorería',
    periodoActualizacion: 'Anual',
    notaPeriodo: 'Cuarto trimestre del año siguiente al ejercicio',
    ejerciciosHistorico: 2,
    esEspecificaMunicipio: false,
    subsecciones: [],
  },
  {
    clave: 'recursos_publicos',
    articulo: 'Art. 50 Fracción XXIV',
    titulo: 'Uso de Recursos Públicos',
    descripcion:
      'Montos, criterios, convocatorias y listado de personas con acceso a recursos públicos.',
    areaResponsable: 'Tesorería',
    periodoActualizacion: 'Trimestral',
    notaPeriodo: 'Ejercicio en curso y dos ejercicios anteriores',
    ejerciciosHistorico: 2,
    esEspecificaMunicipio: false,
    subsecciones: [],
  },
  {
    clave: 'concesiones_contratos',
    articulo: 'Art. 50 Fracción XXV',
    titulo: 'Concesiones, Contratos y Convenios',
    descripcion:
      'Concesiones, contratos, convenios, permisos, licencias o autorizaciones otorgados.',
    areaResponsable: 'Secretaría del Ayuntamiento',
    periodoActualizacion: 'Trimestral',
    notaPeriodo: 'Ejercicio en curso y dos ejercicios anteriores',
    ejerciciosHistorico: 2,
    esEspecificaMunicipio: false,
    subsecciones: [],
  },
  {
    clave: 'licitaciones',
    articulo: 'Art. 50 Fracción XXVI',
    titulo: 'Procedimientos de Licitación y Adjudicación',
    descripcion:
      'Resultados sobre adjudicación directa, invitación restringida y licitación pública.',
    areaResponsable: 'Contraloría',
    periodoActualizacion: 'Trimestral',
    notaPeriodo: 'Ejercicio en curso y dos ejercicios anteriores',
    ejerciciosHistorico: 2,
    esEspecificaMunicipio: false,
    subsecciones: [],
  },
  {
    clave: 'informes_generados',
    articulo: 'Art. 50 Fracción XXVII',
    titulo: 'Informes Institucionales',
    descripcion:
      'Informes que genere el municipio conforme a disposiciones jurídicas aplicables.',
    areaResponsable: 'Presidencia Municipal',
    periodoActualizacion: 'Trimestral',
    notaPeriodo: 'Ejercicio en curso y dos ejercicios anteriores',
    ejerciciosHistorico: 2,
    esEspecificaMunicipio: false,
    subsecciones: [],
  },
  {
    clave: 'estadisticas',
    articulo: 'Art. 50 Fracción XXVIII',
    titulo: 'Estadísticas Institucionales',
    descripcion:
      'Estadísticas generadas en cumplimiento de facultades y funciones.',
    areaResponsable: 'Presidencia Municipal',
    periodoActualizacion: 'Trimestral',
    notaPeriodo: 'Ejercicio en curso y dos ejercicios anteriores',
    ejerciciosHistorico: 2,
    esEspecificaMunicipio: false,
    subsecciones: [],
  },
  {
    clave: 'avances_presupuestales',
    articulo: 'Art. 50 Fracción XXIX',
    titulo: 'Avances Presupuestales',
    descripcion:
      'Avances programáticos o presupuestales, balances generales y estado financiero.',
    areaResponsable: 'Tesorería',
    periodoActualizacion: 'Trimestral',
    notaPeriodo: 'Ejercicio en curso y seis ejercicios anteriores',
    ejerciciosHistorico: 6,
    esEspecificaMunicipio: false,
    subsecciones: [],
  },
  {
    clave: 'donaciones',
    articulo: 'Art. 50 Fracción XLII',
    titulo: 'Donaciones',
    descripcion: 'Donaciones hechas a terceros en dinero o en especie.',
    areaResponsable: 'Tesorería',
    periodoActualizacion: 'Trimestral',
    notaPeriodo: 'Ejercicio en curso y dos ejercicios anteriores',
    ejerciciosHistorico: 2,
    esEspecificaMunicipio: false,
    subsecciones: [],
  },
  {
    clave: 'cuentas_publicas',
    articulo: 'Art. 50 Fracción XLIX',
    titulo: 'Cuentas Públicas',
    descripcion: 'Cuentas públicas municipales del ejercicio fiscal.',
    areaResponsable: 'Tesorería',
    periodoActualizacion: 'Anual',
    notaPeriodo: 'Cuarto trimestre del año siguiente al ejercicio',
    ejerciciosHistorico: 6,
    esEspecificaMunicipio: false,
    subsecciones: [],
  },
  {
    clave: 'servidores_comisionados',
    articulo: 'Art. 50 Fracción LI',
    titulo: 'Servidores Públicos Comisionados',
    descripcion:
      'Relación de servidores públicos comisionados y el objeto de la comisión.',
    areaResponsable: 'Contraloría',
    periodoActualizacion: 'Trimestral',
    notaPeriodo: 'Ejercicio en curso y ejercicio anterior',
    ejerciciosHistorico: 1,
    esEspecificaMunicipio: false,
    subsecciones: [],
  },
  {
    clave: 'expedientes_reservados',
    articulo: 'Art. 50 Fracción LII',
    titulo: 'Expedientes Reservados Clasificados',
    descripcion:
      'Información sobre expedientes reservados como clasificados e información desclasificada.',
    areaResponsable: 'Unidad de Transparencia',
    periodoActualizacion: 'Trimestral',
    notaPeriodo: 'Ejercicio en curso y ejercicio anterior',
    ejerciciosHistorico: 1,
    esEspecificaMunicipio: false,
    subsecciones: [],
  },
  {
    clave: 'catalogo_archivo',
    articulo: 'Art. 50 Fracción XLIII',
    titulo: 'Catálogo de Disposición y Guía de Archivo',
    descripcion: 'Catálogo de disposición documental y guía de archivo.',
    areaResponsable: 'Secretaría del Ayuntamiento',
    periodoActualizacion: 'Anual',
    notaPeriodo: 'Información vigente',
    ejerciciosHistorico: 0,
    esEspecificaMunicipio: false,
    subsecciones: [],
  },
  {
    clave: 'comite_transparencia',
    articulo: 'Art. 50 Fracción XXXVII',
    titulo: 'Comité de Transparencia',
    descripcion:
      'Actas, resoluciones, integrantes y calendario de sesiones del Comité de Transparencia.',
    areaResponsable: 'Unidad de Transparencia',
    periodoActualizacion: 'Trimestral',
    notaPeriodo: 'Ejercicio en curso y ejercicio anterior',
    ejerciciosHistorico: 1,
    esEspecificaMunicipio: false,
    subsecciones: [],
  },
];

// ── OBLIGACIONES ESPECÍFICAS MUNICIPIOS — Artículo 51 Fracción II
export const OBLIGACIONES_ESPECIFICAS_MUNICIPIOS: ObligacionConfig[] = [
  {
    clave: 'plan_municipal_desarrollo',
    articulo: 'Art. 51 Fracción II inciso a)',
    titulo: 'Plan Municipal de Desarrollo',
    descripcion: 'Plan Municipal de Desarrollo vigente.',
    areaResponsable: 'Secretaría del Ayuntamiento',
    periodoActualizacion: 'Anual',
    notaPeriodo: 'Vigente durante toda la administración',
    ejerciciosHistorico: 0,
    esEspecificaMunicipio: true,
    subsecciones: [],
  },
  {
    clave: 'ley_ingresos_presupuesto',
    articulo: 'Art. 51 Fracción II inciso b)',
    titulo: 'Ley de Ingresos y Presupuesto de Egresos',
    descripcion:
      'Ley de Ingresos y Presupuesto de Egresos del ejercicio fiscal vigente.',
    areaResponsable: 'Tesorería',
    periodoActualizacion: 'Anual',
    notaPeriodo: 'Primeros 30 días del ejercicio fiscal',
    ejerciciosHistorico: 2,
    esEspecificaMunicipio: true,
    subsecciones: [
      { clave: 'ley_ingresos', titulo: 'Ley de Ingresos', orden: 1 },
      {
        clave: 'presupuesto_egresos',
        titulo: 'Presupuesto de Egresos',
        orden: 2,
      },
    ],
  },
  {
    clave: 'contribuyentes_cancelacion',
    articulo: 'Art. 51 Fracción II inciso c)',
    titulo: 'Contribuyentes con Cancelación de Crédito Fiscal',
    descripcion:
      'Nombre, RFC y montos de contribuyentes a quienes se les hubiera cancelado o condonado algún crédito fiscal.',
    areaResponsable: 'Tesorería',
    periodoActualizacion: 'Trimestral',
    notaPeriodo: 'Ejercicio en curso y dos ejercicios anteriores',
    ejerciciosHistorico: 2,
    esEspecificaMunicipio: true,
    subsecciones: [],
  },
  {
    clave: 'desarrollo_urbano_licencias',
    articulo: 'Art. 51 Fracción II inciso d)',
    titulo: 'Planes de Desarrollo Urbano y Licencias',
    descripcion:
      'Planes de desarrollo urbano, ordenamiento territorial, tipos y usos de suelo, licencias otorgadas.',
    areaResponsable: 'Obras Públicas y Desarrollo Urbano',
    periodoActualizacion: 'Trimestral',
    notaPeriodo: 'Información vigente y ejercicio en curso',
    ejerciciosHistorico: 1,
    esEspecificaMunicipio: true,
    subsecciones: [
      {
        clave: 'planes_desarrollo_urbano',
        titulo: 'Planes de Desarrollo Urbano',
        orden: 1,
      },
      {
        clave: 'licencias_uso_suelo',
        titulo: 'Licencias de Uso de Suelo',
        orden: 2,
      },
      {
        clave: 'licencias_construccion',
        titulo: 'Licencias de Construcción',
        orden: 3,
      },
    ],
  },
  {
    clave: 'proyectos_disposiciones',
    articulo: 'Art. 51 Fracción II inciso e)',
    titulo: 'Proyectos de Disposiciones Administrativas',
    descripcion:
      'Proyectos de disposiciones administrativas, salvo que su difusión comprometa los efectos pretendidos.',
    areaResponsable: 'Secretaría del Ayuntamiento',
    periodoActualizacion: 'Trimestral',
    notaPeriodo: 'Información vigente',
    ejerciciosHistorico: 0,
    esEspecificaMunicipio: true,
    subsecciones: [],
  },
  {
    clave: 'gacetas_municipales',
    articulo: 'Art. 51 Fracción II inciso f)',
    titulo: 'Gacetas Municipales',
    descripcion:
      'Gacetas municipales con resolutivos y acuerdos aprobados por el Ayuntamiento.',
    areaResponsable: 'Secretaría del Ayuntamiento',
    periodoActualizacion: 'Trimestral',
    notaPeriodo: 'Ejercicio en curso y dos ejercicios anteriores',
    ejerciciosHistorico: 2,
    esEspecificaMunicipio: true,
    subsecciones: [],
  },
  {
    clave: 'policia_estadisticas',
    articulo: 'Art. 51 Fracción II inciso i)',
    titulo: 'Estadísticas de Cuerpos de Policía Municipal',
    descripcion:
      'Estadísticas e indicadores de desempeño de los cuerpos de policía municipal.',
    areaResponsable: 'Seguridad Pública',
    periodoActualizacion: 'Trimestral',
    notaPeriodo: 'Ejercicio en curso y dos ejercicios anteriores',
    ejerciciosHistorico: 2,
    esEspecificaMunicipio: true,
    subsecciones: [],
  },
  {
    clave: 'multas_recaudacion',
    articulo: 'Art. 51 Fracción II inciso j)',
    titulo: 'Multas y su Aplicación',
    descripcion:
      'Cantidades recibidas por concepto de multas y el uso o aplicación que se les dé.',
    areaResponsable: 'Tesorería',
    periodoActualizacion: 'Trimestral',
    notaPeriodo: 'Ejercicio en curso y dos ejercicios anteriores',
    ejerciciosHistorico: 2,
    esEspecificaMunicipio: true,
    subsecciones: [],
  },
  {
    clave: 'calendario_actividades',
    articulo: 'Art. 51 Fracción II inciso k)',
    titulo: 'Calendario de Actividades Culturales, Deportivas y Recreativas',
    descripcion:
      'Calendario con las actividades culturales, deportivas y recreativas a realizar.',
    areaResponsable: 'Dirección de Cultura y Recreación',
    periodoActualizacion: 'Trimestral',
    notaPeriodo: 'Trimestre en curso',
    ejerciciosHistorico: 0,
    esEspecificaMunicipio: true,
    subsecciones: [],
  },
  {
    clave: 'calendario_recoleccion_basura',
    articulo: 'Art. 51 Fracción II inciso l)',
    titulo: 'Calendario de Recolección de Basura',
    descripcion:
      'Calendario con horarios, número de unidad y teléfonos del servicio de recolección de basura.',
    areaResponsable: 'Dirección de Limpia Pública',
    periodoActualizacion: 'Trimestral',
    notaPeriodo: 'Trimestre en curso',
    ejerciciosHistorico: 0,
    esEspecificaMunicipio: true,
    subsecciones: [],
  },
];

// Catálogo completo unificado — 44 obligaciones
export const TODAS_LAS_OBLIGACIONES: ObligacionConfig[] = [
  ...OBLIGACIONES_COMUNES,
  ...OBLIGACIONES_ESPECIFICAS_MUNICIPIOS,
];

// ═══════════════════════════════════════════════════════════════
// SCHEMA — TransparenciaSeccion
// Una instancia por obligación por municipio (44 documentos)
// Se crean automáticamente al dar de alta el municipio
// ═══════════════════════════════════════════════════════════════

export type TransparenciaSeccionDocument = TransparenciaSeccion & Document;

@Schema({ _id: false })
export class TransparenciaDocumento {
  @Prop({ required: true })
  nombre: string;

  @Prop({ default: '' })
  descripcion: string;

  @Prop({ required: true, enum: ['pdf', 'excel', 'link', 'texto'] })
  tipo: 'pdf' | 'excel' | 'link' | 'texto';

  @Prop({ default: '' })
  archivoUrl: string;

  @Prop({ default: '' })
  archivoKey: string;

  @Prop({ default: '' })
  url: string;

  @Prop({ default: '' })
  texto: string;

  @Prop({ required: true })
  fechaPublicacion: Date;

  @Prop({ default: '' })
  periodoReferencia: string;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  subidoPor: Types.ObjectId;

  @Prop({ default: '' })
  nombreSubidoPor: string;

  @Prop({ default: '' })
  ejercicio: string;
}

export const TransparenciaDocumentoSchema = SchemaFactory.createForClass(
  TransparenciaDocumento,
);

@Schema({ _id: false })
export class TransparenciaSubseccion {
  @Prop({ required: true }) clave: string;
  @Prop({ required: true }) titulo: string;
  @Prop({ required: true }) orden: number;

  @Prop({ type: [TransparenciaDocumentoSchema], default: [] })
  documentos: TransparenciaDocumento[];

  @Prop() ultimaActualizacion?: Date;
}

export const TransparenciaSubseccionSchema = SchemaFactory.createForClass(
  TransparenciaSubseccion,
);

@Schema({
  collection: 'transparencia_secciones',
  timestamps: true,
})
export class TransparenciaSeccion {
  @Prop({ type: Types.ObjectId, ref: 'Municipio', required: true, index: true })
  municipioId: Types.ObjectId;

  @Prop({ required: true, index: true })
  clave: string;

  // Guardados desde el catálogo al crear el municipio
  @Prop({ required: true }) titulo: string;
  @Prop({ required: true }) descripcion: string;
  @Prop({ required: true }) articulo: string;
  @Prop({ required: true }) areaResponsable: string;
  @Prop({ required: true }) periodoActualizacion: string;
  @Prop({ required: true }) notaPeriodo: string;
  @Prop({ required: true }) ejerciciosHistorico: number;
  @Prop({ required: true }) esEspecificaMunicipio: boolean;

  // Si subsecciones[] tiene entradas → documentos van en cada subseccion
  // Si subsecciones[] está vacío → documentos van directo en documentos[]
  @Prop({ type: [TransparenciaSubseccionSchema], default: [] })
  subsecciones: TransparenciaSubseccion[];

  @Prop({ type: [TransparenciaDocumentoSchema], default: [] })
  documentos: TransparenciaDocumento[];

  @Prop()
  ultimaActualizacion?: Date;

  @Prop({ default: false })
  alCorriente: boolean;

  @Prop({ default: '' })
  notaInterna: string;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  ultimaModificacionPor?: Types.ObjectId;
}

export const TransparenciaSeccionSchema =
  SchemaFactory.createForClass(TransparenciaSeccion);

// Índice compuesto — un registro por obligación por municipio
TransparenciaSeccionSchema.index(
  { municipioId: 1, clave: 1 },
  { unique: true },
);

// ═══════════════════════════════════════════════════════════════
// TIPOS AUXILIARES
// ═══════════════════════════════════════════════════════════════

export interface TransparenciaDocumentoPublico {
  nombre: string;
  descripcion: string;
  tipo: 'pdf' | 'excel' | 'link' | 'texto';
  archivoUrl?: string;
  url?: string;
  texto?: string;
  fechaPublicacion: Date;
  periodoReferencia: string;
  ejercicio: string;
}

export interface TransparenciaSeccionPublica {
  clave: string;
  titulo: string;
  descripcion: string;
  articulo: string;
  areaResponsable: string;
  periodoActualizacion: string;
  notaPeriodo: string;
  ultimaActualizacion?: Date;
  subsecciones: {
    clave: string;
    titulo: string;
    orden: number;
    ultimaActualizacion?: Date;
    documentos: TransparenciaDocumentoPublico[];
  }[];
  documentos: TransparenciaDocumentoPublico[];
}

export interface ResumenCumplimiento {
  totalObligaciones: number;
  conDocumentos: number;
  alCorriente: number;
  sinDocumentos: number;
  porcentajeCumplimiento: number;
  enRiesgo: {
    clave: string;
    titulo: string;
    articulo: string;
    ultimaActualizacion?: Date;
    periodoActualizacion: string;
  }[];
}

// ── Seed ─────────────────────────────────────────────────────────────────────

export function buildSeedTransparencia(municipioId: Types.ObjectId) {
  return TODAS_LAS_OBLIGACIONES.map((obligacion) => ({
    municipioId,
    clave: obligacion.clave,
    titulo: obligacion.titulo,
    descripcion: obligacion.descripcion,
    articulo: obligacion.articulo,
    areaResponsable: obligacion.areaResponsable,
    periodoActualizacion: obligacion.periodoActualizacion,
    notaPeriodo: obligacion.notaPeriodo,
    ejerciciosHistorico: obligacion.ejerciciosHistorico,
    esEspecificaMunicipio: obligacion.esEspecificaMunicipio,
    subsecciones: obligacion.subsecciones.map((sub) => ({
      clave: sub.clave,
      titulo: sub.titulo,
      orden: sub.orden,
      documentos: [],
    })),
    documentos: [],
    alCorriente: false,
    notaInterna: '',
  }));
}
