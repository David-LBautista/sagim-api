import { Content } from 'pdfmake/interfaces';

export interface HeaderData {
  municipioNombre: string;
  tipoReporte: string;
  fechaInicio: string;
  fechaFin: string;
  generadoEn?: Date;
  orientacion?: 'portrait' | 'landscape';
  logoBase64?: string;
}

/**
 * Devuelve una función dinámica de header para pdfmake.
 * El logo solo se renderiza en la primera página; el resto usa mayor margen
 * superior para mantener el mismo espacio reservado por pageMargins.
 */
export function buildHeaderFn(
  data: HeaderData,
): (currentPage: number, pageCount: number) => Content {
  return (currentPage: number) => {
    const esPrimeraPagina = currentPage === 1;
    // page 1: margin normal; page 2+: compensar la altura del logo (~64px)
    const topMargin = esPrimeraPagina ? 16 : 80;
    return {
      margin: [40, topMargin, 40, 0],
      stack: buildHeader({ ...data, logoBase64: esPrimeraPagina ? data.logoBase64 : undefined }),
    } as Content;
  };
}

/**
 * Encabezado estándar para todos los reportes DIF.
 * Devuelve un arreglo Content[] para usar dentro del docDefinition.
 */
export function buildHeader(data: HeaderData): Content[] {
  const orientacion = data.orientacion ?? 'portrait';
  const pageWidth = orientacion === 'landscape' ? 751 : 535; // A4 con márgenes [30]

  const content: Content[] = [];

  if (data.logoBase64) {
    content.push({
      image: data.logoBase64,
      width: 60,
      alignment: 'center',
      margin: [0, 0, 0, 4],
    });
  }

  content.push({
    text: data.municipioNombre.toUpperCase(),
    fontSize: 14,
    bold: true,
    alignment: 'center',
    color: '#333',
    margin: [0, 0, 0, 2],
  });

  content.push({
    text: data.tipoReporte,
    fontSize: 11,
    alignment: 'center',
    color: '#333',
    margin: [0, 0, 0, 2],
  });

  content.push({
    text: `Período: ${data.fechaInicio} — ${data.fechaFin}`,
    fontSize: 9,
    color: '#555',
    alignment: 'center',
    margin: [0, 0, 0, 8],
  });

  content.push({
    canvas: [
      {
        type: 'line',
        x1: 0,
        y1: 0,
        x2: pageWidth,
        y2: 0,
        lineWidth: 0.5,
        lineColor: '#ccc',
      },
    ],
    margin: [0, 0, 0, 0],
  });

  return content;
}
