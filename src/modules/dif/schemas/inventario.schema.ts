import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type InventarioDocument = Inventario & Document;

@Schema({ collection: 'dif_inventario', timestamps: true })
export class Inventario {
  @Prop({ type: Types.ObjectId, ref: 'Municipality', required: true })
  municipioId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Programa', required: true })
  programaId: Types.ObjectId;

  @Prop({ type: String, required: true })
  tipo: string;

  @Prop({ type: Number, required: true, default: 0 })
  stockActual: number;

  @Prop({ type: Number, required: true, default: 0 })
  stockInicial: number;

  @Prop({ type: String, default: 'piezas' })
  unidadMedida: string; // piezas, pesos, litros, etc.

  @Prop({ type: Number, default: 0 })
  alertaMinima: number; // Alerta cuando stock baje de este número

  @Prop({ type: Number })
  valorUnitario?: number; // Valor en pesos de cada unidad (opcional)

  @Prop({ type: Date })
  createdAt: Date;

  @Prop({ type: Date })
  updatedAt: Date;
}

export const InventarioSchema = SchemaFactory.createForClass(Inventario);

// Indexes
InventarioSchema.index({ municipioId: 1 });
InventarioSchema.index({ programaId: 1 });
InventarioSchema.index({ tipo: 1 });
InventarioSchema.index({ programaId: 1, tipo: 1 }, { unique: true }); // Un inventario por programa+tipo

// Virtual para saber si está en alerta
InventarioSchema.virtual('enAlerta').get(function () {
  return this.stockActual <= this.alertaMinima;
});

// Virtual para total de salidas
InventarioSchema.virtual('totalEntregado').get(function () {
  return this.stockInicial - this.stockActual;
});
