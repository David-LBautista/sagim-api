import { Content } from 'pdfmake/interfaces';

export interface FondoReporteItem {
  tipo: string;
  programa: string;
  disponible: number;
  totalIngresado: number;
  utilizado: number;
  porcentajeUtilizado: number;
  entradasMes: number;
  salidasMes: number;
  balanceMes: number;
}

export interface FondosReporteData {
  fondos: FondoReporteItem[];
  resumen: {
    totalFondos: number;
    disponibleTotal: number;
    ingresadoTotal: number;
    utilizadoTotal: number;
    porcentajeGlobal: number;
    balanceMes: number;
  };
  filtros: {
    programaNombre?: string;
  };
}

/**
 * Builder del reporte de fondos monetarios DIF.
 * Solo construye el contenido JSON para pdfmake — sin lógica de negocio.
 */
export function buildFondosReporte(data: FondosReporteData): Content[] {
  const { fondos, resumen, filtros } = data;
  const content: Content[] = [];

  if (filtros.programaNombre) {
    content.push({
      text: `Programa: ${filtros.programaNombre}`,
      style: 'textoSmall',
      margin: [0, 0, 0, 10],
    });
  }

  // ── Resumen financiero en tabla ─────────────────────────────────────
  const balanceColor = resumen.balanceMes >= 0 ? '#2e7d32' : '#c62828';
  content.push({
    table: {
      widths: ['*', '*', '*', '*', '*'],
      body: [
        [
          { text: 'Total ingresado', style: 'tableHeader' },
          { text: 'Total utilizado', style: 'tableHeader' },
          { text: 'Disponible total', style: 'tableHeader' },
          { text: 'Utilización global', style: 'tableHeader' },
          { text: 'Balance del período', style: 'tableHeader' },
        ],
        [
          {
            text: `$${resumen.ingresadoTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`,
            style: 'tableCellCenter',
          },
          {
            text: `$${resumen.utilizadoTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`,
            style: 'tableCellCenter',
          },
          {
            text: `$${resumen.disponibleTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`,
            style: 'tableCellCenter',
          },
          { text: `${resumen.porcentajeGlobal}%`, style: 'tableCellCenter' },
          {
            text: `${resumen.balanceMes >= 0 ? '+' : ''}$${resumen.balanceMes.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`,
            style: 'tableCellCenter',
            bold: true,
            color: balanceColor,
          },
        ],
      ],
    },
    layout: 'lightHorizontalLines',
    margin: [0, 0, 0, 16],
  });

  // ── Tabla de fondos ───────────────────────────────────────────────
  content.push({ text: 'Detalle de Fondos Monetarios', style: 'subtitulo' });

  if (fondos.length === 0) {
    content.push({
      text: 'No hay fondos monetarios registrados.',
      style: 'textoSmall',
      italics: true,
      margin: [0, 8, 0, 0],
    });
    return content;
  }

  const tableBody: any[][] = [
    [
      { text: 'Fondo / Tipo', style: 'tableHeader' },
      { text: 'Programa', style: 'tableHeader' },
      { text: 'Ingresado', style: 'tableHeader' },
      { text: 'Utilizado', style: 'tableHeader' },
      { text: 'Disponible', style: 'tableHeader' },
      { text: '% uso', style: 'tableHeader' },
      { text: 'Ent. período', style: 'tableHeader' },
      { text: 'Sal. período', style: 'tableHeader' },
      { text: 'Balance', style: 'tableHeader' },
    ],
    ...fondos.map((f) => [
      { text: f.tipo, style: 'tableCell' },
      { text: f.programa, style: 'tableCellMuted' },
      { text: formatMoneda(f.totalIngresado), style: 'tableCellCenter' },
      {
        text: formatMoneda(f.utilizado),
        style: 'tableCellCenter',
        color: '#c62828',
      },
      {
        text: formatMoneda(f.disponible),
        style: 'tableCellCenter',
        bold: true,
        color: '#2e7d32',
      },
      {
        text: `${f.porcentajeUtilizado}%`,
        style: 'tableCellCenter',
        color:
          f.porcentajeUtilizado >= 80
            ? '#c62828'
            : f.porcentajeUtilizado >= 50
              ? '#ef6c00'
              : '#2e7d32',
        bold: true,
      },
      {
        text: formatMoneda(f.entradasMes),
        style: 'tableCellCenter',
        color: '#2e7d32',
      },
      {
        text: formatMoneda(f.salidasMes),
        style: 'tableCellCenter',
        color: '#c62828',
      },
      {
        text: `${f.balanceMes >= 0 ? '+' : ''}${formatMoneda(f.balanceMes)}`,
        style: 'tableCellCenter',
        bold: true,
        color: f.balanceMes >= 0 ? '#2e7d32' : '#c62828',
      },
    ]),
    // Totales
    [
      { text: 'TOTAL', colSpan: 2, style: 'tableCell', bold: true },
      {},
      {
        text: formatMoneda(resumen.ingresadoTotal),
        style: 'tableCellCenter',
        bold: true,
      },
      {
        text: formatMoneda(resumen.utilizadoTotal),
        style: 'tableCellCenter',
        bold: true,
        color: '#c62828',
      },
      {
        text: formatMoneda(resumen.disponibleTotal),
        style: 'tableCellCenter',
        bold: true,
        color: '#2e7d32',
      },
      {
        text: `${resumen.porcentajeGlobal}%`,
        style: 'tableCellCenter',
        bold: true,
      },
      { text: '', style: 'tableCellCenter' },
      { text: '', style: 'tableCellCenter' },
      {
        text: `${resumen.balanceMes >= 0 ? '+' : ''}${formatMoneda(resumen.balanceMes)}`,
        style: 'tableCellCenter',
        bold: true,
        color: resumen.balanceMes >= 0 ? '#2e7d32' : '#c62828',
      },
    ],
  ];

  content.push({
    table: {
      headerRows: 1,
      widths: ['*', '*', 55, 55, 55, 35, 55, 55, 50],
      body: tableBody,
    },
    layout: 'lightHorizontalLines',
    margin: [0, 4, 0, 0],
  });

  return content;
}

function formatMoneda(valor: number): string {
  return `$${Math.abs(valor).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;
}
