import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Predio, PredioDocument } from './schemas/predio.schema';
import { Cita, CitaDocument } from './schemas/cita.schema';
import { CreatePredioDto, CreateCitaDto, UpdateCitaDto } from './dto';
import { AppointmentStatus } from '@/shared/enums';

@Injectable()
export class CatastroService {
  constructor(
    @InjectModel(Predio.name)
    private predioModel: Model<PredioDocument>,
    @InjectModel(Cita.name)
    private citaModel: Model<CitaDocument>,
  ) {}

  // ==================== PREDIOS ====================
  async createPredio(
    createPredioDto: CreatePredioDto,
    municipioId: string,
  ): Promise<Predio> {
    // Validar que no exista la clave catastral
    const existente = await this.predioModel.findOne({
      claveCatastral: createPredioDto.claveCatastral,
    });

    if (existente) {
      throw new ConflictException(
        `La clave catastral ${createPredioDto.claveCatastral} ya existe`,
      );
    }

    const predio = new this.predioModel({
      ...createPredioDto,
      municipioId: new Types.ObjectId(municipioId),
      propietarioId: new Types.ObjectId(createPredioDto.propietarioId),
    });

    return predio.save();
  }

  async findPredios(scope: any, propietarioId?: string): Promise<Predio[]> {
    const query: any = {
      ...scope,
      activo: true,
    };

    if (propietarioId) {
      query.propietarioId = new Types.ObjectId(propietarioId);
    }

    return this.predioModel
      .find(query)
      .populate(
        'propietarioId',
        'nombre apellidoPaterno apellidoMaterno curp telefono',
      )
      .sort({ claveCatastral: 1 })
      .exec();
  }

  async findPredioById(id: string, scope: any): Promise<Predio> {
    const predio = await this.predioModel
      .findOne({
        _id: new Types.ObjectId(id),
        ...scope,
      })
      .populate(
        'propietarioId',
        'nombre apellidoPaterno apellidoMaterno curp telefono email direccion',
      )
      .exec();

    if (!predio) {
      throw new NotFoundException(`Predio con ID ${id} no encontrado`);
    }

    return predio;
  }

  async findPredioByClave(claveCatastral: string, scope: any): Promise<Predio> {
    const predio = await this.predioModel
      .findOne({
        claveCatastral,
        ...scope,
      })
      .populate(
        'propietarioId',
        'nombre apellidoPaterno apellidoMaterno curp telefono email',
      )
      .exec();

    if (!predio) {
      throw new NotFoundException(
        `Predio con clave ${claveCatastral} no encontrado`,
      );
    }

    return predio;
  }

  // ==================== CITAS ====================
  async createCita(
    createCitaDto: CreateCitaDto,
    municipioId: string,
  ): Promise<Cita> {
    // Validar que el predio existe si se proporciona
    if (createCitaDto.predioId) {
      await this.findPredioById(createCitaDto.predioId, municipioId);
    }

    // Generar folio
    const count = await this.citaModel.countDocuments({
      municipioId: new Types.ObjectId(municipioId),
    });
    const folio = `CIT-${new Date().getFullYear()}-${String(count + 1).padStart(6, '0')}`;

    const cita = new this.citaModel({
      ...createCitaDto,
      municipioId: new Types.ObjectId(municipioId),
      predioId: createCitaDto.predioId
        ? new Types.ObjectId(createCitaDto.predioId)
        : undefined,
      ciudadanoId: new Types.ObjectId(createCitaDto.ciudadanoId),
      fecha: new Date(createCitaDto.fecha),
      folio,
    });

    return cita.save();
  }

  async findCitas(scope: any, estado?: string): Promise<Cita[]> {
    const query: any = { ...scope };

    if (estado) {
      query.estado = estado;
    }

    return this.citaModel
      .find(query)
      .populate('predioId', 'claveCatastral ubicacion uso')
      .populate(
        'ciudadanoId',
        'nombre apellidoPaterno apellidoMaterno curp telefono',
      )
      .populate('atendidoPor', 'nombre email')
      .sort({ fecha: -1 })
      .exec();
  }

  async findCitaById(id: string, scope: any): Promise<Cita> {
    const cita = await this.citaModel
      .findOne({
        _id: new Types.ObjectId(id),
        ...scope,
      })
      .populate('predioId')
      .populate(
        'ciudadanoId',
        'nombre apellidoPaterno apellidoMaterno curp telefono email',
      )
      .populate('atendidoPor', 'nombre email')
      .exec();

    if (!cita) {
      throw new NotFoundException(`Cita con ID ${id} no encontrada`);
    }

    return cita;
  }

  async updateCita(
    id: string,
    updateCitaDto: UpdateCitaDto,
    municipioId: string,
    userId: string,
  ): Promise<Cita> {
    const updateData: any = { ...updateCitaDto };

    // Si se completa la cita, registrar fecha y usuario
    if (updateCitaDto.estado === AppointmentStatus.COMPLETADA) {
      updateData.fechaAtencion = new Date();
      updateData.atendidoPor = new Types.ObjectId(userId);
    }

    const cita = await this.citaModel
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(id),
          municipioId: new Types.ObjectId(municipioId),
        },
        updateData,
        { new: true },
      )
      .populate('predioId', 'claveCatastral ubicacion')
      .populate('ciudadanoId', 'nombre apellidoPaterno apellidoMaterno curp')
      .populate('atendidoPor', 'nombre email')
      .exec();

    if (!cita) {
      throw new NotFoundException(`Cita con ID ${id} no encontrada`);
    }

    return cita;
  }
}
