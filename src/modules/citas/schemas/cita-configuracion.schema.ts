import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type DiaSemana =
  | 'lunes'
  | 'martes'
  | 'miercoles'
  | 'jueves'
  | 'viernes'
  | 'sabado'
  | 'domingo';

export type CitaConfiguracionDocument = CitaConfiguracion & Document;

@Schema({ collection: 'citas_configuracion', timestamps: true })
export class CitaConfiguracion {
  @Prop({
    type: Types.ObjectId,
    ref: 'Municipality',
    required: true,
    index: true,
  })
  municipioId: Types.ObjectId;

  /** Área municipal que atiende citas — ej: 'Registro Civil', 'DIF', 'Tesorería' */
  @Prop({ required: true })
  area: string;

  /** Módulo al que pertenece el área — ej: 'REGISTRO_CIVIL', 'DIF', 'TESORERIA' */
  @Prop({ required: true })
  modulo: string;

  @Prop({ required: true, default: true })
  activo: boolean;

  /** Duración en minutos de cada slot */
  @Prop({ required: true, default: 30 })
  duracionSlotMinutos: number;

  /** Días de anticipación mínima para agendar */
  @Prop({ required: true, default: 0 })
  diasAnticipacionMinima: number;

  /** Días de anticipación máxima para agendar */
  @Prop({ required: true, default: 30 })
  diasAnticipacionMaxima: number;

  /**
   * Horarios por día de la semana.
   * Cada entrada define qué bloques HH:mm-HH:mm atiende ese día
   * y cuántas citas simultáneas acepta cada slot.
   */
  @Prop({
    type: [
      {
        dia: { type: String, required: true },
        activo: { type: Boolean, default: true },
        bloques: {
          type: [
            {
              inicio: { type: String, required: true }, // '09:00'
              fin: { type: String, required: true }, // '14:00'
              capacidadPorSlot: { type: Number, default: 1 },
            },
          ],
          default: [],
        },
      },
    ],
    default: [],
  })
  horarios: Array<{
    dia: DiaSemana;
    activo: boolean;
    bloques: Array<{
      inicio: string;
      fin: string;
      capacidadPorSlot: number;
    }>;
  }>;

  /** Fechas bloqueadas específicas (festivos, sesiones de cabildo, etc.) */
  @Prop({ type: [Date], default: [] })
  diasBloqueados: Date[];

  /**
   * Lista de trámites disponibles para agendar cita en esta área.
   * Ej: ['Acta de Nacimiento', 'Matrimonio Civil', 'Acta de Defunción']
   */
  @Prop({ type: [String], default: [] })
  tramites: string[];

  /** Instrucciones para el ciudadano — ej: 'Traer original y copia de identificación' */
  @Prop({ default: '' })
  instrucciones: string;

  /** Usuario que configuró el área */
  @Prop({ type: Types.ObjectId, ref: 'User' })
  configuradoPor?: Types.ObjectId;

  @Prop({ type: Date })
  createdAt: Date;

  @Prop({ type: Date })
  updatedAt: Date;
}

export const CitaConfiguracionSchema =
  SchemaFactory.createForClass(CitaConfiguracion);

/** Un municipio solo puede tener una configuración por área */
CitaConfiguracionSchema.index({ municipioId: 1, area: 1 }, { unique: true });
