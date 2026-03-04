import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { MetodoPago, CanalPago } from '@/shared/enums';

export type PagoCajaDocument = PagoCaja & Document;

@Schema({ collection: 'tesoreria_pagos', timestamps: true })
export class PagoCaja {
  @Prop({ type: Types.ObjectId, ref: 'Municipality', required: true })
  municipioId: Types.ObjectId;

  @Prop({ required: true })
  folio: string; // Generado por pre-save hook: CAJA-YYMM-XXXX

  // ==================== SERVICIO (SNAPSHOT) ====================
  @Prop({ type: Types.ObjectId, ref: 'ServicioCobro', required: true })
  servicioId: Types.ObjectId;

  @Prop({ required: true })
  servicioNombre: string; // Snapshot — queda fijo aunque cambie el nombre del servicio

  @Prop({ required: true })
  servicioCategoria: string; // Snapshot igual

  // ==================== CIUDADANO ====================
  @Prop({ type: Types.ObjectId, ref: 'Ciudadano', default: null })
  ciudadanoId: Types.ObjectId | null;

  // ==================== MONTO Y DESGLOSE FISCAL ====================
  @Prop({ required: true, min: 0 })
  monto: number; // Total cobrado al ciudadano

  @Prop({ required: true, min: 0 })
  subtotal: number; // monto / (1 + porcentajeContribucion/100)

  @Prop({ required: true, min: 0 })
  contribucion: number; // monto - subtotal

  @Prop({ required: true, min: 0, max: 100 })
  porcentajeContribucion: number; // snapshot del % configurado al momento del pago

  // ==================== PAGO ====================
  @Prop({ required: true, enum: MetodoPago })
  metodoPago: MetodoPago;

  @Prop({
    required: true,
    enum: ['PAGADO', 'PENDIENTE', 'CANCELADO'],
    default: 'PAGADO',
  })
  estado: string;

  @Prop({ required: true, enum: CanalPago, default: CanalPago.CAJA })
  canal: string;

  // ==================== CAJERO (SNAPSHOT) ====================
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  cajeroId: Types.ObjectId;

  @Prop({ required: true })
  cajeroNombre: string; // Snapshot — si el usuario cambia de nombre, el historial queda correcto

  // ==================== EXTRA ====================
  @Prop()
  observaciones?: string;

  // Referencia al documento relacionado (ej. folio del acta en Registro Civil,
  // número de expediente en DIF, clave catastral en Predial, etc.)
  @Prop()
  referenciaDocumento?: string;

  // S3 key del recibo PDF generado — permanente
  // Para obtener URL firmada: GET /tesoreria/pagos/caja/:id/recibo
  @Prop({ default: null })
  reciboS3Key: string | null;

  @Prop({ required: true })
  fechaPago: Date;
}

export const PagoCajaSchema = SchemaFactory.createForClass(PagoCaja);

// ==================== ÍNDICES ====================
PagoCajaSchema.index({ municipioId: 1, fechaPago: 1 });
PagoCajaSchema.index({ municipioId: 1, estado: 1, fechaPago: 1 });
PagoCajaSchema.index({ municipioId: 1, canal: 1, fechaPago: 1 });
PagoCajaSchema.index({ municipioId: 1, cajeroId: 1, fechaPago: 1 }); // corte de caja por cajero
PagoCajaSchema.index({ municipioId: 1, folio: 1 }, { unique: true });
// El folio se genera en el service con un contador atómico antes de llamar a .save()
// Formato: CAJA-{YYYYMM}-{0001}  (consecutivo por municipio y mes)
