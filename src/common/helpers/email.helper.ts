import * as fs from 'fs';
import * as path from 'path';

// ═══════════════════════════════════════════════════════════════
// SAGIM — Email Template Helper
// Carga la plantilla base y reemplaza variables {{VARIABLE}}
// ═══════════════════════════════════════════════════════════════

export interface EmailBaseVars {
  MUNICIPIO_NOMBRE: string;
  MUNICIPIO_CORREO: string;
  LOGO_URL: string;
  CIUDADANO_NOMBRE: string;
  HEADER_TITULO: string;
  HEADER_SUBTITULO?: string;
  MENSAJE_INTRO: string;
  FOLIO?: string;
  CAMPO_1_LABEL?: string;
  CAMPO_1_VALOR?: string;
  CAMPO_2_LABEL?: string;
  CAMPO_2_VALOR?: string;
  CAMPO_3_LABEL?: string;
  CAMPO_3_VALOR?: string;
  CAMPO_4_LABEL?: string;
  CAMPO_4_VALOR?: string;
  CAMPO_5_LABEL?: string;
  CAMPO_5_VALOR?: string;
  ALERT_LABEL?: string;
  ALERT_TEXTO?: string;
  ALERT_MODIFIER?: 'success' | 'info' | 'danger'; // default = warning (amarillo)
  BTN_URL?: string;
  BTN_TEXTO?: string;
  BTN2_URL?: string;
  BTN2_TEXTO?: string;
  BTN2_CLASE?: string; // btn--danger | btn--secondary | btn--success
  [key: string]: string | undefined;
}

// ── renderEmail ─────────────────────────────────────────────────
export function renderEmail(vars: EmailBaseVars): string {
  const templatePath = path.join(
    __dirname,
    '../../templates/email-base.template.html',
  );
  let html = fs.readFileSync(templatePath, 'utf-8');

  // Construir ALERT_HTML
  let alertHtml = '';
  if (vars.ALERT_TEXTO) {
    const modifier = vars.ALERT_MODIFIER
      ? ` alert-box--${vars.ALERT_MODIFIER}`
      : '';
    alertHtml = `
      <div class="alert-box${modifier}">
        ${vars.ALERT_LABEL ? `<div class="alert-box__label">${vars.ALERT_LABEL}</div>` : ''}
        <p class="alert-box__text">${vars.ALERT_TEXTO}</p>
      </div>`;
  }
  html = html.replace('{{ALERT_HTML}}', alertHtml);

  // Construir BTNS_HTML
  let btnsHtml = '';
  if (vars.BTN_URL && vars.BTN_TEXTO) {
    if (vars.BTN2_URL && vars.BTN2_TEXTO) {
      const btn2Clase = vars.BTN2_CLASE ?? 'btn--secondary';
      btnsHtml = `
        <div class="btn-group">
          <a href="${vars.BTN_URL}" class="btn btn--primary" style="margin:0 8px 8px 0;display:inline-block;">${vars.BTN_TEXTO}</a>
          <a href="${vars.BTN2_URL}" class="btn ${btn2Clase}" style="margin:0 0 8px 0;display:inline-block;">${vars.BTN2_TEXTO}</a>
        </div>`;
    } else {
      btnsHtml = `
        <div class="btn-container">
          <a href="${vars.BTN_URL}" class="btn btn--primary">${vars.BTN_TEXTO}</a>
        </div>`;
    }
  }
  html = html.replace('{{BTNS_HTML}}', btnsHtml);

  // Reemplazar todas las variables restantes
  for (const [key, value] of Object.entries(vars)) {
    html = html.replaceAll(`{{${key}}}`, value ?? '');
  }

  // Limpiar variables no reemplazadas
  html = html.replace(/\{\{[A-Z0-9_]+\}\}/g, '');

  return html;
}

// ═══════════════════════════════════════════════════════════════
// PLANTILLAS ESPECÍFICAS
// ═══════════════════════════════════════════════════════════════

