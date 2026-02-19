import {
  Injectable,
  UnauthorizedException,
  Inject,
  LoggerService,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { User, UserDocument } from '@/modules/users/schemas/user.schema';
import {
  Municipality,
  MunicipalityDocument,
} from '@/modules/municipalities/schemas/municipality.schema';
import {
  Modulo,
  ModuloDocument,
} from '@/modules/modulos/schemas/modulo.schema';
import { JwtPayload, TokenResponse } from '@/shared/interfaces';
import { UserRole } from '@/shared/enums';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Municipality.name)
    private municipalityModel: Model<MunicipalityDocument>,
    @InjectModel(Modulo.name)
    private moduloModel: Model<ModuloDocument>,
    private jwtService: JwtService,
    private configService: ConfigService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.userModel.findOne({ email: email.toLowerCase() });

    if (!user) {
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return null;
    }

    if (!user.activo) {
      throw new UnauthorizedException('Usuario inactivo');
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _pwd, refreshToken: _rft, ...result } = user.toObject();
    return result;
  }

  async login(user: any): Promise<TokenResponse> {
    const payload: JwtPayload = {
      email: user.email,
      sub: user._id.toString(),
      municipioId: user.municipioId ? user.municipioId.toString() : null,
      rol: user.rol,
    };

    const accessToken = this.jwtService.sign(payload as any);
    const refreshToken = this.jwtService.sign(payload as any, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: (this.configService.get<string>('JWT_REFRESH_EXPIRATION') ||
        '7d') as any,
    });

    // Save refresh token
    await this.userModel.findByIdAndUpdate(user._id, {
      refreshToken: await bcrypt.hash(refreshToken, 10),
      ultimoAcceso: new Date(),
    });

    // Obtener municipio para conocer módulos habilitados (solo si no es SUPER_ADMIN)
    let municipio = null;
    if (user.municipioId) {
      municipio = await this.municipalityModel.findById(user.municipioId);
    }

    // Determinar módulos disponibles según rol y configuración del municipio
    const modulosDisponibles = await this.getModulosDisponibles(
      user.rol,
      municipio,
      user.moduloId, // Pasar el moduloId del usuario
    );

    // Determinar permisos/acciones específicas por módulo
    const permisos = this.getPermisosPorRol(user.rol);

    this.logger.log(`Usuario ${user.email} ha iniciado sesión`, 'AuthService');

    // Determinar información del municipio o logo por defecto
    let municipioInfo;
    if (municipio) {
      municipioInfo = {
        nombre: municipio.nombre,
        logoUrl: municipio.logoUrl,
      };
    } else if (user.rol === UserRole.SUPER_ADMIN) {
      // SUPER_ADMIN sin municipio usa logo de SAGIM
      municipioInfo = {
        nombre: 'SAGIM',
        logoUrl:
          'https://res.cloudinary.com/dxibm927i/image/upload/v1771435403/sagim/super_admin/escudo_sagim_nhucsv.svg',
      };
    }

    return {
      accessToken,
      refreshToken,
      expiresIn: this.configService.get<string>('JWT_EXPIRATION'),
      user: {
        id: user._id.toString(),
        email: user.email,
        nombre: user.nombre,
        rol: user.rol,
        municipioId: user.municipioId ? user.municipioId.toString() : null,
        activo: user.activo,
      },
      municipio: municipioInfo,
      modulos: modulosDisponibles,
      permisos,
    };
  }

  /**
   * Determina qué módulos están disponibles para un usuario
   * basado en su rol y la configuración del municipio
   */
  private async getModulosDisponibles(
    rol: UserRole,
    municipio: any,
    moduloId?: any, // ID del módulo asignado al usuario OPERATIVO
  ): Promise<string[]> {
    // Obtener todos los módulos activos de la BD
    const modulosActivos = await this.moduloModel
      .find({ activo: true })
      .select('nombre')
      .lean();

    const nombresModulos = modulosActivos.map((m) => m.nombre);

    // SUPER_ADMIN tiene acceso a todos los módulos activos
    if (rol === UserRole.SUPER_ADMIN) {
      return nombresModulos;
    }

    // OPERATIVO: solo puede ver el módulo que tiene asignado
    if (rol === UserRole.OPERATIVO && moduloId) {
      const moduloAsignado = await this.moduloModel
        .findById(moduloId)
        .select('nombre')
        .lean();

      return moduloAsignado ? [moduloAsignado.nombre] : [];
    }

    // ADMIN_MUNICIPIO: tiene acceso según configuración del municipio
    if (!municipio || !municipio.config || !municipio.config.modulos) {
      // Si no hay configuración, solo dar acceso a USUARIOS
      return nombresModulos.filter((nombre) => nombre === 'USUARIOS');
    }

    // Filtrar módulos según configuración del municipio (solo los habilitados)
    const modulosHabilitados = Object.keys(municipio.config.modulos).filter(
      (moduloKey) => municipio.config.modulos[moduloKey] === true,
    );

    // Retornar solo los módulos que estén activos en BD Y habilitados en el municipio
    return nombresModulos.filter((nombre) =>
      modulosHabilitados.includes(nombre),
    );
  }

  /**
   * Determina los permisos/acciones específicas que puede realizar cada rol
   * Los permisos se manejan a nivel de rol, los módulos dinámicos se manejan desde el frontend
   */
  private getPermisosPorRol(rol: UserRole): Record<string, string[]> {
    const PERMISOS_POR_ROL: Record<string, Record<string, string[]>> = {
      [UserRole.SUPER_ADMIN]: {
        MUNICIPIOS: ['crear', 'editar', 'eliminar', 'ver'],
        USUARIOS: ['crear', 'editar', 'eliminar', 'ver'],
      },
      [UserRole.ADMIN_MUNICIPIO]: {
        USUARIOS: ['crear', 'editar', 'eliminar', 'ver'],
      },
      [UserRole.OPERATIVO]: {
        USUARIOS: ['ver'],
      },
    };

    return PERMISOS_POR_ROL[rol] || { USUARIOS: ['ver'] };
  }

  async refreshToken(refreshToken: string): Promise<TokenResponse> {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      }) as JwtPayload;

      const user = await this.userModel.findById(payload.sub);

      if (!user || !user.refreshToken) {
        throw new UnauthorizedException('Token inválido');
      }

      const isRefreshTokenValid = await bcrypt.compare(
        refreshToken,
        user.refreshToken,
      );

      if (!isRefreshTokenValid) {
        throw new UnauthorizedException('Token inválido');
      }

      if (!user.activo) {
        throw new UnauthorizedException('Usuario inactivo');
      }

      const newPayload: JwtPayload = {
        email: user.email,
        sub: user._id.toString(),
        municipioId: user.municipioId ? user.municipioId.toString() : null,
        rol: user.rol,
      };

      const accessToken = this.jwtService.sign(newPayload as any);
      const newRefreshToken = this.jwtService.sign(newPayload as any, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: (this.configService.get<string>('JWT_REFRESH_EXPIRATION') ||
          '7d') as any,
      });

      // Update refresh token
      await this.userModel.findByIdAndUpdate(user._id, {
        refreshToken: await bcrypt.hash(newRefreshToken, 10),
        ultimoAcceso: new Date(),
      });

      // Obtener municipio para conocer módulos habilitados (solo si no es SUPER_ADMIN)
      let municipio = null;
      if (user.municipioId) {
        municipio = await this.municipalityModel.findById(user.municipioId);
      }
      const modulosDisponibles = await this.getModulosDisponibles(
        user.rol,
        municipio,
        user.moduloId, // Pasar el moduloId del usuario
      );
      const permisos = this.getPermisosPorRol(user.rol);

      this.logger.log(
        `Token renovado para usuario ${user.email}`,
        'AuthService',
      );

      // Determinar información del municipio o logo por defecto
      let municipioInfo;
      if (municipio) {
        municipioInfo = {
          nombre: municipio.nombre,
          logoUrl: municipio.logoUrl,
        };
      } else if (user.rol === UserRole.SUPER_ADMIN) {
        // SUPER_ADMIN sin municipio usa logo de SAGIM
        municipioInfo = {
          nombre: 'SAGIM',
          logoUrl:
            'https://res.cloudinary.com/dxibm927i/image/upload/v1771435403/sagim/super_admin/escudo_sagim_nhucsv.svg',
        };
      }

      return {
        accessToken,
        refreshToken: newRefreshToken,
        expiresIn: this.configService.get<string>('JWT_EXPIRATION'),
        user: {
          id: user._id.toString(),
          email: user.email,
          nombre: user.nombre,
          rol: user.rol,
          municipioId: user.municipioId ? user.municipioId.toString() : null,
          activo: user.activo,
        },
        municipio: municipioInfo,
        modulos: modulosDisponibles,
        permisos,
      };
    } catch {
      throw new UnauthorizedException('Token inválido o expirado');
    }
  }

  async logout(userId: string): Promise<void> {
    await this.userModel.findByIdAndUpdate(userId, {
      refreshToken: null,
    });

    this.logger.log(`Usuario ${userId} ha cerrado sesión`, 'AuthService');
  }
}
