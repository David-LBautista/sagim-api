/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as dayjs from 'dayjs';
import {
  AuditLog,
  AuditLogDocument,
  AuditAction,
  AuditModule,
} from './schemas/audit-log.schema';
import { CreateAuditLogDto } from './dto';

@Injectable()
export class AuditoriaService {
  constructor(
    @InjectModel(AuditLog.name) private auditLogModel: Model<AuditLogDocument>,
  ) {}

  /**
   * Crear un registro de auditoría
   */
  async createLog(
    createDto: CreateAuditLogDto,
    usuarioId: string,
    rol: string,
    municipioId: string,
    ip?: string,
    userAgent?: string,
  ): Promise<AuditLog> {
    const auditLog = new this.auditLogModel({
      ...createDto,
      usuarioId: new Types.ObjectId(usuarioId),
      rol,
      municipioId: new Types.ObjectId(municipioId),
      ip,
      userAgent,
    });

    return auditLog.save();
  }

  /** Filtro de municipio: vacío para SUPER_ADMIN, filtrado para el resto */
  private municipioFilter(municipioId?: string): any {
    return municipioId ? { municipioId: new Types.ObjectId(municipioId) } : {};
  }

  /**
   * Obtener logs con filtros (bitácora detallada) — paginado
   */
  async findAll(
    municipioId: string | undefined,
    filters: {
      modulo?: AuditModule;
      usuarioId?: string;
      accion?: AuditAction;
      entidad?: string;
      fechaDesde?: Date;
      fechaHasta?: Date;
      page?: number;
      limit?: number;
    } = {},
  ): Promise<{
    data: AuditLog[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const query: any = { ...this.municipioFilter(municipioId) };

    if (filters.modulo) query.modulo = filters.modulo;
    if (filters.usuarioId)
      query.usuarioId = new Types.ObjectId(filters.usuarioId);
    if (filters.accion) query.accion = filters.accion;
    if (filters.entidad) query.entidad = filters.entidad;

    // Default: últimos 7 días si no se indica fecha
    const fechaDesde =
      filters.fechaDesde ?? dayjs().subtract(7, 'day').startOf('day').toDate();
    const fechaHasta = filters.fechaHasta;

    query.createdAt = { $gte: fechaDesde };
    if (fechaHasta) query.createdAt.$lte = fechaHasta;

    const page = Math.max(1, filters.page ?? 1);
    const limit = Math.min(200, Math.max(1, filters.limit ?? 50));
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.auditLogModel
        .find(query)
        .populate('usuarioId', 'nombre email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.auditLogModel.countDocuments(query),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  /**
   * Resumen de auditoría
   */
  async getResumen(municipioId?: string) {
    const mFilter = this.municipioFilter(municipioId);
    const hace30Dias = new Date();
    hace30Dias.setDate(hace30Dias.getDate() - 30);

    const [totales, usuariosActivos, modulosAuditados, ultimosAccesos] =
      await Promise.all([
        // Total de acciones en los últimos 30 días
        this.auditLogModel.countDocuments({
          ...mFilter,
          createdAt: { $gte: hace30Dias },
        }),

        // Usuarios únicos activos
        this.auditLogModel.distinct('usuarioId', {
          ...mFilter,
          createdAt: { $gte: hace30Dias },
        }),

        // Módulos auditados
        this.auditLogModel.distinct('modulo', {
          ...mFilter,
        }),

        // Últimos accesos (logins)
        this.auditLogModel.countDocuments({
          ...mFilter,
          accion: AuditAction.LOGIN,
          createdAt: { $gte: hace30Dias },
        }),
      ]);

    return {
      accionesTotales: totales,
      usuariosActivos: usuariosActivos.length,
      modulosAuditados: modulosAuditados.length,
      ultimosAccesos,
      periodo: '30 días',
    };
  }

  /**
   * Actividad por módulo
   */
  async getActividadPorModulo(
    municipioId: string | undefined,
    dias: number = 30,
  ) {
    const fechaInicio = new Date();
    fechaInicio.setDate(fechaInicio.getDate() - dias);

    const actividad = await this.auditLogModel.aggregate([
      {
        $match: {
          ...this.municipioFilter(municipioId),
          createdAt: { $gte: fechaInicio },
        },
      },
      {
        $group: {
          _id: '$modulo',
          acciones: { $count: {} },
        },
      },
      {
        $project: {
          _id: 0,
          modulo: '$_id',
          acciones: 1,
        },
      },
      {
        $sort: { acciones: -1 },
      },
    ]);

    return actividad;
  }

  /**
   * Acciones críticas (DELETE, cambios sensibles)
   */
  async getAccionesCriticas(
    municipioId: string | undefined,
    dias: number = 30,
  ) {
    const fechaInicio = new Date();
    fechaInicio.setDate(fechaInicio.getDate() - dias);

    const criticas = await this.auditLogModel
      .find({
        ...this.municipioFilter(municipioId),
        accion: { $in: [AuditAction.DELETE, AuditAction.EXPORT] },
        createdAt: { $gte: fechaInicio },
      })
      .populate('usuarioId', 'nombre email')
      .sort({ createdAt: -1 })
      .limit(100)
      .exec();

    return criticas.map((log) => ({
      fecha: log.createdAt,
      accion: log.accion,
      modulo: log.modulo,
      entidad: log.entidad,
      entidadId: log.entidadId,
      usuario: (log.usuarioId as any)?.nombre || 'Desconocido',
      descripcion: log.descripcion,
    }));
  }

  /**
   * Accesos al sistema (logins)
   */
  async getAccesos(municipioId: string | undefined, dias: number = 30) {
    const fechaInicio = new Date();
    fechaInicio.setDate(fechaInicio.getDate() - dias);

    const accesos = await this.auditLogModel
      .find({
        ...this.municipioFilter(municipioId),
        accion: AuditAction.LOGIN,
        createdAt: { $gte: fechaInicio },
      })
      .populate('usuarioId', 'nombre email rol')
      .sort({ createdAt: -1 })
      .limit(200)
      .exec();

    return accesos.map((log) => ({
      fecha: log.createdAt,
      usuario: (log.usuarioId as any)?.nombre || 'Desconocido',
      email: (log.usuarioId as any)?.email,
      rol: log.rol,
      ip: log.ip,
      userAgent: log.userAgent,
    }));
  }

  /**
   * Actividad de un usuario específico
   */
  async getActividadUsuario(
    usuarioId: string,
    municipioId: string | undefined,
    limite: number = 100,
  ) {
    return this.auditLogModel
      .find({
        usuarioId: new Types.ObjectId(usuarioId),
        ...this.municipioFilter(municipioId),
      })
      .sort({ createdAt: -1 })
      .limit(limite)
      .exec();
  }

  /**
   * Historial de cambios de una entidad específica
   */
  async getHistorialEntidad(
    entidad: string,
    entidadId: string,
    municipioId?: string,
  ): Promise<AuditLog[]> {
    return this.auditLogModel
      .find({
        entidad,
        entidadId,
        ...this.municipioFilter(municipioId),
      })
      .populate('usuarioId', 'nombre email')
      .sort({ createdAt: -1 })
      .exec();
  }
}
