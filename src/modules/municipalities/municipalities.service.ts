import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
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
import { Modulo, ModuloDocument } from '../modulos/schemas/modulo.schema';
import {
  CreateMunicipalityDto,
  UpdateMunicipalityConfigDto,
  UpdateMunicipalityDto,
} from './dto';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { TransparenciaService } from '../transparencia/transparencia.service';
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
    @InjectModel(Modulo.name)
    private moduloModel: Model<ModuloDocument>,
    private readonly cloudinaryService: CloudinaryService,
    private readonly transparenciaService: TransparenciaService,
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
      const slugged = this.toSlug(createMunicipalityDto.nombre);
      const uploadResult = await this.cloudinaryService.uploadImage(
        logo,
        `sagim/municipios/${slugged}/logo`,
      );
      logoUrl = uploadResult.secure_url;
    }

    const municipality = await this.municipalityModel.create({
      ...createMunicipalityDto,
      estadoId: new Types.ObjectId(createMunicipalityDto.estadoId),
      logoUrl,
      onboardingCompletado: false,
      onboardingSteps: {
        datos: false, // el admin confirma en el paso 1 del wizard
        servicios: false,
        equipo: false,
        padron: false,
      },
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

    // Inicializar secciones de transparencia (44 obligaciones Ley 250 Veracruz)
    await this.transparenciaService.seedSecciones(municipality._id);

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

  async findPublico(slug: string) {
    const normalizado = slug.replace(/-/g, ' ');
    const sinEspacios = slug.replace(/-/g, '').replace(/\s/g, '').toLowerCase();
    const municipio = await this.municipalityModel
      .findOne({
        $or: [
          { claveInegi: slug },
          { nombre: { $regex: `^${normalizado}$`, $options: 'i' } },
          {
            $expr: {
              $regexMatch: {
                input: { $replaceAll: { input: { $toLower: '$nombre' }, find: ' ', replacement: '' } },
                regex: `^${sinEspacios}$`,
              },
            },
          },
        ],
        activo: true,
      })
      .select(
        'nombre logoUrl claveInegi contactoEmail contactoTelefono direccion latitud longitud config',
      )
      .lean();

    if (!municipio) {
      throw new NotFoundException(`Municipio "${slug}" no encontrado`);
    }

    return {
      nombre: (municipio as any).nombre,
      logoUrl: (municipio as any).logoUrl ?? null,
      claveInegi: (municipio as any).claveInegi ?? null,
      contactoEmail: (municipio as any).contactoEmail ?? null,
      contactoTelefono: (municipio as any).contactoTelefono ?? null,
      direccion: (municipio as any).direccion ?? null,
      latitud: (municipio as any).latitud ?? null,
      longitud: (municipio as any).longitud ?? null,
    };
  }

  async findAll(): Promise<any[]> {
    const [municipalities, todosLosModulos] = await Promise.all([
      this.municipalityModel
        .find()
        .populate('estadoId', 'nombre clave')
        .select('-__v')
        .sort({ nombre: 1 })
        .lean(),
      this.moduloModel.find({ activo: true }).select('nombre').lean(),
    ]);

    // Map de todos los módulos disponibles en el catálogo
    const modulosDisponibles = todosLosModulos.map(
      (m: any) => m.nombre as string,
    );

    // Obtener admins de todos los municipios en una sola query
    const municipioIds = municipalities.map((m: any) => m._id);
    const admins = await this.userModel
      .find(
        { municipioId: { $in: municipioIds }, rol: UserRole.ADMIN_MUNICIPIO },
        { nombre: 1, email: 1, telefono: 1, municipioId: 1, activo: 1 },
      )
      .lean();

    const adminMap = new Map(
      admins.map((a: any) => [a.municipioId.toString(), a]),
    );

    return municipalities.map((m: any) => {
      // Construir config.modulos con TODOS los módulos del catálogo;
      // los que ya están configurados conservan su valor, el resto queda en false
      const modulosStored = m.config?.modulos ?? {};
      const modulosCompletos: Record<string, boolean> = {};
      for (const nombre of modulosDisponibles) {
        modulosCompletos[nombre] = modulosStored[nombre] === true;
      }

      return {
        ...m,
        config: {
          ...(m.config ?? {}),
          modulos: modulosCompletos,
        },
        admin: adminMap.get(m._id.toString()) ?? null,
      };
    });
  }

  async findOne(id: string): Promise<any> {
    const [municipality, todosLosModulos] = await Promise.all([
      this.municipalityModel
        .findById(id)
        .populate('estadoId', 'nombre clave')
        .select('-__v')
        .lean(),
      this.moduloModel.find({ activo: true }).select('nombre').lean(),
    ]);

    if (!municipality) {
      throw new NotFoundException('Municipio no encontrado');
    }

    const admin = await this.userModel
      .findOne(
        {
          municipioId: (municipality as any)._id,
          rol: UserRole.ADMIN_MUNICIPIO,
        },
        { nombre: 1, email: 1, telefono: 1, activo: 1 },
      )
      .lean();

    const modulosDisponibles = todosLosModulos.map(
      (m: any) => m.nombre as string,
    );
    const modulosStored = (municipality as any).config?.modulos ?? {};
    const modulosCompletos: Record<string, boolean> = {};
    for (const nombre of modulosDisponibles) {
      modulosCompletos[nombre] = modulosStored[nombre] === true;
    }

    return {
      ...(municipality as any),
      config: {
        ...((municipality as any).config ?? {}),
        modulos: modulosCompletos,
      },
      admin: admin ?? null,
    };
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

  async update(
    id: string,
    updateDto: UpdateMunicipalityDto,
    logo?: Express.Multer.File,
  ): Promise<MunicipalityDocument> {
    const municipality = await this.municipalityModel.findById(id);

    if (!municipality) {
      throw new NotFoundException('Municipio no encontrado');
    }

    const {
      adminNombre,
      adminEmail,
      adminPassword,
      adminTelefono,
      config,
      ...municipioFields
    } = updateDto;

    // Actualizar campos del municipio
    const municipioUpdate: Record<string, any> = { ...municipioFields };

    // Subir nuevo logo si se envió
    if (logo) {
      const slugged = this.toSlug(municipality.nombre);
      const uploadResult = await this.cloudinaryService.uploadImage(
        logo,
        `sagim/municipios/${slugged}/logo`,
      );
      municipioUpdate.logoUrl = uploadResult.secure_url;
    }

    if (config) {
      municipioUpdate.config = {
        ...municipality.config,
        ...config,
        modulos: {
          ...(municipality.config?.modulos ?? {}),
          ...(config.modulos ?? {}),
        },
      };
    }

    const updatedMunicipality = await this.municipalityModel
      .findByIdAndUpdate(id, { $set: municipioUpdate }, { new: true })
      .populate('estadoId', 'nombre clave')
      .lean();

    // Crear o actualizar usuario ADMIN_MUNICIPIO si se enviaron datos del admin
    if (adminNombre || adminEmail || adminPassword || adminTelefono) {
      const adminExistente = await this.userModel.findOne({
        municipioId: new Types.ObjectId(id),
        rol: UserRole.ADMIN_MUNICIPIO,
      });

      if (adminExistente) {
        // Actualizar campos enviados
        const adminUpdate: Record<string, any> = {};
        if (adminNombre) adminUpdate.nombre = adminNombre;
        if (adminEmail) adminUpdate.email = adminEmail.toLowerCase();
        if (adminTelefono) adminUpdate.telefono = adminTelefono;
        if (adminPassword) {
          adminUpdate.password = await bcrypt.hash(adminPassword, 10);
        }
        await this.userModel.updateOne(
          { _id: adminExistente._id },
          { $set: adminUpdate },
        );
        this.logger.log(
          `Admin actualizado para municipio: ${municipality.nombre} (${adminExistente.email})`,
          'MunicipalitiesService',
        );
      } else {
        // Crear nuevo admin — requiere email, nombre y password
        if (!adminEmail || !adminNombre || !adminPassword) {
          throw new BadRequestException(
            'Para crear el administrador se requieren adminEmail, adminNombre y adminPassword',
          );
        }
        const hashedPassword = await bcrypt.hash(adminPassword, 10);
        await this.userModel.create({
          nombre: adminNombre,
          email: adminEmail.toLowerCase(),
          password: hashedPassword,
          telefono: adminTelefono ?? undefined,
          rol: UserRole.ADMIN_MUNICIPIO,
          municipioId: new Types.ObjectId(id),
          activo: true,
        });
        this.logger.log(
          `Admin creado para municipio: ${municipality.nombre} (${adminEmail})`,
          'MunicipalitiesService',
        );
      }
    }

    this.logger.log(
      `Municipio actualizado: ${municipality.nombre}`,
      'MunicipalitiesService',
    );

    const admin = await this.userModel
      .findOne(
        { municipioId: new Types.ObjectId(id), rol: UserRole.ADMIN_MUNICIPIO },
        { nombre: 1, email: 1, telefono: 1, activo: 1 },
      )
      .lean();

    return { ...(updatedMunicipality as any), admin: admin ?? null };
  }

  // ─────────────────────────────────────────────────────
  // ONBOARDING
  // ─────────────────────────────────────────────────────

  /** Devuelve el estado actual del onboarding con los steps calculados */
  async getOnboarding(id: string): Promise<any> {
    const municipality = await this.municipalityModel
      .findById(id)
      .populate('estadoId', 'nombre')
      .select('-__v')
      .lean();

    if (!municipality) throw new NotFoundException('Municipio no encontrado');

    const operadoresCount = await this.userModel.countDocuments({
      municipioId: new Types.ObjectId(id),
      rol: UserRole.OPERATIVO,
      activo: true,
    });

    const steps = {
      datos: municipality.onboardingSteps?.datos ?? false,
      servicios: municipality.onboardingSteps?.servicios ?? false,
      equipo: municipality.onboardingSteps?.equipo ?? false,
      padron: municipality.onboardingSteps?.padron ?? false,
    };

    // Campos informativos calculados en vivo desde los datos reales del municipio
    const info = {
      logo: !!(municipality as any).logoUrl,
      contacto: !!(municipality as any).contactoEmail,
    };

    // Primer paso sin completar → 1-based
    const orden = ['datos', 'servicios', 'equipo', 'padron'] as const;
    const pasoActual = orden.findIndex((s) => !steps[s]) + 1 || 4;

    return {
      onboardingCompletado: municipality.onboardingCompletado ?? false,
      pasoActual,
      steps,
      info,
      operadoresCount,
      municipio: municipality,
    };
  }

  /** Paso 1 — Admin verificó los datos y presionó Continuar */
  async completeOnboardingDatos(id: string): Promise<any> {
    const municipality = await this.municipalityModel.findById(id);
    if (!municipality) throw new NotFoundException('Municipio no encontrado');

    await this.municipalityModel.findByIdAndUpdate(id, {
      $set: { 'onboardingSteps.datos': true },
    });

    this.logger.log(
      `Onboarding [datos] completado: ${municipality.nombre}`,
      'MunicipalitiesService',
    );
    return { step: 'datos', completado: true };
  }

  /** Paso 2 — Admin revisó el catálogo de servicios */
  async completeOnboardingServicios(id: string): Promise<any> {
    const municipality = await this.municipalityModel.findById(id);
    if (!municipality) throw new NotFoundException('Municipio no encontrado');

    await this.municipalityModel.findByIdAndUpdate(id, {
      $set: { 'onboardingSteps.servicios': true },
    });

    this.logger.log(
      `Onboarding [servicios] completado: ${municipality.nombre}`,
      'MunicipalitiesService',
    );
    return { step: 'servicios', completado: true };
  }

  /** Paso 3 — Valida ≥1 OPERATIVO activo y marca equipo completado */
  async completeOnboardingEquipo(id: string): Promise<any> {
    const municipality = await this.municipalityModel.findById(id);
    if (!municipality) throw new NotFoundException('Municipio no encontrado');

    const operadoresCount = await this.userModel.countDocuments({
      municipioId: new Types.ObjectId(id),
      rol: UserRole.OPERATIVO,
      activo: true,
    });

    await this.municipalityModel.findByIdAndUpdate(id, {
      $set: { 'onboardingSteps.equipo': true },
    });

    this.logger.log(
      `Onboarding [equipo] completado: ${municipality.nombre} (${operadoresCount} operadores)`,
      'MunicipalitiesService',
    );
    return { step: 'equipo', completado: true, operadoresCount };
  }

  /** Paso 4 — Importó padrón o lo saltó (ambos casos marcan el step como completado) */
  async completeOnboardingPadron(
    id: string,
    saltado: boolean = false,
  ): Promise<any> {
    const municipality = await this.municipalityModel.findById(id);
    if (!municipality) throw new NotFoundException('Municipio no encontrado');

    await this.municipalityModel.findByIdAndUpdate(id, {
      $set: { 'onboardingSteps.padron': true },
    });

    this.logger.log(
      `Onboarding [padron] completado: ${municipality.nombre} (${saltado ? 'saltado' : 'importado'})`,
      'MunicipalitiesService',
    );
    return { step: 'padron', completado: true, saltado };
  }

  /** Paso final — Valida pasos requeridos y marca onboardingCompletado */
  async completarOnboarding(id: string): Promise<any> {
    const municipality = await this.municipalityModel.findById(id);
    if (!municipality) throw new NotFoundException('Municipio no encontrado');

    const steps = municipality.onboardingSteps as any;
    const faltantes: string[] = [];
    if (!steps?.datos) faltantes.push('datos');
    if (!steps?.servicios) faltantes.push('servicios');
    if (!steps?.equipo) faltantes.push('equipo');

    if (faltantes.length > 0) {
      throw new BadRequestException(
        `Pasos requeridos sin completar: ${faltantes.join(', ')}`,
      );
    }

    await this.municipalityModel.findByIdAndUpdate(id, {
      $set: {
        onboardingCompletado: true,
        'onboardingSteps.padron': steps?.padron ?? true, // saltar = completado
      },
    });

    this.logger.log(
      `Onboarding COMPLETADO: ${municipality.nombre}`,
      'MunicipalitiesService',
    );
    return { onboardingCompletado: true };
  }

  private toSlug(nombre: string): string {
    return nombre
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');
  }
}
