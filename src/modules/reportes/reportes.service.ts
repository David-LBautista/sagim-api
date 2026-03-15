import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { randomUUID } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

import {
  Reporte,
  ReporteDocument,
  ReportesConfiguracion,
  ReportesConfiguracionDocument,
  CATALOGO_CATEGORIAS_REPORTES,
  EstadoReporte,
} from './schemas/reporte.schema';
import {
  CrearReportePublicoDto,
  CrearReporteInternoDto,
  ActualizarEstadoReporteDto,
  AsignarReporteDto,
  CambiarPrioridadDto,
  FiltrosReportesDto,
  MetricasQueryDto,
} from './dto/reportes.dto';
import { Counter, CounterDocument } from '@/modules/dif/schemas/counter.schema';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import {
  Municipality,
  MunicipalityDocument,
} from '../municipalities/schemas/municipality.schema';
import { SagimGateway } from '../notificaciones/sagim.gateway';
import { fecha } from '@/common/helpers/fecha.helper';

@Injectable()
export class ReportesService {
  private readonly logger = new Logger(ReportesService.name);
  private readonly resend: Resend;
  private readonly emailFrom: string;
  private readonly frontendUrl: string;

  constructor(
    @InjectModel(Reporte.name)
    private reporteModel: Model<ReporteDocument>,
    @InjectModel(ReportesConfiguracion.name)
    private configModel: Model<ReportesConfiguracionDocument>,
    @InjectModel(Municipality.name)
    private municipioModel: Model<MunicipalityDocument>,
    @InjectModel(Counter.name)
    private counterModel: Model<CounterDocument>,
    private readonly cloudinaryService: CloudinaryService,
    private readonly sagimGateway: SagimGateway,
    private readonly configService: ConfigService,
  ) {
    this.resend = new Resend(configService.get<string>('RESEND_API_KEY'));
    this.emailFrom =
      configService.get<string>('EMAIL_FROM') ?? 'noreply@sagim.mx';
    this.frontendUrl =
      configService.get<string>('FRONTEND_URL') ?? 'http://localhost:3001';
  }

  // ═══════════════════════════════════════════════════════════
  // HELPERS PRIVADOS
  // ═══════════════════════════════════════════════════════════

  /** Resuelve municipio por claveInegi (slug) o nombre normalizado */
  async resolverMunicipio(
    slug: string,
  ): Promise<{ _id: unknown; nombre: string; claveInegi?: string }> {
    const normalizado = slug.replace(/-/g, ' ');
    const sinEspacios = slug.replace(/-/g, '').replace(/\s/g, '').toLowerCase();
    const municipio = await this.municipioModel
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
      .lean()
      .exec();

    if (!municipio) {
      throw new NotFoundException(`Municipio "${slug}" no encontrado`);
    }
    return municipio as { _id: unknown; nombre: string; claveInegi?: string };
  }

  /** Genera folio REP-YYMM-XXXX único por municipio (contador atómico) */
  private async generarFolio(municipioId: string): Promise<string> {
    const now = fecha.ahoraEnMexico();
    const yy = String(now.year()).slice(-2);
    const mm = String(now.month() + 1).padStart(2, '0');
    const yymm = `${yy}${mm}`;
    const munShort = municipioId.toString().slice(-4).toUpperCase();
    const counterId = `rep-${munShort}-${yymm}`;
    const prefijo = `REP-${yymm}-`;

    const counter = await this.counterModel.findOneAndUpdate(
      { _id: counterId },
      { $inc: { seq: 1 } },
      { upsert: true, new: true },
    );

    let seq = counter.seq;

    if (seq === 1) {
      const ultima = await this.reporteModel
        .findOne({
          municipioId: new Types.ObjectId(municipioId),
          folio: { $regex: `^${prefijo}` },
        })
        .sort({ folio: -1 })
        .lean();

      if (ultima?.folio) {
        const lastSeq = parseInt(ultima.folio.split('-').at(-1)!, 10);
        if (!isNaN(lastSeq) && lastSeq >= 1) {
          await this.counterModel.updateOne(
            { _id: counterId },
            { $max: { seq: lastSeq } },
          );
          const bumped = await this.counterModel.findOneAndUpdate(
            { _id: counterId },
            { $inc: { seq: 1 } },
            { new: true },
          );
          seq = bumped!.seq;
        }
      }
    }

    return `REP-${yymm}-${seq.toString().padStart(4, '0')}`;
  }

