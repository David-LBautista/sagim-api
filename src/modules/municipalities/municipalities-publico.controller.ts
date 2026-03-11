import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { MunicipalitiesService } from './municipalities.service';
import { Public } from '@/common/decorators/public.decorator';

@ApiTags('Municipios — Portal Público')
@Public()
@Controller('public/:municipioSlug')
export class MunicipalitiesPublicoController {
  constructor(private readonly municipalitiesService: MunicipalitiesService) {}

  /** GET /public/:municipioSlug/info */
  @Get('info')
  @ApiOperation({
    summary: 'Información pública del municipio (nombre, logo, contacto)',
  })
  getInfo(@Param('municipioSlug') slug: string) {
    return this.municipalitiesService.findPublico(slug);
  }
}
