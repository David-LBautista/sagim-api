  
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateModuloDto } from './dto/create-modulo.dto';
import { Modulo, ModuloDocument } from './schemas/modulo.schema';
import {
  Municipality,
  MunicipalityDocument,
} from '@/modules/municipalities/schemas/municipality.schema';
import { UserRole } from '@/shared/enums';

@Injectable()
export class ModulosService {
  constructor(
    @InjectModel(Modulo.name)
    private readonly moduloModel: Model<ModuloDocument>,
    @InjectModel(Municipality.name)
    private readonly municipalityModel: Model<MunicipalityDocument>,
  ) {}

  async create(createModuloDto: CreateModuloDto) {
    const modulo = new this.moduloModel(createModuloDto);
    await modulo.save();
    return { message: 'Módulo creado', data: modulo };
  }

  async findAll(user: any) {
    // SUPER_ADMIN solo ve USUARIOS y MUNICIPIOS (no módulos municipales)
    if (user.rol === UserRole.SUPER_ADMIN) {
      return this.moduloModel
        .find({
          activo: true,
          nombre: { $in: ['USUARIOS', 'MUNICIPIOS'] },
        })
        .sort({ nombre: 1 })
        .exec();
    }

    // ADMIN_MUNICIPIO y OPERATIVO ven solo módulos activos y habilitados en su municipio
    if (user.municipioId) {
      const municipio = await this.municipalityModel.findById(user.municipioId);

      if (!municipio || !municipio.config || !municipio.config.modulos) {
        return [];
      }

      // Obtener nombres de módulos habilitados en el municipio
      const modulosHabilitados = Object.keys(municipio.config.modulos).filter(
        (moduloKey) => municipio.config.modulos[moduloKey] === true,
      );

      // Devolver solo módulos activos Y habilitados en el municipio
      return this.moduloModel
        .find({ activo: true, nombre: { $in: modulosHabilitados } })
        .sort({ nombre: 1 })
        .exec();
    }

    return [];
  }

  async updateEstadoById(id: string, activo: boolean) {
    const modulo = await this.moduloModel.findByIdAndUpdate(
      id,
      { activo },
      { new: true },
    );
    if (!modulo) {
      return { message: 'Módulo no encontrado', id };
    }
    return { message: 'Estado actualizado', id, activo };
  }
}
