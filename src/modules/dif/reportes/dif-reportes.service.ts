import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { fecha } from '@/common/helpers/fecha.helper';
import { TDocumentDefinitions } from 'pdfmake/interfaces';
import { PdfService } from '@/modules/shared/pdf/pdf.service';

import { Apoyo, ApoyoDocument } from '@/modules/dif/schemas/apoyo.schema';
import {
  Beneficiario,
  BeneficiarioDocument,
} from '@/modules/dif/schemas/beneficiario.schema';
import {
  Inventario,
  InventarioDocument,
  TipoInventario,
} from '@/modules/dif/schemas/inventario.schema';
import {
  MovimientoInventario,
  MovimientoInventarioDocument,
  TipoMovimiento,
} from '@/modules/dif/schemas/movimiento-inventario.schema';
import {
  Municipality,
  MunicipalityDocument,
} from '@/modules/municipalities/schemas/municipality.schema';
import { S3Service } from '@/modules/s3/s3.service';

import { FiltrosReporteDto } from './dto/filtros-reporte.dto';
import { buildHeader } from './templates/header.template';
import { folioExtendido } from '@/shared/helpers/folio.helper';
import { buildFooter } from './templates/footer.template';
import { estilosDIF } from './templates/estilos.template';

import {
  buildApoyoReporte,
  ApoyoReporteItem,
} from './builders/apoyo-reporte.builder';
import {
  buildBeneficiarioReporte,
  BeneficiarioReporteItem,
} from './builders/beneficiario-reporte.builder';
import {
  buildInventarioReporte,
  InventarioReporteItem,
} from './builders/inventario-reporte.builder';
import {
  buildFondosReporte,
  FondoReporteItem,
} from './builders/fondos-reporte.builder';

@Injectable()
export class DifReportesService {
  constructor(
    @InjectModel(Apoyo.name) private apoyoModel: Model<ApoyoDocument>,
    @InjectModel(Beneficiario.name)
    private beneficiarioModel: Model<BeneficiarioDocument>,
    @InjectModel(Inventario.name)
    private inventarioModel: Model<InventarioDocument>,
    @InjectModel(MovimientoInventario.name)
    private movimientoModel: Model<MovimientoInventarioDocument>,
    @InjectModel(Municipality.name)
    private municipalityModel: Model<MunicipalityDocument>,
    private readonly pdfService: PdfService,
  ) {}

  // ── Punto de entrada principal ──────────────────────────────────────

