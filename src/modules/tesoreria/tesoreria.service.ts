import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
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
import { CreateServicioCobroDto, CreateOrdenPagoTesoreriaDto } from './dto';
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
  ) {}

  // ==================== SERVICIOS COBRABLES ====================

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
      monto: createOrdenDto.monto,
      descripcion: createOrdenDto.concepto,
      estado: OrdenPagoStatus.PENDIENTE,
      creadaPorId: new Types.ObjectId(userId),
      expiresAt,
      // Guardar email para envío
      metadata: { emailCiudadano: createOrdenDto.emailCiudadano },
    });

    return ordenPago.save();
  }

  async findAllOrdenes(
    scope: any,
    filters?: {
      estado?: string;
      servicioId?: string;
      fechaDesde?: Date;
      fechaHasta?: Date;
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

    return this.ordenPagoModel
      .find(query)
      .populate('servicioId', 'nombre costo')
      .populate('creadaPorId', 'nombre email')
      .sort({ createdAt: -1 })
      .exec();
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
    const orden = await this.findOrdenById(id, municipioId);

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
    const orden = await this.findOrdenById(id, municipioId);

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
    // Mismo comportamiento que generarLinkPago
    // En producción, aquí se enviaría el email
    return this.generarLinkPago(id, municipioId);
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

  async reporteDiario(scope: any, fecha: Date): Promise<any> {
    const inicioDia = new Date(fecha);
    inicioDia.setHours(0, 0, 0, 0);

    const finDia = new Date(fecha);
    finDia.setHours(23, 59, 59, 999);

    const pagos = await this.findAllPagos(scope, {
      fechaDesde: inicioDia,
      fechaHasta: finDia,
    });

    const totalRecaudado = pagos.reduce((sum, p) => sum + p.monto, 0);
    const totalOperaciones = pagos.length;

    return {
      fecha,
      totalRecaudado,
      totalOperaciones,
      pagos,
    };
  }

  async reporteMensual(scope: any, mes: number, año: number): Promise<any> {
    const inicioMes = new Date(año, mes - 1, 1);
    const finMes = new Date(año, mes, 0, 23, 59, 59, 999);

    const pagos = await this.findAllPagos(scope, {
      fechaDesde: inicioMes,
      fechaHasta: finMes,
    });

    const totalRecaudado = pagos.reduce((sum, p) => sum + p.monto, 0);
    const totalOperaciones = pagos.length;

    // Agrupar por servicio
    const porServicio: any = {};
    pagos.forEach((pago: any) => {
      const servicioNombre =
        pago.ordenPagoId?.servicioId?.nombre || 'Sin servicio';
      if (!porServicio[servicioNombre]) {
        porServicio[servicioNombre] = { cantidad: 0, total: 0 };
      }
      porServicio[servicioNombre].cantidad++;
      porServicio[servicioNombre].total += pago.monto;
    });

    return {
      mes,
      año,
      totalRecaudado,
      totalOperaciones,
      porServicio,
    };
  }

  async reportePorServicio(servicioId: string, scope: any): Promise<any> {
    const servicio = await this.findServicioById(servicioId, scope);

    const ordenes = await this.ordenPagoModel
      .find({
        servicioId: new Types.ObjectId(servicioId),
        ...scope,
      })
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

    const pagos = await this.pagoModel
      .find({
        ordenPagoId: { $in: ordenes.map((o) => o._id) },
      })
      .exec();

    const totalRecaudado = pagos.reduce((sum, p) => sum + p.monto, 0);

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
        totalRecaudado,
      },
    };
  }
}
