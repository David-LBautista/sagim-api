import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';

import { CitasService } from '../citas.service';
import {
  CrearCitaPublicaDto,
  CambiarEstadoCitaDto,
  ReagendarCitaDto,
} from '../dto/citas.dto';
import { MunicipalityId } from '../../../common/decorators/user.decorator';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { MunicipalityGuard } from '../../../common/guards/municipality.guard';

@ApiTags('Citas — Panel Interno')
@ApiBearerAuth()
@UseGuards(MunicipalityGuard, RolesGuard)
@Controller('citas')
export class CitasController {
  constructor(private readonly citasService: CitasService) {}

  /** GET /citas */
  @Get()
  @ApiOperation({ summary: 'Listar citas con filtros y paginación' })
  @ApiQuery({ name: 'area', required: false })
  @ApiQuery({
    name: 'fecha',
    required: false,
    description: 'YYYY-MM-DD (día exacto)',
  })
  @ApiQuery({ name: 'fechaInicio', required: false, description: 'YYYY-MM-DD' })
  @ApiQuery({ name: 'fechaFin', required: false, description: 'YYYY-MM-DD' })
  @ApiQuery({
    name: 'estado',
    required: false,
    enum: [
      'pendiente',
      'confirmada',
      'atendida',
      'no_se_presento',
      'cancelada',
    ],
  })
  @ApiQuery({ name: 'curp', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findAll(
    @MunicipalityId() municipioId: string,
    @Query('area') area?: string,
    @Query('fecha') fecha?: string,
    @Query('fechaInicio') fechaInicio?: string,
    @Query('fechaFin') fechaFin?: string,
    @Query('estado') estado?: string,
    @Query('curp') curp?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.citasService.findCitas(municipioId, {
      area,
      fecha,
      fechaInicio,
      fechaFin,
      estado,
      curp,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  /** GET /citas/hoy */
  @Get('hoy')
  @ApiOperation({ summary: 'Resumen de citas del día de hoy' })
  @ApiQuery({ name: 'area', required: false })
  citasHoy(
    @MunicipalityId() municipioId: string,
    @Query('area') area?: string,
  ) {
    return this.citasService.citasHoy(municipioId, area);
  }

  /** GET /citas/metricas */
  @Get('metricas')
  @ApiOperation({ summary: 'Métricas mensuales de citas' })
  @ApiQuery({ name: 'mes', required: true, type: Number, example: 1 })
  @ApiQuery({ name: 'anio', required: true, type: Number, example: 2025 })
  @ApiQuery({ name: 'area', required: false })
  getMetricas(
    @MunicipalityId() municipioId: string,
    @Query('mes') mes: string,
    @Query('anio') anio: string,
    @Query('area') area?: string,
  ) {
    return this.citasService.getMetricas(
      municipioId,
      parseInt(mes, 10),
      parseInt(anio, 10),
      area,
    );
  }

  /** GET /citas/:id */
  @Get(':id')
  @ApiOperation({ summary: 'Detalle de una cita por ID' })
  findOne(@Param('id') id: string, @MunicipalityId() municipioId: string) {
    return this.citasService.findCitaById(id, municipioId);
  }

  /** POST /citas — Agendar desde recepción */
  @Post()
  @ApiOperation({ summary: 'Agendar cita desde la recepción (funcionario)' })
  async crearInterna(
    @MunicipalityId() municipioId: string,
    @Body() dto: CrearCitaPublicaDto,
  ) {
    // Para obtener el nombre del municipio, se asume que el guard lo inyecta
    // Si no, busca por ID dentro del servicio
    return this.citasService.crearCitaInterna(
      municipioId,
      dto,
      '',
      '', // nombre: se puede mejorar inyectando el municipio completo en el guard
    );
  }

  /** PATCH /citas/:id/estado */
  @Patch(':id/estado')
  @ApiOperation({
    summary: 'Cambiar estado de una cita (confirmar, atender, cancelar…)',
  })
  cambiarEstado(
    @Param('id') id: string,
    @MunicipalityId() municipioId: string,
    @Body() dto: CambiarEstadoCitaDto,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    @Query('userId') userId = 'sistema',
  ) {
    return this.citasService.cambiarEstado(id, dto, municipioId, userId);
  }

  /** PATCH /citas/:id/reagendar */
  @Patch(':id/reagendar')
  @ApiOperation({ summary: 'Reagendar una cita a otra fecha/hora' })
  reagendar(
    @Param('id') id: string,
    @MunicipalityId() municipioId: string,
    @Body() dto: ReagendarCitaDto,
  ) {
    return this.citasService.reagendar(id, dto, municipioId, '');
  }
}
