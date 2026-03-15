import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type PortalAvisoDocument = PortalAviso & Document;

export type TipoAviso = 'informativo' | 'alerta' | 'urgente';

@Schema({ collection: 'portal_avisos', timestamps: true })
export class PortalAviso {
  @Prop({ type: Types.ObjectId, ref: 'Municipality', required: true })
  municipioId: Types.ObjectId;

  /** Título principal del aviso. Ej: "Paga tu predial antes del 31 de marzo" */
  @Prop({ required: true, maxlength: 120 })
  titulo: string;

  /** Texto de apoyo opcional */
  @Prop({ default: '', maxlength: 500 })
  cuerpo: string;

  /** Determina el color/ícono en el front: informativo=azul, alerta=amarillo, urgente=rojo */
  @Prop({ enum: ['informativo', 'alerta', 'urgente'], default: 'informativo' })
  tipo: TipoAviso;

  /** URL opcional al que apunta el aviso (ruta interna o externa) */
  @Prop({ default: '' })
  url: string;

  /** Etiqueta del botón de acción cuando se define url. Ej: "Ver más", "Ir a pagos" */
  @Prop({ default: '' })
  urlTexto: string;

  /** Fecha desde la que el aviso es visible en el portal público */
  @Prop({ required: true })
  vigenciaInicio: Date;

  /** Fecha en la que el aviso deja de mostrarse */
  @Prop({ required: true })
  vigenciaFin: Date;

  /** Posición en el carrusel/listado (menor = primero) */
  @Prop({ default: 0 })
  orden: number;

  /** false = ocultado manualmente antes de que expire */
  @Prop({ default: true })
  activo: boolean;

  /** URL de imagen ilustrativa del aviso (Cloudinary). Se actualiza vía endpoint separado de upload. */
  @Prop({ default: '' })
  imagenUrl: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  creadoPor: Types.ObjectId;
}

export const PortalAvisoSchema = SchemaFactory.createForClass(PortalAviso);

PortalAvisoSchema.index({ municipioId: 1, activo: 1, vigenciaFin: 1 });
PortalAvisoSchema.index({ municipioId: 1, orden: 1 });