// ── Confirmación de cita ─────────────────────────────────────
export function emailCitaConfirmada(data: {
  municipioNombre: string;
  municipioCorreo: string;
  logoUrl: string;
  ciudadanoNombre: string;
  folio: string;
  area: string;
  tramite: string;
  fecha: string;
  hora: string;
  instrucciones: string;
  urlVerCita: string;
  urlCancelar: string;
}): string {
  return renderEmail({
    MUNICIPIO_NOMBRE: data.municipioNombre,
    MUNICIPIO_CORREO: data.municipioCorreo,
    LOGO_URL: data.logoUrl,
    CIUDADANO_NOMBRE: data.ciudadanoNombre,
    HEADER_TITULO: 'Cita confirmada',
    HEADER_SUBTITULO: '',
    MENSAJE_INTRO: 'Tu cita ha sido agendada correctamente.',
    FOLIO: data.folio,
    CAMPO_1_LABEL: 'Área',
    CAMPO_1_VALOR: data.area,
    CAMPO_2_LABEL: 'Trámite',
    CAMPO_2_VALOR: data.tramite,
    CAMPO_3_LABEL: 'Fecha',
    CAMPO_3_VALOR: data.fecha,
    CAMPO_4_LABEL: 'Hora',
    CAMPO_4_VALOR: data.hora,
    ALERT_LABEL: data.instrucciones ? 'Instrucciones' : undefined,
    ALERT_TEXTO: data.instrucciones || undefined,
    BTN_URL: data.urlVerCita,
    BTN_TEXTO: 'Ver mi cita',
    BTN2_URL: data.urlCancelar,
    BTN2_TEXTO: 'Cancelar cita',
    BTN2_CLASE: 'btn--danger',
  });
}

// ── Recordatorio de cita ──────────────────────────────────────
export function emailCitaRecordatorio(data: {
  municipioNombre: string;
  municipioCorreo: string;
  logoUrl: string;
  ciudadanoNombre: string;
  folio: string;
  area: string;
  tramite: string;
  fecha: string;
  hora: string;
  instrucciones: string;
  urlCancelar: string;
}): string {
  return renderEmail({
    MUNICIPIO_NOMBRE: data.municipioNombre,
    MUNICIPIO_CORREO: data.municipioCorreo,
    LOGO_URL: data.logoUrl,
    CIUDADANO_NOMBRE: data.ciudadanoNombre,
    HEADER_TITULO: 'Recordatorio de cita',
    HEADER_SUBTITULO: 'Tu cita es mañana',
    MENSAJE_INTRO: 'Te recordamos que mañana tienes una cita agendada.',
    FOLIO: data.folio,
    CAMPO_1_LABEL: 'Área',
    CAMPO_1_VALOR: data.area,
    CAMPO_2_LABEL: 'Trámite',
    CAMPO_2_VALOR: data.tramite,
    CAMPO_3_LABEL: 'Fecha',
    CAMPO_3_VALOR: data.fecha,
    CAMPO_4_LABEL: 'Hora',
    CAMPO_4_VALOR: data.hora,
    ALERT_LABEL: data.instrucciones ? 'Instrucciones' : undefined,
    ALERT_TEXTO: data.instrucciones || undefined,
    BTN_URL: data.urlCancelar,
    BTN_TEXTO: '¿No puedes asistir? Cancela aquí',
    BTN2_URL: undefined,
    BTN2_TEXTO: undefined,
  });
}

// ── Cita reagendada ────────────────────────────────────────────
export function emailCitaReagendada(data: {
  municipioNombre: string;
  municipioCorreo: string;
  logoUrl: string;
  ciudadanoNombre: string;
  folio: string;
  area: string;
  tramite: string;
  fecha: string;
  hora: string;
}): string {
  return renderEmail({
    MUNICIPIO_NOMBRE: data.municipioNombre,
    MUNICIPIO_CORREO: data.municipioCorreo,
    LOGO_URL: data.logoUrl,
    CIUDADANO_NOMBRE: data.ciudadanoNombre,
    HEADER_TITULO: 'Cita reagendada',
    HEADER_SUBTITULO: `Folio: ${data.folio}`,
    MENSAJE_INTRO: 'Tu cita ha sido reprogramada con los siguientes datos:',
    FOLIO: data.folio,
    CAMPO_1_LABEL: 'Área',
    CAMPO_1_VALOR: data.area,
    CAMPO_2_LABEL: 'Trámite',
    CAMPO_2_VALOR: data.tramite,
    CAMPO_3_LABEL: 'Nueva fecha',
    CAMPO_3_VALOR: data.fecha,
    CAMPO_4_LABEL: 'Nueva hora',
    CAMPO_4_VALOR: data.hora,
    ALERT_LABEL: 'Información',
    ALERT_TEXTO:
      'Si no puedes asistir en la nueva fecha, accede al portal ciudadano para cancelar o reagendar.',
    ALERT_MODIFIER: 'info',
  });
}