  // ═══════════════════════════════════════════════════════════
  // PÚBLICOS — PORTAL CIUDADANO
  // ═══════════════════════════════════════════════════════════

  /** GET /public/:slug/reportes/categorias */
  async getCategoriasActivas(municipioId: string) {
    const config = await this.configModel
      .findOne({ municipioId: new Types.ObjectId(municipioId) })
      .lean();

    const activas =
      config?.categoriasActivas ??
      CATALOGO_CATEGORIAS_REPORTES.map((c) => c.clave);

    return CATALOGO_CATEGORIAS_REPORTES.filter((c) =>
      activas.includes(c.clave),
    ).map((c) => ({
      clave: c.clave,
      nombre: c.nombre,
      descripcion: c.descripcion,
      icono: c.icono,
    }));
  }

  /** GET /public/:slug/reportes/info */
  async getInfoPortal(municipioId: string) {
    const config = await this.configModel
      .findOne({ municipioId: new Types.ObjectId(municipioId) })
      .lean();

    return {
      activo: config?.activo ?? true,
      mensajeBienvenida:
        config?.mensajeBienvenida ??
        'Reporta un problema en tu comunidad y dale seguimiento desde aquí.',
      tiempoRespuestaEstimado:
        config?.tiempoRespuestaEstimado ?? '72 horas hábiles',
    };
  }

  /** POST /public/:slug/reportes */
  async crearReportePublico(
    municipioId: string,
    dto: CrearReportePublicoDto,
    municipioNombre: string,
    municipioSlug: string,
    files?: Express.Multer.File[],
  ) {
    const config = await this.configModel
      .findOne({ municipioId: new Types.ObjectId(municipioId) })
      .lean();

    if (config && !config.activo) {
      throw new BadRequestException(
        'El módulo de reportes no está disponible actualmente.',
      );
    }

    const categoriaInfo = CATALOGO_CATEGORIAS_REPORTES.find(
      (c) => c.clave === dto.categoria,
    );
    if (!categoriaInfo) {
      throw new BadRequestException(`Categoría "${dto.categoria}" no válida`);
    }

    // Generar folio antes del upload para usarlo como carpeta
    const folio = await this.generarFolio(municipioId);

    let evidenciaUrls: string[] = [];
    if (files && files.length > 0) {
      evidenciaUrls = await this.cloudinaryService.uploadMultipleImages(
        files,
        `sagim/municipios/${municipioSlug}/reportes/${folio}`,
      );
    }

    const tokenConsulta = randomUUID();

    let reporte: ReporteDocument;
    {
      try {
        reporte = await this.reporteModel.create({
          folio,
          municipioId: new Types.ObjectId(municipioId),
          categoria: categoriaInfo.clave,
          categoriaNombre: categoriaInfo.nombre,
          areaResponsable: categoriaInfo.areaResponsable,
          modulo: categoriaInfo.modulo,
          descripcion: dto.descripcion,
          ubicacion: dto.ubicacion,
          ciudadano: {
            nombre: dto.nombre ?? '',
            telefono: dto.telefono ?? '',
            correo: dto.correo ?? '',
            recibirNotificaciones: dto.recibirNotificaciones ?? false,
          },
          evidencia: evidenciaUrls,
          estado: 'pendiente' as EstadoReporte,
          historial: [
            {
              estado: 'pendiente',
              fecha: new Date(),
              comentarioPublico: 'Reporte recibido.',
              notaInterna: '',
              nombreUsuario: 'Sistema',
            },
          ],
          tokenConsulta,
          origen: 'portal_publico',
          prioridad: 'normal',
          visible: true,
        });
      } catch (e: any) {
        throw e;
      }
    }

    if (dto.correo) {
      this.enviarCorreoConfirmacion(
        dto.correo,
        dto.nombre ?? 'Ciudadano',
        municipioNombre,
        municipioSlug,
        reporte,
      ).catch((e) =>
        this.logger.error(
          'Error enviando correo de confirmación de reporte',
          e,
        ),
      );
    }

    this.sagimGateway.emitNuevoReporte(municipioId, {
      folio: reporte.folio,
      categoria: reporte.categoriaNombre,
      modulo: reporte.modulo,
      areaResponsable: reporte.areaResponsable,
      ubicacion: reporte.ubicacion.descripcion,
      ciudadano: dto.nombre ?? 'Anónimo',
    });

    return {
      folio: reporte.folio,
      tokenConsulta: reporte.tokenConsulta,
      categoria: reporte.categoriaNombre,
      areaResponsable: reporte.areaResponsable,
      estado: reporte.estado,
      mensaje:
        'Tu reporte ha sido registrado. Puedes darle seguimiento con tu folio y token de consulta.',
    };
  }

