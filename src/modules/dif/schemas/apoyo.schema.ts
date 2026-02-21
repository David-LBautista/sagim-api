import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ApoyoDocument = Apoyo & Document;

@Schema({ collection: 'dif_apoyos', timestamps: true })
export class Apoyo {
  @Prop({ type: Types.ObjectId, ref: 'Municipality', required: true })
  municipioId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Beneficiario', required: true })
  beneficiarioId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Programa', required: true })
  programaId: Types.ObjectId;

  @Prop({ type: Date, required: true })
  fecha: Date;

  @Prop({ type: String, required: true })
  tipo: string;

  @Prop({ type: Number, default: 0 })
  monto: number;

  @Prop({ type: Number, default: 1 })
  cantidad: number; // Cantidad de recursos entregados (ej: 2 despensas)

  @Prop({
    type: [
      {
        inventarioId: {
          type: Types.ObjectId,
          ref: 'Inventario',
          required: true,
        },
        cantidad: { type: Number, required: true },
        valorUnitario: { type: Number, default: 0 },
        tipo: { type: String },
      },
    ],
    default: [],
  })
  items?: Array<{
    inventarioId: Types.ObjectId;
    cantidad: number;
    valorUnitario: number;
    tipo: string;
  }>;

  @Prop()
  observaciones?: string;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  entregadoPor?: Types.ObjectId;

  @Prop()
  comprobante?: string;

  @Prop()
  folio: string;

  @Prop({ type: Date })
  createdAt: Date;

  @Prop({ type: Date })
  updatedAt: Date;
}

export const ApoyoSchema = SchemaFactory.createForClass(Apoyo);

// Indexes
ApoyoSchema.index({ municipioId: 1 });
ApoyoSchema.index({ beneficiarioId: 1 });
ApoyoSchema.index({ programaId: 1 });
ApoyoSchema.index({ fecha: -1 });
ApoyoSchema.index({ tipo: 1 });
ApoyoSchema.index({ folio: 1 }, { unique: true });

// Pre-save hook to generate folio
ApoyoSchema.pre('save', async function (next) {
  if (!this.folio) {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, '0');
    this.folio = `DIF-${year}${month}-${random}`;
  }
  next();
});
