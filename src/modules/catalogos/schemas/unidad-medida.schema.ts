import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UnidadMedidaDocument = UnidadMedida & Document;

@Schema({ collection: 'catalogos_unidades_medida', timestamps: true })
export class UnidadMedida {
  @Prop({ required: true, unique: true, uppercase: true })
  clave: string;

  @Prop({ required: true })
  nombre: string;

  @Prop({ default: true })
  activo: boolean;

  @Prop({ type: Date })
  createdAt: Date;

  @Prop({ type: Date })
  updatedAt: Date;
}

export const UnidadMedidaSchema = SchemaFactory.createForClass(UnidadMedida);

// Indexes
UnidadMedidaSchema.index({ activo: 1 });
