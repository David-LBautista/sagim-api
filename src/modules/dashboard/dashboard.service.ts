import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Pago, PagoDocument } from '@/modules/pagos/schemas/pago.schema';
import {
  OrdenPago,
  OrdenPagoDocument,
} from '@/modules/pagos/schemas/orden-pago.schema';
import {
  ServicioCobro,
  ServicioCobroDocument,
} from '@/modules/tesoreria/schemas/servicio-cobro.schema';
import { Apoyo, ApoyoDocument } from '@/modules/dif/schemas/apoyo.schema';

@Injectable()
export class DashboardService {
  constructor(
    @InjectModel(Pago.name) private pagoModel: Model<PagoDocument>,
    @InjectModel(OrdenPago.name)
    private ordenPagoModel: Model<OrdenPagoDocument>,
    @InjectModel(ServicioCobro.name)
    private servicioCobroModel: Model<ServicioCobroDocument>,
    @InjectModel(Apoyo.name) private apoyoModel: Model<ApoyoDocument>,
  ) {}

  // ==========================================
  // 💰 SECCIÓN TESORERÍA (RECAUDACIÓN)
  // ==========================================

  async getResumenTesoreria(municipioId: string) {
    const municipioObjectId = new Types.ObjectId(municipioId);
    const mesActual = new Date();
    mesActual.setDate(1);
    mesActual.setHours(0, 0, 0, 0);

    const [pagosStats, ordenesStats, serviciosActivos] = await Promise.all([
      this.pagoModel.aggregate([
        {
          $match: {
            municipioId: municipioObjectId,
            estado: 'PAGADO',
            fechaPago: { $gte: mesActual },
          },
        },
        {
          $group: {
            _id: null,
            recaudacionTotal: { $sum: '$monto' },
            pagosRealizados: { $count: {} },
          },
        },
      ]),
      this.ordenPagoModel.countDocuments({
        municipioId: municipioObjectId,
        estado: 'PENDIENTE',
      }),
      this.servicioCobroModel.countDocuments({
        municipioId: municipioObjectId,
        activo: true,
      }),
    ]);

    const stats = pagosStats[0] || { recaudacionTotal: 0, pagosRealizados: 0 };

    return {
      recaudacionTotal: stats.recaudacionTotal,
      pagosRealizados: stats.pagosRealizados,
      pagosPendientes: ordenesStats,
      serviciosActivos: serviciosActivos,
      periodo: mesActual.toISOString().substring(0, 7), // "2026-01"
    };
  }

  async getIngresos(municipioId: string, desde?: string, hasta?: string) {
    const municipioObjectId = new Types.ObjectId(municipioId);

    // Si no se especifica rango, usar mes actual
    const fechaDesde = desde
      ? new Date(desde)
      : new Date(new Date().setDate(1));
    const fechaHasta = hasta ? new Date(hasta) : new Date();
    fechaHasta.setHours(23, 59, 59, 999);

    const ingresos = await this.pagoModel.aggregate([
      {
        $match: {
          municipioId: municipioObjectId,
          estado: 'PAGADO',
          fechaPago: { $gte: fechaDesde, $lte: fechaHasta },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$fechaPago' },
          },
          monto: { $sum: '$monto' },
        },
      },
      {
        $sort: { _id: 1 },
      },
      {
        $project: {
          _id: 0,
          fecha: '$_id',
          monto: 1,
        },
      },
    ]);

