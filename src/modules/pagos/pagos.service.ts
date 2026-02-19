/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Injectable,
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
import { CreatePagoDto, CreateOrdenPagoDto, PagarOrdenDto } from './dto';
import { PaymentStatus } from '@/shared/enums';
import { S3Service } from '@/modules/s3/s3.service';
import Stripe from 'stripe';
import * as PDFDocument from 'pdfkit';
import { randomUUID } from 'crypto';

@Injectable()
export class PagosService {
  private stripe: Stripe;

  constructor(
    @InjectModel(Pago.name)
    private pagoModel: Model<PagoDocument>,
    @InjectModel(OrdenPago.name)
    private ordenPagoModel: Model<OrdenPagoDocument>,
    private s3Service: S3Service,
  ) {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
      apiVersion: '2026-01-28.clover',
    });
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
    const count = await this.pagoModel.countDocuments({
      municipioId: new Types.ObjectId(municipioId),
    });
    const folio = `PAG-${new Date().getFullYear()}-${String(count + 1).padStart(6, '0')}`;

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

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Header
      doc.fontSize(20).text('RECIBO DE PAGO', { align: 'center' }).moveDown();

      doc
        .fontSize(12)
        .text(`Folio: ${pago.folio}`, { align: 'right' })
        .text(
          `Fecha: ${new Date(pago.fechaPago).toLocaleDateString('es-MX')}`,
          {
            align: 'right',
          },
        )
        .moveDown(2);

      // Datos del pago
      doc.fontSize(14).text('Datos del Pago:', { underline: true }).moveDown();

      doc
        .fontSize(12)
        .text(`Concepto: ${pago.concepto}`)
        .text(`Monto: $${pago.monto.toFixed(2)} MXN`)
        .text(`Método de pago: ${pago.metodoPago || 'Tarjeta'}`)
        .text(`Estado: ${pago.estado}`)
        .moveDown();

      if (pago.descripcion) {
        doc.text(`Descripción: ${pago.descripcion}`).moveDown();
      }

      // Datos del predio (si aplica)
      if (pago.predioId) {
        const predio = pago.predioId as any;
        doc
          .fontSize(14)
          .text('Datos del Predio:', { underline: true })
          .moveDown();

        doc
          .fontSize(12)
          .text(`Clave Catastral: ${predio.claveCatastral}`)
          .text(`Ubicación: ${predio.ubicacion}`)
          .moveDown();
      }

      // Footer
      doc
        .moveDown(3)
        .fontSize(10)
        .text('Este documento es un comprobante oficial de pago.', {
          align: 'center',
        })
        .fontSize(8)
        .text(`Stripe Payment Intent: ${pago.stripePaymentIntentId}`, {
          align: 'center',
        });

      doc.end();
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
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + horasValidez);

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
      areaResponsable: createOrdenPagoDto.areaResponsable,
      creadaPorId: new Types.ObjectId(userId),
      expiresAt,
      estado: OrdenPagoStatus.PENDIENTE,
    });

    return ordenPago.save();
  }

  /**
   * 2️⃣ Ciudadano consulta orden (endpoint público)
   */
  async getOrdenPorToken(token: string): Promise<any> {
    const orden = await this.ordenPagoModel
      .findOne({ token })
      .populate('servicioId', 'nombre descripcion costoBase areaResponsable')
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
    return {
      token: orden.token,
      concepto: orden.concepto,
      descripcion: orden.descripcion,
      monto: orden.monto,
      areaResponsable: orden.areaResponsable,
      expiresAt: orden.expiresAt,
      servicio: orden.servicioId,
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
    const count = await this.pagoModel.countDocuments({
      municipioId: orden.municipioId,
    });
    const folio = `PAG-${new Date().getFullYear()}-${String(count + 1).padStart(6, '0')}`;

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

    // Crear el pago con contabilidad completa
    const pago = new this.pagoModel({
      municipioId: orden.municipioId,
      ordenPagoId: orden._id,
      predioId: orden.predioId,
      concepto: orden.concepto,
      descripcion: orden.descripcion,

      // Montos contables
      montoBase, // Precio ventanilla estimado
      montoEnLinea: montoCobrado, // Precio autorizado en línea
      montoCobrado, // Lo que pagó el ciudadano
      stripeFee: Math.round(stripeFee * 100) / 100, // Fee de Stripe
      montoNetoMunicipio: Math.round(montoNetoMunicipio * 100) / 100, // Neto al municipio

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
    const pdfBuffer = await this.generateReciboPDFForPago(pagoGuardado);

    // Obtener clave del municipio (deberías tenerla en el modelo Municipality)
    // Por ahora usar un placeholder - esto debe venir de la BD
    const municipioClave =
      'MUNICIPIO_' + orden.municipioId.toString().substring(0, 8).toUpperCase();

    // Generar S3 key siguiendo convención SAGIM
    const s3Key = this.s3Service.generateKey(
      municipioClave,
      'tesoreria',
      'pagos',
      'recibo',
      pagoGuardado.folio,
      pagoGuardado._id.toString(),
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
    pagoGuardado.municipioClave = municipioClave;
    await pagoGuardado.save();

    // Marcar orden como PAGADA
    orden.estado = OrdenPagoStatus.PAGADA;
    orden.usadaAt = new Date();
    orden.stripePaymentIntentId = pagarOrdenDto.stripePaymentIntentId;
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    orden.pagoId = pagoGuardado._id as Types.ObjectId;
    await orden.save();

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
   * Generar PDF del recibo para un pago específico (sin necesidad de consultar BD)
   */
  private async generateReciboPDFForPago(pago: PagoDocument): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Header
      doc.fontSize(20).text('RECIBO DE PAGO', { align: 'center' }).moveDown();

      doc
        .fontSize(12)
        .text(`Folio: ${pago.folio}`, { align: 'right' })
        .text(
          `Fecha: ${new Date(pago.fechaPago).toLocaleDateString('es-MX')}`,
          {
            align: 'right',
          },
        )
        .moveDown(2);

      // Datos del pago
      doc.fontSize(14).text('Datos del Pago:', { underline: true }).moveDown();

      doc
        .fontSize(12)
        .text(`Concepto: ${pago.descripcion || pago.concepto}`)
        .text(`Monto pagado: $${pago.montoCobrado.toFixed(2)} MXN`)
        .text(
          `Forma de pago: ${pago.metodoPago === 'card' ? 'Tarjeta' : pago.metodoPago}`,
        )
        .moveDown();

      // Footer
      doc
        .moveDown(3)
        .fontSize(10)
        .text('Este documento es un comprobante oficial de pago.', {
          align: 'center',
        })
        .fontSize(8)
        .text(`Folio de pago: ${pago.folio}`, {
          align: 'center',
        })
        .text(`Almacenado de forma segura`, { align: 'center' });

      doc.end();
    });
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
