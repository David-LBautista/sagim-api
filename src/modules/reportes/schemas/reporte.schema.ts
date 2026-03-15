import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ReporteDocument = Reporte & Document;
export type ReportesConfiguracionDocument = ReportesConfiguracion & Document;

// ═══════════════════════════════════════════════════════════════
// CATÁLOGO DE CATEGORÍAS DE REPORTES CIUDADANOS
// ═══════════════════════════════════════════════════════════════

export interface CategoriaReporteConfig {
  clave: string;
  nombre: string;
  descripcion: string;
  icono: string;
  areaResponsable: string;
  modulo: string;
}

export const CATALOGO_CATEGORIAS_REPORTES: CategoriaReporteConfig[] = [
  {
    clave: 'infraestructura_vial',
    nombre: 'Baches y Pavimento',
    descripcion: 'Hoyos, grietas o daños en calles y banquetas',
    icono: 'road',
    areaResponsable: 'Dirección de Obras Públicas y Desarrollo Urbano',
    modulo: 'DESARROLLO_URBANO',
  },
  {
    clave: 'alumbrado_publico',
    nombre: 'Alumbrado Público',
    descripcion: 'Lámparas apagadas o dañadas en calles y espacios públicos',
    icono: 'lightbulb',
    areaResponsable: 'Dirección de Obras Públicas y Desarrollo Urbano',
    modulo: 'DESARROLLO_URBANO',
  },
  {
    clave: 'agua_drenaje',
    nombre: 'Agua y Drenaje',
    descripcion: 'Fugas de agua, drenaje tapado o sin servicio de agua',
    icono: 'droplets',
    areaResponsable: 'Instituto Metropolitano del Agua',
    modulo: 'ORGANISMO_AGUA',
  },
  {
    clave: 'basura_limpieza',
    nombre: 'Basura y Limpieza',
    descripcion:
      'Basura acumulada, tiraderos clandestinos o falta de recolección',
    icono: 'trash',
    areaResponsable: 'Dirección de Limpia Pública',
    modulo: 'SERVICIOS_PUBLICOS',
  },
  {
    clave: 'areas_verdes',
    nombre: 'Parques y Áreas Verdes',
    descripcion: 'Daños en parques, jardines, juegos o mobiliario urbano',
    icono: 'tree',
    areaResponsable: 'Dirección de Obras Públicas y Desarrollo Urbano',
    modulo: 'DESARROLLO_URBANO',
  },
  {
    clave: 'medio_ambiente',
    nombre: 'Medio Ambiente',
    descripcion: 'Contaminación, tala de árboles o maltrato animal',
    icono: 'leaf',
    areaResponsable: 'Dirección de Medio Ambiente y Protección Animal',
    modulo: 'SERVICIOS_PUBLICOS',
  },
  {
    clave: 'seguridad_publica',
    nombre: 'Seguridad Pública',
    descripcion: 'Situaciones de riesgo, vandalismo o incidentes de seguridad',
    icono: 'shield',
    areaResponsable: 'Dirección de Gobernación',
    modulo: 'SEGURIDAD_PUBLICA',
  },
  {
    clave: 'transito_vialidad',
    nombre: 'Tránsito y Vialidad',
    descripcion: 'Señalización dañada, semáforos descompuestos o accidentes',
    icono: 'traffic-cone',
    areaResponsable: 'Dirección de Tránsito y Vialidad',
    modulo: 'SERVICIOS_PUBLICOS',
  },
  {
    clave: 'proteccion_civil',
    nombre: 'Protección Civil',
    descripcion:
      'Riesgos estructurales, inundaciones o situaciones de emergencia',
    icono: 'alert-triangle',
    areaResponsable: 'Dirección de Protección Civil',
    modulo: 'SERVICIOS_PUBLICOS',
  },
  {
    clave: 'otro',
    nombre: 'Otro',
    descripcion: 'Cualquier otro problema no listado anteriormente',
    icono: 'help-circle',
    areaResponsable: 'Presidencia Municipal',
    modulo: 'PRESIDENCIA',
  },
];

// ═══════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════

export type EstadoReporte =
  | 'pendiente'
  | 'en_proceso'
  | 'resuelto'
  | 'cancelado';

// ═══════════════════════════════════════════════════════════════
// 1. CONFIGURACIÓN DE REPORTES POR MUNICIPIO
// ═══════════════════════════════════════════════════════════════

