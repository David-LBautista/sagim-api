import { Types } from 'mongoose';

/**
 * Convierte un folio simple al folio extendido para documentos oficiales y reportes.
 *
 * UI (pantalla):   APO-202602-0001
 * PDF / auditoria: APO-D3E6-202602-0001
 *
 * El sufijo del municipioId permite identificar de qué municipio es el folio
 * en herramientas de soporte/auditoría sin exponer el ObjectId completo.
 *
 * @param folio      - Folio corto tal como está en la BD, ej. "APO-202602-0001"
 * @param municipioId - ObjectId del municipio (string o Types.ObjectId)
 */
export function folioExtendido(
  folio: string,
  municipioId: string | Types.ObjectId,
): string {
  const munShort = municipioId.toString().slice(-4).toUpperCase();

  // Inserta el código de municipio después del prefijo (3 letras + guion)
  // APO-202602-0001  →  APO-D3E6-202602-0001
  const guionIdx = folio.indexOf('-');
  if (guionIdx === -1) return folio;

  const prefijo = folio.slice(0, guionIdx);
  const resto = folio.slice(guionIdx + 1);
  return `${prefijo}-${munShort}-${resto}`;
}