    return ingresos;
  }

  async getIngresosPorArea(municipioId: string) {
    const municipioObjectId = new Types.ObjectId(municipioId);

    const ingresos = await this.pagoModel.aggregate([
      {
        $match: {
          municipioId: municipioObjectId,
          estado: 'PAGADO',
        },
      },
      {
        $lookup: {
          from: 'ordenpagos',
          localField: 'ordenPagoId',
          foreignField: '_id',
          as: 'orden',
        },
      },
      {
        $unwind: { path: '$orden', preserveNullAndEmptyArrays: true },
      },
      {
        $group: {
          _id: '$orden.areaResponsable',
          monto: { $sum: '$monto' },
        },
      },
      {
        $project: {
          _id: 0,
          area: { $ifNull: ['$_id', 'SIN_AREA'] },
          monto: 1,
        },
      },
      {
        $sort: { monto: -1 },
      },
    ]);

    return ingresos;
  }

  async getServiciosTop(municipioId: string, limit: number) {
    const municipioObjectId = new Types.ObjectId(municipioId);

    const serviciosTop = await this.pagoModel.aggregate([
      {
        $match: {
          municipioId: municipioObjectId,
          estado: 'PAGADO',
        },
      },
      {
        $lookup: {
          from: 'ordenpagos',
          localField: 'ordenPagoId',
          foreignField: '_id',
          as: 'orden',
        },
      },
      {
        $unwind: { path: '$orden', preserveNullAndEmptyArrays: true },
      },
      {
        $lookup: {
          from: 'serviciocobros',
          localField: 'orden.servicioId',
          foreignField: '_id',
          as: 'servicio',
        },
      },
      {
        $unwind: { path: '$servicio', preserveNullAndEmptyArrays: true },
      },
      {
        $group: {
          _id: '$servicio.nombre',
          total: { $count: {} },
        },
      },
      {
        $project: {
          _id: 0,
          servicio: { $ifNull: ['$_id', 'SERVICIO_DESCONOCIDO'] },
          total: 1,
        },
      },
      {
        $sort: { total: -1 },
      },
      {
        $limit: limit,
      },
    ]);

    return serviciosTop;
  }

  async getComparativoMensual(municipioId: string, meses: number) {
    const municipioObjectId = new Types.ObjectId(municipioId);

    const fechaInicio = new Date();
    fechaInicio.setMonth(fechaInicio.getMonth() - meses);
    fechaInicio.setDate(1);
    fechaInicio.setHours(0, 0, 0, 0);

    const comparativo = await this.pagoModel.aggregate([
      {
        $match: {
          municipioId: municipioObjectId,
          estado: 'PAGADO',
          fechaPago: { $gte: fechaInicio },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m', date: '$fechaPago' },
          },
          monto: { $sum: '$monto' },
        },
      },
      {
        $sort: { _id: 1 },
      },
      {
        $project: {
          _id: 0,
          mes: '$_id',
          monto: 1,
        },
      },
    ]);

    return comparativo;
  }

  async getAlertasTesoreria(municipioId: string) {
    const municipioObjectId = new Types.ObjectId(municipioId);
    const alertas = [];

    // Alerta 1: Baja recaudación vs mes anterior
    const mesActual = new Date();
    mesActual.setDate(1);
    mesActual.setHours(0, 0, 0, 0);

    const mesAnterior = new Date(mesActual);
    mesAnterior.setMonth(mesAnterior.getMonth() - 1);

    const [recaudacionActual, recaudacionAnterior] = await Promise.all([
      this.pagoModel.aggregate([
        {
          $match: {
            municipioId: municipioObjectId,
            estado: 'PAGADO',
            fechaPago: { $gte: mesActual },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$monto' },
          },
        },
      ]),
      this.pagoModel.aggregate([
        {
          $match: {
            municipioId: municipioObjectId,
            estado: 'PAGADO',
            fechaPago: { $gte: mesAnterior, $lt: mesActual },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$monto' },
          },
        },
      ]),
    ]);

    const totalActual = recaudacionActual[0]?.total || 0;
    const totalAnterior = recaudacionAnterior[0]?.total || 0;

    if (totalAnterior > 0 && totalActual < totalAnterior * 0.8) {
      const porcentaje = Math.round(
        ((totalAnterior - totalActual) / totalAnterior) * 100,
      );
      alertas.push({
        tipo: 'BAJA_RECAUDACION',
        mensaje: `La recaudación bajó ${porcentaje}% respecto al mes anterior`,
      });
    }

    // Alerta 2: Órdenes pendientes por expirar
    const proximasAExpirar = await this.ordenPagoModel.countDocuments({
      municipioId: municipioObjectId,
      estado: 'PENDIENTE',
      expiresAt: {
        $gte: new Date(),
        $lte: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 horas
      },
    });

    if (proximasAExpirar > 0) {
      alertas.push({
        tipo: 'ORDENES_POR_EXPIRAR',
        mensaje: `${proximasAExpirar} órdenes de pago expiran en las próximas 24 horas`,
      });
    }

    return alertas;
  }

  // ==========================================
  // 🧑‍🤝‍🧑 SECCIÓN DIF (IMPACTO SOCIAL)
  // ==========================================

  async getResumenDIF(municipioId: string) {
    const municipioObjectId = new Types.ObjectId(municipioId);

    const [apoyosStats, localidades] = await Promise.all([
      this.apoyoModel.aggregate([
        {
          $match: {
            municipioId: municipioObjectId,
            estado: { $in: ['ENTREGADO', 'PENDIENTE'] },
          },
        },
        {
          $facet: {
            totales: [
              {
                $group: {
                  _id: null,
                  apoyosEntregados: {
                    $sum: { $cond: [{ $eq: ['$estado', 'ENTREGADO'] }, 1, 0] },
                  },
                  apoyosPendientes: {
                    $sum: { $cond: [{ $eq: ['$estado', 'PENDIENTE'] }, 1, 0] },
                  },
                },
              },
            ],
            beneficiarios: [
              {
                $match: { estado: 'ENTREGADO' },
              },
              {
                $group: {
                  _id: '$ciudadanoId',
                },
              },
              {
                $count: 'total',
              },
            ],
            programas: [
              {
                $group: {
                  _id: '$programaDIF',
                },
              },
              {
                $count: 'total',
              },
            ],
          },
        },
      ]),
      this.apoyoModel.distinct('localidad', {
        municipioId: municipioObjectId,
        estado: 'ENTREGADO',
      }),
    ]);

    const stats = apoyosStats[0];
    const totales = stats.totales[0] || {
      apoyosEntregados: 0,
      apoyosPendientes: 0,
    };
    const beneficiariosUnicos = stats.beneficiarios[0]?.total || 0;
    const programasActivos = stats.programas[0]?.total || 0;

    return {
      beneficiariosUnicos,
      apoyosEntregados: totales.apoyosEntregados,
      apoyosPendientes: totales.apoyosPendientes,
      programasActivos,
      localidadesAtendidas: localidades.length,
    };
  }

  async getApoyosPorPrograma(municipioId: string) {
    const municipioObjectId = new Types.ObjectId(municipioId);

    const apoyos = await this.apoyoModel.aggregate([
      {
        $match: {
          municipioId: municipioObjectId,
          estado: 'ENTREGADO',
        },
      },
      {
        $group: {
          _id: '$programaDIF',
          total: { $count: {} },
        },
      },
      {
        $project: {
          _id: 0,
          programa: '$_id',
          total: 1,
        },
      },
      {
        $sort: { total: -1 },
      },
    ]);

    return apoyos;
  }

  async getBeneficiariosPorLocalidad(municipioId: string) {
    const municipioObjectId = new Types.ObjectId(municipioId);

    const beneficiarios = await this.apoyoModel.aggregate([
      {
        $match: {
          municipioId: municipioObjectId,
          estado: 'ENTREGADO',
        },
      },
      {
        $group: {
          _id: {
            localidad: '$localidad',
            ciudadanoId: '$ciudadanoId',
          },
        },
      },
      {
        $group: {
          _id: '$_id.localidad',
          total: { $count: {} },
        },
      },
      {
        $project: {
          _id: 0,
          localidad: '$_id',
          total: 1,
        },
      },
      {
        $sort: { total: -1 },
      },
    ]);

    return beneficiarios;
  }

  async getApoyosPorTipo(municipioId: string) {
    const municipioObjectId = new Types.ObjectId(municipioId);

    const apoyos = await this.apoyoModel.aggregate([
      {
        $match: {
          municipioId: municipioObjectId,
          estado: 'ENTREGADO',
        },
      },
      {
        $group: {
          _id: '$tipoApoyo',
          total: { $count: {} },
        },
      },
      {
        $project: {
          _id: 0,
          tipo: '$_id',
          total: 1,
        },
      },
      {
        $sort: { total: -1 },
      },
    ]);

    return apoyos;
  }

  async getComparativoMensualDIF(municipioId: string, meses: number) {
    const municipioObjectId = new Types.ObjectId(municipioId);

    const fechaInicio = new Date();
    fechaInicio.setMonth(fechaInicio.getMonth() - meses);
    fechaInicio.setDate(1);
    fechaInicio.setHours(0, 0, 0, 0);

    const comparativo = await this.apoyoModel.aggregate([
      {
        $match: {
          municipioId: municipioObjectId,
          estado: 'ENTREGADO',
          fechaEntrega: { $gte: fechaInicio },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m', date: '$fechaEntrega' },
          },
          apoyos: { $count: {} },
        },
      },
      {
        $sort: { _id: 1 },
      },
      {
        $project: {
          _id: 0,
          mes: '$_id',
          apoyos: 1,
        },
      },
    ]);

    return comparativo;
  }

  async getAlertasDIF(municipioId: string) {
    const municipioObjectId = new Types.ObjectId(municipioId);
    const alertas = [];

    // Alerta 1: Beneficiarios con apoyos duplicados en el mismo mes
    const mesActual = new Date();
    mesActual.setDate(1);
    mesActual.setHours(0, 0, 0, 0);

    const duplicados = await this.apoyoModel.aggregate([
      {
        $match: {
          municipioId: municipioObjectId,
          estado: 'ENTREGADO',
          fechaEntrega: { $gte: mesActual },
        },
      },
      {
        $group: {
          _id: {
            ciudadanoId: '$ciudadanoId',
            programaDIF: '$programaDIF',
          },
          count: { $count: {} },
        },
      },
      {
        $match: {
          count: { $gt: 1 },
        },
      },
      {
        $count: 'total',
      },
    ]);

    if (duplicados.length > 0 && duplicados[0].total > 0) {
      alertas.push({
        tipo: 'DUPLICIDAD',
        mensaje: `${duplicados[0].total} beneficiarios recibieron el mismo apoyo más de una vez este mes`,
      });
    }

    // Alerta 2: Localidades sin apoyos en los últimos 3 meses
    const hace3Meses = new Date();
    hace3Meses.setMonth(hace3Meses.getMonth() - 3);

    const todasLocalidades = await this.apoyoModel.distinct('localidad', {
      municipioId: municipioObjectId,
    });

    const localidadesRecientes = await this.apoyoModel.distinct('localidad', {
      municipioId: municipioObjectId,
      estado: 'ENTREGADO',
      fechaEntrega: { $gte: hace3Meses },
    });

    const localidadesRezagadas = todasLocalidades.filter(
      (loc) => !localidadesRecientes.includes(loc),
    );

    if (localidadesRezagadas.length > 0) {
      alertas.push({
        tipo: 'REZAGO',
        mensaje: `${localidadesRezagadas.length} localidades sin apoyos en los últimos 3 meses`,
      });
    }

    return alertas;
  }
}
