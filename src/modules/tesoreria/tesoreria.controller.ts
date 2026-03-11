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
import {
  CreateServicioCobroDto,
  CreateOrdenPagoTesoreriaDto,
  CreateOrdenInternaDto,
  CobrarOrdenInternaDto,
  UpsertServicioOverrideDto,
  RegistrarPagoCajaDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards';
import {
  Roles,
  MunicipalityId,
  TenantScope,
  CurrentUser,
} from '@/common/decorators';
import { UserRole } from '@/shared/enums';
import { fecha } from '@/common/helpers/fecha.helper';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiParam,
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

  @Get('servicios/catalogo')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_MUNICIPIO, UserRole.OPERATIVO)
  @ApiOperation({
    summary:
      'Catálogo global de servicios cobrables (sin overrides municipales)',
  })
  @ApiQuery({
    name: 'categoria',
    required: false,
    description:
      'Filtra por categoría (ej. "Registro Civil", "Predial", "Licencias")',
  })
  getCatalogoGlobal(@Query('categoria') categoria?: string) {
    return this.tesoreriaService.findCatalogoGlobal(categoria);
  }

  @Get('servicios')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_MUNICIPIO, UserRole.OPERATIVO)
  @ApiOperation({
    summary:
      'Listar servicios cobrables activos (global + overrides del municipio)',
  })
  @ApiQuery({
    name: 'busqueda',
    required: false,
    description: 'Filtra por nombre o clave',
  })
  @ApiQuery({
    name: 'categoria',
    required: false,
    description: 'Filtra por categoría',
  })
  @ApiQuery({
    name: 'areaResponsable',
    required: false,
    description:
      'Filtra por área responsable (puede abarcar varias categorías)',
  })
  @ApiQuery({
    name: 'soloPersonalizados',
    required: false,
    type: Boolean,
    description:
      'true = devuelve solo los servicios con override del municipio',
  })
  findAllServicios(
    @MunicipalityId() municipioId: string,
    @Query('busqueda') busqueda?: string,
    @Query('categoria') categoria?: string,
    @Query('areaResponsable') areaResponsable?: string,
    @Query('soloPersonalizados') soloPersonalizados?: string,
  ) {
    return this.tesoreriaService.findServiciosByMunicipio(
      municipioId.toString(),
      {
        busqueda,
        categoria,
        areaResponsable,
        soloPersonalizados: soloPersonalizados === 'true',
      },
    );
  }

  @Get('servicios/has-overrides')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_MUNICIPIO, UserRole.OPERATIVO)
  @ApiOperation({
    summary:
      'Verifica si el municipio tiene overrides activos (para mostrar botón "Restablecer todo")',
  })
  hasOverrides(@MunicipalityId() municipioId: string) {
    return this.tesoreriaService.hasOverrides(municipioId.toString());
  }

  @Delete('servicios/overrides')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_MUNICIPIO)
  @ApiOperation({
    summary: 'Restablecer todos los overrides del municipio al catálogo global',
  })
  deleteAllOverrides(@MunicipalityId() municipioId: string) {
    return this.tesoreriaService.deleteAllOverrides(municipioId.toString());
  }

  @Delete('servicios/:clave/override')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_MUNICIPIO)
  @ApiOperation({
    summary:
      'Restablecer un servicio al valor del catálogo global (elimina su override)',
  })
  @ApiParam({
    name: 'clave',
    description: 'Clave del servicio, ej. ACTA_NACIMIENTO',
  })
  deleteOverride(
    @Param('clave') clave: string,
    @MunicipalityId() municipioId: string,
  ) {
    return this.tesoreriaService.deleteOverride(municipioId.toString(), clave);
  }

  @Patch('servicios/:clave/override')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_MUNICIPIO)
  @ApiOperation({
    summary:
      'Crear o actualizar el override de un servicio global para este municipio',
  })
  upsertOverride(
    @Param('clave') clave: string,
    @Body() dto: UpsertServicioOverrideDto,
    @MunicipalityId() municipioId: string,
  ) {
    return this.tesoreriaService.upsertOverride(
      municipioId.toString(),
      clave,
      dto,
    );
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
  @ApiQuery({
    name: 'busqueda',
    required: false,
    description: 'Buscar por descripción',
  })
  findAllOrdenes(
    @TenantScope() scope: any,
    @Query('estado') estado?: string,
    @Query('servicioId') servicioId?: string,
    @Query('fechaDesde') fechaDesde?: string,
    @Query('fechaHasta') fechaHasta?: string,
    @Query('busqueda') busqueda?: string,
  ) {
    const filters: any = {};
    if (estado) filters.estado = estado;
    if (servicioId) filters.servicioId = servicioId;
    if (fechaDesde) filters.fechaDesde = new Date(fechaDesde);
    if (fechaHasta) filters.fechaHasta = new Date(fechaHasta);
    if (busqueda) filters.busqueda = busqueda;

    return this.tesoreriaService.findAllOrdenes(scope, filters);
  }

  @Get('ordenes-pago/metrics')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_MUNICIPIO, UserRole.OPERATIVO)
  @ApiOperation({
    summary:
      'Métricas de órdenes de pago (pendientes, recaudado, expiración, conversión)',
  })
  getOrdenesMetrics(@TenantScope() scope: any) {
    return this.tesoreriaService.getOrdenesMetrics(scope);
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

  // ==================== PAGOS PRESENCIALES EN CAJA ====================

  @Post('pagos/caja')
  @Roles(UserRole.ADMIN_MUNICIPIO, UserRole.OPERATIVO)
  @ApiOperation({ summary: 'Registrar pago presencial en caja (ventanilla)' })
  registrarPagoCaja(
    @Body() dto: RegistrarPagoCajaDto,
    @MunicipalityId() municipioId: string,
    @CurrentUser() user: any,
  ) {
    return this.tesoreriaService.registrarPagoCaja(
      dto,
      municipioId,
      user._id.toString(),
      user.nombre,
    );
  }

  @Get('pagos/caja/:id/recibo')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_MUNICIPIO, UserRole.OPERATIVO)
  @ApiOperation({
    summary:
      'Obtener URL firmada del recibo PDF (válida 5 min) — usar para reimprimir',
  })
  getReciboUrl(@Param('id') id: string, @MunicipalityId() municipioId: string) {
    return this.tesoreriaService.getReciboUrl(id, municipioId.toString());
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

  // ==================== ÓRDENES INTERNAS ====================

  @Post('ordenes-internas')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_MUNICIPIO, UserRole.OPERATIVO)
  @ApiOperation({
    summary: 'Crear orden interna de pago (departamento → caja presencial)',
  })
  crearOrdenInterna(
    @Body() dto: CreateOrdenInternaDto,
    @MunicipalityId() municipioId: string,
    @Req() req: Request,
  ) {
    const userId = (req.user as any).sub;
    return this.tesoreriaService.crearOrdenInterna(dto, municipioId, userId);
  }

  @Get('ordenes-internas')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_MUNICIPIO, UserRole.OPERATIVO)
  @ApiOperation({ summary: 'Listar órdenes internas con filtros' })
  @ApiQuery({ name: 'estado', required: false })
  @ApiQuery({
    name: 'ciudadanoId',
    required: false,
    description: 'Filtrar por ID de ciudadano registrado',
  })
  @ApiQuery({ name: 'areaResponsable', required: false })
  @ApiQuery({ name: 'fechaDesde', required: false })
  @ApiQuery({ name: 'fechaHasta', required: false })
  @ApiQuery({
    name: 'busqueda',
    required: false,
    description:
      'Buscar por folio, descripción, área o nombre del contribuyente',
  })
  findOrdenesInternas(
    @TenantScope() scope: any,
    @Query('estado') estado?: string,
    @Query('ciudadanoId') ciudadanoId?: string,
    @Query('areaResponsable') areaResponsable?: string,
    @Query('fechaDesde') fechaDesde?: string,
    @Query('fechaHasta') fechaHasta?: string,
    @Query('busqueda') busqueda?: string,
  ) {
    const filters: any = {};
    if (estado) filters.estado = estado;
    if (ciudadanoId) filters.ciudadanoId = ciudadanoId;
    if (areaResponsable) filters.areaResponsable = areaResponsable;
    if (fechaDesde) filters.fechaDesde = new Date(fechaDesde);
    if (fechaHasta) filters.fechaHasta = new Date(fechaHasta);
    if (busqueda) filters.busqueda = busqueda;
    return this.tesoreriaService.findOrdenesInternas(scope, filters);
  }

  @Post('ordenes-internas/:id/cobrar')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_MUNICIPIO, UserRole.OPERATIVO)
  @ApiOperation({
    summary:
      'Cobrar una orden interna en caja (Modo 2 — cajero selecciona orden existente)',
  })
  @ApiParam({ name: 'id', description: 'ID de la orden interna' })
  cobrarOrdenInterna(
    @Param('id') id: string,
    @Body() dto: CobrarOrdenInternaDto,
    @MunicipalityId() municipioId: string,
    @CurrentUser() user: any,
  ) {
    const cajeroNombre =
      [user.nombre, user.apellido].filter(Boolean).join(' ') || user.email;
    return this.tesoreriaService.cobrarOrdenInterna(
      id,
      dto,
      municipioId,
      user.sub,
      cajeroNombre,
    );
  }

  @Patch('ordenes-internas/:id/cancelar')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_MUNICIPIO, UserRole.OPERATIVO)
  @ApiOperation({ summary: 'Cancelar orden interna (solo si está PENDIENTE)' })
  cancelarOrdenInterna(
    @Param('id') id: string,
    @MunicipalityId() municipioId: string,
  ) {
    return this.tesoreriaService.cancelarOrden(id, municipioId);
  }

  // ==================== REPORTES ====================

  @Get('reportes/diario/pdf')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_MUNICIPIO, UserRole.OPERATIVO)
  @ApiOperation({
    summary: 'Generar PDF de corte de caja diario y obtener URL firmada de S3',
  })
  @ApiQuery({
    name: 'fecha',
    required: false,
    description: 'Fecha YYYY-MM-DD (default: hoy)',
  })
  generarCorteDiarioPdf(
    @TenantScope() scope: any,
    @Query('fecha') fechaStr?: string,
  ) {
    const fechaBusqueda = fechaStr ? fecha.parsearFecha(fechaStr) : new Date();
    return this.tesoreriaService.generarCorteDiarioPdf(scope, fechaBusqueda);
  }

  @Get('reportes/diario')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_MUNICIPIO, UserRole.OPERATIVO)
  @ApiOperation({ summary: 'Reporte de ingresos del día' })
  @ApiQuery({
    name: 'fecha',
    required: false,
    description: 'Fecha en formato YYYY-MM-DD',
  })
  @ApiQuery({
    name: 'detalle',
    required: false,
    type: Boolean,
    description:
      'true = incluye array de pagos individuales (corte de caja / PDF)',
  })
  reporteDiario(
    @TenantScope() scope: any,
    @Query('fecha') fechaStr?: string,
    @Query('detalle') detalle?: string,
  ) {
    const fechaBusqueda = fechaStr ? fecha.parsearFecha(fechaStr) : new Date();
    return this.tesoreriaService.reporteDiario(
      scope,
      fechaBusqueda,
      detalle === 'true',
    );
  }

  @Get('reportes/mensual')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_MUNICIPIO, UserRole.OPERATIVO)
  @ApiOperation({ summary: 'Reporte de ingresos del mes' })
  @ApiQuery({ name: 'mes', required: true, description: 'Mes (1-12)' })
  @ApiQuery({ name: 'año', required: true, description: 'Año (YYYY)' })
  @ApiQuery({
    name: 'detalle',
    required: false,
    type: Boolean,
    description: 'true = incluye array de pagos individuales del mes',
  })
  reporteMensual(
    @TenantScope() scope: any,
    @Query('mes') mes: string,
    @Query('año') año: string,
    @Query('detalle') detalle?: string,
  ) {
    return this.tesoreriaService.reporteMensual(
      scope,
      parseInt(mes),
      parseInt(año),
      detalle === 'true',
    );
  }

  @Get('reportes/mensual/pdf')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_MUNICIPIO, UserRole.OPERATIVO)
  @ApiOperation({
    summary: 'Generar PDF de reporte mensual y obtener URL firmada de S3',
  })
  @ApiQuery({ name: 'mes', required: true, description: 'Mes (1-12)' })
  @ApiQuery({ name: 'año', required: true, description: 'Año (YYYY)' })
  generarCorteMensualPdf(
    @TenantScope() scope: any,
    @Query('mes') mes: string,
    @Query('año') año: string,
  ) {
    return this.tesoreriaService.generarCorteMensualPdf(
      scope,
      parseInt(mes),
      parseInt(año),
    );
  }

  @Get('reportes/servicio/:servicioId/pdf')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_MUNICIPIO, UserRole.OPERATIVO)
  @ApiOperation({
    summary: 'Generar PDF de reporte por servicio y obtener URL firmada de S3',
  })
  generarReporteServicioPdf(
    @Param('servicioId') servicioId: string,
    @TenantScope() scope: any,
  ) {
    return this.tesoreriaService.generarReporteServicioPdf(servicioId, scope);
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
