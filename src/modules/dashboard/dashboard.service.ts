import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { fecha } from '@/common/helpers/fecha.helper';
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
import {
  Beneficiario,
  BeneficiarioDocument,
} from '@/modules/dif/schemas/beneficiario.schema';

@Injectable()
export class DashboardService {
  constructor(
    @InjectModel(Pago.name) private pagoModel: Model<PagoDocument>,
    @InjectModel(OrdenPago.name)
    private ordenPagoModel: Model<OrdenPagoDocument>,
    @InjectModel(ServicioCobro.name)
    private servicioCobroModel: Model<ServicioCobroDocument>,
    @InjectModel(Apoyo.name) private apoyoModel: Model<ApoyoDocument>,
    @InjectModel(Beneficiario.name)
    private beneficiarioModel: Model<BeneficiarioDocument>,
  ) {}

  // ==========================================
  // 💰 SECCIÓN TESORERÍA (RECAUDACIÓN)
  // ==========================================

  async getResumenTesoreria(municipioId: string) {
    const municipioObjectId = new Types.ObjectId(municipioId);
    const hoyMx = fecha.ahoraEnMexico();
    const mesActual = hoyMx.startOf('month').utc().toDate();

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
          $unionWith: {
            coll: 'tesoreria_pagos',
            pipeline: [
              {
                $match: {
                  municipioId: municipioObjectId,
                  estado: 'PAGADO',
                  fechaPago: { $gte: mesActual },
                },
              },
            ],
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
      periodo: hoyMx.format('YYYY-MM'),
    };
  }

