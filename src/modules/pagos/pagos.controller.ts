/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Res,
  Header,
  Req,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { PagosService } from './pagos.service';
import { CreatePagoDto, CreateOrdenPagoDto, PagarOrdenDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards';
import {
  Roles,
  MunicipalityId,
  Public,
  TenantScope,
} from '@/common/decorators';
import { UserRole, PaymentConcept } from '@/shared/enums';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiProduces,
} from '@nestjs/swagger';

@ApiTags('Pagos')
@ApiBearerAuth()
@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class PagosController {
  constructor(private readonly pagosService: PagosService) {}

  // ==================== PAGOS ====================
  @Post('pagos')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_MUNICIPIO, UserRole.OPERATIVO)
  @ApiOperation({ summary: 'Registrar un pago con Stripe' })
  createPago(
    @Body() createPagoDto: CreatePagoDto,
    @MunicipalityId() municipioId: string,
  ) {
    return this.pagosService.createPago(createPagoDto, municipioId);
  }

  @Get('pagos')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_MUNICIPIO, UserRole.OPERATIVO)
  @ApiOperation({ summary: 'Listar pagos con filtros' })
  @ApiQuery({ name: 'predioId', required: false })
  @ApiQuery({ name: 'concepto', required: false, enum: PaymentConcept })
  findPagos(
    @TenantScope() scope: any,
    @Query('predioId') predioId?: string,
    @Query('concepto') concepto?: string,
  ) {
    return this.pagosService.findPagos(scope, { predioId, concepto });
  }

  @Get('pagos/:id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_MUNICIPIO, UserRole.OPERATIVO)
  @ApiOperation({ summary: 'Obtener un pago por ID' })
  findPagoById(@Param('id') id: string, @TenantScope() scope: any) {
    return this.pagosService.findPagoById(id, scope);
  }

  @Get('pagos/:id/recibo')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_MUNICIPIO, UserRole.OPERATIVO)
  @ApiOperation({
    summary: 'Obtener URL firmada para descargar recibo PDF desde S3',
  })
  async getRecibo(@Param('id') id: string, @TenantScope() scope: any) {
    const signedUrl = await this.pagosService.getReciboSignedUrl(id, scope);

    return {
      url: signedUrl,
      expiresIn: 60, // segundos
      message:
        'URL válida por 60 segundos. Descargue el archivo inmediatamente.',
    };
  }

  @Get('pagos/:id/recibo-pdf')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_MUNICIPIO, UserRole.OPERATIVO)
  @ApiOperation({
    summary:
      '[LEGACY] Generar recibo de pago en PDF (usar /recibo en su lugar)',
  })
  @ApiProduces('application/pdf')
  @Header('Content-Type', 'application/pdf')
  async getReciboPDF(
    @Param('id') id: string,
    @TenantScope() scope: any,
    @Res() res: Response,
  ) {
    const pdf = await this.pagosService.generateReciboPDF(id, scope);

    res.setHeader(
      'Content-Disposition',
      `attachment; filename=recibo-${id}.pdf`,
    );
    res.send(pdf);
  }

  // ==================== ÓRDENES DE PAGO (PAGO ASISTIDO) ====================

  @Post('pagos/generar-orden')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_MUNICIPIO, UserRole.OPERATIVO)
  @ApiOperation({
    summary: 'Operador municipal genera orden de pago con token único (24-72h)',
  })
  generarOrdenPago(
    @Body() createOrdenPagoDto: CreateOrdenPagoDto,
    @MunicipalityId() municipioId: string,
    @Req() req: Request,
  ) {
    const userId = (req.user as any).sub;
    return this.pagosService.generarOrdenPago(
      createOrdenPagoDto,
      municipioId,
      userId,
    );
  }

  @Public()
  @Get('pagos/orden/:token')
  @ApiOperation({
    summary: '🌐 PÚBLICO - Ciudadano consulta orden de pago por token',
  })
  getOrdenPago(@Param('token') token: string) {
    return this.pagosService.getOrdenPorToken(token);
  }

  @Public()
  @Post('pagos/orden/:token/pagar')
  @ApiOperation({ summary: '🌐 PÚBLICO - Ciudadano paga con Stripe' })
  pagarOrden(
    @Param('token') token: string,
    @Body() pagarOrdenDto: PagarOrdenDto,
  ) {
    return this.pagosService.pagarOrden(token, pagarOrdenDto);
  }
}
