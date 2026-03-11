/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Pago, PagoDocument } from './schemas/pago.schema';
import {
  OrdenPago,
  OrdenPagoDocument,
  OrdenPagoStatus,
} from './schemas/orden-pago.schema';
import { Predio, PredioDocument } from '../catastro/schemas/predio.schema';
import {
  Ciudadano,
  CiudadanoDocument,
} from '../ciudadanos/schemas/ciudadano.schema';
import { CreatePagoDto, CreateOrdenPagoDto, PagarOrdenDto } from './dto';
import { PaymentStatus } from '@/shared/enums';
import { S3Service } from '@/modules/s3/s3.service';
import {
  Municipality,
  MunicipalityDocument,
} from '@/modules/municipalities/schemas/municipality.schema';
import {
  ServicioCobro,
  ServicioCobroDocument,
} from '@/modules/tesoreria/schemas/servicio-cobro.schema';
import { NotificacionesService } from '../notificaciones/notificaciones.service';
import { PdfService } from '../shared/pdf/pdf.service';
import { TDocumentDefinitions } from 'pdfmake/interfaces';
import Stripe from 'stripe';
import { randomUUID } from 'crypto';
import { fecha } from '@/common/helpers/fecha.helper';
import { Counter, CounterDocument } from '@/modules/dif/schemas/counter.schema';

@Injectable()
export class PagosService {
  private stripe: Stripe;
  private readonly logger = new Logger(PagosService.name);

