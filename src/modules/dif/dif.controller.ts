import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  HttpCode,
  HttpStatus,
  Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
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
  ApiConsumes,
  ApiBody,
  ApiResponse,
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
    summary: 'Listar beneficiarios con filtros avanzados y paginación',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Buscar por nombre, CURP o folio',
  })
  @ApiQuery({
    name: 'curp',
    required: false,
    description: 'Búsqueda parcial por CURP (legacy)',
  })
  @ApiQuery({ name: 'sexo', required: false, enum: ['M', 'F'] })
  @ApiQuery({
    name: 'activo',
    required: false,
    enum: ['true', 'false'],
    description: 'Estatus del beneficiario (default: true)',
  })
  @ApiQuery({
    name: 'fechaInicio',
    required: false,
    description: 'Fecha registro desde (ISO 8601)',
  })
  @ApiQuery({
    name: 'fechaFin',
    required: false,
    description: 'Fecha registro hasta (ISO 8601)',
  })
  @ApiQuery({
    name: 'edadMin',
    required: false,
    description: 'Edad mínima (años)',
  })
  @ApiQuery({
    name: 'edadMax',
    required: false,
    description: 'Edad máxima (años)',
  })
  @ApiQuery({
    name: 'programaId',
    required: false,
    description: 'ID del programa DIF',
  })
  @ApiQuery({
    name: 'grupoVulnerable',
    required: false,
    description: 'Grupo vulnerable (ej. ADULTO_MAYOR, DISCAPACIDAD, MUJER)',
  })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  findBeneficiarios(
    @TenantScope() scope: any,
    @Query('search') search?: string,
    @Query('curp') curp?: string,
    @Query('sexo') sexo?: string,
    @Query('activo') activo?: string,
    @Query('fechaInicio') fechaInicio?: string,
    @Query('fechaFin') fechaFin?: string,
    @Query('edadMin') edadMin?: string,
    @Query('edadMax') edadMax?: string,
    @Query('programaId') programaId?: string,
    @Query('grupoVulnerable') grupoVulnerable?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;
    return this.difService.findBeneficiarios(
      scope,
      {
        search,
        curp,
        sexo,
        activo: activo === undefined ? undefined : activo === 'true',
        fechaInicio,
        fechaFin,
        edadMin: edadMin ? parseInt(edadMin, 10) : undefined,
        edadMax: edadMax ? parseInt(edadMax, 10) : undefined,
        programaId,
        grupoVulnerable,
      },
      pageNum,
      limitNum,
    );
  }

  @Post('beneficiarios/importar')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_MUNICIPIO, UserRole.OPERATIVO)
  @UseInterceptors(FileInterceptor('archivo'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary:
      'Importar padrón DIF desde Excel — crea ciudadanos si no existen y luego crea/actualiza beneficiarios',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['archivo', 'mapeo'],
      properties: {
        archivo: { type: 'string', format: 'binary' },
        mapeo: {
          type: 'string',
          example:
            '{"curp":"CURP","nombre":"NOMBRE","apellidoPaterno":"APELLIDO_PATERNO","apellidoMaterno":"APELLIDO_MATERNO","grupoVulnerable":"GRUPO_VULNERABLE","fechaNacimiento":"FECHA_NACIMIENTO","sexo":"SEXO","telefono":"TELEFONO","email":"EMAIL","localidad":"LOCALIDAD","domicilio":"DOMICILIO","observaciones":"OBSERVACIONES"}',
          description: 'JSON con mapeo campo-sistema → nombre columna Excel',
        },
        accionDuplicados: {
          type: 'string',
          enum: ['ignorar', 'actualizar'],
          default: 'ignorar',
        },
      },
    },
  })
  async importarBeneficiarios(
    @MunicipalityId() municipioId: string,
    @UploadedFile() archivo: Express.Multer.File,
    @Body('mapeo') mapeoStr: string,
    @Body('accionDuplicados')
    accionDuplicados: 'ignorar' | 'actualizar' = 'ignorar',
  ) {
    let mapeo: Record<string, string>;
    try {
      mapeo = JSON.parse(mapeoStr ?? '{}');
    } catch {
      mapeo = {};
    }
    return this.difService.importarBeneficiarios(
      municipioId,
      archivo.buffer,
      mapeo,
      accionDuplicados ?? 'ignorar',
    );
  }

  @Get('beneficiarios/verificar-curp/:curp')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_MUNICIPIO, UserRole.OPERATIVO)
  @ApiOperation({
    summary:
      'Verificar si existe un beneficiario por CURP — siempre 200, nunca 404. Usar en dialogs de registro.',
  })
  @ApiResponse({
    status: 200,
    schema: {
      example: {
        existe: false,
        beneficiario: null,
      },
    },
  })
  verificarBeneficiarioCurp(
    @Param('curp') curp: string,
    @TenantScope() scope: any,
  ) {
    return this.difService.verificarBeneficiarioCurp(curp, scope);
  }

  @Get('beneficiarios/estadisticas')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_MUNICIPIO, UserRole.OPERATIVO)
  @ApiOperation({
    summary: 'Estadísticas del padrón — tarjetas del dashboard DIF',
  })
  estadisticasBeneficiarios(@TenantScope() scope: any) {
    return this.difService.estadisticasBeneficiarios(scope);
  }

  @Get('beneficiarios/exportar')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_MUNICIPIO, UserRole.OPERATIVO)
  @ApiOperation({ summary: 'Exportar padrón de beneficiarios a Excel (.xlsx)' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'grupoVulnerable', required: false })
  @ApiQuery({ name: 'programaId', required: false })
  @ApiQuery({ name: 'activo', required: false, enum: ['true', 'false'] })
  async exportarBeneficiarios(
    @TenantScope() scope: any,
    @Query('search') search: string,
    @Query('grupoVulnerable') grupoVulnerable: string,
    @Query('programaId') programaId: string,
    @Query('activo') activo: string,
    @Res() res: Response,
  ) {
    const buffer = await this.difService.exportarBeneficiarios(scope, {
      search,
      grupoVulnerable,
      programaId,
      activo,
    });
    const hoy = new Date().toISOString().split('T')[0];
    res.set({
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="padron-beneficiarios-${hoy}.xlsx"`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
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
    @TenantScope() scope: any,
  ) {
    return this.difService.updateBeneficiario(id, updateBeneficiarioDto, scope);
  }

  @Patch('beneficiarios/:id/desactivar')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_MUNICIPIO, UserRole.OPERATIVO)
  @ApiOperation({
    summary:
      'Baja lógica del beneficiario (activo: false). Historial de apoyos queda intacto.',
  })
  desactivarBeneficiario(@Param('id') id: string, @TenantScope() scope: any) {
    return this.difService.desactivarBeneficiario(id, scope);
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
  @ApiOperation({ summary: 'Listar todos los programas sociales' })
  findProgramas(@TenantScope() scope: any) {
    return this.difService.findProgramas(scope);
  }

  @Get('programas/:id')
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

  @Get('apoyos/exportar')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_MUNICIPIO, UserRole.OPERATIVO)
  @ApiOperation({ summary: 'Exportar historial de apoyos a Excel (.xlsx)' })
  @ApiQuery({ name: 'programaId', required: false })
  @ApiQuery({ name: 'curp', required: false })
  @ApiQuery({
    name: 'from',
    required: false,
    description: 'Fecha inicial YYYY-MM-DD',
  })
  @ApiQuery({
    name: 'to',
    required: false,
    description: 'Fecha final YYYY-MM-DD',
  })
  async exportarApoyos(
    @TenantScope() scope: any,
    @Query('programaId') programaId: string,
    @Query('curp') curp: string,
    @Query('from') from: string,
    @Query('to') to: string,
    @Res() res: Response,
  ) {
    const buffer = await this.difService.exportarApoyos(scope, {
      curp,
      programaId,
      from,
      to,
    });
    const hoy = new Date().toISOString().split('T')[0];
    res.set({
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="apoyos-dif-${hoy}.xlsx"`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }

  @Get('apoyos/dashboard')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_MUNICIPIO, UserRole.OPERATIVO)
  @ApiOperation({ summary: 'Dashboard de apoyos con métricas clave' })
  getApoyosDashboard(@TenantScope() scope: any) {
    return this.difService.getApoyosDashboard(scope);
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
