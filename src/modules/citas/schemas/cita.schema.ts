import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type EstadoCita =
  | 'pendiente' // agendada, esperando que llegue el día
  | 'confirmada' // confirmada por el área (opcional)
  | 'atendida' // el ciudadano llegó y fue atendido
  | 'no_se_presento' // el ciudadano no llegó
  | 'cancelada'; // cancelada por ciudadano o funcionario

export type CitaDocument = Cita & Document;

@Schema({ collection: 'citas', timestamps: true })
export class Cita {
  /** Folio único — CIT-YYYYMM-XXXX */
  @Prop({ required: true, unique: true, index: true })
  folio: string;

  @Prop({
    type: Types.ObjectId,
    ref: 'Municipality',
    required: true,
    index: true,
  })
  municipioId: Types.ObjectId;

  /** Área municipal que atiende — ej: 'Registro Civil' */
  @Prop({ required: true })
  area: string;

  /** Módulo al que pertenece — ej: 'REGISTRO_CIVIL' */
  @Prop({ required: true })
  modulo: string;

  /** Trámite específico que solicita — ej: 'Acta de Nacimiento' */
  @Prop({ required: true })
  tramite: string;

  /** Referencia al catálogo de servicios cobrables (opcional) */
  @Prop({ type: Types.ObjectId, ref: 'ServicioCobro' })
  servicioId?: Types.ObjectId;

  /** Fecha y hora de la cita */
  @Prop({ required: true, index: true })
  fechaCita: Date;

  /** Hora en formato string para facilitar queries — ej: '09:00' */
  @Prop({ required: true })
  horario: string;

  /**
   * Datos del ciudadano al momento de agendar (snapshot).
   * Se almacenan aunque después se actualice el padrón.
   */
  @Prop({
    type: {
      ciudadanoId: { type: Types.ObjectId, ref: 'Ciudadano' },
      nombreCompleto: { type: String, required: true },
      curp: { type: String, required: true },
      telefono: { type: String, required: true },
      correo: { type: String, default: '' },
      ciudadanoNuevo: { type: Boolean, default: false },
    },
    required: true,
  })
  ciudadano: {
    ciudadanoId?: Types.ObjectId;
    nombreCompleto: string;
    curp: string;
    telefono: string;
    correo: string;
    /** true si fue creado en el padrón automáticamente al agendar desde portal público */
    ciudadanoNuevo: boolean;
  };

  @Prop({
    type: String,
    enum: [
      'pendiente',
      'confirmada',
      'atendida',
      'no_se_presento',
      'cancelada',
    ],
    default: 'pendiente',
  })
  estado: EstadoCita;

  /** Notas del ciudadano al agendar */
  @Prop({ default: '' })
  notasCiudadano: string;

  /** Notas del funcionario al atender */
  @Prop({ default: '' })
  notasFuncionario: string;

  /** Origen de la cita */
  @Prop({
    type: String,
    enum: ['portal_publico', 'recepcion'],
    required: true,
    default: 'portal_publico',
  })
  origen: 'portal_publico' | 'recepcion';

  /** Funcionario que agendó (solo cuando origen = 'recepcion') */
  @Prop({ type: Types.ObjectId, ref: 'User' })
  agendadoPor?: Types.ObjectId;

  /** Funcionario que marcó la cita como atendida */
  @Prop({ type: Types.ObjectId, ref: 'User' })
  atendidaPor?: Types.ObjectId;

  @Prop({ type: Date })
  fechaAtencion?: Date;

  /** Datos de cancelación cuando estado = 'cancelada' */
  @Prop({
    type: {
      motivo: { type: String, required: true },
      fecha: { type: Date, required: true },
      canceladoPor: { type: String, required: true }, // 'ciudadano' | 'funcionario'
      usuarioId: { type: Types.ObjectId, ref: 'User' },
    },
  })
  cancelacion?: {
    motivo: string;
    fecha: Date;
    canceladoPor: 'ciudadano' | 'funcionario';
    usuarioId?: Types.ObjectId;
  };

  /**
   * Token de un solo uso para que el ciudadano pueda consultar
   * o cancelar su cita sin necesidad de crear cuenta.
   */
  @Prop({ index: true })
  tokenConsulta: string;

  /** true cuando ya se envió el recordatorio 24h antes */
  @Prop({ default: false })
  recordatorioEnviado: boolean;

  @Prop({ type: Date })
  createdAt: Date;

  @Prop({ type: Date })
  updatedAt: Date;
}

export const CitaSchema = SchemaFactory.createForClass(Cita);

CitaSchema.index({ municipioId: 1, fechaCita: 1, area: 1 });
CitaSchema.index({ municipioId: 1, estado: 1 });
CitaSchema.index({ 'ciudadano.curp': 1, municipioId: 1 });
