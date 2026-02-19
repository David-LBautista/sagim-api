import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Estado, EstadoDocument } from './schemas/estado.schema';
import {
  MunicipioCatalogo,
  MunicipioCatalogoDocument,
} from './schemas/municipio-catalogo.schema';
import { Rol, RolDocument } from './schemas/rol.schema';
import { UserRole } from '@/shared/enums';

@Injectable()
export class CatalogosService {
  constructor(
    @InjectModel(Estado.name)
    private estadoModel: Model<EstadoDocument>,
    @InjectModel(MunicipioCatalogo.name)
    private municipioCatalogoModel: Model<MunicipioCatalogoDocument>,
    @InjectModel(Rol.name)
    private rolModel: Model<RolDocument>,
  ) {}

  async getEstados() {
    return this.estadoModel
      .find({ activo: true })
      .select('-__v')
      .sort({ nombre: 1 })
      .lean();
  }

  async getMunicipiosByEstado(estadoId: string) {
    return this.municipioCatalogoModel
      .find({ estadoId: new Types.ObjectId(estadoId), activo: true })
      .select('-__v')
      .sort({ nombre: 1 })
      .lean();
  }

  async getRoles(userRole: string) {
    // Definir qué roles puede ver/asignar cada tipo de usuario
    const ROLES_DISPONIBLES: Record<string, string[]> = {
      [UserRole.SUPER_ADMIN]: [
        UserRole.SUPER_ADMIN,
        UserRole.ADMIN_MUNICIPIO,
        UserRole.OPERATIVO,
      ],
      [UserRole.ADMIN_MUNICIPIO]: [UserRole.OPERATIVO],
      [UserRole.OPERATIVO]: [],
    };

    const rolesPermitidos = ROLES_DISPONIBLES[userRole] || [];

    // Obtener todos los roles activos y filtrar por los permitidos
    const roles = await this.rolModel
      .find({ activo: true, nombre: { $in: rolesPermitidos } })
      .select('-__v')
      .sort({ nombre: 1 })
      .lean();

    return roles;
  }
}
