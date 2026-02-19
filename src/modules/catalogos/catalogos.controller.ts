import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CatalogosService } from './catalogos.service';
import { Public } from '@/common/decorators/public.decorator';
import { CurrentUser } from '@/common/decorators/user.decorator';

@ApiTags('Catalogos')
@Controller('catalogos')
export class CatalogosController {
  constructor(private readonly catalogosService: CatalogosService) {}

  @Public()
  @Get('estados')
  @ApiOperation({ summary: 'Obtener catálogo de estados de la República' })
  @ApiResponse({ status: 200, description: 'Lista de estados activos' })
  async getEstados() {
    return this.catalogosService.getEstados();
  }

  @Public()
  @Get('estados/:estadoId/municipios')
  @ApiOperation({ summary: 'Obtener municipios de un estado específico' })
  @ApiResponse({ status: 200, description: 'Lista de municipios del estado' })
  async getMunicipiosByEstado(@Param('estadoId') estadoId: string) {
    return this.catalogosService.getMunicipiosByEstado(estadoId);
  }

  @Get('roles')
  @ApiOperation({
    summary: 'Obtener roles disponibles según el rol del usuario',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de roles que el usuario puede asignar',
  })
  async getRoles(@CurrentUser() user: any) {
    return this.catalogosService.getRoles(user.rol);
  }
}
