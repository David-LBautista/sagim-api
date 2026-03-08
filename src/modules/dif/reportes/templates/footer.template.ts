import { DynamicContent } from 'pdfmake/interfaces';
import { fecha } from '@/common/helpers/fecha.helper';

/**
 * Footer estándar para reportes DIF.
 * Generado el {fecha}  |  Página X de Y
 */
export function buildFooter(): DynamicContent {
  const generadoEn = fecha.ahoraEnMexico().format('DD/MM/YYYY HH:mm');
  return (currentPage: number, pageCount: number): any => ({
    margin: [30, 6, 30, 0],
    table: {
      widths: ['*', 'auto'],
      body: [
        [
          {
            text: `Generado el ${generadoEn} — Documento generado por SAGIM. Uso interno.`,
            style: 'footerText',
            border: [false, true, false, false],
          },
          {
            text: `Página ${currentPage} de ${pageCount}`,
            style: 'footerText',
            alignment: 'right',
            border: [false, true, false, false],
          },
        ],
      ],
    },
  });
}
