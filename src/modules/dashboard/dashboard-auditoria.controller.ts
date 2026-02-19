import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { Roles, MunicipalityId } from '@/common/decorators';
import { UserRole } from '@/shared/enums';
import { AuditoriaService } from '../auditoria/auditoria.service';

@ApiTags('Dashboard Auditoría')
@ApiBearerAuth()
@Controller('dashboard/auditoria')
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_MUNICIPIO)
export class DashboardAuditoriaController {
  constructor(private readonly auditoriaService: AuditoriaService) {}

  @Get('resumen')
  @ApiOperation({ summary: 'Resumen general de auditoría' })
  async getResumen(@MunicipalityId() municipioId: string) {
    return this.auditoriaService.getResumen(municipioId);
  }

  @Get('actividad-por-modulo')
  @ApiOperation({ summary: 'Actividad agrupada por módulo' })
  @ApiQuery({ name: 'dias', required: false, example: 30 })
  async getActividadPorModulo(
    @MunicipalityId() municipioId: string,
    @Query('dias') dias?: number,
  ) {
    return this.auditoriaService.getActividadPorModulo(municipioId, dias || 30);
  }

  @Get('acciones-criticas')
  @ApiOperation({ summary: 'Acciones críticas (DELETE, EXPORT)' })
  @ApiQuery({ name: 'dias', required: false, example: 30 })
  async getAccionesCriticas(
    @MunicipalityId() municipioId: string,
    @Query('dias') dias?: number,
  ) {
    return this.auditoriaService.getAccionesCriticas(municipioId, dias || 30);
  }

  @Get('accesos')
  @ApiOperation({ summary: 'Accesos al sistema (logins)' })
  @ApiQuery({ name: 'dias', required: false, example: 30 })
  async getAccesos(
    @MunicipalityId() municipioId: string,
    @Query('dias') dias?: number,
  ) {
    return this.auditoriaService.getAccesos(municipioId, dias || 30);
  }
}
