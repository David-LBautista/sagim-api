import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { AppointmentStatus } from '@/shared/enums';

export type CitaDocument = Cita & Document;

@Schema({ collection: 'catastro_citas', timestamps: true })
export class Cita {
  @Prop({ type: Types.ObjectId, ref: 'Municipality', required: true })
  municipioId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Predio' })
  predioId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Ciudadano', required: true })
  ciudadanoId: Types.ObjectId;

  @Prop({ type: Date, required: true })
  fecha: Date;

  @Prop({ required: true })
  motivo: string;

  @Prop({
    type: String,
    enum: AppointmentStatus,
    default: AppointmentStatus.PENDIENTE,
  })
  estado: AppointmentStatus;

  @Prop()
  observaciones?: string;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  atendidoPor?: Types.ObjectId;

  @Prop({ type: Date })
  fechaAtencion?: Date;

  @Prop()
  folio: string;

  @Prop({ type: Date })
  createdAt: Date;

  @Prop({ type: Date })
  updatedAt: Date;
}

export const CitaSchema = SchemaFactory.createForClass(Cita);

// Indexes
CitaSchema.index({ municipioId: 1 });
CitaSchema.index({ predioId: 1 });
CitaSchema.index({ ciudadanoId: 1 });
CitaSchema.index({ fecha: 1 });
CitaSchema.index({ estado: 1 });
CitaSchema.index({ folio: 1 }, { unique: true });

// Pre-save hook to generate folio
CitaSchema.pre('save', async function (next) {
  if (!this.folio) {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, '0');
    this.folio = `CIT-${year}${month}-${random}`;
  }
  next();
});
