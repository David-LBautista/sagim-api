import {
  Injectable,
  ConflictException,
  NotFoundException,
  Inject,
  LoggerService,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { User, UserDocument } from './schemas/user.schema';
import { CreateUserDto, UpdateUserDto } from './dto';
import { UserRole } from '@/shared/enums';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
  ) {}

  async create(
    createUserDto: CreateUserDto,
    currentUser: any,
  ): Promise<UserDocument> {
    // Check if email already exists
    const existingUser = await this.userModel.findOne({
      email: createUserDto.email.toLowerCase(),
    });

    if (existingUser) {
      throw new ConflictException('El email ya está registrado');
    }

    // VALIDACIÓN: Qué roles puede crear cada tipo de usuario
    if (currentUser.rol === UserRole.ADMIN_MUNICIPIO) {
      // ADMIN_MUNICIPIO solo puede crear usuarios OPERATIVO
      if (createUserDto.rol !== UserRole.OPERATIVO) {
        throw new ConflictException(
          'Los administradores municipales solo pueden crear usuarios con rol OPERATIVO',
        );
      }
    }

    if (currentUser.rol === UserRole.OPERATIVO) {
      // OPERATIVO no puede crear usuarios
      throw new ConflictException(
        'Los usuarios operativos no tienen permisos para crear usuarios',
      );
    }

    // Validaciones por rol
    if (createUserDto.rol === UserRole.OPERATIVO && !createUserDto.moduloId) {
      throw new ConflictException('El rol OPERATIVO requiere un moduloId');
    }

    if (
      createUserDto.rol === UserRole.OPERATIVO &&
      !createUserDto.municipioId &&
      currentUser.rol !== UserRole.ADMIN_MUNICIPIO
    ) {
      throw new ConflictException('El rol OPERATIVO requiere un municipioId');
    }

    if (
      (createUserDto.rol === UserRole.SUPER_ADMIN ||
        createUserDto.rol === UserRole.ADMIN_MUNICIPIO) &&
      createUserDto.moduloId
    ) {
      throw new ConflictException(
        'Los roles SUPER_ADMIN y ADMIN_MUNICIPIO no deben tener módulo asignado',
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    // REGLA DE ORO: municipioId SIEMPRE desde el token para ADMIN_MUNICIPIO
    let municipioId = createUserDto.municipioId;
    let moduloId = createUserDto.moduloId;

    if (currentUser.rol === UserRole.ADMIN_MUNICIPIO) {
      // ADMIN_MUNICIPIO solo puede crear usuarios en SU municipio (forzado desde token)
      municipioId = currentUser.municipioId;
    } else if (currentUser.rol === UserRole.SUPER_ADMIN) {
      // SUPER_ADMIN puede especificar el municipio desde el body
      municipioId = createUserDto.municipioId;
    }

    // Convertir a ObjectId si existen (vienen como strings del body)
    const municipioObjectId = municipioId 
      ? new Types.ObjectId(municipioId) 
      : undefined;
    const moduloObjectId = moduloId 
      ? new Types.ObjectId(moduloId) 
      : undefined;

    const user = new this.userModel({
      ...createUserDto,
      email: createUserDto.email.toLowerCase(),
      password: hashedPassword,
      municipioId: municipioObjectId,
      moduloId: moduloObjectId,
    });

    const savedUser = await user.save();

    this.logger.log(
      `Usuario creado: ${savedUser.email} (${createUserDto.rol}) por ${currentUser.rol}`,
      'UsersService',
    );

    return savedUser;
  }

  async findAll(): Promise<UserDocument[]> {
    // SUPER_ADMIN: devuelve TODOS los usuarios (activos e inactivos)
    return this.userModel
      .find({}) // Explicitly empty filter to include all users
      .select('-password -refreshToken')
      .populate('municipioId', 'nombre')
      .populate('moduloId', 'nombre descripcion')
      .sort({ createdAt: -1 })
      .lean() as unknown as UserDocument[];
  }

  async findByMunicipio(municipioId: string): Promise<UserDocument[]> {
    // ADMIN: solo usuarios de su municipio (activos e inactivos)
    // Convertir a ObjectId para la búsqueda
    const municipioObjectId = new Types.ObjectId(municipioId);
    
    return this.userModel
      .find({ municipioId: municipioObjectId })
      .select('-password -refreshToken')
      .populate('municipioId', 'nombre')
      .populate('moduloId', 'nombre descripcion')
      .sort({ createdAt: -1 })
      .lean() as unknown as UserDocument[];
  }

  async findOne(id: string): Promise<UserDocument> {
    const user = await this.userModel
      .findById(id)
      .select('-password -refreshToken')
      .populate('municipioId', 'nombre')
      .populate('moduloId', 'nombre descripcion')
      .lean();

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    return user as unknown as UserDocument;
  }

  async update(
    id: string,
    updateUserDto: UpdateUserDto,
  ): Promise<UserDocument> {
    const user = await this.userModel.findById(id);

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    // If email is being updated, check if it's already in use
    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const existingUser = await this.userModel.findOne({
        email: updateUserDto.email.toLowerCase(),
        _id: { $ne: id },
      });

      if (existingUser) {
        throw new ConflictException('El email ya está en uso');
      }

      updateUserDto.email = updateUserDto.email.toLowerCase();
    }

    // Hash password if it's being updated
    if (updateUserDto.password) {
      updateUserDto.password = await bcrypt.hash(updateUserDto.password, 10);
    }

    // Convertir municipioId y moduloId a ObjectId solo si vienen en el DTO
    const updateData: any = { ...updateUserDto };
    
    if (updateUserDto.municipioId) {
      updateData.municipioId = new Types.ObjectId(updateUserDto.municipioId);
    }
    
    if (updateUserDto.moduloId) {
      updateData.moduloId = new Types.ObjectId(updateUserDto.moduloId);
    }

    const updatedUser = await this.userModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .select('-password -refreshToken')
      .lean();

    this.logger.log(
      `Usuario actualizado: ${updatedUser.email}`,
      'UsersService',
    );

    return updatedUser as unknown as UserDocument;
  }

  async remove(id: string): Promise<void> {
    const user = await this.userModel.findById(id);

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    // Soft delete: cambiar activo a false en lugar de eliminar
    await this.userModel.findByIdAndUpdate(id, { activo: false });

    this.logger.log(
      `Usuario desactivado (soft delete): ${user.email}`,
      'UsersService',
    );
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel
      .findOne({ email: email.toLowerCase() })
      .lean() as unknown as UserDocument;
  }
}
