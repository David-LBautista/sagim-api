import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Reporte, ReporteDocument } from './schemas/reporte.schema';
import { CreateReporteDto, UpdateReporteDto } from './dto';
import { ReportStatus } from '@/shared/enums';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

@Injectable()
export class ReportesService {
  constructor(
    @InjectModel(Reporte.name)
    private reporteModel: Model<ReporteDocument>,
    private cloudinaryService: CloudinaryService,
  ) {}

  async create(
    createReporteDto: CreateReporteDto,
    municipioIdFromToken: string,
    files?: Express.Multer.File[],
  ): Promise<Reporte> {
    // Subir imágenes a Cloudinary si se proporcionaron
    let evidenciaUrls: string[] = [];
    if (files && files.length > 0) {
      evidenciaUrls = await this.cloudinaryService.uploadMultipleImages(
        files,
        'sagim/reportes',
      );
    }

    // Generar folio único
    const count = await this.reporteModel.countDocuments({
      municipioId: new Types.ObjectId(municipioIdFromToken),
    });
    const folio = `REP-${new Date().getFullYear()}-${String(count + 1).padStart(6, '0')}`;

    const reporte = new this.reporteModel({
      ...createReporteDto,
      municipioId: new Types.ObjectId(municipioIdFromToken),
      evidencia: evidenciaUrls,
      folio,
    });

    return reporte.save();
  }

  async findAll(
    scope: any,
    filters: {
      tipo?: string;
      estado?: string;
      colonia?: string;
    },
  ): Promise<Reporte[]> {
    const query: any = { ...scope };

    if (filters.tipo) {
      query.tipo = filters.tipo;
    }

    if (filters.estado) {
      query.estado = filters.estado;
    }

    if (filters.colonia) {
      query.colonia = { $regex: filters.colonia, $options: 'i' };
    }

    return this.reporteModel
      .find(query)
      .populate('asignadoA', 'nombre email')
      .sort({ createdAt: -1 })
      .exec();
  }

  async findOne(id: string, scope: any): Promise<Reporte> {
    const reporte = await this.reporteModel
      .findOne({
        _id: new Types.ObjectId(id),
        ...scope,
      })
      .populate(
        'ciudadanoId',
        'nombre apellidoPaterno apellidoMaterno curp telefono email',
      )
      .populate('asignadoA', 'nombre email')
      .exec();

    if (!reporte) {
      throw new NotFoundException(`Reporte con ID ${id} no encontrado`);
    }

    return reporte;
  }

  async update(
    id: string,
    updateReporteDto: UpdateReporteDto,
    municipioId: string,
  ): Promise<Reporte> {
    const updateData: any = { ...updateReporteDto };

    // Si se marca como atendido, registrar fecha
    if (updateReporteDto.estado === ReportStatus.ATENDIDO) {
      updateData.fechaAtencion = new Date();
    }

    const reporte = await this.reporteModel
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(id),
          municipioId: new Types.ObjectId(municipioId),
        },
        updateData,
        { new: true },
      )
      .populate('asignadoA', 'nombre email')
      .exec();

    if (!reporte) {
      throw new NotFoundException(`Reporte con ID ${id} no encontrado`);
    }

    return reporte;
  }

  async uploadImages(
    files: Express.Multer.File[],
  ): Promise<{ urls: string[] }> {
    if (!files || files.length === 0) {
      throw new BadRequestException('No se proporcionaron archivos');
    }

    const urls = await this.cloudinaryService.uploadMultipleImages(
      files,
      'sagim/reportes',
    );

    return { urls };
  }
}