// ── Cancelación de cita ──────────────────────────────────────
export function emailCitaCancelada(data: {
  municipioNombre: string;
  municipioCorreo: string;
  logoUrl: string;
  ciudadanoNombre: string;
  folio: string;
  area: string;
  fecha: string;
}): string {
  return renderEmail({
    MUNICIPIO_NOMBRE: data.municipioNombre,
    MUNICIPIO_CORREO: data.municipioCorreo,
    LOGO_URL: data.logoUrl,
    CIUDADANO_NOMBRE: data.ciudadanoNombre,
    HEADER_TITULO: 'Cita cancelada',
    HEADER_SUBTITULO: '',
    MENSAJE_INTRO: 'Tu cita ha sido cancelada exitosamente.',
    FOLIO: data.folio,
    CAMPO_1_LABEL: 'Área',
    CAMPO_1_VALOR: data.area,
    CAMPO_2_LABEL: 'Fecha',
    CAMPO_2_VALOR: data.fecha,
    ALERT_LABEL: 'Información',
    ALERT_TEXTO:
      'Si deseas agendar una nueva cita, puedes hacerlo en el portal ciudadano.',
    ALERT_MODIFIER: 'info',
  });
}

// ── Orden de pago generada ───────────────────────────────────
export function emailOrdenPago(data: {
  municipioNombre: string;
  municipioCorreo: string;
  logoUrl: string;
  ciudadanoNombre: string;
  folio: string;
  concepto: string;
  monto: string;
  fechaVencimiento: string;
  urlPagar: string;
}): string {
  return renderEmail({
    MUNICIPIO_NOMBRE: data.municipioNombre,
    MUNICIPIO_CORREO: data.municipioCorreo,
    LOGO_URL: data.logoUrl,
    CIUDADANO_NOMBRE: data.ciudadanoNombre,
    HEADER_TITULO: 'Orden de pago generada',
    HEADER_SUBTITULO: 'Sistema de Pagos Municipales — SAGIM',
    MENSAJE_INTRO:
      'Se ha generado una orden de pago a tu nombre. Puedes realizar tu pago de forma segura haciendo clic en el botón de abajo.',
    FOLIO: data.folio,
    CAMPO_1_LABEL: 'Concepto',
    CAMPO_1_VALOR: data.concepto,
    CAMPO_2_LABEL: 'Monto',
    CAMPO_2_VALOR: `${data.monto} MXN`,
    CAMPO_3_LABEL: 'Vence el',
    CAMPO_3_VALOR: data.fechaVencimiento,
    ALERT_LABEL: 'Importante',
    ALERT_TEXTO: `Esta orden vence el ${data.fechaVencimiento}. Después de esa fecha no podrás realizar el pago en línea.`,
    BTN_URL: data.urlPagar,
    BTN_TEXTO: 'Pagar ahora',
  });
}

