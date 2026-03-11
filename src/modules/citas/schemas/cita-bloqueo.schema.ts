import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type CitaBloqueoDocument = CitaBloqueo & Document;

@Schema({ collection: 'citas_bloqueos', timestamps: true })
export class CitaBloqueo {
  @Prop({
    type: Types.ObjectId,
    ref: 'Municipality',
    required: true,
    index: true,
  })
  municipioId: Types.ObjectId;

  /** Área a la que aplica el bloqueo — ej: 'Registro Civil' */
  @Prop({ required: true })
  area: string;

  @Prop({ required: true })
  fechaInicio: Date;

  @Prop({ required: true })
  fechaFin: Date;

  /** Motivo del bloqueo — ej: 'Reunión de área', 'Día festivo', 'Mantenimiento' */
  @Prop({ required: true })
  motivo: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  creadoPor: Types.ObjectId;

  @Prop({ type: Date })
  createdAt: Date;

  @Prop({ type: Date })
  updatedAt: Date;
}

export const CitaBloqueoSchema = SchemaFactory.createForClass(CitaBloqueo);

CitaBloqueoSchema.index({ municipioId: 1, area: 1, fechaInicio: 1 });