  constructor(
    @InjectModel(Pago.name)
    private pagoModel: Model<PagoDocument>,
    @InjectModel(OrdenPago.name)
    private ordenPagoModel: Model<OrdenPagoDocument>,
    @InjectModel(Municipality.name)
    private municipalityModel: Model<MunicipalityDocument>,
    @InjectModel(Ciudadano.name)
    private ciudadanoModel: Model<CiudadanoDocument>,
    @InjectModel(ServicioCobro.name)
    private servicioCobroModel: Model<ServicioCobroDocument>,
    @InjectModel(Counter.name)
    private counterModel: Model<CounterDocument>,
    private s3Service: S3Service,
    private readonly notificacionesService: NotificacionesService,
    private readonly pdfService: PdfService,
  ) {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
      apiVersion: '2026-01-28.clover',
    });
  }

  // ==================== FOLIO CONSECUTIVO — CONTADOR ATÓMICO ====================

  private async generarFolioPago(municipioId: string): Promise<string> {
    const date = new Date();
    const yy = date.getFullYear().toString().slice(-2);
    const mm = (date.getMonth() + 1).toString().padStart(2, '0');
    const yymm = `${yy}${mm}`;
    const munShort = municipioId.toString().slice(-4).toUpperCase();
    const counterId = `pag-${munShort}-${yymm}`;

    const counter = await this.counterModel.findOneAndUpdate(
      { _id: counterId },
      { $inc: { seq: 1 } },
      { upsert: true, new: true },
    );

    return `PAG-${yymm}-${counter.seq.toString().padStart(4, '0')}`;
  }

  // ==================== PAGOS ====================
  async createPago(
    createPagoDto: CreatePagoDto,
    municipioId: string,
  ): Promise<Pago> {
    // Validar el payment intent con Stripe
    let paymentIntent: Stripe.PaymentIntent;
    try {
      paymentIntent = await this.stripe.paymentIntents.retrieve(
        createPagoDto.stripePaymentIntentId,
      );

      if (paymentIntent.status !== 'succeeded') {
        throw new BadRequestException(
          'El pago no ha sido completado en Stripe',
        );
      }
    } catch (error) {
      throw new BadRequestException(
        'Error al validar el pago con Stripe: ' + (error as Error).message,
      );
    }

    // Generar folio
    const folio = await this.generarFolioPago(municipioId);

    const pago = new this.pagoModel({
      ...createPagoDto,
      municipioId: new Types.ObjectId(municipioId),
      predioId: createPagoDto.predioId
        ? new Types.ObjectId(createPagoDto.predioId)
        : undefined,
      ciudadanoId: createPagoDto.ciudadanoId
        ? new Types.ObjectId(createPagoDto.ciudadanoId)
        : undefined,
      estado: PaymentStatus.PAGADO,
      fechaPago: new Date(),
      stripeChargeId: paymentIntent.latest_charge as string,
      metodoPago: paymentIntent.payment_method_types[0],
      folio,
    });

    return pago.save();
  }

  async findPagos(
    scope: any,
    filters: { predioId?: string; concepto?: string },
  ): Promise<Pago[]> {
    const query: any = { ...scope };

    if (filters.predioId) {
      query.predioId = new Types.ObjectId(filters.predioId);
    }

    if (filters.concepto) {
      query.concepto = filters.concepto;
    }

    return this.pagoModel
      .find(query)
      .populate('predioId', 'claveCatastral ubicacion')
      .populate('ciudadanoId', 'nombre apellidoPaterno apellidoMaterno curp')
      .sort({ fechaPago: -1 })
      .exec();
  }

  async findPagoById(id: string, scope: any): Promise<Pago> {
    const pago = await this.pagoModel
      .findOne({
        _id: new Types.ObjectId(id),
        ...scope,
      })
      .populate('predioId')
      .populate(
        'ciudadanoId',
        'nombre apellidoPaterno apellidoMaterno curp telefono email',
      )
      .exec();

    if (!pago) {
      throw new NotFoundException(`Pago con ID ${id} no encontrado`);
    }

    return pago;
  }

  // ==================== RECIBO PDF ====================
  async generateReciboPDF(id: string, scope: any): Promise<Buffer> {
    const pago = await this.findPagoById(id, scope);

    const TZ = 'America/Mexico_City';
    const fecha = new Date(pago.fechaPago);
    const fechaStr = fecha.toLocaleDateString('es-MX', {
      timeZone: TZ,
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
    const horaStr = fecha.toLocaleTimeString('es-MX', {
      timeZone: TZ,
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    const LINE_WIDTH = 214;
    const sep = (): any => ({
      canvas: [
        { type: 'line', x1: 0, y1: 0, x2: LINE_WIDTH, y2: 0, lineWidth: 0.5 },
      ],
      margin: [0, 4, 0, 4],
    });
    const row = (label: string, value: string, boldValue = false): any => ({
      columns: [
        { text: label, width: '45%', fontSize: 8, color: '#555' },
        {
          text: value,
          width: '55%',
          fontSize: 8,
          bold: boldValue,
          alignment: 'right',
        },
      ],
      margin: [0, 2, 0, 2],
    });

    const pct = (pago as any).porcentajeContribucion ?? 10;
    const montoCobrado = (pago as any).montoCobrado ?? pago.monto;
    const subtotal = (pago as any).subtotal ?? montoCobrado;
    const contribucion = (pago as any).contribucion ?? 0;

    const content: any[] = [
      {
        text: 'RECIBO DE PAGO',
        fontSize: 10,
        bold: true,
        alignment: 'center',
        margin: [0, 0, 0, 4],
      },
      sep(),
      row('Folio:', pago.folio, true),
      row('Fecha:', fechaStr),
      row('Hora:', horaStr),
      sep(),
      row('Concepto:', pago.descripcion || (pago.concepto as string)),
      row(
        'Método:',
        pago.metodoPago === 'card' ? 'Tarjeta' : (pago.metodoPago ?? 'Tarjeta'),
      ),
      sep(),
      row('Subtotal:', `$${subtotal.toFixed(2)}`),
      row(`Contribución (${pct}%):`, `$${contribucion.toFixed(2)}`),
      sep(),
      {
        columns: [
          { text: 'TOTAL:', width: '45%', fontSize: 11, bold: true },
          {
            text: `$${montoCobrado.toFixed(2)}`,
            width: '55%',
            fontSize: 11,
            bold: true,
            alignment: 'right',
          },
        ],
        margin: [0, 2, 0, 4],
      },
      sep(),
      {
        text: 'Documento generado por SAGIM.',
        fontSize: 6.5,
        color: '#666',
        alignment: 'center',
        margin: [0, 6, 0, 1],
      },
      {
        text: 'Este recibo es comprobante oficial de pago',
        fontSize: 6.5,
        color: '#666',
        alignment: 'center',
      },
    ];

    return this.pdfService.generatePdfBuffer({
      pageSize: { width: 250, height: 340 } as any,
      pageMargins: [18, 14, 18, 14],
      content,
    });
  }

  // ==================== ÓRDENES DE PAGO (PAGO ASISTIDO) ====================

  /**
   * 1️⃣ Operador municipal genera orden de pago con token único
   */
  async generarOrdenPago(
    createOrdenPagoDto: CreateOrdenPagoDto,
    municipioId: string,
    userId: string,
  ): Promise<OrdenPago> {
    // Generar token único
    const token = randomUUID();

    // Calcular fecha de expiración (default 48 horas)
    const horasValidez = createOrdenPagoDto.horasValidez || 48;
    const expiresAt = fecha.agregarHoras(
      fecha.ahoraEnMexico().toDate(),
      horasValidez,
    );

    // Si tiene servicioId, usar categoria del servicio como areaResponsable canónica
    let areaResponsable = createOrdenPagoDto.areaResponsable;
    if (createOrdenPagoDto.servicioId) {
      const servicio = await this.servicioCobroModel
        .findById(createOrdenPagoDto.servicioId, 'categoria areaResponsable')
        .lean();
      if (servicio && (servicio as any).areaResponsable) {
        areaResponsable = (servicio as any).areaResponsable;
      } else if (servicio && (servicio as any).categoria) {
        // fallback para servicios sin areaResponsable (antes del seed)
        areaResponsable = (servicio as any).categoria;
      }
    }

    const ordenPago = new this.ordenPagoModel({
      token,
      municipioId: new Types.ObjectId(municipioId),
      servicioId: createOrdenPagoDto.servicioId
        ? new Types.ObjectId(createOrdenPagoDto.servicioId)
        : undefined,
      ciudadanoId: createOrdenPagoDto.ciudadanoId
        ? new Types.ObjectId(createOrdenPagoDto.ciudadanoId)
        : undefined,
      monto: createOrdenPagoDto.monto,
      descripcion: createOrdenPagoDto.descripcion,
      areaResponsable,
      creadaPorId: new Types.ObjectId(userId),
      expiresAt,
      estado: OrdenPagoStatus.PENDIENTE,
      nombreContribuyente: createOrdenPagoDto.nombreContribuyente,
      folioDocumento: createOrdenPagoDto.folioDocumento,
      metadata: { emailCiudadano: createOrdenPagoDto.emailCiudadano },
    });

    const orden = await ordenPago.save();

    // Resolver email y nombre para notificación
    let emailDestino = createOrdenPagoDto.emailCiudadano;
    let nombreCiudadano = 'Ciudadano';

    if (createOrdenPagoDto.ciudadanoId) {
      const ciudadano = await this.ciudadanoModel
        .findById(
          createOrdenPagoDto.ciudadanoId,
          'nombre apellidoPaterno email',
        )
        .lean();
      if (ciudadano) {
        nombreCiudadano = [
          (ciudadano as any).nombre,
          (ciudadano as any).apellidoPaterno,
        ]
          .filter(Boolean)
          .join(' ');
        if (!emailDestino && (ciudadano as any).email) {
          emailDestino = (ciudadano as any).email;
        }
      }
    }

    if (emailDestino) {
      const baseUrl = process.env.FRONTEND_URL || 'https://pagos.sagim.mx';
      const municipio = await this.municipalityModel
        .findById(municipioId, 'nombre')
        .lean();
      void this.notificacionesService.enviarLinkPago({
        email: emailDestino,
        nombreCiudadano,
        municipioNombre: (municipio as any)?.nombre ?? 'Municipio',
        descripcion: createOrdenPagoDto.descripcion,
        monto: createOrdenPagoDto.monto,
        urlPago: `${baseUrl}/pago/${orden.token}`,
        expiraEn: expiresAt,
      });
    }

    return orden;
  }

  /**
   * 2️⃣ Ciudadano consulta orden (endpoint público)
   */
  async getOrdenPorToken(token: string): Promise<any> {
    const orden = await this.ordenPagoModel
      .findOne({ token })
      .populate('servicioId', 'nombre descripcion costoBase areaResponsable')
      .populate('municipioId', 'nombre logoUrl')
      .exec();

    if (!orden) {
      throw new NotFoundException('Orden de pago no encontrada');
    }

    // Validar si está activa
    const ahora = new Date();
    if (orden.estado === OrdenPagoStatus.EXPIRADA || ahora > orden.expiresAt) {
      await this.ordenPagoModel.updateOne(
        { _id: orden._id },
        { estado: OrdenPagoStatus.EXPIRADA },
      );
      throw new BadRequestException('La orden de pago ha expirado');
    }

    if (orden.estado === OrdenPagoStatus.PAGADA) {
      throw new BadRequestException('Esta orden ya fue utilizada');
    }

    if (orden.estado === OrdenPagoStatus.CANCELADA) {
      throw new BadRequestException('Esta orden fue cancelada');
    }

    // Retornar solo datos necesarios (sin IDs internos)
    const municipio = orden.municipioId as any;
    return {
      token: orden.token,
      concepto: orden.concepto,
      descripcion: orden.descripcion,
      monto: orden.monto,
      areaResponsable: orden.areaResponsable,
      expiresAt: orden.expiresAt,
      servicio: orden.servicioId,
      municipio: {
        nombre: municipio?.nombre ?? null,
        logoUrl: municipio?.logoUrl ?? null,
      },
    };
  }

  /**
   * 2.5️⃣ Crear PaymentIntent en Stripe (endpoint público)
   * El frontend usa el clientSecret para confirmar el pago con el Card Element.
   */
  async crearPaymentIntent(
    token: string,
  ): Promise<{ clientSecret: string; monto: number }> {
    const orden = await this.ordenPagoModel.findOne({ token }).exec();

    if (!orden) {
      throw new NotFoundException('Orden de pago no encontrada');
    }

    await this.validarOrdenActiva(orden);

    const paymentIntent = await this.stripe.paymentIntents.create({
      amount: Math.round(orden.monto * 100), // centavos
      currency: 'mxn',
      metadata: {
        ordenToken: token,
        municipioId: orden.municipioId.toString(),
      },
    });

    return {
      clientSecret: paymentIntent.client_secret!,
      monto: orden.monto,
    };
  }

  /**
   * 3️⃣ Ciudadano paga (endpoint público)
   */
  async pagarOrden(token: string, pagarOrdenDto: PagarOrdenDto): Promise<any> {
    // Obtener orden
    const orden = await this.ordenPagoModel
      .findOne({ token })
      .populate('predioId')
      .exec();

    if (!orden) {
      throw new NotFoundException('Orden de pago no encontrada');
    }

    // Validar que esté activa
    await this.validarOrdenActiva(orden);

    // 🔒 VALIDAR QUE LA ORDEN NO HAYA SIDO PAGADA ANTES
    const pagoPrevio = await this.pagoModel.findOne({
      ordenPagoId: orden._id,
      estado: PaymentStatus.PAGADO,
    });

    if (pagoPrevio) {
      throw new BadRequestException(
        `Esta orden ya fue pagada anteriormente (Folio: ${pagoPrevio.folio})`,
      );
    }

    // Validar el payment intent con Stripe
    let paymentIntent: Stripe.PaymentIntent;
    let balanceTransaction: Stripe.BalanceTransaction;
    try {
      paymentIntent = await this.stripe.paymentIntents.retrieve(
        pagarOrdenDto.stripePaymentIntentId,
      );

      if (paymentIntent.status !== 'succeeded') {
        throw new BadRequestException(
          'El pago no ha sido completado en Stripe',
        );
      }

      // Validar que el monto coincida (Stripe usa centavos)
      const montoStripe = paymentIntent.amount / 100;
      if (Math.abs(montoStripe - orden.monto) > 0.01) {
        throw new BadRequestException(
          `El monto del pago (${montoStripe}) no coincide con la orden (${orden.monto})`,
        );
      }

      // Obtener balance transaction para calcular fees reales
      if (paymentIntent.latest_charge) {
        const charge = await this.stripe.charges.retrieve(
          paymentIntent.latest_charge as string,
        );
        if (charge.balance_transaction) {
          balanceTransaction = await this.stripe.balanceTransactions.retrieve(
            charge.balance_transaction as string,
          );
        }
      }
    } catch (error) {
      throw new BadRequestException(
        'Error al validar el pago con Stripe: ' + (error as Error).message,
      );
    }

    // 🔒 VALIDAR QUE EL PAYMENT INTENT NO HAYA SIDO USADO ANTES
    const pagoConMismoPI = await this.pagoModel.findOne({
      stripePaymentIntentId: pagarOrdenDto.stripePaymentIntentId,
    });

    if (pagoConMismoPI) {
      throw new BadRequestException(
        `Este PaymentIntent de Stripe ya fue utilizado anteriormente (Folio: ${pagoConMismoPI.folio})`,
      );
    }

    // Generar folio para el pago
    const folio = await this.generarFolioPago(orden.municipioId.toString());
    // ==================== CALCULAR MONTOS (CONTABILIDAD) ====================
    // El precio en línea YA incluye el fee de Stripe
    const montoCobrado = orden.monto; // Lo que pagó el ciudadano (precio en línea)
    const stripeFee = balanceTransaction
      ? balanceTransaction.fee / 100 // Fee real de Stripe en MXN
      : montoCobrado * 0.036 + 3; // Estimación: 3.6% + $3 MXN
    const montoNetoMunicipio = montoCobrado - stripeFee;

    // Calcular precio base (ventanilla) - restando un margen promedio del 8%
    // Esto es para referencia contable. Idealmente debería venir del catálogo de servicios.
    const montoBase = Math.round((montoCobrado / 1.08) * 100) / 100;

    // Desglose fiscal de contribución configurada por el municipio
    const municipioDoc = await this.municipalityModel
      .findById(orden.municipioId, 'nombre porcentajeContribucion')
      .lean();
    const pct = (municipioDoc as any)?.porcentajeContribucion ?? 10;
    const subtotal = Number((montoCobrado / (1 + pct / 100)).toFixed(2));
    const contribucion = Number((montoCobrado - subtotal).toFixed(2));

    // Snapshot de nombre/categoria/areaResponsable del servicio
    let servicioNombre: string | undefined;
    let servicioCategoria: string | undefined;
    let servicioAreaResponsable: string | undefined;
    let servicioId: Types.ObjectId | undefined;
    if (orden.servicioId) {
      const servicio = await this.servicioCobroModel
        .findById(orden.servicioId, 'nombre categoria areaResponsable')
        .lean();
      if (servicio) {
        servicioNombre = (servicio as any).nombre;
        servicioCategoria = (servicio as any).categoria;
        servicioAreaResponsable = (servicio as any).areaResponsable;
        servicioId = orden.servicioId as Types.ObjectId;
      }
    }

    // Crear el pago con contabilidad completa
    const pago = new this.pagoModel({
      municipioId: orden.municipioId,
      ordenPagoId: orden._id,
      predioId: orden.predioId,
      concepto: orden.concepto,
      descripcion: orden.descripcion,

      // Snapshot de servicio
      servicioId,
      servicioNombre,
      servicioCategoria,
      areaResponsable: servicioAreaResponsable,

      // Montos contables
      montoBase, // Precio ventanilla estimado
      montoEnLinea: montoCobrado, // Precio autorizado en línea
      montoCobrado, // Lo que pagó el ciudadano
      stripeFee: Math.round(stripeFee * 100) / 100, // Fee de Stripe
      montoNetoMunicipio: Math.round(montoNetoMunicipio * 100) / 100, // Neto al municipio

      // Desglose fiscal de contribución
      subtotal,
      contribucion,
      porcentajeContribucion: pct,

      // Reglas
      feePagadoPor: 'CIUDADANO',
      esquemaPrecio: 'PRECIO_EN_LINEA',

      // Legacy (mantener compatibilidad)
      monto: montoCobrado,

      // Stripe
      stripePaymentIntentId: pagarOrdenDto.stripePaymentIntentId,
      stripeChargeId: paymentIntent.latest_charge as string,
      stripeBalanceTxnId: balanceTransaction?.id,
      metodoPago: paymentIntent.payment_method_types[0],
      pasarela: 'STRIPE',

      // Metadata
      moneda: 'MXN',
      anioFiscal: new Date().getFullYear(),

      // Estado
      estado: PaymentStatus.PAGADO,
      fechaPago: new Date(),
      folio,
    });

    const pagoGuardado = await pago.save();

    // 🔒 MARCAR ORDEN COMO PAGADA (evita re-pagos)
    orden.estado = OrdenPagoStatus.PAGADA;
    await orden.save();

    // Generar PDF del recibo
    const pdfBuffer = await this.generateReciboPDFForPago(pagoGuardado, orden);

    // Generar S3 key: municipios/{municipioId}/ordenes-pago/recibos/{folio}.pdf
    const s3Key = S3Service.keyReciboOrden(
      orden.municipioId.toString(),
      pagoGuardado.folio,
    );

    // Subir PDF a S3
    await this.s3Service.uploadPDF(s3Key, pdfBuffer, {
      folio: pagoGuardado.folio,
      pagoId: pagoGuardado._id.toString(),
      municipioId: orden.municipioId.toString(),
      fecha: pagoGuardado.fechaPago.toISOString(),
    });

    // Actualizar pago con S3 key
    pagoGuardado.s3Key = s3Key;
    await pagoGuardado.save();

    // Marcar orden como PAGADA
    orden.estado = OrdenPagoStatus.PAGADA;
    orden.usadaAt = new Date();
    orden.stripePaymentIntentId = pagarOrdenDto.stripePaymentIntentId;
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    orden.pagoId = pagoGuardado._id as Types.ObjectId;
    await orden.save();

    // Enviar email de confirmación (fire-and-forget — el pago ya está confirmado si falla)
    const emailConfirmacion = (orden as any).metadata?.emailCiudadano as
      | string
      | undefined;
    if (emailConfirmacion) {
      void this.s3Service
        .getSignedUrl(s3Key, 3600)
        .then((reciboUrl) =>
          this.notificacionesService.enviarConfirmacionPago({
            email: emailConfirmacion,
            nombreCiudadano: (orden as any).nombreContribuyente ?? 'Ciudadano',
            municipioNombre: (municipioDoc as any)?.nombre ?? 'Municipio',
            descripcion: orden.descripcion,
            folio: pagoGuardado.folio,
            monto: pagoGuardado.monto,
            fechaPago: pagoGuardado.fechaPago,
            reciboUrl,
          }),
        )
        .catch((err: Error) =>
          this.logger.warn(
            `Confirmación no enviada para ${pagoGuardado.folio}: ${err.message}`,
          ),
        );
    }

    return {
      success: true,
      message: 'Pago registrado exitosamente',
      folio: pagoGuardado.folio,
      pagoId: pagoGuardado._id,
      monto: pagoGuardado.monto,
      fechaPago: pagoGuardado.fechaPago,
    };
  }

  /**
   * Validar que una orden esté activa
   */
  private async validarOrdenActiva(orden: OrdenPagoDocument): Promise<void> {
    const ahora = new Date();

    if (orden.estado === OrdenPagoStatus.EXPIRADA || ahora > orden.expiresAt) {
      await this.ordenPagoModel.updateOne(
        { _id: orden._id },
        { estado: OrdenPagoStatus.EXPIRADA },
      );
      throw new BadRequestException('La orden de pago ha expirado');
    }

    if (orden.estado === OrdenPagoStatus.PAGADA) {
      throw new BadRequestException('Esta orden ya fue utilizada');
    }

    if (orden.estado === OrdenPagoStatus.CANCELADA) {
      throw new BadRequestException('Esta orden fue cancelada');
    }
  }

  /**
   * Generar PDF del recibo en formato ticket — igual al recibo de caja, sin firma.
   */
  private async generateReciboPDFForPago(
    pago: PagoDocument,
    orden: OrdenPagoDocument,
  ): Promise<Buffer> {
    // Obtener municipio para nombre y logo
    const municipio = await this.municipalityModel
      .findById(orden.municipioId, 'nombre logoUrl')
      .lean();
    const municipioNombre = (municipio as any)?.nombre ?? 'Municipio';
    const logoBase64 = (municipio as any)?.logoUrl
      ? await this.pdfService
          .fetchImageAsBase64((municipio as any).logoUrl as string)
          .catch(() => undefined)
      : undefined;

    const TZ = 'America/Mexico_City';
    const fechaStr = pago.fechaPago.toLocaleDateString('es-MX', {
      timeZone: TZ,
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
    const horaStr = pago.fechaPago.toLocaleTimeString('es-MX', {
      timeZone: TZ,
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    const LINE_WIDTH = 214;
    const sep = (): any => ({
      canvas: [
        { type: 'line', x1: 0, y1: 0, x2: LINE_WIDTH, y2: 0, lineWidth: 0.5 },
      ],
      margin: [0, 4, 0, 4],
    });
    const thinSep = (): any => ({
      canvas: [
        {
          type: 'line',
          x1: 0,
          y1: 0,
          x2: LINE_WIDTH,
          y2: 0,
          lineWidth: 0.3,
          dash: { length: 2 },
        },
      ],
      margin: [0, 3, 0, 3],
    });
    const row = (label: string, value: string, boldValue = false): any => ({
      columns: [
        { text: label, width: '45%', fontSize: 8, color: '#555' },
        {
          text: value,
          width: '55%',
          fontSize: 8,
          bold: boldValue,
          alignment: 'right',
        },
      ],
      margin: [0, 2, 0, 2],
    });

    const content: any[] = [];

    if (logoBase64) {
      content.push({
        image: logoBase64,
        width: 44,
        alignment: 'center',
        margin: [0, 0, 0, 4],
      });
    }
    content.push({
      text: municipioNombre.toUpperCase(),
      fontSize: 10,
      bold: true,
      alignment: 'center',
      margin: [0, 0, 0, 2],
    });
    content.push(sep());
    content.push({
      text: 'RECIBO DE PAGO EN LÍNEA',
      fontSize: 9,
      alignment: 'center',
      margin: [0, 0, 0, 4],
    });
    content.push(sep());

    content.push(row('Folio:', pago.folio, true));
    content.push(row('Fecha:', fechaStr));
    content.push(row('Hora:', horaStr));
    content.push(sep());

    content.push(
      row('Concepto:', pago.descripcion || (pago.concepto as string)),
    );
    content.push(thinSep());

    content.push(row('Canal:', 'Pago en línea'));
    content.push(row('Método:', 'Tarjeta'));
    content.push(thinSep());

    const pct = pago.porcentajeContribucion ?? 10;
    content.push(
      row('Subtotal:', `$${(pago.subtotal ?? pago.montoCobrado).toFixed(2)}`),
    );
    content.push(
      row(`Contribución (${pct}%):`, `$${(pago.contribucion ?? 0).toFixed(2)}`),
    );
    content.push(sep());
    content.push({
      columns: [
        { text: 'TOTAL:', width: '45%', fontSize: 11, bold: true },
        {
          text: `$${pago.montoCobrado.toFixed(2)}`,
          width: '55%',
          fontSize: 11,
          bold: true,
          alignment: 'right',
        },
      ],
      margin: [0, 2, 0, 4],
    });

    content.push(sep());
    content.push({
      text: 'Documento generado por SAGIM.',
      fontSize: 6.5,
      color: '#666',
      alignment: 'center',
      margin: [0, 6, 0, 1],
    });
    content.push({
      text: 'Este recibo es comprobante oficial de pago',
      fontSize: 6.5,
      color: '#666',
      alignment: 'center',
    });

    const docDef: TDocumentDefinitions = {
      pageSize: { width: 250, height: 370 } as any,
      pageMargins: [18, 14, 18, 14],
      content,
    };

    return this.pdfService.generatePdfBuffer(docDef);
  }

  /**
   * Obtener URL firmada para descargar recibo (60 segundos de validez)
   */
  async getReciboSignedUrl(id: string, scope: any): Promise<string> {
    const pago = await this.pagoModel.findOne({
      _id: new Types.ObjectId(id),
      ...scope,
    });

    if (!pago) {
      throw new NotFoundException(`Pago con ID ${id} no encontrado`);
    }

    if (!pago.s3Key) {
      throw new NotFoundException('Este pago no tiene recibo en S3');
    }

    // Generar URL firmada temporal (60 segundos)
    return this.s3Service.getSignedUrl(pago.s3Key, 60);
  }
}
