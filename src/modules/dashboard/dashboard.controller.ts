/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { Roles, MunicipalityId } from '@/common/decorators';
import { UserRole } from '@/shared/enums';
import { DashboardService } from './dashboard.service';

@ApiTags('Dashboard Ejecutivo')
@ApiBearerAuth()
@Controller('dashboard')
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_MUNICIPIO)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  // ==========================================
  // 💰 SECCIÓN TESORERÍA (RECAUDACIÓN)
  // ==========================================

  @Get('tesoreria/resumen')
  @ApiOperation({ summary: 'Resumen general de recaudación' })
  async getResumenTesoreria(@MunicipalityId() municipioId: string) {
    return this.dashboardService.getResumenTesoreria(municipioId);
  }

  @Get('tesoreria/ingresos')
  @ApiOperation({ summary: 'Ingresos por día o rango de fechas' })
  @ApiQuery({ name: 'desde', required: false, example: '2026-01-01' })
  @ApiQuery({ name: 'hasta', required: false, example: '2026-01-31' })
  async getIngresos(
    @MunicipalityId() municipioId: string,
    @Query('desde') desde?: string,
    @Query('hasta') hasta?: string,
  ) {
    return this.dashboardService.getIngresos(municipioId, desde, hasta);
  }

  @Get('tesoreria/ingresos-por-area')
  @ApiOperation({ summary: 'Ingresos agrupados por área responsable' })
  async getIngresosPorArea(@MunicipalityId() municipioId: string) {
    return this.dashboardService.getIngresosPorArea(municipioId);
  }

  @Get('tesoreria/servicios-top')
  @ApiOperation({ summary: 'Servicios más cobrados' })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  async getServiciosTop(
    @MunicipalityId() municipioId: string,
    @Query('limit') limit?: number,
  ) {
    return this.dashboardService.getServiciosTop(municipioId, limit || 10);
  }

  @Get('tesoreria/comparativo-mensual')
  @ApiOperation({ summary: 'Comparativo de recaudación por mes' })
  @ApiQuery({ name: 'meses', required: false, example: 6 })
  async getComparativoMensual(
    @MunicipalityId() municipioId: string,
    @Query('meses') meses?: number,
  ) {
    return this.dashboardService.getComparativoMensual(municipioId, meses || 6);
  }

  @Get('tesoreria/alertas')
  @ApiOperation({ summary: 'Alertas y notificaciones de Tesorería' })
  async getAlertasTesoreria(@MunicipalityId() municipioId: string) {
    return this.dashboardService.getAlertasTesoreria(municipioId);
  }

  // ==========================================
  // 🧑‍🤝‍🧑 SECCIÓN DIF (IMPACTO SOCIAL)
  // ==========================================

  @Get('dif/resumen')
  @ApiOperation({ summary: 'Resumen general de DIF' })
  async getResumenDIF(@MunicipalityId() municipioId: string) {
    return this.dashboardService.getResumenDIF(municipioId);
  }

  @Get('dif/apoyos-por-programa')
  @ApiOperation({ summary: 'Apoyos entregados por programa' })
  async getApoyosPorPrograma(@MunicipalityId() municipioId: string) {
    return this.dashboardService.getApoyosPorPrograma(municipioId);
  }

  @Get('dif/beneficiarios-por-localidad')
  @ApiOperation({ summary: 'Beneficiarios únicos por localidad' })
  async getBeneficiariosPorLocalidad(@MunicipalityId() municipioId: string) {
    return this.dashboardService.getBeneficiariosPorLocalidad(municipioId);
  }

  @Get('dif/apoyos-por-tipo')
  @ApiOperation({ summary: 'Apoyos agrupados por tipo' })
  async getApoyosPorTipo(@MunicipalityId() municipioId: string) {
    return this.dashboardService.getApoyosPorTipo(municipioId);
  }

  @Get('dif/comparativo-mensual')
  @ApiOperation({ summary: 'Comparativo de apoyos entregados por mes' })
  @ApiQuery({ name: 'meses', required: false, example: 6 })
  async getComparativoMensualDIF(
    @MunicipalityId() municipioId: string,
    @Query('meses') meses?: number,
  ) {
    return this.dashboardService.getComparativoMensualDIF(
      municipioId,
      meses || 6,
    );
  }

  @Get('dif/alertas')
  @ApiOperation({ summary: 'Alertas y notificaciones sociales DIF' })
  async getAlertasDIF(@MunicipalityId() municipioId: string) {
    return this.dashboardService.getAlertasDIF(municipioId);
  }
}
