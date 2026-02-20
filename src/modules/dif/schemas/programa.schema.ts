import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ProgramaDocument = Programa & Document;

@Schema({ collection: 'dif_programas', timestamps: true })
export class Programa {
  @Prop({ type: Types.ObjectId, ref: 'Municipality', required: false })
  municipioId?: Types.ObjectId;

  @Prop({ required: true })
  nombre: string;

  @Prop({ required: true })
  descripcion: string;

  @Prop({ default: true })
  activo: boolean;

  @Prop({ type: Number, default: 0 })
  presupuestoAnual?: number;

  @Prop({ type: Date })
  fechaInicio?: Date;

  @Prop({ type: Date })
  fechaFin?: Date;

  @Prop({ type: Date })
  createdAt: Date;

  @Prop({ type: Date })
  updatedAt: Date;
}

export const ProgramaSchema = SchemaFactory.createForClass(Programa);

// Indexes
ProgramaSchema.index({ municipioId: 1 });
ProgramaSchema.index({ nombre: 1 });
ProgramaSchema.index({ activo: 1 });