  /** GET /public/:slug/reportes/consultar?folio=&token= */
  async consultarReporte(municipioId: string, folio: string, token: string) {
    const folioUpper = folio.toUpperCase();

    const reporte = await this.reporteModel
      .findOne({
        municipioId: new Types.ObjectId(municipioId),
        folio: folioUpper,
        tokenConsulta: token,
      })
      .lean();

    if (!reporte) {
      throw new NotFoundException('Folio o token inválido');
    }

    return {
      folio: reporte.folio,
      categoria: reporte.categoriaNombre,
      areaResponsable: reporte.areaResponsable,
      descripcion: reporte.descripcion,
      ubicacion: reporte.ubicacion,
      estado: reporte.estado,
      prioridad: reporte.prioridad,
      fechaRegistro: (reporte as any).createdAt,
      ultimaActualizacion: (reporte as any).updatedAt,
      historial: reporte.historial
        .filter((h) => h.comentarioPublico)
        .map((h) => ({
          estado: h.estado,
          fecha: h.fecha,
          comentario: h.comentarioPublico,
        })),
    };
  }

  // ═══════════════════════════════════════════════════════════
  // INTERNOS — PANEL DE FUNCIONARIOS
  // ═══════════════════════════════════════════════════════════

  /** GET /reportes */
  async findAll(municipioId: string, filters: FiltrosReportesDto) {
    const query: any = {
      municipioId: new Types.ObjectId(municipioId),
    };

    if (filters.categoria) query.categoria = filters.categoria;
    if (filters.estado) query.estado = filters.estado;
    if (filters.modulo) query.modulo = filters.modulo;
    if (filters.prioridad) query.prioridad = filters.prioridad;
    if (filters.origen) query.origen = filters.origen;
    if (filters.asignadoA)
      query.asignadoA = new Types.ObjectId(filters.asignadoA);

    if (filters.fechaInicio || filters.fechaFin) {
      query.createdAt = {};
      if (filters.fechaInicio)
        query.createdAt.$gte = new Date(filters.fechaInicio);
      if (filters.fechaFin) {
        const fin = new Date(filters.fechaFin);
        fin.setDate(fin.getDate() + 1);
        query.createdAt.$lt = fin;
      }
    }

    if (filters.buscar) {
      const regex = new RegExp(
        filters.buscar.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
        'i',
      );
      query.$or = [
        { descripcion: regex },
        { 'ubicacion.descripcion': regex },
        { 'ubicacion.colonia': regex },
        { folio: regex },
      ];
    }

    const page = Math.max(1, filters.page ?? 1);
    const limit = Math.min(100, filters.limit ?? 20);
    const skip = (page - 1) * limit;

    const baseMatch = { municipioId: new Types.ObjectId(municipioId) };

    const [data, total, resumenData] = await Promise.all([
      this.reporteModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.reporteModel.countDocuments(query),
      this.reporteModel.aggregate([
        { $match: baseMatch },
        { $group: { _id: '$estado', count: { $sum: 1 } } },
      ]),
    ]);

    const resumen = {
      pendientes: 0,
      enProceso: 0,
      resueltos: 0,
      cancelados: 0,
    };
    for (const r of resumenData) {
      if (r._id === 'pendiente') resumen.pendientes = r.count;
      else if (r._id === 'en_proceso') resumen.enProceso = r.count;
      else if (r._id === 'resuelto') resumen.resueltos = r.count;
      else if (r._id === 'cancelado') resumen.cancelados = r.count;
    }

    return { data, total, page, totalPages: Math.ceil(total / limit), resumen };
  }

  /** GET /reportes/:id */
  async findOne(id: string, municipioId: string) {
    const reporte = await this.reporteModel
      .findOne({
        _id: new Types.ObjectId(id),
        municipioId: new Types.ObjectId(municipioId),
      })
      .lean();

    if (!reporte) {
      throw new NotFoundException(`Reporte con ID ${id} no encontrado`);
    }
    return reporte;
  }

