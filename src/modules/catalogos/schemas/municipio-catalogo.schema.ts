import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type MunicipioCatalogoDocument = MunicipioCatalogo & Document;

@Schema({ collection: 'catalogos_municipios_veracruz', timestamps: true })
export class MunicipioCatalogo {
  @Prop({ required: true })
  nombre: string;

  @Prop({ required: true })
  poblacion: number;

  @Prop({ type: Types.ObjectId, ref: 'Estado', required: true })
  estadoId: Types.ObjectId;

  @Prop({ required: true, default: true })
  activo: boolean;

  createdAt: Date;
  updatedAt: Date;
}

export const MunicipioCatalogoSchema =
  SchemaFactory.createForClass(MunicipioCatalogo);

// Indexes optimizados para performance
MunicipioCatalogoSchema.index({ estadoId: 1 });
MunicipioCatalogoSchema.index({ activo: 1 });
MunicipioCatalogoSchema.index({ estadoId: 1, nombre: 1 }); // Búsquedas por estado + nombre
