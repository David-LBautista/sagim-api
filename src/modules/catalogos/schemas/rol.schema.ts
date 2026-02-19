import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type RolDocument = Rol & Document;

@Schema({ collection: 'catalog_roles', timestamps: true })
export class Rol {
  @Prop({ required: true, unique: true, uppercase: true })
  nombre: string; // SUPER_ADMIN, ADMIN_MUNICIPIO, OPERATIVO

  @Prop({ required: true })
  descripcion: string;

  @Prop({ default: true })
  activo: boolean;

  @Prop({ type: Date })
  createdAt: Date;

  @Prop({ type: Date })
  updatedAt: Date;
}

export const RolSchema = SchemaFactory.createForClass(Rol);

// Indexes
RolSchema.index({ activo: 1 });
