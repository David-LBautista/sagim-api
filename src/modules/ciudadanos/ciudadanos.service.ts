import {
  Injectable,
  NotFoundException,
  ConflictException,
  Inject,
  LoggerService,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Ciudadano, CiudadanoDocument } from './schemas/ciudadano.schema';
import { CreateCiudadanoDto } from './dto';

@Injectable()
export class CiudadanosService {
  constructor(
    @InjectModel(Ciudadano.name)
    private ciudadanoModel: Model<CiudadanoDocument>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
  ) {}

  async create(
    createCiudadanoDto: CreateCiudadanoDto,
    municipioId: string,
  ): Promise<CiudadanoDocument> {
    // Verificar que no exista el CURP en este municipio
    const existingCiudadano = await this.ciudadanoModel.findOne({
      curp: createCiudadanoDto.curp.toUpperCase(),
      municipioId,
    });

    if (existingCiudadano) {
      throw new ConflictException(
        `Ya existe un ciudadano con el CURP ${createCiudadanoDto.curp} en este municipio`,
      );
    }

    const ciudadano = await this.ciudadanoModel.create({
      ...createCiudadanoDto,
      curp: createCiudadanoDto.curp.toUpperCase(),
      municipioId,
    });

    this.logger.log(
      `Ciudadano creado: ${ciudadano.nombre} ${ciudadano.apellidoPaterno} (${ciudadano.curp})`,
      'CiudadanosService',
    );

    return ciudadano;
  }

  async findByCurp(curp: string, scope: any): Promise<CiudadanoDocument> {
    const ciudadano = await this.ciudadanoModel
      .findOne({
        curp: curp.toUpperCase(),
        ...scope,
      })
      .lean();

    if (!ciudadano) {
      throw new NotFoundException(
        `No se encontró un ciudadano con el CURP ${curp}`,
      );
    }

    return ciudadano as unknown as CiudadanoDocument;
  }

  async findOne(id: string, scope: any): Promise<CiudadanoDocument> {
    const ciudadano = await this.ciudadanoModel
      .findOne({ _id: id, ...scope })
      .lean();

    if (!ciudadano) {
      throw new NotFoundException('Ciudadano no encontrado');
    }

    return ciudadano as unknown as CiudadanoDocument;
  }
}
