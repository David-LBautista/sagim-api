import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { PaymentConcept, PaymentStatus } from '@/shared/enums';

export type PagoDocument = Pago & Document;

@Schema({ collection: 'pagos_pagos', timestamps: true })
export class Pago {
  @Prop({ type: Types.ObjectId, ref: 'Municipality', required: true })
  municipioId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'OrdenPago' })
  ordenPagoId?: Types.ObjectId; // Referencia a la orden de pago (si aplica)

  @Prop({ type: Types.ObjectId, ref: 'Predio' })
  predioId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Ciudadano' })
  ciudadanoId?: Types.ObjectId;

  @Prop({ type: String, enum: PaymentConcept, required: true })
  concepto: PaymentConcept;

  // ==================== MONTOS (CONTABILIDAD) ====================
  @Prop({ type: Number, required: true })
  montoBase: number; // Precio ventanilla (ej: $250)

  @Prop({ type: Number, required: true })
  montoEnLinea: number; // Precio en línea autorizado (ej: $270)

  @Prop({ type: Number, required: true })
  montoCobrado: number; // Lo que pagó el ciudadano (= montoEnLinea)

  @Prop({ type: Number })
  stripeFee?: number; // Fee que cobra Stripe (ej: $16.20)

  @Prop({ type: Number })
  montoNetoMunicipio?: number; // Lo que recibe el municipio (montoCobrado - stripeFee)

  // Reglas de fee
  @Prop({ type: String, default: 'CIUDADANO' })
  feePagadoPor?: string; // 'CIUDADANO' | 'MUNICIPIO'

  @Prop({ type: String, default: 'PRECIO_EN_LINEA' })
  esquemaPrecio?: string; // 'PRECIO_EN_LINEA' | 'BASE_MAS_FEE'

  // ==================== LEGACY (Mantener compatibilidad) ====================
  @Prop({ type: Number, required: true })
  monto: number; // = montoCobrado (mantener por compatibilidad)

  @Prop({ type: String, enum: PaymentStatus, default: PaymentStatus.PENDIENTE })
  estado: PaymentStatus;

  @Prop({ required: true })
  stripePaymentIntentId: string;

  @Prop()
  stripeChargeId?: string;

  @Prop()
  stripeBalanceTxnId?: string; // ID de transacción de balance de Stripe

  @Prop({ type: String, default: 'STRIPE' })
  pasarela?: string; // 'STRIPE' | 'PAYPAL' | 'OTRO'

  @Prop()
  metodoPago?: string;

  @Prop()
  descripcion?: string;

  @Prop({ type: Date })
  fechaPago?: Date;

  @Prop()
  s3Key?: string; // Key de S3 (NO URL): municipios/{clave}/{modulo}/pagos/{YYYY}/{MM}/recibo-{folio}.pdf

  @Prop()
  municipioClave?: string; // Clave del municipio para S3 (LA_PERLA, ORIZABA, etc.)

  @Prop({ type: Number, default: 1 })
  version?: number; // Versión del recibo (si se regenera)

  @Prop()
  recibo?: string; // DEPRECATED - Mantener por compatibilidad, usar s3Key

  @Prop()
  folio: string;

  @Prop({ type: String, default: 'MXN' })
  moneda?: string; // 'MXN' | 'USD'

  @Prop({ type: Number })
  anioFiscal?: number; // Año fiscal para reportes (2026, 2027, etc.)

  @Prop({ type: Date })
  createdAt: Date;

  @Prop({ type: Date })
  updatedAt: Date;
}

export const PagoSchema = SchemaFactory.createForClass(Pago);

// Indexes
PagoSchema.index({ municipioId: 1 });
PagoSchema.index({ predioId: 1 });
PagoSchema.index({ ciudadanoId: 1 });
PagoSchema.index({ concepto: 1 });
PagoSchema.index({ estado: 1 });
PagoSchema.index({ stripePaymentIntentId: 1 });
PagoSchema.index({ folio: 1 }, { unique: true });
PagoSchema.index({ fechaPago: -1 });

// Pre-save hook to generate folio
PagoSchema.pre('save', async function (next) {
  if (!this.folio) {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, '0');
    this.folio = `PAG-${year}${month}-${random}`;
  }
  next();
});
