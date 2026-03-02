import { DynamicContent } from 'pdfmake/interfaces';

/**
 * Footer estándar con número de página y aviso de confidencialidad.
 * Se usa como la propiedad `footer` del TDocumentDefinitions.
 */
export function buildFooter(): DynamicContent {
  return (currentPage: number, pageCount: number): any => ({
    margin: [40, 0, 40, 0],
    table: {
      widths: ['*', 'auto'],
      body: [
        [
          {
            text: 'Documento generado automáticamente por SAGIM. Uso interno y confidencial.',
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
