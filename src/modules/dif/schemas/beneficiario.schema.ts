import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { VulnerableGroup } from '@/shared/enums';

export type BeneficiarioDocument = Beneficiario & Document;

@Schema({ collection: 'dif_beneficiarios', timestamps: true })
export class Beneficiario {
  @Prop({ type: Types.ObjectId, ref: 'Municipality', required: true })
  municipioId: Types.ObjectId;

  @Prop({ required: true })
  nombre: string;

  @Prop({ required: true })
  apellidoPaterno: string;

  @Prop()
  apellidoMaterno?: string;

  @Prop({ required: true, uppercase: true })
  curp: string;

  @Prop({ type: Date })
  fechaNacimiento?: Date;

  @Prop()
  telefono?: string;

  @Prop()
  email?: string;

  @Prop()
  domicilio?: string;

  @Prop()
  localidad?: string;

  @Prop({ type: [String], enum: VulnerableGroup, required: true })
  grupoVulnerable: VulnerableGroup[];

  @Prop()
  observaciones?: string;

  @Prop({ default: true })
  activo: boolean;

  @Prop({ type: Date, default: () => new Date() })
  fechaRegistro: Date;

  @Prop({ type: Date })
  createdAt: Date;

  @Prop({ type: Date })
  updatedAt: Date;
}

export const BeneficiarioSchema = SchemaFactory.createForClass(Beneficiario);

// Indexes
BeneficiarioSchema.index({ municipioId: 1 });
BeneficiarioSchema.index({ curp: 1, municipioId: 1 }, { unique: true });
BeneficiarioSchema.index({ grupoVulnerable: 1 });
BeneficiarioSchema.index({ activo: 1 });
BeneficiarioSchema.index({ nombre: 1, apellidoPaterno: 1 });