  async generarReporte(
    municipioId: string,
    municipioNombre: string,
    filtros: FiltrosReporteDto,
  ): Promise<{ url: string; key: string; expiraEn: number }> {
    const tipo = filtros.tipo || 'apoyos';

    // Resolverr nombre real del municipio
    const municipio = await this.municipalityModel
      .findById(municipioId, 'nombre logoUrl')
      .lean();
    const municipioNombreReal = (municipio as any)?.nombre || municipioNombre;
    const logoBase64 = (municipio as any)?.logoUrl
      ? await this.pdfService
          .fetchImageAsBase64((municipio as any).logoUrl)
          .catch(() => undefined)
      : undefined;

    // 1. Obtener datos + construir contenido según tipo
    let content: any[];
    let tituloReporte: string;

    switch (tipo) {
      case 'apoyos':
        ({ content, tituloReporte } = await this.buildApoyoContent(
          municipioId,
          filtros,
        ));
        break;
      case 'beneficiarios':
        ({ content, tituloReporte } = await this.buildBeneficiarioContent(
          municipioId,
          filtros,
        ));
        break;
      case 'inventario':
        ({ content, tituloReporte } = await this.buildInventarioContent(
          municipioId,
          filtros,
        ));
        break;
      case 'fondos':
        ({ content, tituloReporte } = await this.buildFondosContent(
          municipioId,
          filtros,
        ));
        break;
      default:
        throw new BadRequestException(`Tipo de reporte desconocido: ${tipo}`);
    }

    // 2. Ensamblar documento pdfmake
    const docDefinition: TDocumentDefinitions = {
      pageSize: 'LETTER',
      pageOrientation: [
        'fondos',
        'inventario',
        'apoyos',
        'beneficiarios',
      ].includes(tipo)
        ? 'landscape'
        : 'portrait',
      pageMargins: [40, 80, 40, 50],
      header: {
        margin: [40, 16, 40, 0],
        stack: buildHeader({
          municipioNombre: municipioNombreReal,
          logoBase64,
          tipoReporte: tituloReporte,
          fechaInicio: filtros.fechaInicio,
          fechaFin: filtros.fechaFin,
          generadoEn: new Date(),
          orientacion: [
            'fondos',
            'inventario',
            'apoyos',
            'beneficiarios',
          ].includes(tipo)
            ? 'landscape'
            : 'portrait',
        }),
      },
      footer: buildFooter(),
      styles: estilosDIF,
      defaultStyle: {
        font: 'Roboto',
        fontSize: 9,
      },
      content: [
        {
          text: tituloReporte,
          style: 'titulo',
          alignment: 'center',
          margin: [0, 12, 0, 2],
        },
        {
          text: `Período: ${filtros.fechaInicio} — ${filtros.fechaFin}`,
          style: 'textoSmall',
          alignment: 'center',
          margin: [0, 0, 0, 14],
        },
        ...content,
      ],
    };

    // 3. Generar buffer PDF
    const pdfBuffer = await this.pdfService.generatePdfBuffer(docDefinition);

    // 4. Subir a S3: municipios/{municipioId}/reportes/dif/{tipo}/RPT-{tipo}-{YYYYMM}-{ts}.pdf
    const periodo = filtros.fechaInicio
      ? filtros.fechaInicio.substring(0, 7).replace('-', '')
      : new Date().toISOString().substring(0, 7).replace('-', '');
    const key = S3Service.keyReporteDif(municipioId, tipo, periodo);

    // 5. Subir a S3 y generar URL firmada
    const expiresIn = filtros.expiresIn || 300;
    const { url } = await this.pdfService.uploadAndSign(
      key,
      pdfBuffer,
      { municipioId, tipo, generadoEn: new Date().toISOString() },
      expiresIn,
    );

    return { url, key, expiraEn: expiresIn };
  }

  // ── Builders de contenido ──────────────────────────────────────────

