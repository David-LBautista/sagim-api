import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import {
  emailOrdenPago,
  emailPagoConfirmado,
} from '../../common/helpers/email.helper';

export interface EnviarLinkPagoParams {
  email: string;
  nombreCiudadano: string;
  municipioNombre: string;
  municipioLogoUrl?: string;
  descripcion: string;
  monto: number;
  urlPago: string;
  expiraEn: Date;
}

export interface EnviarConfirmacionPagoParams {
  email: string;
  nombreCiudadano: string;
  municipioNombre: string;
  municipioLogoUrl?: string;
  descripcion: string;
  folio: string;
  monto: number;
  fechaPago: Date;
  reciboUrl?: string;
}

@Injectable()
export class NotificacionesService {
  private readonly resend: Resend;
  private readonly logger = new Logger(NotificacionesService.name);
  private readonly emailFrom: string;

  constructor(private readonly configService: ConfigService) {
    this.resend = new Resend(configService.get<string>('RESEND_API_KEY'));
    this.emailFrom =
      configService.get<string>('EMAIL_FROM') ?? 'pagos@sagim.mx';
  }

  /**
   * Enviar link de pago al ciudadano.
   * Fire-and-forget seguro: los errores se loguean pero no rompen el flujo principal.
   */
  async enviarLinkPago(params: EnviarLinkPagoParams): Promise<void> {
    try {
      const expiraStr = params.expiraEn.toLocaleString('es-MX', {
        timeZone: 'America/Mexico_City',
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
      const html = emailOrdenPago({
        municipioNombre: params.municipioNombre,
        municipioCorreo: this.emailFrom,
        logoUrl: params.municipioLogoUrl ?? '',
        ciudadanoNombre: params.nombreCiudadano,
        folio: '',
        concepto: params.descripcion,
        monto: `$${params.monto.toFixed(2)}`,
        fechaVencimiento: expiraStr,
        urlPagar: params.urlPago,
      });
      await this.resend.emails.send({
        from: `${params.municipioNombre} <${this.emailFrom}>`,
        to: params.email,
        subject: `Orden de pago — ${params.descripcion}`,
        html,
      });
      this.logger.log(
        `Email de pago enviado a ${params.email} — ${params.descripcion}`,
      );
    } catch (error) {
      this.logger.error(
        `Error enviando email a ${params.email}: ${error?.message}`,
        error?.stack,
      );
    }
  }

  /**
   * Enviar confirmación de pago al ciudadano.
   * Fire-and-forget seguro: los errores se loguean pero no revierten el pago.
   */
  async enviarConfirmacionPago(
    params: EnviarConfirmacionPagoParams,
  ): Promise<void> {
    try {
      const TZ = 'America/Mexico_City';
      const fechaStr = params.fechaPago.toLocaleDateString('es-MX', {
        timeZone: TZ,
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      });
      const horaStr = params.fechaPago.toLocaleTimeString('es-MX', {
        timeZone: TZ,
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
      const html = emailPagoConfirmado({
        municipioNombre: params.municipioNombre,
        municipioCorreo: this.emailFrom,
        logoUrl: params.municipioLogoUrl ?? '',
        ciudadanoNombre: params.nombreCiudadano,
        folio: params.folio,
        concepto: params.descripcion,
        monto: `$${params.monto.toFixed(2)}`,
        fechaPago: `${fechaStr} — ${horaStr}`,
        urlRecibo: params.reciboUrl,
      });
      await this.resend.emails.send({
        from: `${params.municipioNombre} <${this.emailFrom}>`,
        to: params.email,
        subject: `Confirmación de pago — ${params.folio}`,
        html,
      });
      this.logger.log(
        `Email de confirmación enviado a ${params.email} — ${params.folio}`,
      );
    } catch (error) {
      this.logger.error(
        `Error enviando confirmación a ${params.email}: ${(error as Error)?.message}`,
        (error as Error)?.stack,
      );
    }
  }

  // DEPRECATED — mantener por compatibilidad hasta refactor completo
  private templateConfirmacionPago(
    params: EnviarConfirmacionPagoParams,
  ): string {
    const TZ = 'America/Mexico_City';
    const fechaStr = params.fechaPago.toLocaleDateString('es-MX', {
      timeZone: TZ,
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
    const horaStr = params.fechaPago.toLocaleTimeString('es-MX', {
      timeZone: TZ,
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
    const reciboBtn = params.reciboUrl
      ? `
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;">
          <tr>
            <td align="center">
              <a href="${params.reciboUrl}"
                 style="display:inline-block;background:#1a237e;color:#ffffff;text-decoration:none;padding:12px 32px;border-radius:6px;font-size:14px;font-weight:bold;">
                Descargar recibo
              </a>
            </td>
          </tr>
        </table>`
      : '';

    return `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:32px 0;">
    <tr>
      <td>
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
          <tr>
            <td style="background:#1b5e20;padding:24px 32px;">
              <p style="margin:0;color:#ffffff;font-size:18px;font-weight:bold;">Pago confirmado &#10003;</p>
              <p style="margin:4px 0 0;color:#a5d6a7;font-size:12px;">Municipio de ${params.municipioNombre} — SAGIM</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 16px;color:#212121;font-size:15px;">
                Hola <strong>${params.nombreCiudadano}</strong>,
              </p>
              <p style="margin:0 0 24px;color:#424242;font-size:14px;line-height:1.6;">
                Tu pago ha sido procesado exitosamente. A continuación el resumen:
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;border-radius:6px;margin-bottom:8px;">
                <tr><td style="padding:16px 20px;">
                  <p style="margin:0 0 4px;color:#757575;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;">Folio</p>
                  <p style="margin:0 0 14px;color:#212121;font-size:15px;font-weight:bold;">${params.folio}</p>

                  <p style="margin:0 0 4px;color:#757575;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;">Concepto</p>
                  <p style="margin:0 0 14px;color:#212121;font-size:14px;">${params.descripcion}</p>

                  <p style="margin:0 0 4px;color:#757575;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;">Monto pagado</p>
                  <p style="margin:0 0 14px;color:#1b5e20;font-size:22px;font-weight:bold;">$${params.monto.toFixed(2)} <span style="font-size:12px;font-weight:normal;color:#757575;">MXN</span></p>

                  <p style="margin:0 0 4px;color:#757575;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;">Fecha y hora</p>
                  <p style="margin:0;color:#424242;font-size:13px;">${fechaStr} &mdash; ${horaStr}</p>
                </td></tr>
              </table>
              ${reciboBtn}
              <p style="margin:24px 0 0;color:#9e9e9e;font-size:11px;text-align:center;line-height:1.5;">
                Guarda este correo como comprobante de tu pago.<br>
                Si tienes alguna duda, acude a las oficinas del municipio.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background:#fafafa;padding:16px 32px;border-top:1px solid #eeeeee;">
              <p style="margin:0;color:#bdbdbd;font-size:11px;text-align:center;">
                Generado por SAGIM — Sistema de Atención y Gestión Integral Municipal
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();
  }

  private templateLinkPago(params: EnviarLinkPagoParams): string {
    const expiraStr = params.expiraEn.toLocaleString('es-MX', {
      timeZone: 'America/Mexico_City',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

    return `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:32px 0;">
    <tr>
      <td>
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background:#1a237e;padding:24px 32px;">
              <p style="margin:0;color:#ffffff;font-size:18px;font-weight:bold;">
                Municipio de ${params.municipioNombre}
              </p>
              <p style="margin:4px 0 0;color:#9fa8da;font-size:12px;">
                Sistema de Pagos Municipales — SAGIM
              </p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 16px;color:#212121;font-size:15px;">
                Hola <strong>${params.nombreCiudadano}</strong>,
              </p>
              <p style="margin:0 0 24px;color:#424242;font-size:14px;line-height:1.6;">
                Se ha generado una orden de pago a tu nombre. Puedes realizar tu pago de forma segura haciendo clic en el botón de abajo.
              </p>

              <!-- Detalle -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;border-radius:6px;margin-bottom:24px;">
                <tr>
                  <td style="padding:16px 20px;">
                    <p style="margin:0 0 8px;color:#757575;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Concepto</p>
                    <p style="margin:0 0 16px;color:#212121;font-size:14px;font-weight:bold;">${params.descripcion}</p>

                    <p style="margin:0 0 8px;color:#757575;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Monto a pagar</p>
                    <p style="margin:0 0 16px;color:#1a237e;font-size:24px;font-weight:bold;">$${params.monto.toFixed(2)} <span style="font-size:13px;font-weight:normal;color:#757575;">MXN</span></p>

                    <p style="margin:0 0 4px;color:#757575;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Vence el</p>
                    <p style="margin:0;color:#d32f2f;font-size:13px;">${expiraStr}</p>
                  </td>
                </tr>
              </table>

              <!-- CTA -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${params.urlPago}"
                       style="display:inline-block;background:#1a237e;color:#ffffff;text-decoration:none;padding:14px 36px;border-radius:6px;font-size:15px;font-weight:bold;letter-spacing:0.3px;">
                      Pagar ahora
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:24px 0 0;color:#9e9e9e;font-size:11px;text-align:center;line-height:1.5;">
                Este enlace es de uso único y expira en la fecha indicada.<br>
                Si no solicitaste este pago, ignora este mensaje.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#fafafa;padding:16px 32px;border-top:1px solid #eeeeee;">
              <p style="margin:0;color:#bdbdbd;font-size:11px;text-align:center;">
                Generado por SAGIM — Sistema de Atención y Gestión Integral Municipal
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();
  }
}
