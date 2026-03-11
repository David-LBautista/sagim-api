import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';

import { CitasService } from '../citas.service';
import { CrearCitaPublicaDto, CancelarCitaPublicaDto } from '../dto/citas.dto';
import { Public } from '../../../common/decorators/public.decorator';

@ApiTags('Citas — Portal Público')
@Public()
@Controller('public/:municipioSlug/citas')
export class CitasPublicoController {
  constructor(private readonly citasService: CitasService) {}

  /** GET /public/:municipioSlug/citas/areas  */
  @Get('areas')
  @ApiOperation({ summary: 'Obtener áreas con citas activas del municipio' })
  async getAreasActivas(@Param('municipioSlug') slug: string) {
    const municipio = await this.citasService.resolverMunicipio(slug);
    return this.citasService.getAreasActivas(String(municipio._id));
  }

  /** GET /public/:municipioSlug/citas/disponibilidad?area=&fechaInicio=&fechaFin= */
  @Get('disponibilidad')
  @ApiOperation({
    summary:
      'Obtener disponibilidad de slots para un área en un rango de fechas',
  })
  @ApiQuery({ name: 'area', required: true })
  @ApiQuery({ name: 'fechaInicio', required: true, description: 'YYYY-MM-DD' })
  @ApiQuery({ name: 'fechaFin', required: true, description: 'YYYY-MM-DD' })
  async getDisponibilidad(
    @Param('municipioSlug') slug: string,
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

  /** POST /public/:municipioSlug/citas */
  @Post()
  @ApiOperation({ summary: 'Agendar cita desde el portal ciudadano' })
  async crearCita(
    @Param('municipioSlug') slug: string,
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

  /** GET /public/:municipioSlug/citas/consultar?folio=&token= (o &curp=) */
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
  async consultarCita(
    @Param('municipioSlug') slug: string,
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

  /** PATCH /public/:municipioSlug/citas/cancelar */
  @Patch('cancelar')
  @ApiOperation({ summary: 'Cancelar cita desde el portal ciudadano' })
  async cancelarCita(
    @Param('municipioSlug') slug: string,
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
