import { Content } from 'pdfmake/interfaces';

export interface BeneficiarioReporteItem {
  folio: string;
  nombre: string;
  apellidoPaterno: string;
  apellidoMaterno?: string;
  curp: string;
  sexo?: string;
  localidad?: string;
  grupoVulnerable: string[];
  totalApoyos: number;
  ultimoApoyo?: Date | string;
  programas: string[];
  activo: boolean;
}

export interface BeneficiarioReporteData {
  beneficiarios: BeneficiarioReporteItem[];
  resumen: {
    total: number;
    activos: number;
    conApoyos: number;
    localidadesUnicas: number;
    gruposPrincipales: { grupo: string; total: number }[];
  };
  filtros: {
    localidad?: string;
    grupoVulnerable?: string;
  };
}

/**
 * Builder del reporte de beneficiarios DIF.
 * Solo construye el contenido JSON para pdfmake — sin lógica de negocio.
 */
export function buildBeneficiarioReporte(
  data: BeneficiarioReporteData,
): Content[] {
  const { beneficiarios, resumen, filtros } = data;

  const content: Content[] = [];

  // ── Filtros aplicados ─────────────────────────────────────────────
  const filtrosTexto: string[] = [];
  if (filtros.localidad) filtrosTexto.push(`Localidad: ${filtros.localidad}`);
  if (filtros.grupoVulnerable)
    filtrosTexto.push(`Grupo vulnerable: ${filtros.grupoVulnerable}`);

  if (filtrosTexto.length > 0) {
    content.push({
      text: `Filtros aplicados: ${filtrosTexto.join(' | ')}`,
      style: 'textoSmall',
      margin: [0, 0, 0, 10],
    });
  }

  // ── KPIs ──────────────────────────────────────────────────────────
  content.push({
    table: {
      widths: ['*', '*', '*', '*'],
      body: [
        [
          kpiCard(resumen.total.toString(), 'Total registrados'),
          kpiCard(resumen.activos.toString(), 'Activos'),
          kpiCard(resumen.conApoyos.toString(), 'Con apoyos'),
          kpiCard(
            resumen.localidadesUnicas.toString(),
            'Localidades atendidas',
          ),
        ],
      ],
    },
    layout: 'noBorders',
    margin: [0, 0, 0, 12],
  });

  // ── Grupos vulnerables ────────────────────────────────────────────
  if (resumen.gruposPrincipales.length > 0) {
    content.push({
      text: 'Distribución por Grupo Vulnerable',
      style: 'subtitulo',
    });
    content.push({
      table: {
        widths: ['*', 100],
        body: [
          [
            { text: 'Grupo Vulnerable', style: 'tableHeaderLight' },
            { text: 'Beneficiarios', style: 'tableHeaderLight' },
          ],
          ...resumen.gruposPrincipales.map((g) => [
            { text: g.grupo, style: 'tableCell' },
            { text: g.total.toString(), style: 'tableCellCenter' },
          ]),
        ],
      },
      layout: 'lightHorizontalLines',
      margin: [0, 4, 0, 16],
    });
  }

  // ── Tabla beneficiarios ──────────────────────────────────────────
  content.push({ text: 'Padrón de Beneficiarios', style: 'subtitulo' });

  if (beneficiarios.length === 0) {
    content.push({
      text: 'No se encontraron beneficiarios con los filtros seleccionados.',
      style: 'textoSmall',
      italics: true,
      margin: [0, 8, 0, 0],
    });
    return content;
  }

  const tableBody: any[][] = [
    [
      { text: 'Folio', style: 'tableHeader' },
      { text: 'Nombre completo', style: 'tableHeader' },
      { text: 'CURP', style: 'tableHeader' },
      { text: 'Sexo', style: 'tableHeader' },
      { text: 'Localidad', style: 'tableHeader' },
      { text: 'Grupos', style: 'tableHeader' },
      { text: 'Apoyos', style: 'tableHeader' },
      { text: 'Último apoyo', style: 'tableHeader' },
    ],
    ...beneficiarios.map((b) => [
      { text: b.folio || '—', style: 'tableCellMuted' },
      {
        text: `${b.apellidoPaterno} ${b.apellidoMaterno || ''}, ${b.nombre}`.trim(),
        style: 'tableCell',
      },
      { text: b.curp, style: 'tableCellMuted', fontSize: 7 },
      {
        text: b.sexo === 'M' ? 'Masc.' : b.sexo === 'F' ? 'Fem.' : '—',
        style: 'tableCellCenter',
      },
      { text: b.localidad || '—', style: 'tableCell' },
      { text: b.grupoVulnerable.join(', ') || '—', style: 'tableCellMuted' },
      { text: b.totalApoyos.toString(), style: 'tableCellCenter' },
      {
        text: b.ultimoApoyo ? formatDate(b.ultimoApoyo) : '—',
        style: 'tableCellCenter',
      },
    ]),
  ];

  content.push({
    table: {
      headerRows: 1,
      widths: [85, 110, 95, 35, 70, 100, 40, 65],
      body: tableBody,
    },
    layout: 'lightHorizontalLines',
    margin: [0, 4, 0, 0],
  });

  return content;
}

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