  // Transiciones de estado válidas
  private static readonly TRANSICIONES: Record<EstadoReporte, EstadoReporte[]> =
    {
      pendiente: ['en_proceso', 'cancelado'],
      en_proceso: ['resuelto', 'cancelado'],
      resuelto: [],
      cancelado: [],
    };

  /** PATCH /reportes/:id/estado */
  async actualizarEstado(
    id: string,
    dto: ActualizarEstadoReporteDto,
    municipioId: string,
    userId?: string,
    nombreUsuario?: string,
  ) {
    const reporte = await this.reporteModel.findOne({
      _id: new Types.ObjectId(id),
      municipioId: new Types.ObjectId(municipioId),
    });

    if (!reporte) {
      throw new NotFoundException(`Reporte con ID ${id} no encontrado`);
    }

    const transicionesValidas =
      ReportesService.TRANSICIONES[reporte.estado] ?? [];
    if (!transicionesValidas.includes(dto.estado as EstadoReporte)) {
      throw new ConflictException(
        `No se puede pasar de "${reporte.estado}" a "${dto.estado}". ` +
          (transicionesValidas.length
            ? `Estados válidos: ${transicionesValidas.join(', ')}`
            : 'Este estado es final.'),
      );
    }

    const ahora = new Date();
    reporte.estado = dto.estado as EstadoReporte;
    reporte.historial.push({
      estado: dto.estado as EstadoReporte,
      fecha: ahora,
      comentarioPublico: dto.comentarioPublico ?? '',
      notaInterna: dto.notaInterna ?? '',
      usuarioId: userId ? new Types.ObjectId(userId) : undefined,
      nombreUsuario: nombreUsuario ?? 'Funcionario',
    } as any);

    if (dto.estado === 'resuelto') {
      reporte.fechaResolucion = ahora;
    }

    await reporte.save();

    if (reporte.ciudadano?.recibirNotificaciones && reporte.ciudadano?.correo) {
      this.enviarCorreoActualizacion(
        reporte.ciudadano.correo,
        reporte.ciudadano.nombre || 'Ciudadano',
        reporte,
      ).catch((e) =>
        this.logger.error('Error enviando correo de actualización', e),
      );
    }

    this.sagimGateway.emitReporteActualizado(municipioId, {
      id: reporte._id.toString(),
      folio: reporte.folio,
      estado: reporte.estado,
      modulo: reporte.modulo,
    });

    return reporte;
  }

  /** POST /reportes/upload-images */
  async uploadImages(
    files: Express.Multer.File[],
    municipioSlug: string,
    folio?: string,
  ): Promise<{ urls: string[] }> {
    if (!files || files.length === 0) {
      throw new BadRequestException('No se proporcionaron archivos');
    }
    const folder = folio
      ? `sagim/municipios/${municipioSlug}/reportes/${folio}`
      : `sagim/municipios/${municipioSlug}/reportes/evidencias`;
    const urls = await this.cloudinaryService.uploadMultipleImages(
      files,
      folder,
    );
    return { urls };
  }

  /** GET /reportes/configuracion */
  async getConfiguracion(municipioId: string) {
    const config = await this.configModel
      .findOne({ municipioId: new Types.ObjectId(municipioId) })
      .lean();
    return (
      config ?? {
        municipioId,
        categoriasActivas: CATALOGO_CATEGORIAS_REPORTES.map((c) => c.clave),
        mensajeBienvenida: 'Reporta un problema en tu comunidad.',
        tiempoRespuestaEstimado: '72 horas hábiles',
        activo: true,
      }
    );
  }

  /** PUT /reportes/configuracion */
  async upsertConfiguracion(
    municipioId: string,
    data: Partial<ReportesConfiguracion>,
  ) {
    return this.configModel.findOneAndUpdate(
      { municipioId: new Types.ObjectId(municipioId) },
      { $set: data },
      { upsert: true, new: true },
    );
  }

  /** GET /reportes/configuracion/catalogo */
  getCatalogoCompleto() {
    return CATALOGO_CATEGORIAS_REPORTES;
  }

  // ═══════════════════════════════════════════════════════════
  // CREACIÓN INTERNA
  // ═══════════════════════════════════════════════════════════

