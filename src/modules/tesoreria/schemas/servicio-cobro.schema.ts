import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { TipoTramite } from '../dto/create-servicio-cobro.dto';

export type ServicioCobroDocument = ServicioCobro & Document;

@Schema({ collection: 'tesoreria_servicios_cobro', timestamps: true })
export class ServicioCobro {
  /** null = catálogo global (plantilla); ObjectId = servicio propio del municipio */
  @Prop({ type: Types.ObjectId, ref: 'Municipality', default: null })
  municipioId: Types.ObjectId | null;

  /** Clave única por municipio — ej. "ACTA_NACIMIENTO" */
  @Prop({ required: true })
  clave: string;

  @Prop({ required: true })
  nombre: string;

  @Prop()
  descripcion?: string;

  @Prop({ required: true })
  categoria: string; // "Registro Civil", "Predial", etc.

  /** Departamento municipal responsable del trámite — ej. "Registro Civil", "Tesorería", "Obras Públicas" */
  @Prop({ required: true })
  areaResponsable: string;

  @Prop({ required: true, default: 0 })
  costo: number; // monto base en pesos

  /** Costo fijo expresado en pesos MXN */
  @Prop()
  costoPesos?: number;

  /** Costo expresado en Unidades de Medida y Actualización (UMA) */
  @Prop()
  costoUMA?: number;

  /** true = el cajero puede modificar el monto al cobrar */
  @Prop({ default: false })
  montoVariable: boolean;

  /** true = debe asociarse a un ciudadano/contribuyente */
  @Prop({ default: false })
  requiereContribuyente: boolean;

  /** true = el servicio aplica algún tipo de descuento */
  @Prop({ default: false })
  tieneDescuento: boolean;

  /** Clasificación: 'tramite' | 'servicio' */
  @Prop({ enum: TipoTramite })
  tipoTramite?: TipoTramite;

  /** Posición de orden en la UI del cajero */
  @Prop({ default: 0 })
  orden: number;

  @Prop({ default: true })
  activo: boolean;
}

export const ServicioCobroSchema = SchemaFactory.createForClass(ServicioCobro);

// Índices
ServicioCobroSchema.index({ municipioId: 1, clave: 1 }, { unique: true });
ServicioCobroSchema.index({ municipioId: 1, activo: 1 });
ServicioCobroSchema.index({ categoria: 1 });
ServicioCobroSchema.index({ nombre: 1 });
