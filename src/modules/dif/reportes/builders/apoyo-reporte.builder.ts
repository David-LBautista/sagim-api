import { Content } from 'pdfmake/interfaces';

export interface ApoyoReporteItem {
  folio: string;
  fecha: Date | string;
  beneficiarioNombre: string;
  beneficiarioCurp: string;
  programa: string;
  tipo: string;
  cantidad: number;
  monto: number;
  entregadoPor: string;
  observaciones?: string;
}

export interface ApoyoReporteData {
  apoyos: ApoyoReporteItem[];
  resumen: {
    totalApoyos: number;
    totalBeneficiarios: number;
    totalMonto: number;
    apoyosMes: number;
  };
  filtros: {
    programaNombre?: string;
    localidad?: string;
    grupoVulnerable?: string;
  };
}

/**
 * Builder del reporte de apoyos DIF.
 * Solo construye el contenido JSON para pdfmake — sin lógica de negocio.
 */
export function buildApoyoReporte(data: ApoyoReporteData): Content[] {
  const { apoyos, resumen, filtros } = data;

  const content: Content[] = [];

  // ── Filtros aplicados ──────────────────────────────────────────────
  if (filtros.programaNombre || filtros.localidad || filtros.grupoVulnerable) {
    const filtrosTexto: string[] = [];
    if (filtros.programaNombre)
      filtrosTexto.push(`Programa: ${filtros.programaNombre}`);
    if (filtros.localidad) filtrosTexto.push(`Localidad: ${filtros.localidad}`);
    if (filtros.grupoVulnerable)
      filtrosTexto.push(`Grupo vulnerable: ${filtros.grupoVulnerable}`);

    content.push({
      text: `Filtros aplicados: ${filtrosTexto.join(' | ')}`,
      style: 'textoSmall',
      margin: [0, 0, 0, 10],
    });
  }

  // ── Tarjetas KPI ──────────────────────────────────────────────────
  content.push({
    table: {
      widths: ['*', '*', '*', '*'],
      body: [
        [
          kpiCard(resumen.totalApoyos.toString(), 'Total apoyos otorgados'),
          kpiCard(
            `$${resumen.totalMonto.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`,
            'Monto total entregado',
          ),
          kpiCard(resumen.apoyosMes.toString(), 'Apoyos este mes'),
          kpiCard(
            resumen.totalBeneficiarios.toString(),
            'Beneficiarios atendidos',
          ),
        ],
      ],
    },
    layout: 'noBorders',
    margin: [0, 0, 0, 16],
  });

  // ── Tabla de apoyos ───────────────────────────────────────────────
  content.push({
    text: 'Detalle de Apoyos Entregados',
    style: 'subtitulo',
  });

  if (apoyos.length === 0) {
    content.push({
      text: 'No se encontraron apoyos en el período seleccionado.',
      style: 'textoSmall',
      italics: true,
      margin: [0, 8, 0, 0],
    });
    return content;
  }

  const tableBody: any[][] = [
    // Encabezado
    [
      { text: 'Folio', style: 'tableHeader' },
      { text: 'Fecha', style: 'tableHeader' },
      { text: 'Beneficiario', style: 'tableHeader' },
      { text: 'CURP', style: 'tableHeader' },
      { text: 'Programa', style: 'tableHeader' },
      { text: 'Tipo', style: 'tableHeader' },
      { text: 'Cant.', style: 'tableHeader' },
      { text: 'Monto', style: 'tableHeader' },
    ],
    // Filas
    ...apoyos.map((a, i) => [
      { text: a.folio, style: 'tableCellMuted' },
      { text: formatDate(a.fecha), style: 'tableCell' },
      { text: a.beneficiarioNombre, style: 'tableCell' },
      { text: a.beneficiarioCurp, style: 'tableCellMuted', fontSize: 7 },
      { text: a.programa, style: 'tableCell' },
      { text: a.tipo, style: 'tableCellCenter' },
      { text: a.cantidad.toString(), style: 'tableCellCenter' },
      {
        text:
          a.monto > 0
            ? `$${a.monto.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`
            : '—',
        style: 'tableCellCenter',
      },
    ]),
  ];

  content.push({
    table: {
      headerRows: 1,
      widths: [75, 65, 120, 90, 110, 80, 35, 50],
      body: tableBody,
    },
    layout: 'lightHorizontalLines',
    margin: [0, 4, 0, 0],
  });

  return content;
}

// ── Helpers ───────────────────────────────────────────────────────────
function kpiCard(valor: string, etiqueta: string): any {
  return {
    stack: [
      { text: valor, style: 'kpiValor' },
      { text: etiqueta, style: 'kpiLabel' },
    ],
    margin: [8, 8, 8, 8],
  };
}

function formatDate(fecha: Date | string): string {
  return new Date(fecha).toLocaleDateString('es-MX', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}