  /** POST /reportes — creado por funcionario */
  async crearReporteInterno(
    municipioId: string,
    dto: CrearReporteInternoDto,
    userId: string,
    nombreUsuario: string,
  ) {
    const config = await this.configModel
      .findOne({ municipioId: new Types.ObjectId(municipioId) })
      .lean();

    if (config && !config.activo) {
      throw new BadRequestException(
        'El módulo de reportes no está disponible actualmente.',
      );
    }

    const categoriaInfo = CATALOGO_CATEGORIAS_REPORTES.find(
      (c) => c.clave === dto.categoria,
    );
    if (!categoriaInfo) {
      throw new BadRequestException(`Categoría "${dto.categoria}" no válida`);
    }

    const origen = dto.origen ?? 'interno';

    let reporte: ReporteDocument;
    let attempts = 0;
    while (true) {
      const folio = await this.generarFolio(municipioId);
      try {
        reporte = await this.reporteModel.create({
          folio,
          municipioId: new Types.ObjectId(municipioId),
          categoria: categoriaInfo.clave,
          categoriaNombre: categoriaInfo.nombre,
          areaResponsable: categoriaInfo.areaResponsable,
          modulo: categoriaInfo.modulo,
          descripcion: dto.descripcion,
          ubicacion: dto.ubicacion,
          ciudadano: {
            nombre: dto.nombre ?? '',
            telefono: dto.telefono ?? '',
            correo: '',
            recibirNotificaciones: false,
          },
          evidencia: [],
          estado: 'pendiente' as EstadoReporte,
          historial: [
            {
              estado: 'pendiente',
              fecha: new Date(),
              comentarioPublico: 'Reporte registrado por funcionario.',
              notaInterna: '',
              usuarioId: new Types.ObjectId(userId),
              nombreUsuario,
            },
          ],
          tokenConsulta: randomUUID(),
          origen,
          prioridad: (dto.prioridad ?? 'normal') as any,
          creadoPor: new Types.ObjectId(userId),
          visible: true,
        });
        break;
      } catch (e: any) {
        if (e?.code === 11000 && e?.keyValue?.folio) {
          if (++attempts >= 5) throw e;
          continue;
        }
        throw e;
      }
    }

    this.sagimGateway.emitNuevoReporte(municipioId, {
      folio: reporte.folio,
      categoria: reporte.categoriaNombre,
      modulo: reporte.modulo,
      areaResponsable: reporte.areaResponsable,
      ubicacion: reporte.ubicacion.descripcion,
      ciudadano: dto.nombre ?? 'Sin nombre',
    });

    return reporte;
  }

  // ═══════════════════════════════════════════════════════════
  // ASIGNACIÓN, PRIORIDAD, VISIBILIDAD
  // ═══════════════════════════════════════════════════════════

  /** PATCH /reportes/:id/asignar */
  async asignarReporte(
    id: string,
    dto: AsignarReporteDto,
    municipioId: string,
    userId: string,
    nombreUsuario: string,
  ) {
    const reporte = await this.reporteModel.findOne({
      _id: new Types.ObjectId(id),
      municipioId: new Types.ObjectId(municipioId),
    });

    if (!reporte) {
      throw new NotFoundException(`Reporte con ID ${id} no encontrado`);
    }

    const ahora = new Date();
    reporte.asignadoA = new Types.ObjectId(dto.usuarioId) as any;
    reporte.nombreAsignado = dto.nombreAsignado ?? '';

    // Avanza a en_proceso si estaba pendiente
    if (reporte.estado === 'pendiente') {
      reporte.estado = 'en_proceso';
    }

    reporte.historial.push({
      estado: reporte.estado,
      fecha: ahora,
      comentarioPublico: '',
      notaInterna:
        dto.notaInterna ??
        `Asignado a ${dto.nombreAsignado ?? 'funcionario'} por ${nombreUsuario}`,
      usuarioId: new Types.ObjectId(userId) as any,
      nombreUsuario,
    } as any);

    await reporte.save();

    this.sagimGateway.emitReporteAsignado(dto.usuarioId, {
      folio: reporte.folio,
      categoriaNombre: reporte.categoriaNombre,
      ubicacion: reporte.ubicacion.descripcion,
      prioridad: reporte.prioridad,
    });

    this.sagimGateway.emitReporteActualizado(municipioId, {
      id: reporte._id.toString(),
      folio: reporte.folio,
      estado: reporte.estado,
      modulo: reporte.modulo,
    });

    return reporte;
  }

