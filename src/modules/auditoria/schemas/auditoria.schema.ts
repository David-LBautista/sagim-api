import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { AuditAction } from '@/shared/enums';

export type AuditoriaDocument = Auditoria & Document;

@Schema({ collection: 'audit_auditorias', timestamps: true })
export class Auditoria {
  @Prop({ type: Types.ObjectId, ref: 'Municipality', required: true })
  municipioId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  usuarioId: Types.ObjectId;

  @Prop({ required: true })
  usuario: string;

  @Prop({ type: String, enum: AuditAction, required: true })
  accion: AuditAction;

  @Prop({ required: true })
  entidad: string;

  @Prop({ type: Types.ObjectId })
  entidadId?: Types.ObjectId;

  @Prop()
  descripcion?: string;

  @Prop({ type: Object })
  datosAnteriores?: any;

  @Prop({ type: Object })
  datosNuevos?: any;

  @Prop()
  ip?: string;

  @Prop()
  userAgent?: string;

  @Prop({ type: Date, default: Date.now })
  fecha: Date;

  @Prop({ type: Date })
  createdAt: Date;
}

export const AuditoriaSchema = SchemaFactory.createForClass(Auditoria);

// Indexes
AuditoriaSchema.index({ municipioId: 1 });
AuditoriaSchema.index({ usuarioId: 1 });
AuditoriaSchema.index({ accion: 1 });
AuditoriaSchema.index({ entidad: 1 });
AuditoriaSchema.index({ fecha: -1 });
AuditoriaSchema.index({ createdAt: -1 });

// TTL index - auto-delete after 2 years
AuditoriaSchema.index({ createdAt: 1 }, { expireAfterSeconds: 63072000 });
