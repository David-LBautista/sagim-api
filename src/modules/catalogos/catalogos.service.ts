import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Estado, EstadoDocument } from './schemas/estado.schema';
import {
  MunicipioCatalogo,
  MunicipioCatalogoDocument,
} from './schemas/municipio-catalogo.schema';
import { Rol, RolDocument } from './schemas/rol.schema';
import {
  UnidadMedida,
  UnidadMedidaDocument,
} from './schemas/unidad-medida.schema';
import {
  TipoMovimiento,
  TipoMovimientoDocument,
} from './schemas/tipo-movimiento.schema';
import {
  GrupoVulnerable,
  GrupoVulnerableDocument,
} from './schemas/grupo-vulnerable.schema';
import { TipoApoyo, TipoApoyoDocument } from './schemas/tipo-apoyo.schema';
import { Localidad, LocalidadDocument } from './schemas/localidad.schema';
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
    @InjectModel(UnidadMedida.name)
    private unidadMedidaModel: Model<UnidadMedidaDocument>,
    @InjectModel(TipoMovimiento.name)
    private tipoMovimientoModel: Model<TipoMovimientoDocument>,
    @InjectModel(GrupoVulnerable.name)
    private grupoVulnerableModel: Model<GrupoVulnerableDocument>,
    @InjectModel(TipoApoyo.name)
    private tipoApoyoModel: Model<TipoApoyoDocument>,
    @InjectModel(Localidad.name)
    private localidadModel: Model<LocalidadDocument>,
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

  // ==================== UNIDADES DE MEDIDA ====================
  async getUnidadesMedida() {
    return this.unidadMedidaModel
      .find({ activo: true })
      .select('-__v')
      .sort({ clave: 1 })
      .lean();
  }

  async getUnidadMedidaByClave(clave: string) {
    const unidad = await this.unidadMedidaModel
      .findOne({ clave: clave.toUpperCase(), activo: true })
      .select('-__v')
      .lean();

    if (!unidad) {
      throw new NotFoundException(
        `Unidad de medida con clave ${clave} no encontrada`,
      );
    }

    return unidad;
  }

  // ==================== TIPOS DE MOVIMIENTO ====================
  async getTiposMovimiento() {
    return this.tipoMovimientoModel
      .find({ activo: true })
      .select('-__v')
      .sort({ clave: 1 })
      .lean();
  }

  async getTipoMovimientoByClave(clave: string) {
    const tipo = await this.tipoMovimientoModel
      .findOne({ clave: clave.toUpperCase(), activo: true })
      .select('-__v')
      .lean();

    if (!tipo) {
      throw new NotFoundException(
        `Tipo de movimiento con clave ${clave} no encontrado`,
      );
    }

    return tipo;
  }

  // ==================== GRUPOS VULNERABLES ====================
  async getGruposVulnerables() {
    return this.grupoVulnerableModel
      .find({ activo: true })
      .select('-__v')
      .sort({ nombre: 1 })
      .lean();
  }

  async getGrupoVulnerableByClave(clave: string) {
    const grupo = await this.grupoVulnerableModel
      .findOne({ clave: clave.toUpperCase(), activo: true })
      .select('-__v')
      .lean();

    if (!grupo) {
      throw new NotFoundException(
        `Grupo vulnerable con clave ${clave} no encontrado`,
      );
    }

    return grupo;
  }

  // ==================== TIPOS DE APOYO ====================
  async getTiposApoyo() {
    return this.tipoApoyoModel
      .find({ activo: true })
      .select('-__v')
      .sort({ nombre: 1 })
      .lean();
  }

  async getTipoApoyoByClave(clave: string) {
    const tipo = await this.tipoApoyoModel
      .findOne({ clave: clave.toUpperCase(), activo: true })
      .select('-__v')
      .lean();

    if (!tipo) {
      throw new NotFoundException(
        `Tipo de apoyo con clave ${clave} no encontrado`,
      );
    }

    return tipo;
  }

  // ==================== LOCALIDADES ====================
  async getLocalidadesByMunicipio(municipioId: string) {
    return this.localidadModel
      .find({ municipioId: new Types.ObjectId(municipioId), activo: true })
      .select('-__v')
      .sort({ nombre: 1 })
      .lean();
  }

  async getLocalidadById(id: string) {
    const localidad = await this.localidadModel
      .findOne({ _id: new Types.ObjectId(id), activo: true })
      .select('-__v')
      .lean();

    if (!localidad) {
      throw new NotFoundException(`Localidad con ID ${id} no encontrada`);
    }

    return localidad;
  }

  async createLocalidad(data: {
    municipioId: string;
    nombre: string;
    clave?: string;
    poblacion?: number;
    codigoPostal?: string;
  }) {
    const localidad = new this.localidadModel({
      ...data,
      municipioId: new Types.ObjectId(data.municipioId),
    });
    return localidad.save();
  }

  async createLocalidadesBulk(
    municipioId: string,
    localidades: string[],
  ): Promise<{ insertadas: number; errores: string[] }> {
    const errores: string[] = [];
    let insertadas = 0;

    for (const nombre of localidades) {
      try {
        const existe = await this.localidadModel.findOne({
          municipioId: new Types.ObjectId(municipioId),
          nombre,
        });

        if (!existe) {
          await this.createLocalidad({ municipioId, nombre });
          insertadas++;
        }
      } catch (error) {
        errores.push(`Error al insertar ${nombre}: ${error.message}`);
      }
    }

    return { insertadas, errores };
  }
}