  async getIngresos(municipioId: string, desde?: string, hasta?: string) {
    const municipioObjectId = new Types.ObjectId(municipioId);

    // Parsear strings YYYY-MM-DD directamente en zona México para evitar
    // desfase: dayjs(str).tz() convertiría primero a UTC local del server.
    const hoyMx = fecha.ahoraEnMexico();
    const fechaDesde: Date = desde
      ? fecha.parsearFecha(desde)
      : fecha.inicioMes(hoyMx.month() + 1, hoyMx.year());
    const fechaHasta: Date = hasta
      ? fecha.parsearFechaFin(hasta)
      : fecha.parsearFechaFin(hoyMx.format('YYYY-MM-DD'));

    const ingresos = await this.pagoModel.aggregate([
      {
        $match: {
          municipioId: municipioObjectId,
          estado: 'PAGADO',
          fechaPago: { $gte: fechaDesde, $lte: fechaHasta },
        },
      },
      {
        $unionWith: {
          coll: 'tesoreria_pagos',
          pipeline: [
            {
              $match: {
                municipioId: municipioObjectId,
                estado: 'PAGADO',
                fechaPago: { $gte: fechaDesde, $lte: fechaHasta },
              },
            },
          ],
        },
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$fechaPago',
              timezone: 'America/Mexico_City',
            },
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
      // Join con la orden de pago para obtener servicioId
      {
        $lookup: {
          from: 'pagos_ordenes',
          localField: 'ordenPagoId',
          foreignField: '_id',
          as: 'orden',
        },
      },
      {
        $unwind: { path: '$orden', preserveNullAndEmptyArrays: true },
      },
      // Join con el servicio para obtener areaResponsable canónica
      {
        $lookup: {
          from: 'tesoreria_servicios_cobro',
          localField: 'orden.servicioId',
          foreignField: '_id',
          as: 'servicio',
        },
      },
      {
        $unwind: { path: '$servicio', preserveNullAndEmptyArrays: true },
      },
      {
        $project: {
          // Prioridad: areaResponsable del catálogo → areaResponsable de la orden → Sin área
          area: {
            $ifNull: [
              '$servicio.areaResponsable',
              { $ifNull: ['$orden.areaResponsable', 'Sin área'] },
            ],
          },
          monto: 1,
        },
      },
      {
        $unionWith: {
          coll: 'tesoreria_pagos',
          pipeline: [
            {
              $match: {
                municipioId: municipioObjectId,
                estado: 'PAGADO',
              },
            },
            // servicioAreaResponsable es snapshot guardado en el pago — no necesita lookup
            {
              $project: {
                area: {
                  $ifNull: ['$servicioAreaResponsable', 'Sin área'],
                },
                monto: 1,
              },
            },
          ],
        },
      },
      {
        $group: {
          _id: '$area',
          monto: { $sum: '$monto' },
        },
      },
      {
        $project: {
          _id: 0,
          area: '$_id',
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
          from: 'pagos_ordenes',
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
          from: 'tesoreria_servicios_cobro',
          localField: 'orden.servicioId',
          foreignField: '_id',
          as: 'servicio',
        },
      },
      {
        $unwind: { path: '$servicio', preserveNullAndEmptyArrays: true },
      },
      {
        $project: {
          servicioNombre: {
            $ifNull: [
              '$servicioNombre',
              { $ifNull: ['$servicio.nombre', 'SERVICIO_DESCONOCIDO'] },
            ],
          },
        },
      },
      {
        $unionWith: {
          coll: 'tesoreria_pagos',
          pipeline: [
            {
              $match: {
                municipioId: municipioObjectId,
                estado: 'PAGADO',
              },
            },
            {
              $project: {
                servicioNombre: {
                  $ifNull: ['$servicioNombre', 'SERVICIO_DESCONOCIDO'],
                },
              },
            },
          ],
        },
      },
      {
        $group: {
          _id: '$servicioNombre',
          total: { $count: {} },
        },
      },
      {
        $project: {
          _id: 0,
          servicio: '$_id',
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

    // Calcular rango usando dayjs en zona México
    const hoyMx = fecha.ahoraEnMexico();
    const inicioRango = hoyMx
      .subtract(meses - 1, 'month')
      .startOf('month')
      .utc()
      .toDate();

    const pagosRaw = await this.pagoModel.aggregate([
      {
        $match: {
          municipioId: municipioObjectId,
          estado: 'PAGADO',
          fechaPago: { $gte: inicioRango },
        },
      },
      {
        $unionWith: {
          coll: 'tesoreria_pagos',
          pipeline: [
            {
              $match: {
                municipioId: municipioObjectId,
                estado: 'PAGADO',
                fechaPago: { $gte: inicioRango },
              },
            },
          ],
        },
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m',
              date: '$fechaPago',
              timezone: 'America/Mexico_City',
            },
          },
          monto: { $sum: '$monto' },
        },
      },
      { $sort: { _id: 1 } },
      { $project: { _id: 0, mes: '$_id', monto: 1 } },
    ]);

    // Rellenar meses sin pagos con monto: 0 para que el frontend
    // siempre reciba exactamente `meses` puntos en la gráfica
    const mapaResultados = new Map(pagosRaw.map((r) => [r.mes, r.monto]));
    const resultado: { mes: string; monto: number }[] = [];

    for (let i = meses - 1; i >= 0; i--) {
      const clave = hoyMx.subtract(i, 'month').format('YYYY-MM');
      resultado.push({ mes: clave, monto: mapaResultados.get(clave) ?? 0 });
    }

    return resultado;
  }

  /**
   * Snapshot completo del dashboard de tesorería para envíar por WS after cada pago.
   * El frontend lo usa para actualizar tarjetas + gráficas sin hacer HTTP.
   */
  async getDashboardTesoreriaSnapshot(municipioId: string) {
    const [resumen, serviciosTop, ingresosPorArea] = await Promise.all([
      this.getResumenTesoreria(municipioId),
      this.getServiciosTop(municipioId, 5),
      this.getIngresosPorArea(municipioId),
    ]);
    return { resumen, serviciosTop, ingresosPorArea };
  }

  /**
   * Snapshot completo del dashboard presidencial.
   * Cubre todas las secciones visibles: tesorería + DIF.
   * Se envía por WS al room del municipio tras cada pago o apoyo registrado.
   */
  async getDashboardPresidencialSnapshot(municipioId: string) {
    const hoyMx = fecha.ahoraEnMexico();
    const inicioMes = hoyMx.startOf('month').format('YYYY-MM-DD');
    const hoy = hoyMx.format('YYYY-MM-DD');

    const [
      resumenTesoreria,
      ingresosHoy,
      ingresosPorArea,
      serviciosTop,
      comparativoTesoreria,
      alertasTesoreria,
      resumenDIF,
      apoyosPorPrograma,
      beneficiariosPorLocalidad,
      comparativoDIF,
      alertasDIF,
    ] = await Promise.all([
      this.getResumenTesoreria(municipioId),
      this.getIngresos(municipioId, inicioMes, hoy),
      this.getIngresosPorArea(municipioId),
      this.getServiciosTop(municipioId, 10),
      this.getComparativoMensual(municipioId, 6),
      this.getAlertasTesoreria(municipioId),
      this.getResumenDIF(municipioId),
      this.getApoyosPorPrograma(municipioId),
      this.getBeneficiariosPorLocalidad(municipioId),
      this.getComparativoMensualDIF(municipioId, 6),
      this.getAlertasDIF(municipioId),
    ]);

    return {
      tesoreria: {
        resumen: resumenTesoreria,
        ingresos: ingresosHoy,
        ingresosPorArea,
        serviciosTop,
        comparativoMensual: comparativoTesoreria,
        alertas: alertasTesoreria,
      },
      dif: {
        resumen: resumenDIF,
        apoyosPorPrograma,
        beneficiariosPorLocalidad,
        comparativoMensual: comparativoDIF,
        alertas: alertasDIF,
      },
    };
  }

  async getAlertasTesoreria(municipioId: string) {
    const municipioObjectId = new Types.ObjectId(municipioId);
    const alertas = [];

    // Alerta 1: Baja recaudación vs mes anterior
    const nowAlertas = new Date();
    const mesActual = fecha.inicioMes(
      nowAlertas.getMonth() + 1,
      nowAlertas.getFullYear(),
    );
    const mesAnteriorNum =
      nowAlertas.getMonth() === 0 ? 12 : nowAlertas.getMonth();
    const anioAnterior =
      nowAlertas.getMonth() === 0
        ? nowAlertas.getFullYear() - 1
        : nowAlertas.getFullYear();
    const mesAnterior = fecha.inicioMes(mesAnteriorNum, anioAnterior);

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
          $unionWith: {
            coll: 'tesoreria_pagos',
            pipeline: [
              {
                $match: {
                  municipioId: municipioObjectId,
                  estado: 'PAGADO',
                  fechaPago: { $gte: mesActual },
                },
              },
            ],
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
          $unionWith: {
            coll: 'tesoreria_pagos',
            pipeline: [
              {
                $match: {
                  municipioId: municipioObjectId,
                  estado: 'PAGADO',
                  fechaPago: { $gte: mesAnterior, $lt: mesActual },
                },
              },
            ],
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

    // Paso 1: estadísticas desde dif_apoyos
    const apoyosStats = await this.apoyoModel.aggregate([
      { $match: { municipioId: municipioObjectId } },
      {
        $facet: {
          totales: [{ $count: 'total' }],
          beneficiarios: [
            { $group: { _id: '$beneficiarioId' } },
            { $count: 'total' },
          ],
          programas: [{ $group: { _id: '$programaId' } }, { $count: 'total' }],
        },
      },
    ]);

    const stats = apoyosStats[0];
    const totalApoyos = stats.totales[0]?.total || 0;
    const beneficiariosUnicos = stats.beneficiarios[0]?.total || 0;
    const programasActivos = stats.programas[0]?.total || 0;

    // Paso 2: localidades atendidas — localidad está en dif_beneficiarios
    const beneficiarioIdsConApoyo = await this.apoyoModel.distinct(
      'beneficiarioId',
      { municipioId: municipioObjectId },
    );

    const localidades = await this.beneficiarioModel.distinct('localidad', {
      _id: { $in: beneficiarioIdsConApoyo },
      localidad: { $exists: true, $ne: null },
    });

    return {
      beneficiariosUnicos,
      apoyosEntregados: totalApoyos,
      apoyosPendientes: 0,
      programasActivos,
      localidadesAtendidas: localidades.filter(Boolean).length,
    };
  }

  async getApoyosPorPrograma(municipioId: string) {
    const municipioObjectId = new Types.ObjectId(municipioId);

    const apoyos = await this.apoyoModel.aggregate([
      {
        $match: { municipioId: municipioObjectId },
      },
      {
        $group: {
          _id: '$programaId',
          total: { $count: {} },
        },
      },
      {
        $lookup: {
          from: 'dif_programas',
          localField: '_id',
          foreignField: '_id',
          as: 'programaInfo',
        },
      },
      {
        $unwind: { path: '$programaInfo', preserveNullAndEmptyArrays: true },
      },
      {
        $project: {
          _id: 0,
          programaId: '$_id',
          programa: { $ifNull: ['$programaInfo.nombre', 'SIN_PROGRAMA'] },
          total: 1,
        },
      },
      { $sort: { total: -1 } },
    ]);

    return apoyos;
  }

  async getBeneficiariosPorLocalidad(municipioId: string) {
    const municipioObjectId = new Types.ObjectId(municipioId);

    // Obtener beneficiarioIds únicos con al menos un apoyo en este municipio
    const beneficiarioIdsConApoyo = await this.apoyoModel.distinct(
      'beneficiarioId',
      { municipioId: municipioObjectId },
    );

    // Agrupar por localidad desde dif_beneficiarios (localidad está ahí, no en apoyos)
    const result = await this.beneficiarioModel.aggregate([
      {
        $match: {
          municipioId: municipioObjectId,
          _id: { $in: beneficiarioIdsConApoyo },
          localidad: { $exists: true, $ne: null, $gt: '' },
        },
      },
      {
        $group: {
          _id: '$localidad',
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
      { $sort: { total: -1 } },
    ]);

    return result;
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

    const hoyMx = fecha.ahoraEnMexico();
    const inicioRango = hoyMx
      .subtract(meses - 1, 'month')
      .startOf('month')
      .utc()
      .toDate();

    const pagosRaw = await this.apoyoModel.aggregate([
      {
        $match: {
          municipioId: municipioObjectId,
          fecha: { $gte: inicioRango },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m',
              date: '$fecha',
              timezone: 'America/Mexico_City',
            },
          },
          apoyos: { $count: {} },
        },
      },
      { $sort: { _id: 1 } },
      { $project: { _id: 0, mes: '$_id', apoyos: 1 } },
    ]);

    // Rellenar meses vacíos con apoyos: 0
    const mapaResultados = new Map(pagosRaw.map((r) => [r.mes, r.apoyos]));
    const resultado: { mes: string; apoyos: number }[] = [];

    for (let i = meses - 1; i >= 0; i--) {
      const clave = hoyMx.subtract(i, 'month').format('YYYY-MM');
      resultado.push({ mes: clave, apoyos: mapaResultados.get(clave) ?? 0 });
    }

    return resultado;
  }

  async getAlertasDIF(municipioId: string) {
    const municipioObjectId = new Types.ObjectId(municipioId);
    const alertas = [];

    // Alerta 1: Beneficiarios con apoyos duplicados en el mismo mes
    const nowDif = new Date();
    const mesActual = fecha.inicioMes(
      nowDif.getMonth() + 1,
      nowDif.getFullYear(),
    );

    // Alerta 1: Beneficiarios con apoyos duplicados (mismo programa) en el mismo mes
    const duplicados = await this.apoyoModel.aggregate([
      {
        $match: {
          municipioId: municipioObjectId,
          fecha: { $gte: mesActual },
        },
      },
      {
        $group: {
          _id: {
            beneficiarioId: '$beneficiarioId',
            programaId: '$programaId',
          },
          count: { $count: {} },
        },
      },
      { $match: { count: { $gt: 1 } } },
      { $count: 'total' },
    ]);

    if (duplicados.length > 0 && duplicados[0].total > 0) {
      alertas.push({
        tipo: 'DUPLICIDAD',
        mensaje: `${duplicados[0].total} beneficiarios recibieron el mismo apoyo más de una vez este mes`,
      });
    }

    // Alerta 2: Localidades sin apoyos en los últimos 3 meses
    // localidad está en dif_beneficiarios, no en dif_apoyos
    const hace3Meses = new Date();
    hace3Meses.setMonth(hace3Meses.getMonth() - 3);

    const todosLosBeneficiarioIds = await this.apoyoModel.distinct(
      'beneficiarioId',
      { municipioId: municipioObjectId },
    );

    const beneficiarioIdsRecientes = await this.apoyoModel.distinct(
      'beneficiarioId',
      { municipioId: municipioObjectId, fecha: { $gte: hace3Meses } },
    );

    const todasLocalidades = await this.beneficiarioModel.distinct(
      'localidad',
      {
        _id: { $in: todosLosBeneficiarioIds },
        localidad: { $exists: true, $ne: null },
      },
    );

    const localidadesRecientes = await this.beneficiarioModel.distinct(
      'localidad',
      {
        _id: { $in: beneficiarioIdsRecientes },
        localidad: { $exists: true, $ne: null },
      },
    );

    const localidadesRezagadas = todasLocalidades.filter(
      (loc) => loc && !localidadesRecientes.includes(loc),
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
