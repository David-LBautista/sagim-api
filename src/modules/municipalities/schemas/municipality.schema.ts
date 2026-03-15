import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { MunicipalityConfig } from '@/shared/interfaces';

export type MunicipalityDocument = Municipality & Document;

@Schema({ collection: 'catalogos_municipios', timestamps: true })
export class Municipality {
  @Prop({ required: true })
  nombre: string;

  @Prop({ type: Types.ObjectId, ref: 'Estado', required: true })
  estadoId: Types.ObjectId;

  @Prop({ unique: true, sparse: true })
  claveInegi?: string;

  @Prop({ type: Number, default: 0 })
  poblacion: number;

  @Prop({ type: Object, required: true })
  config: MunicipalityConfig;

  @Prop({ default: true })
  activo: boolean;

  @Prop()
  logoUrl?: string;

  /** Porcentaje de contribución incluido en el precio del servicio (default 10%).
   *  El cajero lo usa para desglosar subtotal + contribución en el recibo. */
  @Prop({ type: Number, default: 10, min: 0, max: 100 })
  porcentajeContribucion: number;

  @Prop()
  contactoEmail?: string;

  @Prop()
  contactoTelefono?: string;

  @Prop()
  direccion?: string;

  @Prop({ type: Number })
  latitud?: number;

  @Prop({ type: Number })
  longitud?: number;

  @Prop({ default: false })
  onboardingCompletado: boolean;

  @Prop({
    type: {
      /** Paso 1 — Datos del municipio verificados (el admin presionó Continuar) */
      datos: { type: Boolean, default: false },
      /** Paso 2 — Catálogo de servicios revisado */
      servicios: { type: Boolean, default: false },
      /** Paso 3 — Al menos 1 operativo registrado y confirmó Continuar */
      equipo: { type: Boolean, default: false },
      /** Paso 4 — Padrón importado O saltado explícitamente (opcional) */
      padron: { type: Boolean, default: false },
    },
    default: () => ({
      datos: false,
      servicios: false,
      equipo: false,
      padron: false,
    }),
  })
  onboardingSteps: {
    datos: boolean;
    servicios: boolean;
    equipo: boolean;
    padron: boolean;
  };

  @Prop({ type: Date })
  createdAt: Date;

  @Prop({ type: Date })
  updatedAt: Date;
}

export const MunicipalitySchema = SchemaFactory.createForClass(Municipality);

// Indexes optimizados para performance
MunicipalitySchema.index({ activo: 1 });
MunicipalitySchema.index({ estadoId: 1, nombre: 1 }); // Búsquedas por estado + nombre
