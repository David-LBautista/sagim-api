import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

import { CitasService } from '../citas.service';
import {
  CreateCitaConfiguracionDto,
  UpdateCitaConfiguracionDto,
  ToggleCitaConfiguracionDto,
  CreateBloqueoDto,
} from '../dto/citas.dto';
import {
  MunicipalityId,
  UserId,
} from '../../../common/decorators/user.decorator';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { MunicipalityGuard } from '../../../common/guards/municipality.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { UserRole } from '../../../shared/enums';

@ApiTags('Citas — Configuración')
@ApiBearerAuth()
@UseGuards(MunicipalityGuard, RolesGuard)
@Roles(UserRole.ADMIN_MUNICIPIO, UserRole.SUPER_ADMIN)
@Controller('citas/configuracion')
export class CitasConfiguracionController {
  constructor(private readonly citasService: CitasService) {}

  /** GET /citas/configuracion */
  @Get()
  @ApiOperation({
    summary: 'Listar todas las configuraciones de citas del municipio',
  })
  getAll(@MunicipalityId() municipioId: string) {
    return this.citasService.getConfiguraciones(municipioId);
  }

  /** GET /citas/configuracion/areas-disponibles */
  @Get('areas-disponibles')
  @ApiOperation({
    summary:
      'Módulos activos del municipio que aún no tienen configuración de citas',
  })
  getAreasDisponibles(@MunicipalityId() municipioId: string) {
    return this.citasService.getAreasDisponibles(municipioId);
  }

  /** GET /citas/configuracion/bloqueos — todos los bloqueos del municipio */
  @Get('bloqueos')
  @ApiOperation({ summary: 'Listar todos los bloqueos activos del municipio' })
  getAllBloqueos(@MunicipalityId() municipioId: string) {
    return this.citasService.getBloqueos(municipioId);
  }

  /** GET /citas/configuracion/:area */
  @Get(':area')
  @ApiOperation({ summary: 'Obtener configuración de un área específica' })
  getByArea(
    @Param('area') area: string,
    @MunicipalityId() municipioId: string,
  ) {
    return this.citasService.getConfiguracionByArea(municipioId, area);
  }

  /** POST /citas/configuracion */
  @Post()
  @ApiOperation({ summary: 'Crear configuración de citas para un área' })
  create(
    @MunicipalityId() municipioId: string,
    @Body() dto: CreateCitaConfiguracionDto,
    @UserId() userId: string,
  ) {
    return this.citasService.createConfiguracion(municipioId, dto, userId);
  }

  /** PATCH /citas/configuracion/:area */
  @Patch(':area')
  @Put(':area')
  @ApiOperation({ summary: 'Actualizar configuración de un área' })
  update(
    @Param('area') area: string,
    @MunicipalityId() municipioId: string,
    @Body() dto: UpdateCitaConfiguracionDto,
  ) {
    return this.citasService.updateConfiguracion(municipioId, area, dto);
  }

  /** PATCH /citas/configuracion/:area/toggle */
  @Patch(':area/toggle')
  @ApiOperation({
    summary:
      'Activar o desactivar citas para un área (sin body = invierte el estado actual)',
  })
  toggle(
    @Param('area') area: string,
    @MunicipalityId() municipioId: string,
    @Body() dto: ToggleCitaConfiguracionDto,
  ) {
    return this.citasService.toggleConfiguracion(
      municipioId,
      area,
      dto?.activo,
    );
  }

  /** GET /citas/configuracion/:area/bloqueos */
  @Get(':area/bloqueos')
  @ApiOperation({ summary: 'Listar bloqueos de un área específica' })
  getBloqueosByArea(
    @Param('area') area: string,
    @MunicipalityId() municipioId: string,
  ) {
    return this.citasService.getBloqueos(municipioId, area);
  }

  /** POST /citas/configuracion/:area/bloqueos */
  @Post(':area/bloqueos')
  @ApiOperation({ summary: 'Agregar bloqueo de días/rangos para un área' })
  addBloqueo(
    @Param('area') area: string,
    @MunicipalityId() municipioId: string,
    @Body() dto: CreateBloqueoDto,
    @UserId() userId: string,
  ) {
    return this.citasService.addBloqueo(municipioId, area, dto, userId);
  }

  /** DELETE /citas/configuracion/:area/bloqueos/:bloqueoId */
  @Delete(':area/bloqueos/:bloqueoId')
  @ApiOperation({ summary: 'Eliminar un bloqueo' })
  deleteBloqueo(
    @Param('area') area: string,
    @Param('bloqueoId') bloqueoId: string,
    @MunicipalityId() municipioId: string,
  ) {
    return this.citasService.deleteBloqueo(municipioId, area, bloqueoId);
  }
}
