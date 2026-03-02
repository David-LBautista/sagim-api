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
 * Encabezado estándar para todos los reportes DIF.
 * Devuelve un arreglo Content[] para usar dentro del docDefinition.
 */
export function buildHeader(data: HeaderData): Content[] {
  const orientacion = data.orientacion ?? 'portrait';
  const fechaGeneracion = (data.generadoEn || new Date()).toLocaleString(
    'es-MX',
    {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    },
  );

  return [
    // Franja superior con nombre del municipio + SAGIM
    {
      table: {
        widths: data.logoBase64 ? [42, '*', 'auto'] : ['*', 'auto'],
        body: [
          [
            ...(data.logoBase64
              ? [
                  {
                    image: data.logoBase64,
                    width: 34,
                    margin: [0, 2, 6, 0] as [number, number, number, number],
                    border: [false, false, false, false] as [
                      boolean,
                      boolean,
                      boolean,
                      boolean,
                    ],
                  },
                ]
              : []),
            {
              stack: [
                {
                  text: `Sistema SAGIM — DIF Municipal`,
                  style: 'headerText',
                  bold: true,
                },
                {
                  text: [
                    { text: 'Municipio ', style: 'headerText' },
                    {
                      text: data.municipioNombre,
                      style: 'headerText',
                      bold: true,
                      fontSize: 10,
                      color: '#0F2A44',
                    },
                  ],
                },
              ],
              margin: [0, data.logoBase64 ? 7 : 0, 0, 0] as [
                number,
                number,
                number,
                number,
              ],
              border: [false, false, false, false] as [
                boolean,
                boolean,
                boolean,
                boolean,
              ],
            },
            {
              text: `Generado: ${fechaGeneracion}`,
              style: 'headerText',
              alignment: 'right',
              margin: [0, data.logoBase64 ? 7 : 0, 0, 0] as [
                number,
                number,
                number,
                number,
              ],
              border: [false, false, false, false] as [
                boolean,
                boolean,
                boolean,
                boolean,
              ],
            },
          ],
        ],
      },
      layout: 'noBorders',
      margin: [0, 0, 0, 4],
    },
    // Línea divisora
    {
      canvas: [
        {
          type: 'line',
          x1: 0,
          y1: 0,
          x2: orientacion === 'landscape' ? 731 : 515,
          y2: 0,
          lineWidth: 2,
          lineColor: '#0F2A44',
        },
      ],
      margin: [0, 0, 0, 0],
    },
  ];
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}
