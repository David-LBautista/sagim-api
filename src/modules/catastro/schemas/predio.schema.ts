import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { PropertyUse } from '@/shared/enums';

export type PredioDocument = Predio & Document;

@Schema({ collection: 'catastro_predios', timestamps: true })
export class Predio {
  @Prop({ type: Types.ObjectId, ref: 'Municipality', required: true })
  municipioId: Types.ObjectId;

  @Prop({ required: true, unique: true })
  claveCatastral: string;

  @Prop({ type: Types.ObjectId, ref: 'Ciudadano', required: true })
  propietarioId: Types.ObjectId;

  @Prop({ required: true })
  ubicacion: string;

  @Prop()
  colonia?: string;

  @Prop()
  calle?: string;

  @Prop()
  numero?: string;

  @Prop({ type: Number, required: true })
  superficie: number;

  @Prop({ type: String, enum: PropertyUse, required: true })
  uso: PropertyUse;

  @Prop({ type: Number })
  valorCatastral?: number;

  @Prop({ type: Boolean, default: true })
  activo: boolean;

  @Prop()
  observaciones?: string;

  @Prop({ type: Date })
  createdAt: Date;

  @Prop({ type: Date })
  updatedAt: Date;
}

export const PredioSchema = SchemaFactory.createForClass(Predio);

// Indexes
PredioSchema.index({ municipioId: 1 });
PredioSchema.index({ propietarioId: 1 });
PredioSchema.index({ uso: 1 });
PredioSchema.index({ activo: 1 });
