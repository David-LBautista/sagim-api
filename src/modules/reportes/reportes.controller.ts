import {
  Controller,
  Get,
  Patch,
  Put,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';

import { ReportesService } from './reportes.service';
import {
  CrearReporteInternoDto,
  ActualizarEstadoReporteDto,
  AsignarReporteDto,
  CambiarPrioridadDto,
  CambiarVisibilidadDto,
  FiltrosReportesDto,
  MetricasQueryDto,
} from './dto/reportes.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards';
import { Roles, MunicipalityId, CurrentUser } from '@/common/decorators';
import { UserRole } from '@/shared/enums';

@ApiTags('Reportes')
@ApiBearerAuth()
@Controller('reportes')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReportesController {
  constructor(private readonly reportesService: ReportesService) {}

  // ── Literal GET routes MUST come before @Get(':id') ──────────

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_MUNICIPIO, UserRole.OPERATIVO)
  @ApiOperation({ summary: 'Listar reportes del municipio con filtros' })
  @ApiQuery({ name: 'categoria', required: false })
  @ApiQuery({ name: 'estado', required: false })
  @ApiQuery({ name: 'modulo', required: false })
  @ApiQuery({ name: 'prioridad', required: false })
  @ApiQuery({ name: 'origen', required: false })
  @ApiQuery({ name: 'asignadoA', required: false })
  @ApiQuery({ name: 'fechaInicio', required: false })
  @ApiQuery({ name: 'fechaFin', required: false })
  @ApiQuery({ name: 'buscar', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findAll(
    @MunicipalityId() municipioId: string,
    @Query() filters: FiltrosReportesDto,
  ) {
    return this.reportesService.findAll(municipioId, filters);
  }

  @Get('mis-reportes')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_MUNICIPIO, UserRole.OPERATIVO)
  @ApiOperation({ summary: 'Reportes asignados al usuario autenticado' })
  @ApiQuery({
    name: 'estado',
    required: false,
    description: 'Separados por coma. Default: pendiente,en_proceso',
  })
  misReportes(
    @MunicipalityId() municipioId: string,
    @CurrentUser() user: any,
    @Query('estado') estado?: string,
  ) {
    return this.reportesService.misReportes(
      municipioId,
      user?._id?.toString(),
      estado,
    );
  }

  @Get('metricas')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_MUNICIPIO, UserRole.OPERATIVO)
  @ApiOperation({
    summary: 'Métricas internas para el dashboard de Presidencia',
  })
  @ApiQuery({ name: 'mes', required: false, type: Number })
  @ApiQuery({ name: 'anio', required: false, type: Number })
  @ApiQuery({ name: 'modulo', required: false })
  getMetricas(
    @MunicipalityId() municipioId: string,
    @Query() query: MetricasQueryDto,
  ) {
    return this.reportesService.getMetricasInternas(municipioId, query);
  }

  @Get('configuracion')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_MUNICIPIO)
  @ApiOperation({ summary: 'Configuración actual del módulo de reportes' })
  getConfiguracion(@MunicipalityId() municipioId: string) {
    return this.reportesService.getConfiguracion(municipioId);
  }

  @Get('configuracion/catalogo')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_MUNICIPIO)
  @ApiOperation({
    summary: 'Catálogo completo de categorías disponibles (para configuración)',
  })
  getCatalogo() {
    return this.reportesService.getCatalogoCompleto();
  }

  // ── Parameterized route LAST ───────────────────────────────

  @Get(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_MUNICIPIO, UserRole.OPERATIVO)
  @ApiOperation({ summary: 'Detalle completo de un reporte' })
  findOne(@Param('id') id: string, @MunicipalityId() municipioId: string) {
    return this.reportesService.findOne(id, municipioId);
  }

  @Patch(':id/estado')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_MUNICIPIO, UserRole.OPERATIVO)
  @ApiOperation({
    summary: 'Cambiar estado del reporte (con validación de transición)',
  })
  actualizarEstado(
    @Param('id') id: string,
    @Body() dto: ActualizarEstadoReporteDto,
    @MunicipalityId() municipioId: string,
    @CurrentUser() user: any,
  ) {
    return this.reportesService.actualizarEstado(
      id,
      dto,
      municipioId,
      user?._id?.toString(),
      user?.nombre ?? user?.email,
    );
  }

  @Patch(':id/asignar')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_MUNICIPIO, UserRole.OPERATIVO)
  @ApiOperation({ summary: 'Asignar reporte a un funcionario' })
  asignar(
    @Param('id') id: string,
    @Body() dto: AsignarReporteDto,
    @MunicipalityId() municipioId: string,
    @CurrentUser() user: any,
  ) {
    return this.reportesService.asignarReporte(
      id,
      dto,
      municipioId,
      user?._id?.toString(),
      user?.nombre ?? user?.email ?? 'Funcionario',
    );
  }

  @Patch(':id/prioridad')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_MUNICIPIO)
  @ApiOperation({ summary: 'Cambiar prioridad del reporte' })
  cambiarPrioridad(
    @Param('id') id: string,
    @Body() dto: CambiarPrioridadDto,
    @MunicipalityId() municipioId: string,
  ) {
    return this.reportesService.cambiarPrioridad(id, dto, municipioId);
  }

  @Patch(':id/visibilidad')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_MUNICIPIO)
  @ApiOperation({
    summary: 'Mostrar u ocultar reporte en portal de transparencia',
  })
  cambiarVisibilidad(
    @Param('id') id: string,
    @Body() dto: CambiarVisibilidadDto,
    @MunicipalityId() municipioId: string,
  ) {
    return this.reportesService.cambiarVisibilidad(
      id,
      dto.visible,
      municipioId,
    );
  }

  // ──────────────────────────────────────────────────────────
  // CREACIÓN INTERNA
  // ──────────────────────────────────────────────────────────

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_MUNICIPIO, UserRole.OPERATIVO)
  @ApiOperation({
    summary: 'Registrar reporte internamente (recepcionista / funcionario)',
  })
  crearInterno(
    @Body() dto: CrearReporteInternoDto,
    @MunicipalityId() municipioId: string,
    @CurrentUser() user: any,
  ) {
    return this.reportesService.crearReporteInterno(
      municipioId,
      dto,
      user?._id?.toString(),
      user?.nombre ?? user?.email ?? 'Funcionario',
    );
  }

  // ──────────────────────────────────────────────────────────
  // CONFIGURACIÓN
  // ──────────────────────────────────────────────────────────

  @Patch('configuracion')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_MUNICIPIO)
  @ApiOperation({ summary: 'Actualizar configuración del módulo de reportes' })
  upsertConfiguracion(
    @MunicipalityId() municipioId: string,
    @Body() body: Record<string, any>,
  ) {
    return this.reportesService.upsertConfiguracion(municipioId, body);
  }

  // ──────────────────────────────────────────────────────────
  // IMÁGENES
  // ──────────────────────────────────────────────────────────

  @Post('upload-images')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_MUNICIPIO, UserRole.OPERATIVO)
  @ApiOperation({ summary: 'Subir imágenes de evidencia a Cloudinary' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
        },
      },
    },
  })
  @UseInterceptors(FilesInterceptor('files', 10))
  uploadImages(
    @UploadedFiles() files: Express.Multer.File[],
    @Query('slug') slug: string,
    @Query('folio') folio?: string,
  ) {
    return this.reportesService.uploadImages(files, slug, folio);
  }
}
