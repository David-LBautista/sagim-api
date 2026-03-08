import { Content } from 'pdfmake/interfaces';

export interface InventarioReporteItem {
  tipo: string;
  programa: string;
  stockActual: number;
  stockInicial: number;
  alertaMinima: number;
  unidadMedida: string;
  valorUnitario: number;
  valorTotal: number;
  estado: 'CRITICO' | 'BAJO' | 'NORMAL';
  entradasMes: number;
  salidasMes: number;
}

export interface InventarioReporteData {
  items: InventarioReporteItem[];
  resumen: {
    totalArticulos: number;
    criticos: number;
    bajos: number;
    normales: number;
    valorTotalInventario: number;
    entradasMes: number;
    salidasMes: number;
  };
  filtros: {
    programaNombre?: string;
  };
}

const ESTADO_COLORES: Record<string, string> = {
  CRITICO: '#c62828',
  BAJO: '#ef6c00',
  NORMAL: '#2e7d32',
};

/**
 * Builder del reporte de inventario físico DIF.
 * Solo construye el contenido JSON para pdfmake — sin lógica de negocio.
 */
export function buildInventarioReporte(data: InventarioReporteData): Content[] {
  const { items, resumen, filtros } = data;
  const content: Content[] = [];

  if (filtros.programaNombre) {
    content.push({
      text: `Programa: ${filtros.programaNombre}`,
      style: 'textoSmall',
      margin: [0, 0, 0, 10],
    });
  }

  // ── Resumen en tabla ──────────────────────────────────────────────
  content.push({
    table: {
      widths: ['*', '*', '*', '*', '*', '*', '*'],
      body: [
        [
          { text: 'Artículos', style: 'tableHeader' },
          { text: 'Valor total', style: 'tableHeader' },
          { text: 'Entradas del mes', style: 'tableHeader' },
          { text: 'Salidas del mes', style: 'tableHeader' },
          { text: 'Stock Crítico', style: 'tableHeader' },
          { text: 'Stock Bajo', style: 'tableHeader' },
          { text: 'Stock Normal', style: 'tableHeader' },
        ],
        [
          { text: resumen.totalArticulos.toString(), style: 'tableCellCenter' },
          {
            text: `$${resumen.valorTotalInventario.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`,
            style: 'tableCellCenter',
          },
          { text: resumen.entradasMes.toString(), style: 'tableCellCenter', color: '#2e7d32' },
          { text: resumen.salidasMes.toString(), style: 'tableCellCenter', color: '#c62828' },
          { text: resumen.criticos.toString(), style: 'tableCellCenter', bold: true, color: '#c62828' },
          { text: resumen.bajos.toString(), style: 'tableCellCenter', bold: true, color: '#ef6c00' },
          { text: resumen.normales.toString(), style: 'tableCellCenter', bold: true, color: '#2e7d32' },
        ],
      ],
    },
    layout: 'lightHorizontalLines',
    margin: [0, 0, 0, 16],
  });

  // ── Tabla de inventario ───────────────────────────────────────────
  content.push({ text: 'Detalle del Inventario Físico', style: 'subtitulo' });

  if (items.length === 0) {
    content.push({
      text: 'No hay artículos registrados en inventario.',
      style: 'textoSmall',
      italics: true,
      margin: [0, 8, 0, 0],
    });
    return content;
  }

  const tableBody: any[][] = [
    [
      { text: 'Artículo', style: 'tableHeader' },
      { text: 'Programa', style: 'tableHeader' },
      { text: 'Stock actual', style: 'tableHeader' },
      { text: 'Unidad', style: 'tableHeader' },
      { text: 'Valor unit.', style: 'tableHeader' },
      { text: 'Valor total', style: 'tableHeader' },
      { text: 'Estado', style: 'tableHeader' },
      { text: 'Ent. mes', style: 'tableHeader' },
      { text: 'Sal. mes', style: 'tableHeader' },
    ],
    ...items.map((item) => [
      { text: item.tipo, style: 'tableCell' },
      { text: item.programa, style: 'tableCellMuted' },
      { text: item.stockActual.toString(), style: 'tableCellCenter' },
      { text: item.unidadMedida, style: 'tableCellCenter' },
      {
        text: `$${item.valorUnitario.toFixed(2)}`,
        style: 'tableCellCenter',
      },
      {
        text: `$${item.valorTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`,
        style: 'tableCellCenter',
      },
      {
        text: item.estado,
        style: 'tableCellCenter',
        bold: true,
        color: ESTADO_COLORES[item.estado] || '#212121',
      },
      {
        text: item.entradasMes.toString(),
        style: 'tableCellCenter',
        color: '#2e7d32',
      },
      {
        text: item.salidasMes.toString(),
        style: 'tableCellCenter',
        color: '#c62828',
      },
    ]),
  ];

  content.push({
    table: {
      headerRows: 1,
      widths: ['*', '*', 50, 45, 50, 65, 55, 40, 40],
      body: tableBody,
    },
    layout: 'lightHorizontalLines',
    margin: [0, 4, 0, 0],
  });

  return content;
}
