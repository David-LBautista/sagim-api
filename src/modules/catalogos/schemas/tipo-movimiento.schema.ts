import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type TipoMovimientoDocument = TipoMovimiento & Document;

@Schema({ collection: 'catalogos_tipos_movimiento', timestamps: true })
export class TipoMovimiento {
  @Prop({ required: true, unique: true, uppercase: true })
  clave: string; // IN, OUT, AJUSTE

  @Prop({ required: true })
  nombre: string;

  @Prop()
  descripcion?: string;

  @Prop({ default: true })
  activo: boolean;

  @Prop({ type: Date })
  createdAt: Date;

  @Prop({ type: Date })
  updatedAt: Date;
}

export const TipoMovimientoSchema =
  SchemaFactory.createForClass(TipoMovimiento);

// Indexes
TipoMovimientoSchema.index({ activo: 1 });