@Schema({ collection: 'reportes_configuracion', timestamps: true })
export class ReportesConfiguracion extends Document {
  @Prop({
    type: Types.ObjectId,
    ref: 'Municipality',
    required: true,
    unique: true,
  })
  municipioId: Types.ObjectId;

  @Prop({
    type: [String],
    default: CATALOGO_CATEGORIAS_REPORTES.map((c) => c.clave),
  })
  categoriasActivas: string[];

  @Prop({
    default:
      'Reporta un problema en tu comunidad y dale seguimiento desde aquí.',
  })
  mensajeBienvenida: string;

  @Prop({ default: '72 horas hábiles' })
  tiempoRespuestaEstimado: string;

  @Prop({ default: true })
  activo: boolean;
}

export const ReportesConfiguracionSchema = SchemaFactory.createForClass(
  ReportesConfiguracion,
);

// ═══════════════════════════════════════════════════════════════
// 2. SUBDOCUMENTOS
// ═══════════════════════════════════════════════════════════════

@Schema({ _id: false })
export class DatosCiudadanoReporte {
  @Prop({ default: '' }) nombre: string;
  @Prop({ default: '' }) telefono: string;
  @Prop({ default: '' }) correo: string;
  @Prop({ default: false }) recibirNotificaciones: boolean;
}

@Schema({ _id: false })
export class UbicacionReporte {
  @Prop({ required: true }) descripcion: string;
  @Prop({ default: '' }) colonia: string;
  @Prop({ default: '' }) referencia: string;
  @Prop() latitud?: number;
  @Prop() longitud?: number;
}

@Schema({ _id: false })
export class HistorialEstado {
  @Prop({ required: true }) estado: EstadoReporte;
  @Prop({ required: true }) fecha: Date;
  @Prop({ default: '' }) comentarioPublico: string;
  @Prop({ default: '' }) notaInterna: string;
  @Prop({ type: Types.ObjectId, ref: 'Usuario' }) usuarioId?: Types.ObjectId;
  @Prop({ default: '' }) nombreUsuario: string;
}

// ═══════════════════════════════════════════════════════════════
// 3. REPORTE CIUDADANO
// ═══════════════════════════════════════════════════════════════

@Schema({ collection: 'reportes', timestamps: true })
export class Reporte extends Document {
  @Prop({ required: true, unique: true, index: true })
  folio: string;

  @Prop({
    type: Types.ObjectId,
    ref: 'Municipality',
    required: true,
    index: true,
  })
  municipioId: Types.ObjectId;

  @Prop({ required: true, index: true })
  categoria: string;

  @Prop({ required: true })
  categoriaNombre: string;

  @Prop({ required: true })
  areaResponsable: string;

  @Prop({ required: true })
  modulo: string;

  @Prop({ required: true, minlength: 10, maxlength: 500 })
  descripcion: string;

  @Prop({ type: UbicacionReporte, required: true })
  ubicacion: UbicacionReporte;

  @Prop({ type: DatosCiudadanoReporte, default: {} })
  ciudadano: DatosCiudadanoReporte;

  @Prop({ type: Types.ObjectId, ref: 'Ciudadano' })
  ciudadanoId?: Types.ObjectId;

  @Prop({ type: [String], default: [] })
  evidencia: string[];

  @Prop({ required: true, default: 'pendiente', index: true })
  estado: EstadoReporte;

  @Prop({ type: [HistorialEstado], default: [] })
  historial: HistorialEstado[];

  @Prop({ type: Types.ObjectId, ref: 'Usuario' })
  asignadoA?: Types.ObjectId;

  @Prop({ default: '' })
  nombreAsignado: string;

  @Prop()
  fechaResolucion?: Date;

  @Prop({ index: true })
  tokenConsulta: string;

  @Prop({ required: true, default: 'portal_publico' })
  origen: 'portal_publico' | 'interno' | 'telefono';

  @Prop({ type: Types.ObjectId, ref: 'Usuario' })
  creadoPor?: Types.ObjectId;

  @Prop({ default: 'normal' })
  prioridad: 'baja' | 'normal' | 'alta' | 'urgente';

  @Prop({ default: true })
  visible: boolean;
}

export const ReporteSchema = SchemaFactory.createForClass(Reporte);

ReporteSchema.index({ municipioId: 1, estado: 1 });
ReporteSchema.index({ municipioId: 1, categoria: 1 });
ReporteSchema.index({ municipioId: 1, modulo: 1 });
ReporteSchema.index({ municipioId: 1, createdAt: -1 });

// Folio is generated atomically by ReportesService.create() — no pre-save hook needed
