import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ModuloDocument = Modulo & Document;

@Schema({ collection: 'catalog_modulos', timestamps: true })
export class Modulo {
  @Prop({ required: true })
  nombre: string;

  @Prop()
  descripcion?: string;

  @Prop({ required: true })
  activo: boolean;

  @Prop({ type: Date })
  createdAt: Date;

  @Prop({ type: Date })
  updatedAt: Date;
}

export const ModuloSchema = SchemaFactory.createForClass(Modulo);
