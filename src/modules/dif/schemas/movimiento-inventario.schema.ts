import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { SupportType } from '@/shared/enums';

export enum TipoMovimiento {
  ENTRADA = 'ENTRADA',
  SALIDA = 'SALIDA',
  AJUSTE = 'AJUSTE',
}

export type MovimientoInventarioDocument = MovimientoInventario & Document;

@Schema({ collection: 'dif_movimientos_inventario', timestamps: true })
export class MovimientoInventario {
  @Prop({ type: Types.ObjectId, ref: 'Municipality', required: true })
  municipioId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Programa', required: true })
  programaId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Inventario', required: true })
  inventarioId: Types.ObjectId;

  @Prop({ type: String, enum: TipoMovimiento, required: true })
  tipoMovimiento: TipoMovimiento;

  @Prop({ type: String, enum: SupportType, required: true })
  tipoRecurso: SupportType;

  @Prop({ type: Number, required: true })
  cantidad: number;

  @Prop({ type: Number, required: true })
  stockAnterior: number; // Stock antes del movimiento

  @Prop({ type: Number, required: true })
  stockNuevo: number; // Stock después del movimiento

  @Prop({ type: String, required: true })
  concepto: string; // Donación, Compra, Entrega a beneficiario, etc.

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  responsable: Types.ObjectId;

  @Prop({ type: Date, required: true })
  fecha: Date;

  @Prop({ type: Types.ObjectId, ref: 'Apoyo' })
  apoyoId?: Types.ObjectId; // Si el movimiento es por entrega de apoyo

  @Prop()
  comprobante?: string; // Número de factura, oficio, etc.

  @Prop()
  observaciones?: string;

  @Prop()
  folio: string;

  @Prop({ type: Date })
  createdAt: Date;

  @Prop({ type: Date })
  updatedAt: Date;
}

export const MovimientoInventarioSchema =
  SchemaFactory.createForClass(MovimientoInventario);

// Indexes
MovimientoInventarioSchema.index({ municipioId: 1 });
MovimientoInventarioSchema.index({ programaId: 1 });
MovimientoInventarioSchema.index({ inventarioId: 1 });
MovimientoInventarioSchema.index({ tipoMovimiento: 1 });
MovimientoInventarioSchema.index({ fecha: -1 });
MovimientoInventarioSchema.index({ folio: 1 }, { unique: true });

// Pre-save hook para generar folio
// eslint-disable-next-line @typescript-eslint/require-await
MovimientoInventarioSchema.pre('save', async function (next) {
  if (!this.folio) {
    const date = new Date();
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, '0');
    this.folio = `MOV-${year}${month}-${random}`;
  }
  next();
});
