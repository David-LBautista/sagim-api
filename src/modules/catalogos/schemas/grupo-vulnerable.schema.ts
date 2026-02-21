import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type GrupoVulnerableDocument = GrupoVulnerable & Document;

@Schema({ collection: 'catalogos_grupos_vulnerables', timestamps: true })
export class GrupoVulnerable {
  @Prop({ required: true, unique: true, uppercase: true })
  clave: string;

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

export const GrupoVulnerableSchema =
  SchemaFactory.createForClass(GrupoVulnerable);

// Indexes
GrupoVulnerableSchema.index({ activo: 1 });
