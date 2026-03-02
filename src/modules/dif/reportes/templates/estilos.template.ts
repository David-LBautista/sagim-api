import { StyleDictionary } from 'pdfmake/interfaces';

export const estilosDIF: StyleDictionary = {
  // ── Encabezados ────────────────────────────────────────────────────
  titulo: {
    fontSize: 18,
    bold: true,
    color: '#0F2A44',
    margin: [0, 0, 0, 4],
  },
  subtitulo: {
    fontSize: 12,
    bold: true,
    color: '#0F2A44',
    margin: [0, 8, 0, 4],
  },
  seccion: {
    fontSize: 11,
    bold: true,
    color: '#ffffff',
    fillColor: '#0F2A44',
    margin: [4, 6, 4, 6],
  },

  // ── Texto general ──────────────────────────────────────────────────
  texto: {
    fontSize: 9,
    color: '#212121',
  },
  textoSmall: {
    fontSize: 8,
    color: '#424242',
  },
  label: {
    fontSize: 9,
    bold: true,
    color: '#424242',
  },
  valor: {
    fontSize: 9,
    color: '#212121',
  },

  // ── Tablas ─────────────────────────────────────────────────────────
  tableHeader: {
    fontSize: 9,
    bold: true,
    color: '#ffffff',
    fillColor: '#0F2A44',
    alignment: 'center',
    margin: [4, 4, 4, 4],
  },
  tableHeaderLight: {
    fontSize: 9,
    bold: true,
    color: '#212121',
    fillColor: '#e8eaf6',
    alignment: 'center',
    margin: [4, 3, 4, 3],
  },
  tableCell: {
    fontSize: 9,
    color: '#212121',
    margin: [4, 3, 4, 3],
  },
  tableCellCenter: {
    fontSize: 9,
    color: '#212121',
    alignment: 'center',
    margin: [4, 3, 4, 3],
  },
  tableCellMuted: {
    fontSize: 8,
    color: '#757575',
    margin: [4, 3, 4, 3],
  },

  // ── Tarjetas / KPIs ────────────────────────────────────────────────
  kpiValor: {
    fontSize: 22,
    bold: true,
    color: '#0F2A44',
    alignment: 'center',
  },
  kpiLabel: {
    fontSize: 8,
    color: '#616161',
    alignment: 'center',
  },

  // ── Pie de página / encabezado ─────────────────────────────────────
  headerText: {
    fontSize: 8,
    color: '#757575',
  },
  footerText: {
    fontSize: 7,
    color: '#9e9e9e',
    italics: true,
  },
};