// ── Pago confirmado ──────────────────────────────────────────
export function emailPagoConfirmado(data: {
  municipioNombre: string;
  municipioCorreo: string;
  logoUrl: string;
  ciudadanoNombre: string;
  folio: string;
  concepto: string;
  monto: string;
  fechaPago: string;
  urlRecibo?: string;
}): string {
  return renderEmail({
    MUNICIPIO_NOMBRE: data.municipioNombre,
    MUNICIPIO_CORREO: data.municipioCorreo,
    LOGO_URL: data.logoUrl,
    CIUDADANO_NOMBRE: data.ciudadanoNombre,
    HEADER_TITULO: 'Pago confirmado ✓',
    HEADER_SUBTITULO: `${data.municipioNombre} — SAGIM`,
    MENSAJE_INTRO:
      'Tu pago ha sido procesado exitosamente. A continuación el resumen:',
    FOLIO: data.folio,
    CAMPO_1_LABEL: 'Concepto',
    CAMPO_1_VALOR: data.concepto,
    CAMPO_2_LABEL: 'Monto pagado',
    CAMPO_2_VALOR: `${data.monto} MXN`,
    CAMPO_3_LABEL: 'Fecha y hora',
    CAMPO_3_VALOR: data.fechaPago,
    ALERT_LABEL: 'Información',
    ALERT_TEXTO:
      'Guarda este correo como comprobante de tu pago. Si tienes alguna duda, acude a las oficinas del municipio.',
    ALERT_MODIFIER: 'success',
    BTN_URL: data.urlRecibo,
    BTN_TEXTO: data.urlRecibo ? 'Descargar recibo' : undefined,
  });
}

// ── Reporte creado ───────────────────────────────────────────
export function emailReporteCreado(data: {
  municipioNombre: string;
  municipioCorreo: string;
  logoUrl: string;
  ciudadanoNombre: string;
  folio: string;
  categoria: string;
  ubicacion: string;
  tokenConsulta: string;
  urlConsultar: string;
}): string {
  return renderEmail({
    MUNICIPIO_NOMBRE: data.municipioNombre,
    MUNICIPIO_CORREO: data.municipioCorreo,
    LOGO_URL: data.logoUrl,
    CIUDADANO_NOMBRE: data.ciudadanoNombre,
    HEADER_TITULO: 'Reporte registrado',
    HEADER_SUBTITULO: '',
    MENSAJE_INTRO:
      'Tu reporte ha sido registrado exitosamente. Puedes dar seguimiento en cualquier momento con tu folio.',
    FOLIO: data.folio,
    CAMPO_1_LABEL: 'Categoría',
    CAMPO_1_VALOR: data.categoria,
    CAMPO_2_LABEL: 'Ubicación',
    CAMPO_2_VALOR: data.ubicacion,
    CAMPO_3_LABEL: 'Token consulta',
    CAMPO_3_VALOR: data.tokenConsulta,
    ALERT_LABEL: 'Estado inicial',
    ALERT_TEXTO:
      'Tu reporte está pendiente de atención. Te notificaremos cuando haya cambios.',
    ALERT_MODIFIER: 'info',
    BTN_URL: data.urlConsultar,
    BTN_TEXTO: 'Ver estado de mi reporte',
  });
}

// ── Actualización de reporte ─────────────────────────────────
export function emailReporteActualizado(data: {
  municipioNombre: string;
  municipioCorreo: string;
  logoUrl: string;
  ciudadanoNombre: string;
  folio: string;
  nuevoEstado: string;
  comentarioPublico: string;
  urlConsultar: string;
}): string {
  const alertModifier =
    data.nuevoEstado === 'Resuelto'
      ? 'success'
      : data.nuevoEstado === 'Cancelado'
        ? 'danger'
        : 'info';

  return renderEmail({
    MUNICIPIO_NOMBRE: data.municipioNombre,
    MUNICIPIO_CORREO: data.municipioCorreo,
    LOGO_URL: data.logoUrl,
    CIUDADANO_NOMBRE: data.ciudadanoNombre,
    HEADER_TITULO: 'Actualización de tu reporte',
    HEADER_SUBTITULO: `Folio: ${data.folio}`,
    MENSAJE_INTRO: 'Tu reporte ha sido actualizado:',
    FOLIO: data.folio,
    CAMPO_1_LABEL: 'Nuevo estado',
    CAMPO_1_VALOR: data.nuevoEstado,
    CAMPO_2_LABEL: 'Comentario',
    CAMPO_2_VALOR: data.comentarioPublico || 'Sin comentarios adicionales.',
    ALERT_LABEL: undefined,
    ALERT_TEXTO: undefined,
    ALERT_MODIFIER: alertModifier,
    BTN_URL: data.urlConsultar,
    BTN_TEXTO: 'Ver mi reporte',
  });
}
