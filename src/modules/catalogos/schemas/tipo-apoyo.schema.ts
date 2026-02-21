import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type TipoApoyoDocument = TipoApoyo & Document;

@Schema({ collection: 'catalogos_tipos_apoyo', timestamps: true })
export class TipoApoyo {
  @Prop({ required: true, unique: true, uppercase: true })
  clave: string;

  @Prop({ required: true })
  nombre: string;

  @Prop()
  descripcion?: string;

  @Prop({ default: true })
  activo: boolean;

  @Prop({ type: Date })
  createdAt: Date;

  @Prop({ type: Date })
  updatedAt: Date;
}

export const TipoApoyoSchema = SchemaFactory.createForClass(TipoApoyo);

// Indexes
TipoApoyoSchema.index({ activo: 1 });
