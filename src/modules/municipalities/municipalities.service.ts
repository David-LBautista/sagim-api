import {
  Injectable,
  NotFoundException,
  ConflictException,
  Inject,
  LoggerService,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import {
  Municipality,
  MunicipalityDocument,
} from './schemas/municipality.schema';
import { Programa, ProgramaDocument } from '../dif/schemas/programa.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import { CreateMunicipalityDto, UpdateMunicipalityConfigDto } from './dto';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import * as bcrypt from 'bcrypt';
import { UserRole } from '@/shared/enums';

@Injectable()
export class MunicipalitiesService {
  constructor(
    @InjectModel(Municipality.name)
    private municipalityModel: Model<MunicipalityDocument>,
    @InjectModel(Programa.name)
    private programaModel: Model<ProgramaDocument>,
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
    private readonly cloudinaryService: CloudinaryService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
  ) {}

  async create(
    createMunicipalityDto: CreateMunicipalityDto,
    logo?: Express.Multer.File,
  ): Promise<MunicipalityDocument> {
    // Verificar que no exista el municipio con la misma clave INEGI (solo si se proporciona)
    if (createMunicipalityDto.claveInegi) {
      const existingMunicipality = await this.municipalityModel.findOne({
        claveInegi: createMunicipalityDto.claveInegi,
      });

      if (existingMunicipality) {
        throw new ConflictException(
          `Ya existe un municipio con la clave INEGI ${createMunicipalityDto.claveInegi}`,
        );
      }
    }

    // Verificar que no exista el municipio con el mismo nombre
    const existingName = await this.municipalityModel.findOne({
      nombre: createMunicipalityDto.nombre,
    });

    if (existingName) {
      throw new ConflictException(
        `Ya existe un municipio con el nombre ${createMunicipalityDto.nombre}`,
      );
    }

    // Subir logo a Cloudinary si se proporciona
    let logoUrl: string | undefined;
    if (logo) {
      const uploadResult = await this.cloudinaryService.uploadImage(
        logo,
        'municipios/logos',
      );
      logoUrl = uploadResult.secure_url;
    }

    const municipality = await this.municipalityModel.create({
      ...createMunicipalityDto,
      estadoId: new Types.ObjectId(createMunicipalityDto.estadoId),
      logoUrl,
    });

    // Crear programas base del DIF para el nuevo municipio
    const programasBase = [
      {
        nombre: 'Apoyo Alimentario',
        descripcion:
          'Entrega periódica de despensas a familias en situación de vulnerabilidad',
        activo: true,
        municipioId: new Types.ObjectId(municipality._id),
      },
      {
        nombre: 'Apoyo a Adultos Mayores',
        descripcion:
          'Entrega de apoyos económicos o en especie a personas adultas mayores',
        activo: true,
        municipioId: new Types.ObjectId(municipality._id),
      },
      {
        nombre: 'Apoyo a Personas con Discapacidad',
        descripcion:
          'Entrega de apoyos asistenciales a personas con discapacidad',
        activo: true,
        municipioId: new Types.ObjectId(municipality._id),
      },
      {
        nombre: 'Apoyos Emergentes',
        descripcion:
          'Programa para atender situaciones urgentes (incendios, inundaciones, contingencias)',
        activo: true,
        municipioId: new Types.ObjectId(municipality._id),
      },
      {
        nombre: 'Apoyo Escolar',
        descripcion:
          'Entrega de útiles escolares, uniformes o apoyos a estudiantes de familias vulnerables',
        activo: true,
        municipioId: new Types.ObjectId(municipality._id),
      },
    ];

    await this.programaModel.insertMany(programasBase);

    // Crear usuario ADMIN_MUNICIPIO para el municipio
    const hashedPassword = await bcrypt.hash(
      createMunicipalityDto.adminPassword,
      10,
    );
    await this.userModel.create({
      nombre: createMunicipalityDto.adminNombre,
      email: createMunicipalityDto.adminEmail.toLowerCase(),
      password: hashedPassword,
      rol: UserRole.ADMIN_MUNICIPIO,
      municipioId: new Types.ObjectId(municipality._id),
      activo: true,
    });

    this.logger.log(
      `Municipio creado: ${municipality.nombre} (${municipality.claveInegi}) con 5 programas DIF base y usuario ADMIN (${createMunicipalityDto.adminEmail})`,
      'MunicipalitiesService',
    );

    return municipality;
  }

  async findAll(): Promise<MunicipalityDocument[]> {
    const municipalities = await this.municipalityModel
      .find()
      .populate('estadoId', 'nombre clave')
      .select('-__v')
      .sort({ nombre: 1 })
      .lean();

    return municipalities as unknown as MunicipalityDocument[];
  }

  async findOne(id: string): Promise<MunicipalityDocument> {
    const municipality = await this.municipalityModel
      .findById(id)
      .populate('estadoId', 'nombre clave')
      .lean();

    if (!municipality) {
      throw new NotFoundException('Municipio no encontrado');
    }

    return municipality as unknown as MunicipalityDocument;
  }

  async updateConfig(
    id: string,
    updateConfigDto: UpdateMunicipalityConfigDto,
  ): Promise<MunicipalityDocument> {
    const municipality = await this.municipalityModel.findById(id);

    if (!municipality) {
      throw new NotFoundException('Municipio no encontrado');
    }

    const updatedMunicipality = await this.municipalityModel
      .findByIdAndUpdate(id, { config: updateConfigDto.config }, { new: true })
      .lean();

    this.logger.log(
      `Configuración actualizada para municipio: ${municipality.nombre}`,
      'MunicipalitiesService',
    );

    return updatedMunicipality as unknown as MunicipalityDocument;
  }
}