  /** PATCH /reportes/:id/prioridad */
  async cambiarPrioridad(
    id: string,
    dto: CambiarPrioridadDto,
    municipioId: string,
  ) {
    const reporte = await this.reporteModel.findOneAndUpdate(
      {
        _id: new Types.ObjectId(id),
        municipioId: new Types.ObjectId(municipioId),
      },
      { $set: { prioridad: dto.prioridad } },
      { new: true },
    );

    if (!reporte) {
      throw new NotFoundException(`Reporte con ID ${id} no encontrado`);
    }
    return reporte;
  }

  /** PATCH /reportes/:id/visibilidad */
  async cambiarVisibilidad(id: string, visible: boolean, municipioId: string) {
    const reporte = await this.reporteModel.findOneAndUpdate(
      {
        _id: new Types.ObjectId(id),
        municipioId: new Types.ObjectId(municipioId),
      },
      { $set: { visible } },
      { new: true },
    );

    if (!reporte) {
      throw new NotFoundException(`Reporte con ID ${id} no encontrado`);
    }
    return reporte;
  }

  // ═══════════════════════════════════════════════════════════
  // MIS REPORTES
  // ═══════════════════════════════════════════════════════════

  /** GET /reportes/mis-reportes */
  async misReportes(municipioId: string, userId: string, estado?: string) {
    const estados = estado?.split(',').map((s) => s.trim()) ?? [
      'pendiente',
      'en_proceso',
    ];

    const data = await this.reporteModel
      .find({
        municipioId: new Types.ObjectId(municipioId),
        asignadoA: new Types.ObjectId(userId),
        estado: { $in: estados },
      })
      .sort({ prioridad: -1, createdAt: -1 })
      .lean();

    return { data, total: data.length };
  }

  // ═══════════════════════════════════════════════════════════
  // MÉTRICAS
  // ═══════════════════════════════════════════════════════════

