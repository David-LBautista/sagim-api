import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiHeader } from '@nestjs/swagger';
import { MunicipalitiesService } from './municipalities.service';
import { Public } from '@/common/decorators/public.decorator';
import { MunicipioSlug } from '@/common/decorators/municipio-slug.decorator';

@ApiTags('Municipios — Portal Público')
@Public()
@Controller('public')
export class MunicipalitiesPublicoController {
  constructor(private readonly municipalitiesService: MunicipalitiesService) {}

  /** GET /public/info */
  @Get('info')
  @ApiOperation({
    summary: 'Información pública del municipio (nombre, logo, contacto)',
  })
  @ApiHeader({
    name: 'x-municipio-slug',
    required: false,
    description: 'Fallback para dev local',
  })
  getInfo(@MunicipioSlug() slug: string) {
    return this.municipalitiesService.findPublico(slug);
  }
}
