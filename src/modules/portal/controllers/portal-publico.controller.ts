import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiHeader } from '@nestjs/swagger';

import { PortalService } from '../portal.service';
import { Public } from '../../../common/decorators/public.decorator';
import { MunicipioSlug } from '../../../common/decorators/municipio-slug.decorator';

@ApiTags('Portal — Público')
@Public()
@Controller('public/portal')
export class PortalPublicoController {
  constructor(private readonly portalService: PortalService) {}

  /**
   * GET /public/portal
   *
   * Devuelve toda la configuración visual del portal:
   * nombre, logo, colores, mensaje de bienvenida, toggles de secciones,
   * redes sociales y footer.
   *
   * El frontend lo carga una sola vez al montar el PublicLayout.
   */
  @Get()
  @ApiOperation({
    summary: 'Configuración completa del portal público del municipio',
  })
  @ApiHeader({
    name: 'x-municipio-slug',
    required: false,
    description: 'Fallback para dev local',
  })
  async getPortal(@MunicipioSlug() slug: string) {
    const municipio = await this.portalService.resolverMunicipio(slug);
    return this.portalService.getPortalPublico(
      String(municipio._id),
      municipio.nombre,
      municipio.logoUrl,
    );
  }
}
