import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UploadedFiles,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiQuery,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';

import { ReportesService } from '../reportes.service';
import { CrearReportePublicoDto, MetricasQueryDto } from '../dto/reportes.dto';
import { Public } from '../../../common/decorators/public.decorator';

@ApiTags('Reportes — Portal Público')
@Public()
@Controller('public/:municipioSlug/reportes')
export class ReportesPublicoController {
  constructor(private readonly reportesService: ReportesService) {}

  /** GET /public/:municipioSlug/reportes/info */
  @Get('info')
  @ApiOperation({ summary: 'Información del portal de reportes del municipio' })
  async getInfoPortal(@Param('municipioSlug') slug: string) {
    const municipio = await this.reportesService.resolverMunicipio(slug);
    return this.reportesService.getInfoPortal(String(municipio._id));
  }

  /** GET /public/:municipioSlug/reportes/categorias */
  @Get('categorias')
  @ApiOperation({ summary: 'Categorías de reportes activas del municipio' })
  async getCategoriasActivas(@Param('municipioSlug') slug: string) {
    const municipio = await this.reportesService.resolverMunicipio(slug);
    return this.reportesService.getCategoriasActivas(String(municipio._id));
  }

  /** POST /public/:municipioSlug/reportes */
  @Post()
  @ApiOperation({
    summary: 'Crear un reporte ciudadano desde el portal público',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['categoria', 'descripcion', 'ubicacion'],
      properties: {
        categoria: { type: 'string', example: 'infraestructura_vial' },
        descripcion: {
          type: 'string',
          example: 'Bache grande en la calle principal',
        },
        ubicacion: {
          type: 'object',
          properties: {
            descripcion: { type: 'string', example: 'Calle 5 de Mayo s/n' },
            colonia: { type: 'string', example: 'Centro' },
            referencia: { type: 'string', example: 'Frente al parque' },
            latitud: { type: 'number', example: 18.876 },
            longitud: { type: 'number', example: -97.123 },
          },
        },
        nombre: { type: 'string', example: 'Juan Pérez' },
        telefono: { type: 'string', example: '2281234567' },
        correo: { type: 'string', example: 'juan@example.com' },
        recibirNotificaciones: { type: 'boolean', example: true },
        evidencia: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
        },
      },
    },
  })
  @UseInterceptors(FilesInterceptor('evidencia', 5))
  async crearReporte(
    @Param('municipioSlug') slug: string,
    @Body() dto: CrearReportePublicoDto,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    const municipio = await this.reportesService.resolverMunicipio(slug);
    return this.reportesService.crearReportePublico(
      String(municipio._id),
      dto,
      municipio.nombre,
      slug,
      files,
    );
  }

  /** GET /public/:municipioSlug/reportes/consultar?folio=&token= */
  @Get('consultar')
  @ApiOperation({ summary: 'Consultar estado de reporte por folio y token' })
  @ApiQuery({ name: 'folio', required: true, example: 'REP-2501-0001' })
  @ApiQuery({
    name: 'token',
    required: true,
    description: 'UUID recibido por correo',
  })
  async consultarReporte(
    @Param('municipioSlug') slug: string,
    @Query('folio') folio: string,
    @Query('token') token: string,
  ) {
    if (!folio || !token) {
      throw new BadRequestException('Debe proporcionar folio y token');
    }
    const municipio = await this.reportesService.resolverMunicipio(slug);
    return this.reportesService.consultarReporte(
      String(municipio._id),
      folio,
      token,
    );
  }

  /** GET /public/:municipioSlug/reportes/metricas */
  @Get('metricas')
  @ApiOperation({ summary: 'Métricas públicas del portal de transparencia' })
  @ApiQuery({ name: 'mes', required: false, type: Number })
  @ApiQuery({ name: 'anio', required: false, type: Number })
  async getMetricas(
    @Param('municipioSlug') slug: string,
    @Query() query: MetricasQueryDto,
  ) {
    const municipio = await this.reportesService.resolverMunicipio(slug);
    return this.reportesService.getMetricasPublicas(
      String(municipio._id),
      query,
    );
  }
}
