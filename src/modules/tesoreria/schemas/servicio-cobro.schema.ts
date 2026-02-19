import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ServicioCobroDocument = ServicioCobro & Document;

@Schema({ collection: 'tesoreria_servicios_cobro', timestamps: true })
export class ServicioCobro {
  @Prop({ type: Types.ObjectId, ref: 'Municipality', required: true })
  municipioId: Types.ObjectId;

  @Prop({ required: true })
  nombre: string; // "Acta de Nacimiento Certificada"

  @Prop()
  descripcion?: string; // "Emisión de acta certificada"

  @Prop({ required: true })
  costo: number; // Precio en pesos

  @Prop({ default: true })
  activo: boolean;
}

export const ServicioCobroSchema = SchemaFactory.createForClass(ServicioCobro);

// Índices
ServicioCobroSchema.index({ municipioId: 1, activo: 1 });
ServicioCobroSchema.index({ nombre: 1 });
