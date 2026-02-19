import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { MunicipalityConfig } from '@/shared/interfaces';

export type MunicipalityDocument = Municipality & Document;

@Schema({ collection: 'catalog_municipios', timestamps: true })
export class Municipality {
  @Prop({ required: true, unique: true })
  nombre: string;

  @Prop({ required: true })
  estado: string;

  @Prop({ unique: true, sparse: true })
  claveInegi?: string;

  @Prop({ type: Number, default: 0 })
  poblacion: number;

  @Prop({ type: Object, required: true })
  config: MunicipalityConfig;

  @Prop({ default: true })
  activo: boolean;

  @Prop()
  logoUrl?: string;

  @Prop()
  contactoEmail?: string;

  @Prop()
  contactoTelefono?: string;

  @Prop()
  direccion?: string;

  @Prop({ type: Date })
  createdAt: Date;

  @Prop({ type: Date })
  updatedAt: Date;
}

export const MunicipalitySchema = SchemaFactory.createForClass(Municipality);

// Indexes (nombre y claveInegi ya tienen unique: true, solo agregamos activo)
MunicipalitySchema.index({ activo: 1 });
