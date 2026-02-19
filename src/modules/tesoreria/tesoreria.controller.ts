import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { TesoreriaService } from './tesoreria.service';
import { CreateServicioCobroDto, CreateOrdenPagoTesoreriaDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards';
import { Roles, MunicipalityId, TenantScope } from '@/common/decorators';
import { UserRole } from '@/shared/enums';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
} from '@nestjs/swagger';

@ApiTags('Tesorería')
@ApiBearerAuth()
@Controller('tesoreria')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TesoreriaController {
  constructor(private readonly tesoreriaService: TesoreriaService) {}

  // ==================== SERVICIOS COBRABLES ====================

  @Post('servicios')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_MUNICIPIO, UserRole.OPERATIVO)
  @ApiOperation({ summary: 'Crear nuevo servicio cobrable' })
  createServicio(
    @Body() createServicioDto: CreateServicioCobroDto,
    @MunicipalityId() municipioId: string,
  ) {
    return this.tesoreriaService.createServicio(createServicioDto, municipioId);
  }

  @Get('servicios')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_MUNICIPIO, UserRole.OPERATIVO)
  @ApiOperation({ summary: 'Listar servicios cobrables activos' })
  findAllServicios(@TenantScope() scope: any) {
    return this.tesoreriaService.findAllServicios(scope);
  }

  @Get('servicios/:id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_MUNICIPIO, UserRole.OPERATIVO)
  @ApiOperation({ summary: 'Obtener servicio por ID' })
  findServicioById(@Param('id') id: string, @TenantScope() scope: any) {
    return this.tesoreriaService.findServicioById(id, scope);
  }

  @Patch('servicios/:id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_MUNICIPIO, UserRole.OPERATIVO)
  @ApiOperation({ summary: 'Actualizar servicio cobrable' })
  updateServicio(
    @Param('id') id: string,
    @Body() updateData: Partial<CreateServicioCobroDto>,
    @MunicipalityId() municipioId: string,
  ) {
    return this.tesoreriaService.updateServicio(id, updateData, municipioId);
  }

  @Delete('servicios/:id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_MUNICIPIO, UserRole.OPERATIVO)
  @ApiOperation({ summary: 'Desactivar servicio cobrable (soft delete)' })
  deactivateServicio(
    @Param('id') id: string,
    @MunicipalityId() municipioId: string,
  ) {
    return this.tesoreriaService.deactivateServicio(id, municipioId);
  }

  // ==================== ÓRDENES DE PAGO ====================

  @Post('ordenes-pago')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_MUNICIPIO, UserRole.OPERATIVO)
  @ApiOperation({ summary: 'Crear nueva orden de pago' })
  createOrdenPago(
    @Body() createOrdenDto: CreateOrdenPagoTesoreriaDto,
    @MunicipalityId() municipioId: string,
    @Req() req: Request,
  ) {
    const userId = (req.user as any).sub;
    return this.tesoreriaService.createOrdenPago(
      createOrdenDto,
      municipioId,
      userId,
    );
  }

  @Get('ordenes-pago')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_MUNICIPIO, UserRole.OPERATIVO)
  @ApiOperation({ summary: 'Listar órdenes de pago con filtros' })
  @ApiQuery({ name: 'estado', required: false })
  @ApiQuery({ name: 'servicioId', required: false })
  @ApiQuery({ name: 'fechaDesde', required: false })
  @ApiQuery({ name: 'fechaHasta', required: false })
  findAllOrdenes(
    @TenantScope() scope: any,
    @Query('estado') estado?: string,
    @Query('servicioId') servicioId?: string,
    @Query('fechaDesde') fechaDesde?: string,
    @Query('fechaHasta') fechaHasta?: string,
  ) {
    const filters: any = {};
    if (estado) filters.estado = estado;
    if (servicioId) filters.servicioId = servicioId;
    if (fechaDesde) filters.fechaDesde = new Date(fechaDesde);
    if (fechaHasta) filters.fechaHasta = new Date(fechaHasta);

    return this.tesoreriaService.findAllOrdenes(scope, filters);
  }

  @Get('ordenes-pago/:id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_MUNICIPIO, UserRole.OPERATIVO)
  @ApiOperation({ summary: 'Obtener orden de pago por ID' })
  findOrdenById(@Param('id') id: string, @TenantScope() scope: any) {
    return this.tesoreriaService.findOrdenById(id, scope);
  }

  @Patch('ordenes-pago/:id/cancelar')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_MUNICIPIO, UserRole.OPERATIVO)
  @ApiOperation({ summary: 'Cancelar orden de pago (solo si no está pagada)' })
  cancelarOrden(
    @Param('id') id: string,
    @MunicipalityId() municipioId: string,
  ) {
    return this.tesoreriaService.cancelarOrden(id, municipioId);
  }

  // ==================== LINKS DE PAGO ====================

  @Post('ordenes-pago/:id/link')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_MUNICIPIO, UserRole.OPERATIVO)
  @ApiOperation({ summary: 'Generar link de pago para una orden' })
  generarLinkPago(
    @Param('id') id: string,
    @MunicipalityId() municipioId: string,
  ) {
    return this.tesoreriaService.generarLinkPago(id, municipioId);
  }

  @Post('ordenes-pago/:id/reenviar-link')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_MUNICIPIO, UserRole.OPERATIVO)
  @ApiOperation({ summary: 'Reenviar link de pago por email' })
  reenviarLink(@Param('id') id: string, @MunicipalityId() municipioId: string) {
    return this.tesoreriaService.reenviarLink(id, municipioId);
  }

  // ==================== PAGOS (CONSULTA) ====================

  @Get('pagos')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_MUNICIPIO, UserRole.OPERATIVO)
  @ApiOperation({ summary: 'Listar pagos realizados' })
  @ApiQuery({ name: 'servicioId', required: false })
  @ApiQuery({ name: 'fechaDesde', required: false })
  @ApiQuery({ name: 'fechaHasta', required: false })
  findAllPagos(
    @TenantScope() scope: any,
    @Query('servicioId') servicioId?: string,
    @Query('fechaDesde') fechaDesde?: string,
    @Query('fechaHasta') fechaHasta?: string,
  ) {
    const filters: any = {};
    if (servicioId) filters.servicioId = servicioId;
    if (fechaDesde) filters.fechaDesde = new Date(fechaDesde);
    if (fechaHasta) filters.fechaHasta = new Date(fechaHasta);

    return this.tesoreriaService.findAllPagos(scope, filters);
  }

  @Get('pagos/:id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_MUNICIPIO, UserRole.OPERATIVO)
  @ApiOperation({ summary: 'Obtener pago específico por ID' })
  findPagoById(@Param('id') id: string, @TenantScope() scope: any) {
    return this.tesoreriaService.findPagoById(id, scope);
  }

  // ==================== REPORTES ====================

  @Get('reportes/diario')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_MUNICIPIO, UserRole.OPERATIVO)
  @ApiOperation({ summary: 'Reporte de ingresos del día' })
  @ApiQuery({
    name: 'fecha',
    required: false,
    description: 'Fecha en formato YYYY-MM-DD',
  })
  reporteDiario(@TenantScope() scope: any, @Query('fecha') fecha?: string) {
    const fechaBusqueda = fecha ? new Date(fecha) : new Date();
    return this.tesoreriaService.reporteDiario(scope, fechaBusqueda);
  }

  @Get('reportes/mensual')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_MUNICIPIO, UserRole.OPERATIVO)
  @ApiOperation({ summary: 'Reporte de ingresos del mes' })
  @ApiQuery({ name: 'mes', required: true, description: 'Mes (1-12)' })
  @ApiQuery({ name: 'año', required: true, description: 'Año (YYYY)' })
  reporteMensual(
    @TenantScope() scope: any,
    @Query('mes') mes: string,
    @Query('año') año: string,
  ) {
    return this.tesoreriaService.reporteMensual(
      scope,
      parseInt(mes),
      parseInt(año),
    );
  }

  @Get('reportes/servicio/:servicioId')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_MUNICIPIO, UserRole.OPERATIVO)
  @ApiOperation({ summary: 'Reporte de estadísticas por servicio' })
  reportePorServicio(
    @Param('servicioId') servicioId: string,
    @TenantScope() scope: any,
  ) {
    return this.tesoreriaService.reportePorServicio(servicioId, scope);
  }
}
