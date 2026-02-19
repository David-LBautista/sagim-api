import { Controller, Get, Post, Query, Body, Req } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { Roles, MunicipalityId } from '@/common/decorators';
import { UserRole } from '@/shared/enums';
import { AuditoriaService } from './auditoria.service';
import { CreateAuditLogDto } from './dto';
import { AuditAction, AuditModule } from './schemas/audit-log.schema';

@ApiTags('Auditoría')
@ApiBearerAuth()
@Controller('auditoria')
export class AuditoriaController {
  constructor(private readonly auditoriaService: AuditoriaService) {}

  /**
   * Crear un log de auditoría manualmente
   * (El interceptor lo hace automáticamente en la mayoría de casos)
   */
  @Post('logs')
  @ApiOperation({ summary: 'Crear registro de auditoría manual' })
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_MUNICIPIO, UserRole.OPERATIVO)
  async createLog(
    @Body() createDto: CreateAuditLogDto,
    @Req() req: any,
    @MunicipalityId() municipioId: string,
  ) {
    const userId = req.user.sub;
    const userRole = req.user.rol;
    const ip = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];

    return this.auditoriaService.createLog(
      createDto,
      userId,
      userRole,
      municipioId,
      ip,
      userAgent,
    );
  }

  /**
   * Bitácora detallada con filtros (CONTRALORÍA)
   */
  @Get('logs')
  @ApiOperation({ summary: 'Obtener bitácora de auditoría con filtros' })
  @ApiQuery({ name: 'modulo', required: false, enum: AuditModule })
  @ApiQuery({ name: 'usuarioId', required: false })
  @ApiQuery({ name: 'accion', required: false, enum: AuditAction })
  @ApiQuery({ name: 'entidad', required: false })
  @ApiQuery({ name: 'desde', required: false, example: '2026-01-01' })
  @ApiQuery({ name: 'hasta', required: false, example: '2026-01-31' })
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_MUNICIPIO)
  async getLogs(
    @MunicipalityId() municipioId: string,
    @Query('modulo') modulo?: AuditModule,
    @Query('usuarioId') usuarioId?: string,
    @Query('accion') accion?: AuditAction,
    @Query('entidad') entidad?: string,
    @Query('desde') desde?: string,
    @Query('hasta') hasta?: string,
  ) {
    const filters: any = {};
    if (modulo) filters.modulo = modulo;
    if (usuarioId) filters.usuarioId = usuarioId;
    if (accion) filters.accion = accion;
    if (entidad) filters.entidad = entidad;
    if (desde) filters.fechaDesde = new Date(desde);
    if (hasta) filters.fechaHasta = new Date(hasta);

    return this.auditoriaService.findAll(municipioId, filters);
  }

  /**
   * Historial de cambios de una entidad específica
   */
  @Get('historial/:entidad/:entidadId')
  @ApiOperation({ summary: 'Obtener historial de cambios de una entidad' })
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_MUNICIPIO)
  async getHistorial(
    @MunicipalityId() municipioId: string,
    @Query('entidad') entidad: string,
    @Query('entidadId') entidadId: string,
  ) {
    return this.auditoriaService.getHistorialEntidad(
      entidad,
      entidadId,
      municipioId,
    );
  }

  /**
   * Actividad de un usuario específico
   */
  @Get('usuario/:usuarioId')
  @ApiOperation({ summary: 'Obtener actividad de un usuario' })
  @ApiQuery({ name: 'limite', required: false, example: 100 })
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_MUNICIPIO)
  async getActividadUsuario(
    @MunicipalityId() municipioId: string,
    @Query('usuarioId') usuarioId: string,
    @Query('limite') limite?: number,
  ) {
    return this.auditoriaService.getActividadUsuario(
      usuarioId,
      municipioId,
      limite || 100,
    );
  }
}
