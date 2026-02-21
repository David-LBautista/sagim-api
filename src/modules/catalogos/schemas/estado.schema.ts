import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type EstadoDocument = Estado & Document;

@Schema({ collection: 'catalogos_estados', timestamps: true })
export class Estado {
  @Prop({ required: true, unique: true })
  clave: string;

  @Prop({ required: true })
  nombre: string;

  @Prop({ required: true, default: true })
  activo: boolean;

  createdAt: Date;
  updatedAt: Date;
}

export const EstadoSchema = SchemaFactory.createForClass(Estado);
