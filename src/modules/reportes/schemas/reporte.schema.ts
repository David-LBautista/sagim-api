import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ReportType, ReportStatus } from '@/shared/enums';
import { Location } from '@/shared/interfaces';

export type ReporteDocument = Reporte & Document;

@Schema({ collection: 'reportes_reportes', timestamps: true })
export class Reporte {
  @Prop({ type: Types.ObjectId, ref: 'Municipality', required: true })
  municipioId: Types.ObjectId;

  @Prop()
  nombre?: string;

  @Prop()
  telefono?: string;

  @Prop({ type: String, enum: ReportType, required: true })
  tipo: ReportType;

  @Prop({ required: true })
  descripcion: string;

  @Prop({ type: Object, required: true })
  ubicacion: Location;

  @Prop()
  colonia?: string;

  @Prop()
  calle?: string;

  @Prop({ type: [String], default: [] })
  evidencia: string[];

  @Prop({ type: String, enum: ReportStatus, default: ReportStatus.PENDIENTE })
  estado: ReportStatus;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  asignadoA?: Types.ObjectId;

  @Prop()
  comentario?: string;

  @Prop({ type: Date })
  fechaAtencion?: Date;

  @Prop()
  folio: string;

  @Prop({ type: Date })
  createdAt: Date;

  @Prop({ type: Date })
  updatedAt: Date;
}

export const ReporteSchema = SchemaFactory.createForClass(Reporte);

// Indexes
ReporteSchema.index({ municipioId: 1 });
ReporteSchema.index({ ciudadanoId: 1 });
ReporteSchema.index({ tipo: 1 });
ReporteSchema.index({ estado: 1 });
ReporteSchema.index({ folio: 1 }, { unique: true });
ReporteSchema.index({ createdAt: -1 });

// Folio is generated atomically by ReportesService.create() — no pre-save hook needed
