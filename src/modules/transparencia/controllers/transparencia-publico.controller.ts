import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam } from '@nestjs/swagger';

import { TransparenciaService } from '../transparencia.service';
import { PortalService } from '../../portal/portal.service';
import { Public } from '../../../common/decorators/public.decorator';

@ApiTags('Transparencia — Público')
@Public()
@Controller('public/:municipioSlug/transparencia')
export class TransparenciaPublicoController {
  constructor(
    private readonly transparenciaService: TransparenciaService,
    private readonly portalService: PortalService,
  ) {}

  /**
   * GET /public/:municipioSlug/transparencia
   *
   * Devuelve todas las secciones con documentos.
   * Las secciones vacías NO aparecen.
   */
  @Get()
  @ApiOperation({
    summary:
      'Portal de transparencia del municipio (solo secciones con documentos)',
  })
  @ApiParam({ name: 'municipioSlug', example: 'veracruz' })
  async getPortalTransparencia(@Param('municipioSlug') slug: string) {
    const municipio = await this.portalService.resolverMunicipio(slug);
    const secciones = await this.transparenciaService.getPortalTransparencia(
      String(municipio._id),
    );
    return {
      municipio: municipio.nombre,
      ...secciones,
    };
  }

  /**
   * GET /public/:municipioSlug/transparencia/:clave
   *
   * Detalle público de una sección (404 si no tiene documentos).
   */
  @Get(':clave')
  @ApiOperation({
    summary:
      'Detalle de una sección de transparencia (solo si tiene documentos)',
  })
  @ApiParam({ name: 'municipioSlug', example: 'veracruz' })
  @ApiParam({ name: 'clave', example: 'marco_normativo' })
  async getSeccion(
    @Param('municipioSlug') slug: string,
    @Param('clave') clave: string,
  ) {
    const municipio = await this.portalService.resolverMunicipio(slug);
    return this.transparenciaService.getSeccionPublica(
      String(municipio._id),
      clave,
    );
  }
}