  private async buildApoyoContent(
    municipioId: string,
    filtros: FiltrosReporteDto,
  ) {
    const municipioOId = new Types.ObjectId(municipioId);
    const matchBase: any = {
      municipioId: municipioOId,
      fecha: {
        $gte: fecha.inicioDia(filtros.fechaInicio),
        $lte: fecha.finDia(filtros.fechaFin),
      },
    };
    if (filtros.programaId)
      matchBase.programaId = new Types.ObjectId(filtros.programaId);

    const apoyosRaw = await this.apoyoModel
      .find(matchBase)
      .populate(
        'beneficiarioId',
        'nombre apellidoPaterno apellidoMaterno curp localidad grupoVulnerable',
      )
      .populate('programaId', 'nombre')
      .populate('entregadoPor', 'nombre')
      .lean();

    // Si hay filtro de localidad o grupoVulnerable, filtrar en memoria
    // (están en beneficiario, no en apoyo)
    let apoyosFiltrados = apoyosRaw;
    if (filtros.localidad) {
      apoyosFiltrados = apoyosFiltrados.filter(
        (a: any) => a.beneficiarioId?.localidad === filtros.localidad,
      );
    }
    if (filtros.grupoVulnerable) {
      apoyosFiltrados = apoyosFiltrados.filter((a: any) =>
        a.beneficiarioId?.grupoVulnerable?.includes(filtros.grupoVulnerable),
      );
    }

    const items: ApoyoReporteItem[] = apoyosFiltrados.map((a: any) => ({
      folio: a.folio ? folioExtendido(a.folio, municipioId) : '—',
      fecha: a.fecha,
      beneficiarioNombre: a.beneficiarioId
        ? `${a.beneficiarioId.nombre} ${a.beneficiarioId.apellidoPaterno}`
        : '—',
      beneficiarioCurp: a.beneficiarioId?.curp || '—',
      programa: a.programaId?.nombre || '—',
      tipo: a.tipo || '—',
      cantidad: a.cantidad || 1,
      monto: a.monto || 0,
      entregadoPor: a.entregadoPor?.nombre || '—',
      observaciones: a.observaciones,
    }));

    const beneficiariosIds = [
      ...new Set(
        apoyosFiltrados
          .map((a: any) => a.beneficiarioId?._id?.toString())
          .filter(Boolean),
      ),
    ];

    // Nombre del programa si hay filtro
    let programaNombre: string | undefined;
    if (filtros.programaId && apoyosFiltrados.length > 0) {
      programaNombre = (apoyosFiltrados[0] as any).programaId?.nombre;
    }

    // Apoyos del mes actual
    const ahora = new Date();
    const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
    const finMes = new Date(
      ahora.getFullYear(),
      ahora.getMonth() + 1,
      0,
      23,
      59,
      59,
    );
    const apoyosMes = apoyosFiltrados.filter((a: any) => {
      const f = new Date(a.fecha);
      return f >= inicioMes && f <= finMes;
    }).length;

    const content = buildApoyoReporte({
      apoyos: items,
      resumen: {
        totalApoyos: items.length,
        totalBeneficiarios: beneficiariosIds.length,
        totalMonto: items.reduce((s, i) => s + i.monto, 0),
        apoyosMes,
      },
      filtros: {
        programaNombre,
        localidad: filtros.localidad,
        grupoVulnerable: filtros.grupoVulnerable,
      },
    });

    return { content, tituloReporte: 'Reporte de Apoyos DIF' };
  }

