/**
 * S3Keys — Centraliza la construcción de todas las keys de S3 del sistema.
 *
 * Estructura base:
 *   sagim/municipios/{municipioId}/{módulo}/{categoría}/{anio}/{mes}/{archivo}
 *
 * Reglas:
 *  - Usar municipioId (ObjectId) — nunca slug. Los IDs son inmutables; los slugs pueden cambiar.
 *  - Todo lo recurrente (recibos, cortes, reportes) lleva /{anio}/{mes}/ para evitar
 *    carpetas con miles de archivos y facilitar limpieza por período.
 *  - Nombres de archivo descriptivos con folio o fecha — nunca UUIDs solos.
 *  - Transparencia separada: documentos públicos de larga vida, sin partición por mes.
 *
 * Uso:
 *   import { S3Keys } from '@/shared/helpers/s3-keys.helper';
 *   const key = S3Keys.reciboCaja(municipioId, pago.folio);
 */

const pad = (n: number): string => String(n).padStart(2, '0');

/**
 * Extrae {anio, mes} desde un folio con formato PREFIX-YYYYMM-NNNN.
 * Si el folio no tiene ese formato, usa la fecha actual como fallback.
 */
function fechaDeFolio(folio: string): { anio: string; mes: string } {
  const parts = folio.split('-');
  // Segmento YYYYMM está en la segunda posición: CAJA-202603-0001
  if (parts.length >= 2 && /^\d{6}$/.test(parts[1])) {
    return { anio: parts[1].slice(0, 4), mes: parts[1].slice(4, 6) };
  }
  const now = new Date();
  return { anio: String(now.getFullYear()), mes: pad(now.getMonth() + 1) };
}

/**
 * Extrae {anio, mes} desde una cadena con formato YYYYMM o YYYYMMDD.
 */
function fechaDePeriodo(periodo: string): { anio: string; mes: string } {
  if (periodo.length >= 6 && /^\d{6,8}/.test(periodo)) {
    return { anio: periodo.slice(0, 4), mes: periodo.slice(4, 6) };
  }
  const now = new Date();
  return { anio: String(now.getFullYear()), mes: pad(now.getMonth() + 1) };
}

export const S3Keys = {
  // ── TESORERÍA ────────────────────────────────────────────────────────────────

  /**
   * Recibo de cobro en caja (pago inmediato en ventanilla).
   * sagim/municipios/{id}/tesoreria/recibos/{anio}/{mes}/{folio}.pdf
   */
  reciboCaja: (municipioId: string, folio: string): string => {
    const { anio, mes } = fechaDeFolio(folio);
    return `sagim/municipios/${municipioId}/tesoreria/recibos/${anio}/${mes}/${folio}.pdf`;
  },

  /**
   * Corte de caja diario.
   * sagim/municipios/{id}/tesoreria/cortes/{anio}/{mes}/CORTE-{YYYYMMDD}.pdf
   */
  corteDiario: (municipioId: string, periodo: string): string => {
    const { anio, mes } = fechaDePeriodo(periodo);
    return `sagim/municipios/${municipioId}/tesoreria/cortes/${anio}/${mes}/CORTE-${periodo}.pdf`;
  },

  /**
   * Corte/reporte mensual de tesorería.
   * sagim/municipios/{id}/tesoreria/cortes/{anio}/{mes}/CORTE-MENSUAL-{YYYYMM}.pdf
   */
  corteMensual: (municipioId: string, periodo: string): string => {
    const { anio, mes } = fechaDePeriodo(periodo);
    return `sagim/municipios/${municipioId}/tesoreria/cortes/${anio}/${mes}/CORTE-MENSUAL-${periodo}.pdf`;
  },

  /**
   * Reporte de un servicio específico de tesorería.
   * sagim/municipios/{id}/tesoreria/reportes/{anio}/RPT-servicios-{sid}-{YYYYMMDD}.pdf
   */
  reporteServicioTesoreria: (municipioId: string, periodo: string): string => {
    const { anio } = fechaDePeriodo(periodo);
    return `sagim/municipios/${municipioId}/tesoreria/reportes/${anio}/RPT-servicios-${periodo}.pdf`;
  },

  // ── ÓRDENES DE PAGO (Stripe / pago en línea) ─────────────────────────────────

  /**
   * Recibo de orden de pago en línea (Stripe).
   * sagim/municipios/{id}/ordenes-pago/{anio}/{mes}/{folio}.pdf
   */
  reciboOrden: (municipioId: string, folio: string): string => {
    const { anio, mes } = fechaDeFolio(folio);
    return `sagim/municipios/${municipioId}/ordenes-pago/${anio}/${mes}/${folio}.pdf`;
  },

  // ── DIF ──────────────────────────────────────────────────────────────────────

  /**
   * Reporte de DIF (beneficiarios, inventario, apoyos, fondos).
   * sagim/municipios/{id}/dif/reportes/{subtipo}/{anio}/{mes}/RPT-{subtipo}-{YYYYMM}-{ts}.pdf
   *
   * El timestamp evita colisiones si se regenera el mismo reporte en el mismo mes.
   */
  reporteDif: (
    municipioId: string,
    subtipo: string,
    periodo: string,
  ): string => {
    const { anio, mes } = fechaDePeriodo(periodo);
    const ts = Date.now();
    return `sagim/municipios/${municipioId}/dif/reportes/${subtipo}/${anio}/${mes}/RPT-${subtipo}-${periodo}-${ts}.pdf`;
  },

  /**
   * Archivo de importación masiva de DIF (xlsx, csv).
   * sagim/municipios/{id}/dif/importaciones/{anio}/{mes}/{filename}
   */
  importacionDif: (
    municipioId: string,
    fecha: Date,
    nombreArchivo: string,
  ): string => {
    const anio = String(fecha.getFullYear());
    const mes = pad(fecha.getMonth() + 1);
    return `sagim/municipios/${municipioId}/dif/importaciones/${anio}/${mes}/${nombreArchivo}`;
  },

  // ── TRANSPARENCIA ────────────────────────────────────────────────────────────

  /**
   * Documento de transparencia (actas de cabildo, presupuesto, reglamentos, etc.).
   * sagim/municipios/{id}/transparencia/{categoria}/{nombreArchivo}
   *
   * Sin partición por año/mes — son documentos de larga vida, públicos o semi-públicos.
   * Categorías sugeridas: 'actas-cabildo' | 'presupuesto' | 'reglamentos' | 'cuenta-publica'
   */
  transparencia: (
    municipioId: string,
    categoria: string,
    nombreArchivo: string,
  ): string => {
    return `sagim/municipios/${municipioId}/transparencia/${categoria}/${nombreArchivo}`;
  },
};

/**
 * @deprecated Usar S3Keys directamente.
 * Alias para retrocompatibilidad con S3Service.key* estáticos durante migración.
 */
export const s3Keys = S3Keys;
