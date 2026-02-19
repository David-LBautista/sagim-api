import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum AuditAction {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  VIEW = 'VIEW',
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  EXPORT = 'EXPORT',
  DOWNLOAD = 'DOWNLOAD',
}

export enum AuditModule {
  AUTH = 'AUTH',
  USUARIOS = 'USUARIOS',
  DIF = 'DIF',
  TESORERIA = 'TESORERIA',
  REGISTRO_CIVIL = 'REGISTRO_CIVIL',
  CATASTRO = 'CATASTRO',
  REPORTES = 'REPORTES',
  CIUDADANOS = 'CIUDADANOS',
  PAGOS = 'PAGOS',
}

export type AuditLogDocument = AuditLog & Document;

@Schema({ collection: 'audit_logs', timestamps: true })
export class AuditLog {
  @Prop({
    type: Types.ObjectId,
    ref: 'Municipality',
    required: true,
    index: true,
  })
  municipioId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  usuarioId: Types.ObjectId;

  @Prop({ required: true })
  rol: string; // UserRole del usuario al momento de la acción

  @Prop({ type: String, enum: AuditModule, required: true, index: true })
  modulo: AuditModule;

  @Prop({ type: String, enum: AuditAction, required: true, index: true })
  accion: AuditAction;

  @Prop({ required: true })
  entidad: string; // Beneficiario, Apoyo, Pago, etc.

  @Prop()
  entidadId?: string; // ID del documento afectado

  @Prop({ type: Object })
  cambios?: {
    antes?: Record<string, any>;
    despues?: Record<string, any>;
  };

  @Prop()
  ip?: string; // IP del usuario

  @Prop()
  userAgent?: string; // Navegador/dispositivo

  @Prop()
  descripcion?: string; // Descripción legible de la acción

  @Prop({ type: Object })
  metadata?: Record<string, any>; // Datos adicionales

  // Timestamps automáticos de Mongoose
  createdAt?: Date;
  updatedAt?: Date;
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);

// Índices compuestos para consultas frecuentes
AuditLogSchema.index({ municipioId: 1, modulo: 1, createdAt: -1 });
AuditLogSchema.index({ municipioId: 1, usuarioId: 1, createdAt: -1 });
AuditLogSchema.index({ municipioId: 1, accion: 1, createdAt: -1 });
AuditLogSchema.index({ createdAt: -1 }); // Para TTL y consultas por fecha
