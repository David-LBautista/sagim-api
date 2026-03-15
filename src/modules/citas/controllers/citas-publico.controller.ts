import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiHeader } from '@nestjs/swagger';

import { CitasService } from '../citas.service';
import { CrearCitaPublicaDto, CancelarCitaPublicaDto } from '../dto/citas.dto';
import { Public } from '../../../common/decorators/public.decorator';
import { MunicipioSlug } from '../../../common/decorators/municipio-slug.decorator';

@ApiTags('Citas — Portal Público')
@Public()
@Controller('public/citas')
export class CitasPublicoController {
  constructor(private readonly citasService: CitasService) {}

  /** GET /public/citas/areas  */
  @Get('areas')
  @ApiOperation({ summary: 'Áreas con citas activas del municipio' })
  @ApiHeader({
    name: 'x-municipio-slug',
    required: false,
    description: 'Fallback para dev local',
  })
  async getAreasActivas(@MunicipioSlug() slug: string) {
    const municipio = await this.citasService.resolverMunicipio(slug);
    return this.citasService.getAreasActivas(String(municipio._id));
  }

  /** GET /public/citas/disponibilidad?area=&fechaInicio=&fechaFin= */
  @Get('disponibilidad')
  @ApiOperation({
    summary:
      'Obtener disponibilidad de slots para un área en un rango de fechas',
  })
  @ApiQuery({ name: 'area', required: true })
  @ApiQuery({ name: 'fechaInicio', required: true, description: 'YYYY-MM-DD' })
  @ApiQuery({ name: 'fechaFin', required: true, description: 'YYYY-MM-DD' })
  @ApiHeader({
    name: 'x-municipio-slug',
    required: false,
    description: 'Fallback para dev local',
  })
  async getDisponibilidad(
    @MunicipioSlug() slug: string,
    @Query('area') area: string,
    @Query('fechaInicio') fechaInicio: string,
    @Query('fechaFin') fechaFin: string,
  ) {
    const municipio = await this.citasService.resolverMunicipio(slug);
    return this.citasService.getDisponibilidad(
      String(municipio._id),
      area,
      fechaInicio,
      fechaFin,
    );
  }

  /** POST /public/citas */
  @Post()
  @ApiOperation({ summary: 'Agendar cita desde el portal ciudadano' })
  @ApiHeader({
    name: 'x-municipio-slug',
    required: false,
    description: 'Fallback para dev local',
  })
  async crearCita(
    @MunicipioSlug() slug: string,
    @Body() dto: CrearCitaPublicaDto,
  ) {
    const municipio = await this.citasService.resolverMunicipio(slug);
    return this.citasService.crearCitaPublica(
      String(municipio._id),
      dto,
      municipio.nombre,
      slug,
    );
  }

  /** GET /public/citas/consultar?folio=&token= (o &curp=) */
  @Get('consultar')
  @ApiOperation({
    summary: 'Consultar estado de cita por folio + token (email) o CURP',
  })
  @ApiQuery({ name: 'folio', required: true, example: 'CIT-2501-0001' })
  @ApiQuery({
    name: 'token',
    required: false,
    description: 'UUID recibido por correo',
  })
  @ApiQuery({
    name: 'curp',
    required: false,
    description: 'CURP del ciudadano (alternativa al token)',
  })
  @ApiHeader({
    name: 'x-municipio-slug',
    required: false,
    description: 'Fallback para dev local',
  })
  async consultarCita(
    @MunicipioSlug() slug: string,
    @Query('folio') folio: string,
    @Query('token') token?: string,
    @Query('curp') curp?: string,
  ) {
    const tokenOrCurp = token || curp;
    if (!tokenOrCurp) {
      throw new BadRequestException('Debe proporcionar token o CURP');
    }
    const municipio = await this.citasService.resolverMunicipio(slug);
    return this.citasService.consultarCita(
      String(municipio._id),
      folio,
      tokenOrCurp,
      municipio.nombre,
      slug,
    );
  }

  /** PATCH /public/citas/cancelar */
  @Patch('cancelar')
  @ApiOperation({ summary: 'Cancelar cita desde el portal ciudadano' })
  @ApiHeader({
    name: 'x-municipio-slug',
    required: false,
    description: 'Fallback para dev local',
  })
  async cancelarCita(
    @MunicipioSlug() slug: string,
    @Body() dto: CancelarCitaPublicaDto,
  ) {
    const tokenOrCurp = dto.token || dto.curp;
    if (!tokenOrCurp) {
      throw new BadRequestException('Debe proporcionar token o CURP');
    }
    const municipio = await this.citasService.resolverMunicipio(slug);
    return this.citasService.cancelarCitaCiudadano(
      String(municipio._id),
      dto.folio,
      tokenOrCurp,
      dto.motivo,
    );
  }
}
