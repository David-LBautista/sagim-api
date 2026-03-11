import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type CategoriaServicioDocument = CategoriaServicio & Document;

@Schema({ collection: 'catalogos_categorias_servicios', timestamps: true })
export class CategoriaServicio {
  /** Nombre visible de la categoría — ej. "Registro Civil", "Predial" */
  @Prop({ required: true, unique: true })
  nombre: string;

  /** Área o departamento municipal responsable de estos trámites */
  @Prop({ required: true })
  areaResponsable: string;

  /** Posición de orden en listados y formularios */
  @Prop({ default: 0 })
  orden: number;

  @Prop({ default: true })
  activo: boolean;
}

export const CategoriaServicioSchema =
  SchemaFactory.createForClass(CategoriaServicio);

CategoriaServicioSchema.index({ activo: 1 });
CategoriaServicioSchema.index({ orden: 1 });
