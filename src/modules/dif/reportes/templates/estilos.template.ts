import { StyleDictionary } from 'pdfmake/interfaces';

export const estilosDIF: StyleDictionary = {
  // ── Encabezados ────────────────────────────────────────────────────
  titulo: {
    fontSize: 14,
    bold: true,
    color: '#333',
    margin: [0, 0, 0, 2],
  },
  subtitulo: {
    fontSize: 10,
    bold: true,
    color: '#333',
    margin: [0, 0, 0, 6],
  },
  seccion: {
    fontSize: 10,
    bold: true,
    color: '#333',
    margin: [0, 8, 0, 4],
  },

  // ── Texto general ──────────────────────────────────────────────────
  texto: {
    fontSize: 8,
    color: '#333',
  },
  textoSmall: {
    fontSize: 8,
    color: '#555',
  },
  label: {
    fontSize: 8,
    bold: true,
    color: '#555',
  },
  valor: {
    fontSize: 8,
    color: '#333',
  },

  // ── Tablas ─────────────────────────────────────────────────────────
  tableHeader: {
    fontSize: 8,
    bold: true,
    color: '#333',
    alignment: 'left',
    margin: [4, 3, 4, 3],
  },
  tableHeaderLight: {
    fontSize: 8,
    bold: true,
    color: '#333',
    alignment: 'left',
    margin: [4, 3, 4, 3],
  },
  tableCell: {
    fontSize: 8,
    color: '#333',
    margin: [4, 3, 4, 3],
  },
  tableCellCenter: {
    fontSize: 8,
    color: '#333',
    alignment: 'center',
    margin: [4, 3, 4, 3],
  },
  tableCellMuted: {
    fontSize: 8,
    color: '#555',
    margin: [4, 3, 4, 3],
  },

  // ── Tarjetas / KPIs ────────────────────────────────────────────────
  kpiValor: {
    fontSize: 11,
    bold: true,
    color: '#333',
    alignment: 'center',
  },
  kpiLabel: {
    fontSize: 8,
    bold: true,
    color: '#555',
    alignment: 'center',
  },

  // ── Pie de página / encabezado ─────────────────────────────────────
  headerText: {
    fontSize: 8,
    color: '#555',
  },
  footerText: {
    fontSize: 7,
    color: '#888',
  },
};