  /** GET /public/:slug/reportes/metricas */
  async getMetricasPublicas(municipioId: string, query: MetricasQueryDto) {
    const now = fecha.ahoraEnMexico();
    const m = query.mes ?? now.month() + 1;
    const a = query.anio ?? now.year();
    const inicio = new Date(a, m - 1, 1);
    const fin = new Date(a, m, 1);

    const baseMatch = {
      municipioId: new Types.ObjectId(municipioId),
      visible: true,
      createdAt: { $gte: inicio, $lt: fin },
    };

    const [resumenMes, porCategoria, ultimos5] = await Promise.all([
      this.reporteModel.aggregate([
        { $match: baseMatch },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            resueltos: {
              $sum: { $cond: [{ $eq: ['$estado', 'resuelto'] }, 1, 0] },
            },
            sumTiempoHoras: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $eq: ['$estado', 'resuelto'] },
                      { $ne: ['$fechaResolucion', null] },
                    ],
                  },
                  {
                    $divide: [
                      { $subtract: ['$fechaResolucion', '$createdAt'] },
                      3600000,
                    ],
                  },
                  0,
                ],
              },
            },
          },
        },
      ]),
      this.reporteModel.aggregate([
        { $match: baseMatch },
        {
          $group: {
            _id: { clave: '$categoria', nombre: '$categoriaNombre' },
            total: { $sum: 1 },
            resueltos: {
              $sum: { $cond: [{ $eq: ['$estado', 'resuelto'] }, 1, 0] },
            },
          },
        },
        { $sort: { total: -1 } },
      ]),
      this.reporteModel
        .find({
          municipioId: new Types.ObjectId(municipioId),
          estado: 'resuelto',
          visible: true,
        })
        .sort({ fechaResolucion: -1 })
        .limit(5)
        .lean(),
    ]);

    const stats = resumenMes[0] ?? {
      total: 0,
      resueltos: 0,
      sumTiempoHoras: 0,
    };

    return {
      totalMes: stats.total,
      resueltoseMes: stats.resueltos,
      tasaResolucion:
        stats.total > 0
          ? Math.round((stats.resueltos / stats.total) * 1000) / 10
          : 0,
      tiempoPromedioResolucion:
        stats.resueltos > 0
          ? Math.round(stats.sumTiempoHoras / stats.resueltos)
          : 0,
      porCategoria: porCategoria.map((c) => ({
        clave: c._id.clave,
        nombre: c._id.nombre,
        total: c.total,
        resueltos: c.resueltos,
      })),
      ultimos5Resueltos: ultimos5.map((r) => ({
        folio: r.folio,
        categoriaNombre: r.categoriaNombre,
        ubicacion: r.ubicacion?.descripcion ?? '',
        fechaResolucion: r.fechaResolucion,
      })),
    };
  }

  /** GET /reportes/metricas */
  async getMetricasInternas(municipioId: string, query: MetricasQueryDto) {
    const now = fecha.ahoraEnMexico();
    const m = query.mes ?? now.month() + 1;
    const a = query.anio ?? now.year();
    const inicio = new Date(a, m - 1, 1);
    const fin = new Date(a, m, 1);

    const baseMatch: any = {
      municipioId: new Types.ObjectId(municipioId),
      createdAt: { $gte: inicio, $lt: fin },
    };
    if (query.modulo) baseMatch.modulo = query.modulo;

    // For tendencia: daily buckets
    const diasEnMes = new Date(a, m, 0).getDate();
    const tendenciaPromises = Array.from({ length: diasEnMes }, (_, i) => {
      const diaInicio = new Date(a, m - 1, i + 1);
      const diaFin = new Date(a, m - 1, i + 2);
      return this.reporteModel
        .aggregate([
          {
            $match: {
              ...baseMatch,
              createdAt: { $gte: diaInicio, $lt: diaFin },
            },
          },
          {
            $group: {
              _id: null,
              total: { $sum: 1 },
              resueltos: {
                $sum: { $cond: [{ $eq: ['$estado', 'resuelto'] }, 1, 0] },
              },
            },
          },
        ])
        .then((r) => ({
          fecha: diaInicio.toISOString().split('T')[0],
          total: r[0]?.total ?? 0,
          resueltos: r[0]?.resueltos ?? 0,
        }));
    });

    const [
      resumenMes,
      porCategoria,
      porModulo,
      porOrigen,
      porPrioridad,
      tendencia,
    ] = await Promise.all([
      this.reporteModel.aggregate([
        { $match: baseMatch },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            resueltos: {
              $sum: { $cond: [{ $eq: ['$estado', 'resuelto'] }, 1, 0] },
            },
            pendientes: {
              $sum: { $cond: [{ $eq: ['$estado', 'pendiente'] }, 1, 0] },
            },
            enProceso: {
              $sum: { $cond: [{ $eq: ['$estado', 'en_proceso'] }, 1, 0] },
            },
            cancelados: {
              $sum: { $cond: [{ $eq: ['$estado', 'cancelado'] }, 1, 0] },
            },
            sumTiempoHoras: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $eq: ['$estado', 'resuelto'] },
                      { $ne: ['$fechaResolucion', null] },
                    ],
                  },
                  {
                    $divide: [
                      { $subtract: ['$fechaResolucion', '$createdAt'] },
                      3600000,
                    ],
                  },
                  0,
                ],
              },
            },
          },
        },
      ]),
      this.reporteModel.aggregate([
        { $match: baseMatch },
        {
          $group: {
            _id: { clave: '$categoria', nombre: '$categoriaNombre' },
            total: { $sum: 1 },
            resueltos: {
              $sum: { $cond: [{ $eq: ['$estado', 'resuelto'] }, 1, 0] },
            },
          },
        },
        { $sort: { total: -1 } },
      ]),
      this.reporteModel.aggregate([
        { $match: baseMatch },
        {
          $group: {
            _id: '$modulo',
            total: { $sum: 1 },
            resueltos: {
              $sum: { $cond: [{ $eq: ['$estado', 'resuelto'] }, 1, 0] },
            },
            pendientes: {
              $sum: { $cond: [{ $eq: ['$estado', 'pendiente'] }, 1, 0] },
            },
          },
        },
        { $sort: { total: -1 } },
      ]),
      this.reporteModel.aggregate([
        { $match: baseMatch },
        { $group: { _id: '$origen', count: { $sum: 1 } } },
      ]),
      this.reporteModel.aggregate([
        { $match: baseMatch },
        { $group: { _id: '$prioridad', count: { $sum: 1 } } },
      ]),
      Promise.all(tendenciaPromises),
    ]);

    const stats = resumenMes[0] ?? {
      total: 0,
      resueltos: 0,
      pendientes: 0,
      enProceso: 0,
      cancelados: 0,
      sumTiempoHoras: 0,
    };

    const origenMap: Record<string, number> = {};
    for (const o of porOrigen) origenMap[o._id] = o.count;

    const prioridadMap: Record<string, number> = {};
    for (const p of porPrioridad) prioridadMap[p._id] = p.count;

    return {
      totalMes: stats.total,
      resueltoseMes: stats.resueltos,
      pendientes: stats.pendientes,
      enProceso: stats.enProceso,
      cancelados: stats.cancelados,
      tasaResolucion:
        stats.total > 0
          ? Math.round((stats.resueltos / stats.total) * 1000) / 10
          : 0,
      tiempoPromedioResolucion:
        stats.resueltos > 0
          ? Math.round(stats.sumTiempoHoras / stats.resueltos)
          : 0,
      porCategoria: porCategoria.map((c) => ({
        clave: c._id.clave,
        nombre: c._id.nombre,
        total: c.total,
        resueltos: c.resueltos,
      })),
      porModulo: porModulo.map((m) => ({
        modulo: m._id,
        total: m.total,
        resueltos: m.resueltos,
        pendientes: m.pendientes,
      })),
      porOrigen: {
        portalPublico: origenMap['portal_publico'] ?? 0,
        interno: origenMap['interno'] ?? 0,
        telefono: origenMap['telefono'] ?? 0,
      },
      porPrioridad: {
        baja: prioridadMap['baja'] ?? 0,
        normal: prioridadMap['normal'] ?? 0,
        alta: prioridadMap['alta'] ?? 0,
        urgente: prioridadMap['urgente'] ?? 0,
      },
      tendencia,
    };
  }

  private async enviarCorreoConfirmacion(
    correo: string,
    nombre: string,
    municipioNombre: string,
    municipioSlug: string,
    reporte: ReporteDocument,
  ) {
    const linkConsultar = `${this.frontendUrl}/public/${municipioSlug}/reportes/consultar?folio=${reporte.folio}&token=${reporte.tokenConsulta}`;
    const municipioDoc = await this.municipioModel
      .findById(reporte.municipioId, 'logoUrl')
      .lean();
    const logoUrl = (municipioDoc as any)?.logoUrl ?? '';
    const { emailReporteCreado } =
      await import('../../common/helpers/email.helper');
    const html = emailReporteCreado({
      municipioNombre,
      municipioCorreo: this.emailFrom,
      logoUrl,
      ciudadanoNombre: nombre,
      folio: reporte.folio,
      categoria: reporte.categoriaNombre,
      ubicacion: reporte.ubicacion?.descripcion ?? '',
      tokenConsulta: reporte.tokenConsulta,
      urlConsultar: linkConsultar,
    });
    await this.resend.emails.send({
      from: this.emailFrom,
      to: correo,
      subject: `Reporte registrado ${reporte.folio} — ${municipioNombre}`,
      html,
    });
  }

  private async enviarCorreoActualizacion(
    correo: string,
    nombre: string,
    reporte: ReporteDocument,
  ) {
    const estadoTexto: Record<EstadoReporte, string> = {
      pendiente: 'Pendiente',
      en_proceso: 'En proceso',
      resuelto: 'Resuelto',
      cancelado: 'Cancelado',
    };
    const ultimoHistorial = reporte.historial.slice(-1)[0];
    const comentario = ultimoHistorial?.comentarioPublico ?? '';
    const municipioDoc = await this.municipioModel
      .findById(reporte.municipioId, 'nombre logoUrl')
      .lean();
    const municipioNombreResuelto = (municipioDoc as any)?.nombre ?? '';
    const logoUrl = (municipioDoc as any)?.logoUrl ?? '';
    const { emailReporteActualizado } =
      await import('../../common/helpers/email.helper');
    const html = emailReporteActualizado({
      municipioNombre: municipioNombreResuelto,
      municipioCorreo: this.emailFrom,
      logoUrl,
      ciudadanoNombre: nombre,
      folio: reporte.folio,
      nuevoEstado: estadoTexto[reporte.estado] ?? reporte.estado,
      comentarioPublico: comentario,
      urlConsultar: '',
    });
    await this.resend.emails.send({
      from: this.emailFrom,
      to: correo,
      subject: `Actualización de reporte ${reporte.folio}`,
      html,
    });
  }
}
