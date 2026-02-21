import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { DifService } from './dif.service';
import {
  CreateBeneficiarioDto,
  UpdateBeneficiarioDto,
  CreateProgramaDto,
  CreateApoyoDto,
  CreateEntradaInventarioDto,
  CreateMovimientoInventarioDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards';
import {
  Roles,
  MunicipalityId,
  CurrentUser,
  TenantScope,
} from '@/common/decorators';
import { UserRole } from '@/shared/enums';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
} from '@nestjs/swagger';

@ApiTags('DIF')
@ApiBearerAuth()
@Controller('dif')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DifController {
  constructor(private readonly difService: DifService) {}

  // ==================== BENEFICIARIOS ====================
  @Post('beneficiarios')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_MUNICIPIO, UserRole.OPERATIVO)
  @ApiOperation({ summary: 'Registrar un nuevo beneficiario en el padrón' })
  createBeneficiario(
    @Body() createBeneficiarioDto: CreateBeneficiarioDto,
    @MunicipalityId() municipioId: string,
  ) {
    return this.difService.createBeneficiario(
      createBeneficiarioDto,
      municipioId,
    );
  }

  @Get('beneficiarios')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_MUNICIPIO, UserRole.OPERATIVO)
  @ApiOperation({
    summary: 'Listar beneficiarios con filtro por CURP y paginación',
  })
  @ApiQuery({ name: 'curp', required: false })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  findBeneficiarios(
    @TenantScope() scope: any,
    @Query('curp') curp?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;
    return this.difService.findBeneficiarios(scope, curp, pageNum, limitNum);
  }

  @Get('beneficiarios/curp/:curp')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_MUNICIPIO, UserRole.OPERATIVO)
  @ApiOperation({
    summary: 'Buscar beneficiario por CURP con historial de apoyos paginado',
  })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  findBeneficiarioByCurp(
    @Param('curp') curp: string,
    @TenantScope() scope: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.difService.findBeneficiarioByCurp(
      curp,
      scope,
      pageNum,
      limitNum,
    );
  }

  @Get('beneficiarios/:id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_MUNICIPIO, UserRole.OPERATIVO)
  @ApiOperation({ summary: 'Obtener un beneficiario por ID' })
  findBeneficiarioById(@Param('id') id: string, @TenantScope() scope: any) {
    return this.difService.findBeneficiarioById(id, scope);
  }
  @Patch('beneficiarios/:id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_MUNICIPIO, UserRole.OPERATIVO)
  @ApiOperation({ summary: 'Actualizar datos de un beneficiario' })
  updateBeneficiario(
    @Param('id') id: string,
    @Body() updateBeneficiarioDto: UpdateBeneficiarioDto,
    @MunicipalityId() municipioId: string,
  ) {
    return this.difService.updateBeneficiario(
      id,
      updateBeneficiarioDto,
      municipioId,
    );
  }

  // ==================== PROGRAMAS ====================
  @Post('programas')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_MUNICIPIO, UserRole.OPERATIVO)
  @ApiOperation({ summary: 'Crear un nuevo programa social' })
  createPrograma(
    @Body() createProgramaDto: CreateProgramaDto,
    @MunicipalityId() municipioId: string,
  ) {
    return this.difService.createPrograma(createProgramaDto, municipioId);
  }

  @Get('programas')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_MUNICIPIO, UserRole.OPERATIVO)
  @ApiOperation({ summary: 'Listar todos los programas sociales' })
  findProgramas(@TenantScope() scope: any) {
    return this.difService.findProgramas(scope);
  }

  @Get('programas/:id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_MUNICIPIO, UserRole.OPERATIVO)
  @ApiOperation({ summary: 'Obtener un programa por ID' })
  findProgramaById(@Param('id') id: string, @TenantScope() scope: any) {
    return this.difService.findProgramaById(id, scope);
  }

  // ==================== APOYOS ====================
  @Post('apoyos')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_MUNICIPIO, UserRole.OPERATIVO)
  @ApiOperation({ summary: 'Registrar una entrega de apoyo' })
  createApoyo(
    @Body() createApoyoDto: CreateApoyoDto,
    @MunicipalityId() municipioId: string,
    @CurrentUser() user: any,
  ) {
    return this.difService.createApoyo(createApoyoDto, municipioId, user.sub);
  }

  @Get('apoyos')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_MUNICIPIO, UserRole.OPERATIVO)
  @ApiOperation({
    summary: 'Listar apoyos con filtro por beneficiario o programa',
  })
  @ApiQuery({ name: 'curp', required: false })
  @ApiQuery({ name: 'programaId', required: false })
  @ApiQuery({
    name: 'from',
    required: false,
    description: 'Fecha inicial (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'to',
    required: false,
    description: 'Fecha final (YYYY-MM-DD)',
  })
  findApoyos(
    @TenantScope() scope: any,
    @Query('curp') curp?: string,
    @Query('programaId') programaId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.difService.findApoyos(scope, curp, programaId, from, to);
  }

  @Get('apoyos/:id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_MUNICIPIO, UserRole.OPERATIVO)
  @ApiOperation({ summary: 'Obtener un apoyo por ID' })
  findApoyoById(@Param('id') id: string, @TenantScope() scope: any) {
    return this.difService.findApoyoById(id, scope);
  }

  // ==================== INVENTARIO - ITEMS (CATÁLOGO) ====================
  @Post('inventario/items')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_MUNICIPIO, UserRole.OPERATIVO)
  @ApiOperation({
    summary: 'Crear un nuevo item en el catálogo de inventario',
  })
  createInventarioItem(
    @Body() createEntradaDto: CreateEntradaInventarioDto,
    @MunicipalityId() municipioId: string,
    @CurrentUser() user: any,
  ) {
    return this.difService.registrarEntrada(
      createEntradaDto,
      municipioId,
      user.sub,
    );
  }

  @Get('inventario/items')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_MUNICIPIO, UserRole.OPERATIVO)
  @ApiOperation({ summary: 'Listar todos los items del inventario' })
  @ApiQuery({ name: 'programaId', required: false })
  getInventarioItems(
    @TenantScope() scope: any,
    @Query('programaId') programaId?: string,
  ) {
    return this.difService.getInventario(scope, programaId);
  }

  @Get('inventario/items/:id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_MUNICIPIO, UserRole.OPERATIVO)
  @ApiOperation({ summary: 'Obtener un item de inventario por ID' })
  getInventarioItemById(@Param('id') id: string, @TenantScope() scope: any) {
    return this.difService.findInventarioById(id, scope);
  }

  @Patch('inventario/items/:id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_MUNICIPIO, UserRole.OPERATIVO)
  @ApiOperation({ summary: 'Actualizar un item de inventario' })
  updateInventarioItem(
    @Param('id') id: string,
    @Body() updateDto: any,
    @TenantScope() scope: any,
  ) {
    return this.difService.updateInventarioItem(id, updateDto, scope);
  }

  // ==================== INVENTARIO - MOVIMIENTOS ====================
  @Post('inventario/movimientos')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_MUNICIPIO, UserRole.OPERATIVO)
  @ApiOperation({
    summary: 'Registrar movimiento de inventario (entrada o salida)',
  })
  createMovimiento(
    @Body() createMovimientoDto: CreateMovimientoInventarioDto,
    @MunicipalityId() municipioId: string,
    @CurrentUser() user: any,
  ) {
    return this.difService.createMovimiento(
      createMovimientoDto,
      municipioId,
      user.sub,
    );
  }

  @Get('inventario/movimientos')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_MUNICIPIO, UserRole.OPERATIVO)
  @ApiOperation({
    summary: 'Listar movimientos de inventario (entradas/salidas)',
  })
  @ApiQuery({ name: 'programaId', required: false })
  @ApiQuery({ name: 'type', required: false, enum: ['IN', 'OUT'] })
  getMovimientos(
    @TenantScope() scope: any,
    @Query('programaId') programaId?: string,
    @Query('type') type?: string,
  ) {
    return this.difService.getMovimientos(scope, {
      programaId,
      type: type as any,
    });
  }

  // ==================== INVENTARIO - DASHBOARD ====================
  @Get('inventario/dashboard')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_MUNICIPIO, UserRole.OPERATIVO)
  @ApiOperation({
    summary: 'Dashboard de inventario con métricas clave',
  })
  getInventarioDashboard(@TenantScope() scope: any) {
    return this.difService.getInventarioDashboard(scope);
  }
}
