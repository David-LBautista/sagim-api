import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Address } from '@/shared/interfaces';

export type CiudadanoDocument = Ciudadano & Document;

@Schema({ collection: 'ciudadanos_ciudadanos', timestamps: true })
export class Ciudadano {
  @Prop({ type: Types.ObjectId, ref: 'Municipality', required: true })
  municipioId: Types.ObjectId;

  @Prop({ required: true, uppercase: true })
  curp: string;

  @Prop({ required: true })
  nombre: string;

  @Prop({ required: true })
  apellidoPaterno: string;

  @Prop({ required: true })
  apellidoMaterno: string;

  @Prop()
  telefono?: string;

  @Prop({ lowercase: true })
  email?: string;

  @Prop({ type: Object })
  direccion?: Address;

  @Prop({ type: Date })
  fechaNacimiento?: Date;

  @Prop()
  fotoPerfil?: string;

  @Prop({ default: true })
  activo: boolean;

  @Prop({ type: Date })
  createdAt: Date;

  @Prop({ type: Date })
  updatedAt: Date;
}

export const CiudadanoSchema = SchemaFactory.createForClass(Ciudadano);

// Indexes
CiudadanoSchema.index({ curp: 1, municipioId: 1 }, { unique: true });
CiudadanoSchema.index({ municipioId: 1 });
CiudadanoSchema.index({ email: 1 });
CiudadanoSchema.index({ telefono: 1 });
CiudadanoSchema.index({ activo: 1 });

// Compound text index for search
CiudadanoSchema.index({
  nombre: 'text',
  apellidoPaterno: 'text',
  apellidoMaterno: 'text',
  curp: 'text',
});
