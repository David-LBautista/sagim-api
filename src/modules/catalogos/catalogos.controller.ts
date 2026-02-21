import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CatalogosService } from './catalogos.service';
import { Public } from '@/common/decorators/public.decorator';
import { CurrentUser } from '@/common/decorators/user.decorator';
import { Roles } from '@/common/decorators';
import { UserRole } from '@/shared/enums';
import {
  CreateLocalidadDto,
  CreateLocalidadesBulkDto,
} from './dto/create-localidad.dto';

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

  @Public()
  @Get('unidades-medida')
  @ApiOperation({ summary: 'Obtener catálogo de unidades de medida' })
  @ApiResponse({
    status: 200,
    description: 'Lista de unidades de medida activas',
  })
  async getUnidadesMedida() {
    return this.catalogosService.getUnidadesMedida();
  }

  @Public()
  @Get('unidades-medida/:clave')
  @ApiOperation({ summary: 'Obtener una unidad de medida por clave' })
  @ApiResponse({ status: 200, description: 'Unidad de medida encontrada' })
  async getUnidadMedidaByClave(@Param('clave') clave: string) {
    return this.catalogosService.getUnidadMedidaByClave(clave);
  }

  @Public()
  @Get('tipos-movimiento')
  @ApiOperation({
    summary: 'Obtener catálogo de tipos de movimiento de inventario',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de tipos de movimiento activos',
  })
  async getTiposMovimiento() {
    return this.catalogosService.getTiposMovimiento();
  }

  @Public()
  @Get('tipos-movimiento/:clave')
  @ApiOperation({ summary: 'Obtener un tipo de movimiento por clave' })
  @ApiResponse({ status: 200, description: 'Tipo de movimiento encontrado' })
  async getTipoMovimientoByClave(@Param('clave') clave: string) {
    return this.catalogosService.getTipoMovimientoByClave(clave);
  }

  @Public()
  @Get('grupos-vulnerables')
  @ApiOperation({ summary: 'Obtener catálogo de grupos vulnerables' })
  @ApiResponse({
    status: 200,
    description: 'Lista de grupos vulnerables activos',
  })
  async getGruposVulnerables() {
    return this.catalogosService.getGruposVulnerables();
  }

  @Public()
  @Get('grupos-vulnerables/:clave')
  @ApiOperation({ summary: 'Obtener un grupo vulnerable por clave' })
  @ApiResponse({ status: 200, description: 'Grupo vulnerable encontrado' })
  async getGrupoVulnerableByClave(@Param('clave') clave: string) {
    return this.catalogosService.getGrupoVulnerableByClave(clave);
  }

  @Public()
  @Get('tipos-apoyo')
  @ApiOperation({ summary: 'Obtener catálogo de tipos de apoyo' })
  @ApiResponse({ status: 200, description: 'Lista de tipos de apoyo activos' })
  async getTiposApoyo() {
    return this.catalogosService.getTiposApoyo();
  }

  @Public()
  @Get('tipos-apoyo/:clave')
  @ApiOperation({ summary: 'Obtener un tipo de apoyo por clave' })
  @ApiResponse({ status: 200, description: 'Tipo de apoyo encontrado' })
  async getTipoApoyoByClave(@Param('clave') clave: string) {
    return this.catalogosService.getTipoApoyoByClave(clave);
  }

  @Public()
  @Get('localidades/municipio/:municipioId')
  @ApiOperation({ summary: 'Obtener localidades de un municipio específico' })
  @ApiResponse({
    status: 200,
    description: 'Lista de localidades del municipio',
  })
  async getLocalidadesByMunicipio(@Param('municipioId') municipioId: string) {
    return this.catalogosService.getLocalidadesByMunicipio(municipioId);
  }

  @Public()
  @Get('localidades/:id')
  @ApiOperation({ summary: 'Obtener una localidad por ID' })
  @ApiResponse({ status: 200, description: 'Localidad encontrada' })
  async getLocalidadById(@Param('id') id: string) {
    return this.catalogosService.getLocalidadById(id);
  }

  @Post('localidades')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_MUNICIPIO)
  @ApiOperation({ summary: 'Crear una nueva localidad' })
  @ApiResponse({ status: 201, description: 'Localidad creada exitosamente' })
  async createLocalidad(@Body() createLocalidadDto: CreateLocalidadDto) {
    return this.catalogosService.createLocalidad(createLocalidadDto);
  }

  @Post('localidades/bulk')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_MUNICIPIO)
  @ApiOperation({
    summary: 'Cargar múltiples localidades de un municipio (carga masiva)',
  })
  @ApiResponse({
    status: 201,
    description: 'Localidades cargadas exitosamente',
  })
  async createLocalidadesBulk(
    @Body() createLocalidadesBulkDto: CreateLocalidadesBulkDto,
  ) {
    return this.catalogosService.createLocalidadesBulk(
      createLocalidadesBulkDto.municipioId,
      createLocalidadesBulkDto.localidades,
    );
  }
}
