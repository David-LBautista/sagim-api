import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

// ═══════════════════════════════════════════════════════════════
// SUB-SCHEMAS
// ═══════════════════════════════════════════════════════════════

@Schema({ _id: false })
export class PortalApariencia {
  @Prop({ default: '#1e3a5f' })
  colorPrimario: string;

  @Prop({ default: '#c9a84c' })
  colorSecundario: string;

  /** URL del banner principal (S3). Se actualiza vía endpoint separado de upload. */
  @Prop({ default: '' })
  bannerUrl: string;

  @Prop({ default: '' })
  bannerAlt: string;
}
export const PortalAparienciaSchema =
  SchemaFactory.createForClass(PortalApariencia);

@Schema({ _id: false })
export class PortalGeneral {
  /** Subtítulo debajo del nombre del municipio. Ej: 'H. Ayuntamiento de La Perla' */
  @Prop({ default: '' })
  subtitulo: string;

  @Prop({
    default:
      'Aquí podrás realizar tus trámites de manera ágil, oportuna y transparente.',
  })
  mensajeBienvenida: string;

  @Prop({ default: true }) mostrarCitas: boolean;
  @Prop({ default: true }) mostrarReportes: boolean;
  @Prop({ default: true }) mostrarTransparencia: boolean;

  @Prop({ default: false }) enMantenimiento: boolean;
  @Prop({ default: '' }) mensajeMantenimiento: string;
}
export const PortalGeneralSchema = SchemaFactory.createForClass(PortalGeneral);

@Schema({ _id: false })
export class PortalRedesSociales {
  @Prop({ default: '' }) facebook: string;
  @Prop({ default: '' }) twitter: string;
  @Prop({ default: '' }) instagram: string;
  @Prop({ default: '' }) youtube: string;
  /** Sitio oficial externo si el municipio ya tiene uno */
  @Prop({ default: '' }) sitioWeb: string;
}
export const PortalRedesSocialesSchema =
  SchemaFactory.createForClass(PortalRedesSociales);

@Schema({ _id: false })
export class FooterLinkItem {
  @Prop({ required: true }) texto: string;
  @Prop({ required: true }) url: string;
  /** true → abre en nueva pestaña */
  @Prop({ default: false }) externo: boolean;
}
export const FooterLinkItemSchema =
  SchemaFactory.createForClass(FooterLinkItem);

@Schema({ _id: false })
export class FooterColumna {
  @Prop({ required: true }) titulo: string;

  @Prop({ type: [FooterLinkItemSchema], default: [] })
  links: FooterLinkItem[];
}
export const FooterColumnaSchema = SchemaFactory.createForClass(FooterColumna);

@Schema({ _id: false })
export class FooterNumeroEmergencia {
  @Prop({ required: true }) numero: string; // '01 800 716 34 10'
  @Prop({ required: true }) servicio: string; // 'Protección Civil'
}
export const FooterNumeroEmergenciaSchema = SchemaFactory.createForClass(
  FooterNumeroEmergencia,
);

@Schema({ _id: false })
export class PortalFooter {
  @Prop({ default: '' }) direccion: string;
  @Prop({ default: '' }) correo: string;
  @Prop({ default: '' }) telefono: string;

  /** Hasta 3 columnas de links personalizados */
  @Prop({ type: [FooterColumnaSchema], default: [] })
  columnas: FooterColumna[];

  @Prop({ type: [FooterNumeroEmergenciaSchema], default: [] })
  numerosEmergencia: FooterNumeroEmergencia[];

  /** Ej: '© 2026 H. Ayuntamiento de La Perla. Todos los derechos reservados.' */
  @Prop({ default: '' })
  textoLegal: string;
}
export const PortalFooterSchema = SchemaFactory.createForClass(PortalFooter);

// ═══════════════════════════════════════════════════════════════
// SCHEMA PRINCIPAL
// ═══════════════════════════════════════════════════════════════

export type PortalConfiguracionDocument = PortalConfiguracion & Document;

@Schema({ collection: 'portal_configuracion', timestamps: true })
export class PortalConfiguracion {
  @Prop({
    type: Types.ObjectId,
    ref: 'Municipality',
    required: true,
    unique: true,
  })
  municipioId: Types.ObjectId;

  @Prop({ type: PortalGeneralSchema, default: () => ({}) })
  general: PortalGeneral;

  @Prop({ type: PortalAparienciaSchema, default: () => ({}) })
  apariencia: PortalApariencia;

  @Prop({ type: PortalRedesSocialesSchema, default: () => ({}) })
  redesSociales: PortalRedesSociales;

  @Prop({ type: PortalFooterSchema, default: () => ({}) })
  footer: PortalFooter;

  /** Usuario que realizó el último cambio */
  @Prop({ type: Types.ObjectId, ref: 'User' })
  ultimaModificacionPor?: Types.ObjectId;
}

export const PortalConfiguracionSchema =
  SchemaFactory.createForClass(PortalConfiguracion);
