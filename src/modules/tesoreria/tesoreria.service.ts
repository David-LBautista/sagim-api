import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { TDocumentDefinitions } from 'pdfmake/interfaces';
import { PdfService } from '../shared/pdf/pdf.service';
import { folioExtendido } from '@/shared/helpers/folio.helper';
import { fecha } from '@/common/helpers/fecha.helper';
import {
  NotificacionesService,
  EnviarLinkPagoParams,
} from '../notificaciones/notificaciones.service';
import {
  ServicioCobro,
  ServicioCobroDocument,
} from './schemas/servicio-cobro.schema';
import {
  OrdenPago,
  OrdenPagoDocument,
  OrdenPagoStatus,
} from '../pagos/schemas/orden-pago.schema';
import { Pago, PagoDocument } from '../pagos/schemas/pago.schema';
import { PagoCaja, PagoCajaDocument } from './schemas/pago-caja.schema';
import {
  Municipality,
  MunicipalityDocument,
} from '../municipalities/schemas/municipality.schema';
import {
  Ciudadano,
  CiudadanoDocument,
} from '../ciudadanos/schemas/ciudadano.schema';
import { S3Service } from '../s3/s3.service';
import { Counter, CounterDocument } from '../dif/schemas/counter.schema';
import {
  CreateServicioCobroDto,
  CreateOrdenPagoTesoreriaDto,
  UpsertServicioOverrideDto,
  RegistrarPagoCajaDto,
} from './dto';
import { CanalPago } from '@/shared/enums';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class TesoreriaService {
  constructor(
    @InjectModel(ServicioCobro.name)
    private servicioCobroModel: Model<ServicioCobroDocument>,
    @InjectModel(OrdenPago.name)
    private ordenPagoModel: Model<OrdenPagoDocument>,
    @InjectModel(Pago.name)
    private pagoModel: Model<PagoDocument>,
    @InjectModel(PagoCaja.name)
    private pagoCajaModel: Model<PagoCajaDocument>,
    @InjectModel(Municipality.name)
    private municipalityModel: Model<MunicipalityDocument>,
    @InjectModel(Ciudadano.name)
    private ciudadanoModel: Model<CiudadanoDocument>,
    @InjectModel(Counter.name)
    private counterModel: Model<CounterDocument>,
    private readonly s3Service: S3Service,
    private readonly pdfService: PdfService,
    private readonly notificacionesService: NotificacionesService,
  ) {}

  // ==================== SERVICIOS COBRABLES ====================

  // ── Merge: catálogo global + overrides del municipio ────────────────
  async findServiciosByMunicipio(
    municipioId: string,
    filters?: {
      busqueda?: string;
      categoria?: string;
      soloPersonalizados?: boolean;
    },
  ): Promise<(ServicioCobro & { esPersonalizado: boolean })[]> {
    const [globales, overrides] = await Promise.all([
      this.servicioCobroModel.find({ municipioId: null, activo: true }).lean(),
      this.servicioCobroModel
        .find({ municipioId: new Types.ObjectId(municipioId) })
        .lean(),
    ]);

    const overrideMap = new Map(overrides.map((s) => [s.clave, s]));

    let merged = globales
      .map((global) => ({
        ...(overrideMap.get(global.clave) ?? global),
        esPersonalizado: overrideMap.has(global.clave),
      }))
      .filter((s) => s.activo)
      .concat(
        overrides
          .filter((o) => !globales.find((g) => g.clave === o.clave) && o.activo)
          .map((o) => ({ ...o, esPersonalizado: true })),
      )
      .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));

    if (filters?.soloPersonalizados) {
      merged = merged.filter((s) => s.esPersonalizado);
    }

    if (filters?.categoria) {
      merged = merged.filter((s) => s.categoria === filters.categoria);
    }

    if (filters?.busqueda) {
      const q = filters.busqueda.toLowerCase();
      merged = merged.filter(
        (s) =>
          s.nombre.toLowerCase().includes(q) ||
          (s as any).clave.toLowerCase().includes(q),
      );
    }

    return merged as unknown as (ServicioCobro & {
      esPersonalizado: boolean;
    })[];
  }

  // ── Verifica si el municipio tiene al menos un override ───────────────
  async hasOverrides(
    municipioId: string,
  ): Promise<{ hasOverrides: boolean; total: number }> {
    const total = await this.servicioCobroModel.countDocuments({
      municipioId: new Types.ObjectId(municipioId),
    });
    return { hasOverrides: total > 0, total };
  }

  // ── Elimina el override de un servicio (lo vuelve al global) ──────────
  async deleteOverride(municipioId: string, clave: string): Promise<void> {
    const result = await this.servicioCobroModel.deleteOne({
      municipioId: new Types.ObjectId(municipioId),
      clave,
    });
    if (result.deletedCount === 0) {
      throw new NotFoundException(
        `No existe un override del servicio "${clave}" para este municipio`,
      );
    }
  }

  // ── Elimina todos los overrides del municipio ─────────────────────
  async deleteAllOverrides(
    municipioId: string,
  ): Promise<{ eliminados: number }> {
    const result = await this.servicioCobroModel.deleteMany({
      municipioId: new Types.ObjectId(municipioId),
    });
    return { eliminados: result.deletedCount };
  }

  // ── Override: municipio crea/actualiza su versión de un servicio ───────────
  async upsertOverride(
    municipioId: string,
    clave: string,
    changes: UpsertServicioOverrideDto,
  ): Promise<ServicioCobro> {
    // Solo se pueden hacer overrides de servicios que existen en el catálogo global
    const globalExiste = await this.servicioCobroModel.findOne({
      municipioId: null,
      clave,
    });

    if (!globalExiste) {
      throw new NotFoundException(
        `Servicio con clave "${clave}" no existe en el catálogo global. ` +
          `Para crear servicios propios del municipio usa POST /tesoreria/servicios.`,
      );
    }

    const mId = new Types.ObjectId(municipioId);

    // Partir de todos los campos del global y sobreescribir solo los que vienen en changes
    const mergedFields = {
      nombre: (globalExiste as any).nombre,
      descripcion: (globalExiste as any).descripcion,
      categoria: (globalExiste as any).categoria,
      costo: (globalExiste as any).costo,
      montoVariable: (globalExiste as any).montoVariable,
      requiereContribuyente: (globalExiste as any).requiereContribuyente,
      orden: (globalExiste as any).orden,
      activo: (globalExiste as any).activo,
      ...changes, // los cambios del usuario sobreescriben el global
      municipioId: mId,
      clave,
    };

    return this.servicioCobroModel.findOneAndUpdate(
      { municipioId: mId, clave },
      { $set: mergedFields },
      { upsert: true, new: true },
    );
  }

  async createServicio(
    createServicioDto: CreateServicioCobroDto,
    municipioId: string,
  ): Promise<ServicioCobro> {
    const servicio = new this.servicioCobroModel({
      ...createServicioDto,
      municipioId: new Types.ObjectId(municipioId),
    });

    return servicio.save();
  }

  // ── Catálogo global (seed, municipioId = null) ────────────────────
  async findCatalogoGlobal(categoria?: string): Promise<ServicioCobro[]> {
    const query: any = { municipioId: null, activo: true };
    if (categoria) query.categoria = categoria;
    return this.servicioCobroModel
      .find(query)
      .sort({ orden: 1, nombre: 1 })
      .lean()
      .exec() as unknown as ServicioCobro[];
  }

  async findAllServicios(scope: any): Promise<ServicioCobro[]> {
    return this.servicioCobroModel
      .find({
        ...scope,
        activo: true,
      })
      .sort({ nombre: 1 })
      .exec();
  }

  async findServicioById(id: string, scope: any): Promise<ServicioCobro> {
    const servicio = await this.servicioCobroModel
      .findOne({
        _id: new Types.ObjectId(id),
        ...scope,
      })
      .exec();

    if (!servicio) {
      throw new NotFoundException(`Servicio con ID ${id} no encontrado`);
    }

    return servicio;
  }

  async updateServicio(
    id: string,
    updateData: Partial<CreateServicioCobroDto>,
    municipioId: string,
  ): Promise<ServicioCobro> {
    const servicio = await this.servicioCobroModel
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(id),
          municipioId: new Types.ObjectId(municipioId),
        },
        updateData,
        { new: true },
      )
      .exec();

    if (!servicio) {
      throw new NotFoundException(`Servicio con ID ${id} no encontrado`);
    }

    return servicio;
  }

  async deactivateServicio(id: string, municipioId: string): Promise<void> {
    const result = await this.servicioCobroModel
      .updateOne(
        {
          _id: new Types.ObjectId(id),
          municipioId: new Types.ObjectId(municipioId),
        },
        { activo: false },
      )
      .exec();

    if (result.matchedCount === 0) {
      throw new NotFoundException(`Servicio con ID ${id} no encontrado`);
    }
  }

  // ==================== ÓRDENES DE PAGO ====================

  async createOrdenPago(
    createOrdenDto: CreateOrdenPagoTesoreriaDto,
    municipioId: string,
    userId: string,
  ): Promise<OrdenPago> {
    // Validar que el servicio existe
    const servicio = await this.findServicioById(
      createOrdenDto.servicioId,
      municipioId,
    );

    if (!servicio.activo) {
      throw new BadRequestException('El servicio no está activo');
    }

    // Generar token único
    const token = uuidv4();

    // Calcular expiración
    const horasValidez = createOrdenDto.horasValidez || 48;
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + horasValidez);

    const ordenPago = new this.ordenPagoModel({
      token,
      municipioId: new Types.ObjectId(municipioId),
      servicioId: new Types.ObjectId(createOrdenDto.servicioId),
      ciudadanoId: createOrdenDto.ciudadanoId
        ? new Types.ObjectId(createOrdenDto.ciudadanoId)
        : undefined,
      monto: createOrdenDto.monto,
      descripcion: createOrdenDto.concepto,
      estado: OrdenPagoStatus.PENDIENTE,
      creadaPorId: new Types.ObjectId(userId),
      expiresAt,
      metadata: {
        emailCiudadano: createOrdenDto.emailCiudadano,
        nombreContribuyente: createOrdenDto.nombreContribuyente,
      },
    });

    const orden = await ordenPago.save();

    // Resolver email y nombre para notificación
    let emailDestino = createOrdenDto.emailCiudadano;
    let nombreCiudadano = createOrdenDto.nombreContribuyente || 'Ciudadano';

    if (createOrdenDto.ciudadanoId) {
      const ciudadano = await this.ciudadanoModel
        .findById(createOrdenDto.ciudadanoId, 'nombre apellidoPaterno email')
        .lean();
      if (ciudadano) {
        nombreCiudadano = [
          (ciudadano as any).nombre,
          (ciudadano as any).apellidoPaterno,
        ]
          .filter(Boolean)
          .join(' ');
        // Usar email del ciudadano si no se proporcionó uno explícito
        if (!emailDestino && (ciudadano as any).email) {
          emailDestino = (ciudadano as any).email;
        }
      }
    }

    // Auto-enviar email si hay destino
    if (emailDestino) {
      const baseUrl = process.env.FRONTEND_URL || 'https://pagos.sagim.mx';
      const municipio = await this.municipalityModel
        .findById(municipioId, 'nombre')
        .lean();

      void this.notificacionesService.enviarLinkPago({
        email: emailDestino,
        nombreCiudadano,
        municipioNombre: (municipio as any)?.nombre ?? 'Municipio',
        descripcion: createOrdenDto.concepto,
        monto: createOrdenDto.monto,
        urlPago: `${baseUrl}/pago/${orden.token}`,
        expiraEn: expiresAt,
      });
    }

    return orden;
  }

  async findAllOrdenes(
    scope: any,
    filters?: {
      estado?: string;
      servicioId?: string;
      fechaDesde?: Date;
      fechaHasta?: Date;
      busqueda?: string;
    },
  ): Promise<OrdenPago[]> {
    const query: any = { ...scope };

    if (filters?.estado) {
      query.estado = filters.estado;
    }

    if (filters?.servicioId) {
      query.servicioId = new Types.ObjectId(filters.servicioId);
    }

    if (filters?.fechaDesde || filters?.fechaHasta) {
      query.createdAt = {};
      if (filters.fechaDesde) {
        query.createdAt.$gte = filters.fechaDesde;
      }
      if (filters.fechaHasta) {
        query.createdAt.$lte = filters.fechaHasta;
      }
    }

    if (filters?.busqueda) {
      const regex = new RegExp(filters.busqueda, 'i');
      query.$or = [{ descripcion: regex }];
    }

    return this.ordenPagoModel
      .find(query)
      .populate('servicioId', 'nombre costo')
      .populate('ciudadanoId', 'nombre apellidoPaterno')
      .populate('creadaPorId', 'nombre email')
      .populate('pagoId', 'folio')
      .sort({ createdAt: -1 })
      .exec();
  }

  async getOrdenesMetrics(scope: any): Promise<{
    pendientes: number;
    recaudadoMes: number;
    porExpirar24h: number;
    tasaConversion: number;
  }> {
    const ahora = new Date();
    const en24h = new Date(ahora.getTime() + 24 * 60 * 60 * 1000);
    const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);

    const [pendientes, porExpirar24h, recaudadoAgg, total, pagadas] =
      await Promise.all([
        this.ordenPagoModel.countDocuments({
          ...scope,
          estado: OrdenPagoStatus.PENDIENTE,
          expiresAt: { $gt: ahora },
        }),
        this.ordenPagoModel.countDocuments({
          ...scope,
          estado: OrdenPagoStatus.PENDIENTE,
          expiresAt: { $gte: ahora, $lte: en24h },
        }),
        this.ordenPagoModel.aggregate([
          {
            $match: {
              ...scope,
              estado: OrdenPagoStatus.PAGADA,
              usadaAt: { $gte: inicioMes },
            },
          },
          { $group: { _id: null, total: { $sum: '$monto' } } },
        ]),
        this.ordenPagoModel.countDocuments({ ...scope }),
        this.ordenPagoModel.countDocuments({
          ...scope,
          estado: OrdenPagoStatus.PAGADA,
        }),
      ]);

    return {
      pendientes,
      recaudadoMes: (recaudadoAgg[0]?.total as number) ?? 0,
      porExpirar24h,
      tasaConversion: total > 0 ? Math.round((pagadas / total) * 1000) / 10 : 0,
    };
  }

  async findOrdenById(id: string, scope: any): Promise<OrdenPago> {
    const orden = await this.ordenPagoModel
      .findOne({
        _id: new Types.ObjectId(id),
        ...scope,
      })
      .populate('servicioId', 'nombre costo descripcion')
      .populate('creadaPorId', 'nombre email')
      .populate('pagoId')
      .exec();

    if (!orden) {
      throw new NotFoundException(`Orden de pago con ID ${id} no encontrada`);
    }

    return orden;
  }

  async cancelarOrden(id: string, municipioId: string): Promise<OrdenPago> {
    const orden = await this.findOrdenById(id, {
      municipioId: new Types.ObjectId(municipioId),
    });

    if (orden.estado === OrdenPagoStatus.PAGADA) {
      throw new BadRequestException('No se puede cancelar una orden ya pagada');
    }

    return this.ordenPagoModel
      .findByIdAndUpdate(
        id,
        { estado: OrdenPagoStatus.CANCELADA },
        { new: true },
      )
      .exec();
  }

  async generarLinkPago(
    id: string,
    municipioId: string,
  ): Promise<{ url: string; expiraEn: Date }> {
    const orden = await this.findOrdenById(id, {
      municipioId: new Types.ObjectId(municipioId),
    });

    if (orden.estado !== OrdenPagoStatus.PENDIENTE) {
      throw new BadRequestException(
        'Solo se pueden generar links para órdenes pendientes',
      );
    }

    // El token ya existe desde la creación
    const baseUrl = process.env.FRONTEND_URL || 'https://pagos.sagim.mx';
    const url = `${baseUrl}/pago/${orden.token}`;

    return {
      url,
      expiraEn: orden.expiresAt,
    };
  }

  async reenviarLink(
    id: string,
    municipioId: string,
  ): Promise<{ url: string; expiraEn: Date }> {
    const linkData = await this.generarLinkPago(id, municipioId);

    // Recuperar datos de la orden para el email
    const orden = await this.ordenPagoModel
      .findOne({
        _id: new Types.ObjectId(id),
        municipioId: new Types.ObjectId(municipioId),
      })
      .lean();

    const emailDestino = (orden as any)?.metadata?.emailCiudadano as
      | string
      | undefined;

    if (emailDestino) {
      const municipio = await this.municipalityModel
        .findById(municipioId, 'nombre')
        .lean();
      const municipioNombre = (municipio as any)?.nombre ?? 'Municipio';

      let nombreCiudadano =
        (orden as any)?.metadata?.nombreContribuyente || 'Ciudadano';
      if ((orden as any)?.ciudadanoId) {
        const ciudadano = await this.ciudadanoModel
          .findById((orden as any).ciudadanoId, 'nombre apellidoPaterno')
          .lean();
        if (ciudadano) {
          nombreCiudadano = [
            (ciudadano as any).nombre,
            (ciudadano as any).apellidoPaterno,
          ]
            .filter(Boolean)
            .join(' ');
        }
      }

      void this.notificacionesService.enviarLinkPago({
        email: emailDestino,
        nombreCiudadano,
        municipioNombre,
        descripcion: (orden as any)?.descripcion ?? 'Pago municipal',
        monto: (orden as any)?.monto ?? 0,
        urlPago: linkData.url,
        expiraEn: linkData.expiraEn,
      });
    }

    return linkData;
  }

  // ==================== PAGOS (CONSULTA) ====================

  async findAllPagos(
    scope: any,
    filters?: {
      servicioId?: string;
      fechaDesde?: Date;
      fechaHasta?: Date;
    },
  ): Promise<Pago[]> {
    // Obtener órdenes del municipio
    const ordenes = await this.ordenPagoModel
      .find({
        ...scope,
        estado: OrdenPagoStatus.PAGADA,
      })
      .select('_id')
      .exec();

    const ordenIds = ordenes.map((o) => o._id);

    const query: any = {
      ordenPagoId: { $in: ordenIds },
    };

    if (filters?.fechaDesde || filters?.fechaHasta) {
      query.fechaPago = {};
      if (filters.fechaDesde) {
        query.fechaPago.$gte = filters.fechaDesde;
      }
      if (filters.fechaHasta) {
        query.fechaPago.$lte = filters.fechaHasta;
      }
    }

    return this.pagoModel
      .find(query)
      .populate({
        path: 'ordenPagoId',
        populate: { path: 'servicioId', select: 'nombre' },
      })
      .sort({ fechaPago: -1 })
      .exec();
  }

  async findPagoById(id: string, scope: any): Promise<Pago> {
    const pago = await this.pagoModel
      .findById(id)
      .populate({
        path: 'ordenPagoId',
        populate: { path: 'servicioId', select: 'nombre descripcion costo' },
      })
      .exec();

    if (!pago) {
      throw new NotFoundException(`Pago con ID ${id} no encontrado`);
    }

    // Verificar que pertenece al municipio (si scope tiene municipioId)
    if (scope.municipioId) {
      const orden = pago.ordenPagoId as any;
      if (orden.municipioId.toString() !== scope.municipioId.toString()) {
        throw new NotFoundException(`Pago con ID ${id} no encontrado`);
      }
    }

    return pago;
  }

  // ==================== REPORTES ====================

  /**
   * Helper privado: consolida pagos Stripe (pagos_pagos) + pagos en caja (tesoreria_pagos)
   * en un array unificado con la misma forma para reportes.
   */
  private async findPagosConsolidados(
    municipioId: string,
    fechaDesde: Date,
    fechaHasta: Date,
  ): Promise<
    {
      monto: number;
      servicioNombre: string;
      canal: string;
      metodoPago?: string;
    }[]
  > {
    const mid = new Types.ObjectId(municipioId);
    const dateFilter = { $gte: fechaDesde, $lte: fechaHasta };

    // 1. Pagos en caja (tesoreria_pagos) — servicioNombre ya es un snapshot
    const pagosCaja = await this.pagoCajaModel
      .find({ municipioId: mid, fechaPago: dateFilter })
      .select('monto servicioNombre canal metodoPago')
      .lean()
      .exec();

    const cajaUnificados = pagosCaja.map((p) => ({
      monto: p.monto,
      servicioNombre: p.servicioNombre,
      canal: 'CAJA' as const,
      metodoPago: p.metodoPago,
    }));

    // 2. Pagos en línea Stripe (pagos_pagos) — nombre viene via orden → servicio
    const ordenes = await this.ordenPagoModel
      .find({ municipioId: mid, estado: OrdenPagoStatus.PAGADA })
      .select('_id servicioId')
      .populate({ path: 'servicioId', select: 'nombre' })
      .lean()
      .exec();

    const ordenNombreMap = new Map(
      ordenes.map((o) => [
        o._id.toString(),
        (o.servicioId as any)?.nombre || 'Sin servicio',
      ]),
    );

    const pagosStripe = await this.pagoModel
      .find({
        ordenPagoId: { $in: ordenes.map((o) => o._id) },
        fechaPago: dateFilter,
      })
      .select('monto ordenPagoId metodoPago')
      .lean()
      .exec();

    const stripeUnificados = pagosStripe.map((p) => ({
      monto: p.monto,
      servicioNombre:
        ordenNombreMap.get((p as any).ordenPagoId?.toString()) ??
        'Sin servicio',
      canal: 'EN_LINEA' as const,
      metodoPago: p.metodoPago,
    }));

    return [...cajaUnificados, ...stripeUnificados];
  }

  async reporteDiario(
    scope: any,
    fechaParam: Date,
    detalle = false,
  ): Promise<any> {
    // Rango del día completo en America/Mexico_City → convertido a UTC para la consulta
    const inicioDia = fecha.inicioDia(fechaParam);
    const finDia = fecha.finDia(fechaParam);

    const municipioId = scope.municipioId?.toString();
    const mid = new Types.ObjectId(municipioId);

    const pagos = await this.findPagosConsolidados(
      municipioId,
      inicioDia,
      finDia,
    );

    const totalRecaudado = pagos.reduce((s, p) => s + p.monto, 0);
    const porCanal: Record<string, number> = { CAJA: 0, EN_LINEA: 0 };
    const porServicio: Record<string, { cantidad: number; total: number }> = {};

    for (const p of pagos) {
      porCanal[p.canal] = (porCanal[p.canal] ?? 0) + p.monto;
      if (!porServicio[p.servicioNombre]) {
        porServicio[p.servicioNombre] = { cantidad: 0, total: 0 };
      }
      porServicio[p.servicioNombre].cantidad++;
      porServicio[p.servicioNombre].total += p.monto;
    }

    const resumen: any = {
      fecha: inicioDia,
      totalRecaudado,
      totalOperaciones: pagos.length,
      porCanal,
      porServicio,
    };

    // ── Detalle individual (corte de caja / PDF) ────────────────────────────
    if (detalle) {
      // Pagos en caja — populate ciudadanoId para obtener nombre completo
      const pagosCajaDoc = await this.pagoCajaModel
        .find({
          municipioId: mid,
          fechaPago: { $gte: inicioDia, $lte: finDia },
        })
        .populate({
          path: 'ciudadanoId',
          select: 'nombre apellidoPaterno apellidoMaterno',
        })
        .sort({ fechaPago: 1 })
        .lean()
        .exec();

      // Pagos en línea — populate via orden
      const ordenes = await this.ordenPagoModel
        .find({ municipioId: mid, estado: OrdenPagoStatus.PAGADA })
        .select('_id servicioId')
        .populate({ path: 'servicioId', select: 'nombre' })
        .lean()
        .exec();
      const ordenNombreMap = new Map(
        ordenes.map((o) => [
          o._id.toString(),
          (o.servicioId as any)?.nombre ?? 'Sin servicio',
        ]),
      );
      const pagosStripeDoc = await this.pagoModel
        .find({
          ordenPagoId: { $in: ordenes.map((o) => o._id) },
          fechaPago: { $gte: inicioDia, $lte: finDia },
        })
        .sort({ fechaPago: 1 })
        .lean()
        .exec();

      const formatHora = (d: Date) => fecha.hora(d);

      const detalleCaja = pagosCajaDoc.map((p) => {
        const c = p.ciudadanoId as any;
        const ciudadano = c
          ? [c.nombre, c.apellidoPaterno, c.apellidoMaterno]
              .filter(Boolean)
              .join(' ')
          : null;
        return {
          _id: (p as any)._id.toString(),
          folio: p.folio,
          hora: formatHora(p.fechaPago),
          servicio: p.servicioNombre,
          ciudadano,
          referenciaDocumento: p.referenciaDocumento ?? null,
          monto: p.monto,
          metodoPago: p.metodoPago,
          canal: 'CAJA',
          tieneRecibo: !!p.reciboS3Key,
        };
      });

      const detalleLinea = pagosStripeDoc.map((p) => ({
        _id: (p as any)._id.toString(),
        folio: (p as any).folio ?? null,
        hora: formatHora((p as any).fechaPago),
        servicio:
          ordenNombreMap.get((p as any).ordenPagoId?.toString()) ??
          'Sin servicio',
        ciudadano: null, // ciudadanoId opcional en Stripe, no se incluye aquí
        monto: p.monto,
        metodoPago: (p as any).metodoPago ?? 'TARJETA',
        canal: 'EN_LINEA',
        tieneRecibo: !!(p as any).s3Key,
      }));

      // Ordenados por hora
      resumen.pagos = [...detalleCaja, ...detalleLinea].sort((a, b) =>
        a.hora.localeCompare(b.hora),
      );
    }

    return resumen;
  }

  async reporteMensual(scope: any, mes: number, año: number): Promise<any> {
    // Rango mensual en America/Mexico_City → convertido a UTC para la consulta
    const inicioMes = fecha.inicioMes(mes, año);
    const finMes = fecha.finMes(mes, año);

    const municipioId = scope.municipioId?.toString();
    const pagos = await this.findPagosConsolidados(
      municipioId,
      inicioMes,
      finMes,
    );

    const totalRecaudado = pagos.reduce((s, p) => s + p.monto, 0);
    const porCanal: Record<string, number> = { CAJA: 0, EN_LINEA: 0 };
    const porServicio: Record<string, { cantidad: number; total: number }> = {};

    for (const p of pagos) {
      porCanal[p.canal] = (porCanal[p.canal] ?? 0) + p.monto;
      if (!porServicio[p.servicioNombre]) {
        porServicio[p.servicioNombre] = { cantidad: 0, total: 0 };
      }
      porServicio[p.servicioNombre].cantidad++;
      porServicio[p.servicioNombre].total += p.monto;
    }

    return {
      mes,
      año,
      totalRecaudado,
      totalOperaciones: pagos.length,
      porCanal,
      porServicio,
    };
  }

  async reportePorServicio(servicioId: string, scope: any): Promise<any> {
    const servicio = await this.findServicioById(servicioId, scope);
    const sid = new Types.ObjectId(servicioId);
    const mid = new Types.ObjectId(scope.municipioId);

    // Órdenes + pagos en línea (Stripe)
    const ordenes = await this.ordenPagoModel
      .find({ servicioId: sid, ...scope })
      .exec();

    const totalOrdenes = ordenes.length;
    const ordenesPagadas = ordenes.filter(
      (o) => o.estado === OrdenPagoStatus.PAGADA,
    ).length;
    const ordenesPendientes = ordenes.filter(
      (o) => o.estado === OrdenPagoStatus.PENDIENTE,
    ).length;
    const ordenesExpiradas = ordenes.filter(
      (o) => o.estado === OrdenPagoStatus.EXPIRADA,
    ).length;

    const pagosStripe = await this.pagoModel
      .find({ ordenPagoId: { $in: ordenes.map((o) => o._id) } })
      .exec();
    const recaudadoEnLinea = pagosStripe.reduce((s, p) => s + p.monto, 0);

    // Pagos en caja para el mismo servicio
    const pagosCaja = await this.pagoCajaModel
      .find({ servicioId: sid, municipioId: mid })
      .exec();
    const recaudadoCaja = pagosCaja.reduce((s, p) => s + p.monto, 0);

    return {
      servicio: {
        nombre: servicio.nombre,
        costoBase: servicio.costo,
      },
      estadisticas: {
        totalOrdenes,
        ordenesPagadas,
        ordenesPendientes,
        ordenesExpiradas,
        recaudadoEnLinea,
        recaudadoCaja,
        totalRecaudado: recaudadoEnLinea + recaudadoCaja,
      },
    };
  }

  // ==================== PAGOS PRESENCIALES EN CAJA ====================

  async registrarPagoCaja(
    dto: RegistrarPagoCajaDto,
    municipioId: string,
    cajeroId: string,
    cajeroNombre: string,
  ) {
    // 1. Verificar que el servicio existe y está activo
    const servicios = await this.findServiciosByMunicipio(municipioId);
    const servicio = servicios.find(
      (s) => (s as any)._id.toString() === dto.servicioId,
    );

    if (!servicio) throw new NotFoundException('Servicio no encontrado');
    if (!(servicio as any).activo)
      throw new BadRequestException('El servicio está inactivo');

    // 2. Validar contribuyente si el servicio lo requiere
    if ((servicio as any).requiereContribuyente && !dto.ciudadanoId) {
      throw new BadRequestException(
        'Este servicio requiere asociar un ciudadano',
      );
    }

    // 3. Obtener configuración del municipio (porcentajeContribucion + datos para el PDF)
    const municipio = await this.municipalityModel
      .findById(municipioId, 'nombre logoUrl porcentajeContribucion')
      .lean();
    const porcentajeContribucion =
      (municipio as any)?.porcentajeContribucion ?? 10;
    const subtotal = Number(
      (dto.monto / (1 + porcentajeContribucion / 100)).toFixed(2),
    );
    const contribucion = Number((dto.monto - subtotal).toFixed(2));

    // 4. Generar folio consecutivo atómico: CAJA-{YYYYMM}-{0001}
    const folio = await this.generateFolioCaja(municipioId);

    // 5. Crear y guardar el pago con desglose fiscal
    const pago = await new this.pagoCajaModel({
      municipioId: new Types.ObjectId(municipioId),
      folio,
      servicioId: new Types.ObjectId(dto.servicioId),
      servicioNombre: (servicio as any).nombre, // snapshot
      servicioCategoria: (servicio as any).categoria, // snapshot
      ciudadanoId: dto.ciudadanoId ? new Types.ObjectId(dto.ciudadanoId) : null,
      monto: dto.monto,
      subtotal,
      contribucion,
      porcentajeContribucion, // snapshot
      metodoPago: dto.metodoPago,
      estado: 'PAGADO',
      canal: CanalPago.CAJA,
      cajeroId: new Types.ObjectId(cajeroId),
      cajeroNombre, // snapshot
      fechaPago: new Date(),
      observaciones: dto.observaciones,
      referenciaDocumento: dto.referenciaDocumento,
      reciboS3Key: null,
    }).save();

    // 4. Generar PDF del recibo y subir a S3
    // Si falla (S3 caído, etc.) el pago queda guardado — se puede regenerar después
    try {
      // municipio ya fue consultado antes de crear el pago
      const municipioNombre = (municipio as any)?.nombre ?? 'Municipio';
      const logoBase64 = (municipio as any)?.logoUrl
        ? await this.pdfService
            .fetchImageAsBase64((municipio as any).logoUrl)
            .catch(() => undefined)
        : undefined;

      // Obtener nombre del ciudadano si aplica
      let ciudadanoNombre: string | null = null;
      if (dto.ciudadanoId) {
        const c = await this.ciudadanoModel
          .findById(dto.ciudadanoId, 'nombre apellidoPaterno apellidoMaterno')
          .lean();
        if (c) {
          ciudadanoNombre = [
            c.nombre,
            (c as any).apellidoPaterno,
            (c as any).apellidoMaterno,
          ]
            .filter(Boolean)
            .join(' ')
            .toUpperCase();
        }
      }

      // Generar PDF
      const docDef = this.buildReciboDefinition({
        municipioNombre,
        logoBase64,
        folio: pago.folio,
        fecha: pago.fechaPago,
        servicio: (servicio as any).nombre,
        ciudadano: ciudadanoNombre,
        referenciaDocumento: dto.referenciaDocumento ?? null,
        monto: dto.monto,
        subtotal: pago.subtotal,
        contribucion: pago.contribucion,
        porcentajeContribucion: pago.porcentajeContribucion,
        metodoPago: dto.metodoPago,
        cajeroNombre,
      });
      const pdfBuffer = await this.pdfService.generatePdfBuffer(docDef);

      // Subir a S3 + signed URL en un solo paso
      const { url: reciboUrl, key: s3Key } =
        await this.pdfService.uploadAndSign(
          S3Service.keyReciboCaja(municipioId, pago.folio),
          pdfBuffer,
          {
            folio: pago.folio,
            municipioId,
            generadoEn: new Date().toISOString(),
          },
          300,
        );

      // Guardar key en el documento
      pago.reciboS3Key = s3Key;
      await pago.save();

      return { ...pago.toObject(), reciboUrl };
    } catch (err) {
      // PDF/S3 falló pero el pago está guardado — devolver sin reciboUrl
      console.error(
        `[TesoreriaService] Error generando recibo PDF: ${err.message}`,
      );
      return { ...pago.toObject(), reciboUrl: null };
    }
  }

  /**
   * Regenerar URL firmada del recibo de un pago de caja.
   * Usar para el botón "Reimprimir" en la tabla.
   * La URL es válida por 5 minutos.
   */
  async getReciboUrl(
    pagoId: string,
    municipioId: string,
  ): Promise<{ reciboUrl: string; expiraEn: Date }> {
    const pago = await this.pagoCajaModel
      .findOne({
        _id: new Types.ObjectId(pagoId),
        municipioId: new Types.ObjectId(municipioId),
      })
      .lean();

    if (!pago) throw new NotFoundException('Pago no encontrado');
    if (!pago.reciboS3Key)
      throw new BadRequestException('Este pago no tiene recibo generado');

    const url = await this.s3Service.getSignedUrl(pago.reciboS3Key, 300);
    const expiraEn = new Date(Date.now() + 300_000);
    return { reciboUrl: url, expiraEn };
  }

  // ==================== HELPERS DE ZONA HORARIA ====================

  /**
   * Devuelve {inicio, fin} en UTC que abarcan el día completo en America/Mexico_City.
   * Maneja correctamente el cambio de horario de verano (CST/CDT).
   */

  // ==================== FOLIO CONSECUTIVO — CONTADOR ATÓMICO ====================

  private async generateFolioCaja(municipioId: string): Promise<string> {
    const date = new Date();
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const munShort = municipioId.toString().slice(-4).toUpperCase();
    const counterId = `caja-${munShort}-${year}${month}`;

    const counter = await this.counterModel.findOneAndUpdate(
      { _id: counterId },
      { $inc: { seq: 1 } },
      { upsert: true, new: true },
    );

    const secuencial = counter.seq.toString().padStart(4, '0');
    return `CAJA-${year}${month}-${secuencial}`;
  }

  // ==================== PDF PRIVADO — CORTE DIARIO ====================

  async generarCorteDiarioPdf(
    scope: any,
    fechaCorte: Date,
  ): Promise<{ url: string; key: string; expiraEn: Date }> {
    const municipioId = scope.municipioId?.toString();

    // Datos del reporte (reutiliza la lógica existente con detalle completo)
    const resumen: any = await this.reporteDiario(scope, fechaCorte, true);

    // Datos del municipio para el encabezado
    const municipio = await this.municipalityModel
      .findById(municipioId, 'nombre logoUrl')
      .lean();
    const municipioNombre = (municipio as any)?.nombre ?? 'Municipio';
    const logoBase64 = (municipio as any)?.logoUrl
      ? await this.pdfService
          .fetchImageAsBase64((municipio as any).logoUrl)
          .catch(() => undefined)
      : undefined;

    const fechaStr = fecha.formatear(
      fechaCorte,
      'dddd, DD [de] MMMM [de] YYYY',
    );

    const docDefinition = this.buildCorteDiarioDefinition({
      municipioNombre,
      logoBase64,
      fechaStr,
      resumen,
      municipioId,
    });

    const pdfBuffer = await this.pdfService.generatePdfBuffer(docDefinition);

    // Key: municipios/{id}/reportes/tesoreria/diario/RPT-diario-{YYYYMMDD}.pdf
    const periodo = fecha.formatear(fechaCorte, 'YYYYMMDD');
    const key = S3Service.keyReporteTesoreria(municipioId, 'diario', periodo);

    return this.pdfService.uploadAndSign(key, pdfBuffer, {
      municipioId,
      tipo: 'corte-diario',
      generadoEn: new Date().toISOString(),
    });
  }

  private buildCorteDiarioDefinition(params: {
    municipioNombre: string;
    logoBase64?: string;
    fechaStr: string;
    resumen: any;
    municipioId: string;
  }): TDocumentDefinitions {
    const { municipioNombre, logoBase64, fechaStr, resumen, municipioId } =
      params;
    const pagos: any[] = resumen.pagos ?? [];

    const content: any[] = [];

    if (logoBase64) {
      content.push({
        image: logoBase64,
        width: 60,
        alignment: 'center',
        margin: [0, 0, 0, 6],
      });
    }
    content.push({
      text: municipioNombre.toUpperCase(),
      fontSize: 14,
      bold: true,
      alignment: 'center',
      margin: [0, 0, 0, 2],
    });
    content.push({
      text: 'CORTE DE CAJA',
      fontSize: 11,
      alignment: 'center',
      margin: [0, 0, 0, 2],
    });
    content.push({
      text: fechaStr,
      fontSize: 9,
      color: '#555',
      alignment: 'center',
      margin: [0, 0, 0, 14],
    });

    // Cuadro resumen
    content.push({
      table: {
        widths: ['*', '*', '*', '*'],
        body: [
          [
            {
              text: 'Total Recaudado',
              style: 'resumenLabel',
              alignment: 'center',
            },
            { text: 'Operaciones', style: 'resumenLabel', alignment: 'center' },
            { text: 'Caja', style: 'resumenLabel', alignment: 'center' },
            { text: 'En Línea', style: 'resumenLabel', alignment: 'center' },
          ],
          [
            {
              text: `$${(resumen.totalRecaudado ?? 0).toFixed(2)}`,
              style: 'resumenValor',
              alignment: 'center',
            },
            {
              text: `${resumen.totalOperaciones ?? 0}`,
              style: 'resumenValor',
              alignment: 'center',
            },
            {
              text: `$${(resumen.porCanal?.CAJA ?? 0).toFixed(2)}`,
              style: 'resumenValor',
              alignment: 'center',
            },
            {
              text: `$${(resumen.porCanal?.EN_LINEA ?? 0).toFixed(2)}`,
              style: 'resumenValor',
              alignment: 'center',
            },
          ],
        ],
      },
      layout: 'lightHorizontalLines',
      margin: [0, 0, 0, 16],
    });

    // Tabla de movimientos
    if (pagos.length === 0) {
      content.push({
        text: 'Sin movimientos en este período.',
        fontSize: 9,
        color: '#888',
        alignment: 'center',
        margin: [0, 10, 0, 0],
      });
    } else {
      content.push({
        text: 'MOVIMIENTOS DEL DÍA',
        fontSize: 10,
        bold: true,
        margin: [0, 0, 0, 6],
      });

      const headerRow = [
        { text: 'Folio', style: 'thTable' },
        { text: 'Hora', style: 'thTable' },
        { text: 'Servicio', style: 'thTable' },
        { text: 'Ciudadano', style: 'thTable' },
        { text: 'Canal', style: 'thTable' },
        { text: 'Método', style: 'thTable' },
        { text: 'Monto', style: 'thTable', alignment: 'right' },
      ];

      const dataRows = pagos.map((p) => [
        {
          text: p.folio ? folioExtendido(p.folio, municipioId) : '—',
          style: 'tdTable',
        },
        { text: p.hora ?? '—', style: 'tdTable' },
        { text: p.servicio ?? '—', style: 'tdTable' },
        { text: p.ciudadano ?? '—', style: 'tdTable' },
        { text: p.canal ?? '—', style: 'tdTable' },
        { text: p.metodoPago ?? '—', style: 'tdTable' },
        {
          text: `$${(p.monto ?? 0).toFixed(2)}`,
          style: 'tdTable',
          alignment: 'right',
        },
      ]);

      const totalRow = [
        { text: '', colSpan: 5, border: [false, true, false, false] },
        {},
        {},
        {},
        {},
        {
          text: 'TOTAL:',
          bold: true,
          fontSize: 9,
          border: [false, true, false, false],
        },
        {
          text: `$${(resumen.totalRecaudado ?? 0).toFixed(2)}`,
          bold: true,
          fontSize: 9,
          alignment: 'right',
          border: [false, true, false, false],
        },
      ];

      content.push({
        table: {
          headerRows: 1,
          widths: ['auto', 'auto', '*', '*', 'auto', 'auto', 'auto'],
          body: [headerRow, ...dataRows, totalRow],
        },
        layout: 'lightHorizontalLines',
      });
    }

    const generadoEn = fecha.formatear(new Date(), 'DD/MM/YYYY HH:mm');
    content.push({
      text: `Generado el ${generadoEn}`,
      fontSize: 7,
      color: '#888',
      alignment: 'right',
      margin: [0, 16, 0, 0],
    });

    return {
      pageSize: 'A4',
      pageOrientation: pagos.length > 12 ? 'landscape' : 'portrait',
      pageMargins: [30, 40, 30, 40],
      content,
      styles: {
        resumenLabel: { fontSize: 8, color: '#555', bold: true },
        resumenValor: { fontSize: 11, bold: true },
        thTable: { fontSize: 8, bold: true, color: '#333' },
        tdTable: { fontSize: 8 },
      },
    } as TDocumentDefinitions;
  }

  // ==================== PDF PRIVADO — RECIBO DE CAJA ====================

  private buildReciboDefinition(params: {
    municipioNombre: string;
    logoBase64?: string;
    folio: string;
    fecha: Date;
    servicio: string;
    ciudadano: string | null;
    referenciaDocumento: string | null;
    monto: number;
    subtotal: number;
    contribucion: number;
    porcentajeContribucion: number;
    metodoPago: string;
    cajeroNombre: string;
  }): TDocumentDefinitions {
    const {
      municipioNombre,
      logoBase64,
      folio,
      fecha: fechaDoc,
      servicio,
      ciudadano,
      referenciaDocumento,
      monto,
      subtotal,
      contribucion,
      porcentajeContribucion,
      metodoPago,
      cajeroNombre,
    } = params;

    const fechaStr = fecha.formatear(fechaDoc, 'DD/MM/YYYY');
    const horaStr = fecha.hora(fechaDoc);

    const LINE_WIDTH = 214; // page 250 - margins 18*2
    const sep = (): any => ({
      canvas: [
        { type: 'line', x1: 0, y1: 0, x2: LINE_WIDTH, y2: 0, lineWidth: 0.5 },
      ],
      margin: [0, 4, 0, 4],
    });
    const thinSep = (): any => ({
      canvas: [
        {
          type: 'line',
          x1: 0,
          y1: 0,
          x2: LINE_WIDTH,
          y2: 0,
          lineWidth: 0.3,
          dash: { length: 2 },
        },
      ],
      margin: [0, 3, 0, 3],
    });
    const row = (label: string, value: string, boldValue = false): any => ({
      columns: [
        { text: label, width: '45%', fontSize: 8, color: '#555' },
        {
          text: value,
          width: '55%',
          fontSize: 8,
          bold: boldValue,
          alignment: 'right',
        },
      ],
      margin: [0, 2, 0, 2],
    });

    const content: any[] = [];

    if (logoBase64) {
      content.push({
        image: logoBase64,
        width: 44,
        alignment: 'center',
        margin: [0, 0, 0, 4],
      });
    }
    content.push({
      text: municipioNombre.toUpperCase(),
      fontSize: 10,
      bold: true,
      alignment: 'center',
      margin: [0, 0, 0, 2],
    });
    content.push(sep());
    content.push({
      text: 'RECIBO DE PAGO',
      fontSize: 9,
      alignment: 'center',
      margin: [0, 0, 0, 4],
    });
    content.push(sep());

    content.push(row('Folio:', folio, true));
    content.push(row('Fecha:', fechaStr));
    content.push(row('Hora:', horaStr));
    content.push(sep());

    content.push(row('Servicio:', servicio));
    if (ciudadano) content.push(row('Ciudadano:', ciudadano));
    if (referenciaDocumento)
      content.push(row('Referencia:', referenciaDocumento));
    content.push(thinSep());

    content.push(
      row('Método:', metodoPago === 'EFECTIVO' ? 'Efectivo' : 'Tarjeta'),
    );
    content.push(thinSep());
    content.push(row('Subtotal:', `$${subtotal.toFixed(2)}`));
    content.push(
      row(
        `Contribución (${porcentajeContribucion}%):`,
        `$${contribucion.toFixed(2)}`,
      ),
    );
    content.push(sep());
    content.push({
      columns: [
        { text: 'TOTAL:', width: '45%', fontSize: 11, bold: true },
        {
          text: `$${monto.toFixed(2)}`,
          width: '55%',
          fontSize: 11,
          bold: true,
          alignment: 'right',
        },
      ],
      margin: [0, 2, 0, 4],
    });

    content.push(sep());
    content.push(row('Atendió:', cajeroNombre));

    // Espacio para firma del cajero
    content.push({ text: '', margin: [0, 18, 0, 0] });
    content.push({
      canvas: [
        {
          type: 'line',
          x1: 40,
          y1: 0,
          x2: LINE_WIDTH - 40,
          y2: 0,
          lineWidth: 0.5,
        },
      ],
    });
    content.push({
      text: 'Firma del cajero',
      fontSize: 6.5,
      color: '#666',
      alignment: 'center',
      margin: [0, 2, 0, 0],
    });

    content.push(sep());

    content.push({
      text: 'Documento generado por SAGIM.',
      fontSize: 6.5,
      color: '#666',
      alignment: 'center',
      margin: [0, 6, 0, 1],
    });
    content.push({
      text: 'Este recibo es comprobante oficial de pago',
      fontSize: 6.5,
      color: '#666',
      alignment: 'center',
    });

    return {
      pageSize: { width: 250, height: 420 } as any, // altura aumentada para firma
      pageMargins: [18, 14, 18, 14],
      content,
    };
  }
}