  private async buildBeneficiarioContent(
    municipioId: string,
    filtros: FiltrosReporteDto,
  ) {
    const municipioOId = new Types.ObjectId(municipioId);
    const matchBase: any = { municipioId: municipioOId, activo: true };
    if (filtros.localidad) matchBase.localidad = filtros.localidad;
    if (filtros.grupoVulnerable)
      matchBase.grupoVulnerable = filtros.grupoVulnerable;

    const beneficiariosRaw = await this.beneficiarioModel
      .find(matchBase)
      .lean();

    // Apoyos por beneficiario dentro del rango
    const apoyosPorBeneficiario = await this.apoyoModel.aggregate([
      {
        $match: {
          municipioId: municipioOId,
          fecha: {
            $gte: fecha.inicioDia(filtros.fechaInicio),
            $lte: fecha.finDia(filtros.fechaFin),
          },
        },
      },
      {
        $group: {
          _id: '$beneficiarioId',
          total: { $count: {} },
          ultimoApoyo: { $max: '$fecha' },
          programas: { $addToSet: '$programaId' },
        },
      },
    ]);

    const apoyosMap = new Map(
      apoyosPorBeneficiario.map((a) => [a._id.toString(), a]),
    );

    // Obtener nombres de programas
    const programaIds = [
      ...new Set(
        apoyosPorBeneficiario.flatMap((a) =>
          a.programas.map((p: any) => p.toString()),
        ),
      ),
    ];
    const programasRaw = await this.apoyoModel
      .distinct('programaId', { municipioId: municipioOId })
      .then(() =>
        this.beneficiarioModel.db
          .collection('dif_programas')
          .find({
            _id: { $in: programaIds.map((id) => new Types.ObjectId(id)) },
          })
          .project({ nombre: 1 })
          .toArray(),
      );
    const programasNombres = new Map(
      programasRaw.map((p: any) => [p._id.toString(), p.nombre]),
    );

    const items: BeneficiarioReporteItem[] = beneficiariosRaw.map((b: any) => {
      const stats = apoyosMap.get(b._id.toString());
      return {
        folio: b.folio ? folioExtendido(b.folio, municipioId) : '',
        nombre: b.nombre,
        apellidoPaterno: b.apellidoPaterno,
        apellidoMaterno: b.apellidoMaterno,
        curp: b.curp,
        sexo: b.sexo,
        localidad: b.localidad,
        grupoVulnerable: b.grupoVulnerable || [],
        totalApoyos: stats?.total || 0,
        ultimoApoyo: stats?.ultimoApoyo,
        programas:
          stats?.programas?.map(
            (id: any) => programasNombres.get(id.toString()) || '—',
          ) || [],
        activo: b.activo,
      };
    });

    // Grupos vulnerables conteo
    const gruposMap: Record<string, number> = {};
    items.forEach((b) =>
      b.grupoVulnerable.forEach((g) => {
        gruposMap[g] = (gruposMap[g] || 0) + 1;
      }),
    );
    const gruposPrincipales = Object.entries(gruposMap)
      .map(([grupo, total]) => ({ grupo, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);

    const localidadesUnicas = new Set(
      items.map((b) => b.localidad).filter(Boolean),
    ).size;

    const content = buildBeneficiarioReporte({
      beneficiarios: items,
      resumen: {
        total: items.length,
        activos: items.filter((b) => b.activo).length,
        conApoyos: items.filter((b) => b.totalApoyos > 0).length,
        localidadesUnicas,
        gruposPrincipales,
      },
      filtros: {
        localidad: filtros.localidad,
        grupoVulnerable: filtros.grupoVulnerable,
      },
    });

    return { content, tituloReporte: 'Padrón de Beneficiarios DIF' };
  }

  private async buildInventarioContent(
    municipioId: string,
    filtros: FiltrosReporteDto,
  ) {
    const municipioOId = new Types.ObjectId(municipioId);
    const matchBase: any = {
      municipioId: municipioOId,
      tipoInventario: TipoInventario.FISICO,
    };
    if (filtros.programaId)
      matchBase.programaId = new Types.ObjectId(filtros.programaId);

    const inventariosRaw = await this.inventarioModel
      .find(matchBase)
      .populate('programaId', 'nombre')
      .lean();

    // Movimientos del período por inventario
    const movimientosMes = await this.movimientoModel.aggregate([
      {
        $match: {
          municipioId: municipioOId,
          fecha: {
            $gte: fecha.inicioDia(filtros.fechaInicio),
            $lte: fecha.finDia(filtros.fechaFin),
          },
          inventarioId: { $in: inventariosRaw.map((i: any) => i._id) },
        },
      },
      {
        $group: {
          _id: {
            inventarioId: '$inventarioId',
            tipoMovimiento: '$tipoMovimiento',
          },
          cantidad: { $sum: '$cantidad' },
        },
      },
    ]);

    const movMap: Record<string, Record<string, number>> = {};
    movimientosMes.forEach((m) => {
      const id = m._id.inventarioId.toString();
      if (!movMap[id]) movMap[id] = {};
      movMap[id][m._id.tipoMovimiento] = m.cantidad;
    });

    const items: InventarioReporteItem[] = inventariosRaw.map((inv: any) => {
      const movi = movMap[inv._id.toString()] || {};
      const porcentaje =
        inv.alertaMinima > 0
          ? Math.round((inv.stockActual / inv.alertaMinima) * 100)
          : 100;
      const estado: 'CRITICO' | 'BAJO' | 'NORMAL' =
        porcentaje <= 30 ? 'CRITICO' : porcentaje <= 60 ? 'BAJO' : 'NORMAL';

      return {
        tipo: inv.tipo,
        programa: inv.programaId?.nombre || '—',
        stockActual: inv.stockActual,
        stockInicial: inv.stockInicial,
        alertaMinima: inv.alertaMinima,
        unidadMedida: inv.unidadMedida || 'piezas',
        valorUnitario: inv.valorUnitario || 0,
        valorTotal: inv.stockActual * (inv.valorUnitario || 0),
        estado,
        entradasMes: movi[TipoMovimiento.IN] || 0,
        salidasMes: movi[TipoMovimiento.OUT] || 0,
      };
    });

    const content = buildInventarioReporte({
      items,
      resumen: {
        totalArticulos: items.length,
        criticos: items.filter((i) => i.estado === 'CRITICO').length,
        bajos: items.filter((i) => i.estado === 'BAJO').length,
        normales: items.filter((i) => i.estado === 'NORMAL').length,
        valorTotalInventario: items.reduce((s, i) => s + i.valorTotal, 0),
        entradasMes: items.reduce((s, i) => s + i.entradasMes, 0),
        salidasMes: items.reduce((s, i) => s + i.salidasMes, 0),
      },
      filtros: {
        programaNombre: filtros.programaId
          ? (inventariosRaw[0] as any)?.programaId?.nombre
          : undefined,
      },
    });

    return { content, tituloReporte: 'Reporte de Inventario Físico DIF' };
  }

  private async buildFondosContent(
    municipioId: string,
    filtros: FiltrosReporteDto,
  ) {
    const municipioOId = new Types.ObjectId(municipioId);
    const matchBase: any = {
      municipioId: municipioOId,
      tipoInventario: TipoInventario.MONETARIO,
    };
    if (filtros.programaId)
      matchBase.programaId = new Types.ObjectId(filtros.programaId);

    const fondosRaw = await this.inventarioModel
      .find(matchBase)
      .populate('programaId', 'nombre')
      .lean();

    // Movimientos del período por fondo
    const movPeriodo = await this.movimientoModel.aggregate([
      {
        $match: {
          municipioId: municipioOId,
          fecha: {
            $gte: fecha.inicioDia(filtros.fechaInicio),
            $lte: fecha.finDia(filtros.fechaFin),
          },
          inventarioId: { $in: fondosRaw.map((f: any) => f._id) },
        },
      },
      {
        $group: {
          _id: {
            inventarioId: '$inventarioId',
            tipoMovimiento: '$tipoMovimiento',
          },
          monto: { $sum: '$cantidad' },
        },
      },
    ]);

    const movFondoMap: Record<string, Record<string, number>> = {};
    movPeriodo.forEach((m) => {
      const id = m._id.inventarioId.toString();
      if (!movFondoMap[id]) movFondoMap[id] = {};
      movFondoMap[id][m._id.tipoMovimiento] = m.monto;
    });

    const fondos: FondoReporteItem[] = fondosRaw.map((f: any) => {
      const movi = movFondoMap[f._id.toString()] || {};
      const entradas = movi[TipoMovimiento.IN] || 0;
      const salidas = movi[TipoMovimiento.OUT] || 0;
      return {
        tipo: f.tipo,
        programa: f.programaId?.nombre || '—',
        disponible: f.stockActual,
        totalIngresado: f.stockInicial,
        utilizado: f.stockInicial - f.stockActual,
        porcentajeUtilizado:
          f.stockInicial > 0
            ? Math.round(
                ((f.stockInicial - f.stockActual) / f.stockInicial) * 100,
              )
            : 0,
        entradasMes: entradas,
        salidasMes: salidas,
        balanceMes: entradas - salidas,
      };
    });

    const disponibleTotal = fondos.reduce((s, f) => s + f.disponible, 0);
    const ingresadoTotal = fondos.reduce((s, f) => s + f.totalIngresado, 0);
    const utilizadoTotal = fondos.reduce((s, f) => s + f.utilizado, 0);
    const balanceMes = fondos.reduce((s, f) => s + f.balanceMes, 0);

    const content = buildFondosReporte({
      fondos,
      resumen: {
        totalFondos: fondos.length,
        disponibleTotal,
        ingresadoTotal,
        utilizadoTotal,
        porcentajeGlobal:
          ingresadoTotal > 0
            ? Math.round((utilizadoTotal / ingresadoTotal) * 100)
            : 0,
        balanceMes,
      },
      filtros: {
        programaNombre: filtros.programaId
          ? (fondosRaw[0] as any)?.programaId?.nombre
          : undefined,
      },
    });

    return { content, tituloReporte: 'Reporte de Fondos Monetarios DIF' };
  }
}
