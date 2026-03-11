import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Predio, PredioDocument } from './schemas/predio.schema';
import { CreatePredioDto } from './dto';

@Injectable()
export class CatastroService {
  constructor(
    @InjectModel(Predio.name)
    private predioModel: Model<PredioDocument>,
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
}
