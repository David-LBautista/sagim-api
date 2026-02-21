import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type LocalidadDocument = Localidad & Document;

@Schema({ collection: 'catalogos_localidades', timestamps: true })
export class Localidad {
  @Prop({ type: Types.ObjectId, ref: 'Municipality', required: true })
  municipioId: Types.ObjectId;

  @Prop({ required: true })
  nombre: string;

  @Prop()
  clave?: string; // Clave INEGI u otro identificador oficial

  @Prop()
  poblacion?: number;

  @Prop()
  codigoPostal?: string;

  @Prop({ default: true })
  activo: boolean;

  @Prop({ type: Date })
  createdAt: Date;

  @Prop({ type: Date })
  updatedAt: Date;
}

export const LocalidadSchema = SchemaFactory.createForClass(Localidad);

// Indexes
LocalidadSchema.index({ municipioId: 1 });
LocalidadSchema.index({ nombre: 1 });
LocalidadSchema.index({ activo: 1 });
LocalidadSchema.index({ municipioId: 1, nombre: 1 }, { unique: true });
