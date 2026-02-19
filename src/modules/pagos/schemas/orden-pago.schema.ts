import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { PaymentConcept } from '@/shared/enums';

export enum OrdenPagoStatus {
  PENDIENTE = 'PENDIENTE',
  PAGADA = 'PAGADA',
  EXPIRADA = 'EXPIRADA',
  CANCELADA = 'CANCELADA',
}

export type OrdenPagoDocument = OrdenPago & Document;

@Schema({ collection: 'pagos_ordenes', timestamps: true })
export class OrdenPago {
  @Prop({ required: true, unique: true, index: true })
  token: string; // UUID v4

  @Prop({ type: Types.ObjectId, ref: 'Municipality', required: true })
  municipioId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'ServicioMunicipal' })
  servicioId?: Types.ObjectId; // Servicio municipal (acta, licencia, etc.)

  @Prop({ type: Types.ObjectId, ref: 'Predio' })
  predioId?: Types.ObjectId; // Solo si es pago de predial (futuro)

  @Prop({ type: Types.ObjectId, ref: 'Ciudadano' })
  ciudadanoId?: Types.ObjectId; // Opcional - asociar pago a ciudadano

  @Prop({ required: true })
  monto: number;

  @Prop({ type: String, enum: PaymentConcept, default: PaymentConcept.OTRO })
  concepto: PaymentConcept;

  @Prop({
    type: String,
    enum: OrdenPagoStatus,
    default: OrdenPagoStatus.PENDIENTE,
  })
  estado: OrdenPagoStatus;

  @Prop({ required: true })
  expiresAt: Date; // 24-72 horas

  @Prop()
  usadaAt?: Date; // Fecha en que se usó

  @Prop()
  descripcion?: string;

  @Prop()
  areaResponsable?: string; // Registro Civil, DIF, etc.

  @Prop({ type: [Number] }) // [2024, 2025, 2026] - Solo para predial futuro
  añosPagados?: number[];

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  creadaPorId: Types.ObjectId; // Usuario de Tesorería que generó la orden

  @Prop({ type: Object })
  metadata?: {
    emailCiudadano?: string;
    [key: string]: any;
  }; // Datos adicionales (email, teléfono, etc.)

  @Prop()
  stripePaymentIntentId?: string; // Se llena cuando el ciudadano paga

  @Prop({ type: Types.ObjectId, ref: 'Pago' })
  pagoId?: Types.ObjectId; // Referencia al pago generado
}

export const OrdenPagoSchema = SchemaFactory.createForClass(OrdenPago);

// Índices compuestos
OrdenPagoSchema.index({ municipioId: 1, estado: 1 });
OrdenPagoSchema.index({ servicioId: 1 });
OrdenPagoSchema.index({ predioId: 1, createdAt: -1 });
OrdenPagoSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index para auto-expirar
