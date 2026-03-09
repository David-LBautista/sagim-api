import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
  Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { Response } from 'express';
import { CiudadanosService } from './ciudadanos.service';
import { CreateCiudadanoDto, UpdateCiudadanoDto } from './dto';
import { TenantScope, MunicipalityId } from '@/common/decorators';

@ApiTags('Ciudadanos')
@ApiBearerAuth()
@Controller('ciudadanos')
export class CiudadanosController {
  constructor(private readonly ciudadanosService: CiudadanosService) {}

  // ─────────────────────────────────────────────────────
  // Rutas fijas ANTES que :id para evitar colisiones
  // ─────────────────────────────────────────────────────

  @Get('estadisticas')
  @ApiOperation({ summary: 'Métricas del padrón — tarjetas del panel' })
  @ApiResponse({
    status: 200,
    description: 'Total, con email y registrados este mes',
    schema: {
      example: { total: 487, conEmail: 312, registradosEsteMes: 23 },
    },
  })
  async estadisticas(@TenantScope() scope: any) {
    return this.ciudadanosService.estadisticas(scope);
  }

  @Get('exportar')
  @ApiOperation({ summary: 'Descargar padrón en Excel (.xlsx)' })
  @ApiQuery({ name: 'busqueda', required: false })
  @ApiQuery({ name: 'localidad', required: false })
  @ApiQuery({ name: 'activo', required: false, enum: ['true', 'false'] })
  @ApiResponse({ status: 200, description: 'Archivo .xlsx con el padrón' })
  async exportar(
    @TenantScope() scope: any,
    @Query('busqueda') busqueda: string,
    @Query('localidad') localidad: string,
    @Query('activo') activo: string,
    @Res() res: Response,
  ) {
    const buffer = await this.ciudadanosService.exportar(
      scope,
      busqueda,
      localidad,
      activo,
    );
    const fecha = new Date().toISOString().split('T')[0];
    res.set({
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="padron-ciudadanos-${fecha}.xlsx"`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }

  @Post('importar')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('archivo'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Importar padrón masivo desde Excel (.xlsx/.xls) o CSV',
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
            '{"curp":"CURP","nombre":"NOMBRE","apellidoPaterno":"AP_PATERNO","apellidoMaterno":"AP_MATERNO","telefono":"TELEFONO","email":"EMAIL","fechaNacimiento":"FECHA_NAC","localidad":"LOCALIDAD","colonia":"COLONIA","calle":"CALLE","numero":"NUMERO","codigoPostal":"CP"}',
          description:
            'JSON string con mapeo campo-sistema → nombre-columna-en-excel',
        },
        accionDuplicados: {
          type: 'string',
          enum: ['ignorar', 'actualizar'],
          default: 'ignorar',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    schema: {
      example: {
        importados: 487,
        actualizados: 9,
        ignorados: 0,
        errores: 2,
        detalleErrores: [
          { fila: 15, nombre: 'PEDRO MARTINEZ', error: 'CURP inválida: XXXX' },
        ],
      },
    },
  })
  async importar(
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
    return this.ciudadanosService.importar(
      municipioId,
      archivo.buffer,
      mapeo,
      accionDuplicados ?? 'ignorar',
    );
  }

  // ─────────────────────────────────────────────────────
  // CREATE
  // ─────────────────────────────────────────────────────

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Registrar nuevo ciudadano' })
  @ApiResponse({ status: 201, description: 'Ciudadano creado exitosamente' })
  @ApiResponse({ status: 409, description: 'CURP ya existe en el municipio' })
  async create(
    @Body() createCiudadanoDto: CreateCiudadanoDto,
    @MunicipalityId() municipioId: string,
  ) {
    return this.ciudadanosService.create(createCiudadanoDto, municipioId);
  }

  // ─────────────────────────────────────────────────────
  // LIST paginado
  // ─────────────────────────────────────────────────────

  @Get()
  @ApiOperation({
    summary: 'Listado paginado del padrón | búsqueda por CURP o nombre',
  })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiQuery({ name: 'busqueda', required: false })
  @ApiQuery({ name: 'localidad', required: false })
  @ApiQuery({
    name: 'activo',
    required: false,
    example: 'true',
    description: 'Filtrar por estado (true/false)',
  })
  @ApiQuery({
    name: 'curp',
    required: false,
    description: 'CURP exacto — devuelve objeto único',
  })
  @ApiResponse({ status: 200, description: 'Lista paginada de ciudadanos' })
  async findAll(
    @Query('curp') curp: string,
    @Query('busqueda') busqueda: string,
    @Query('page') page: number,
    @Query('limit') limit: number,
    @Query('localidad') localidad: string,
    @Query('activo') activo: string,
    @TenantScope() scope: any,
  ) {
    // Compatibilidad hacia atrás: ?curp= sin paginación → objeto único
    if (curp) return this.ciudadanosService.findByCurp(curp, scope);
    // ?busqueda= sin page/limit → array de 15 resultados (autocomplete)
    if (busqueda && !page && !limit)
      return this.ciudadanosService.buscar(busqueda, scope);

    return this.ciudadanosService.findAll(scope, {
      page,
      limit,
      busqueda,
      localidad,
      activo,
    });
  }

  // ─────────────────────────────────────────────────────
  // :id routes — SIEMPRE al final
  // ─────────────────────────────────────────────────────

  @Get(':id')
  @ApiOperation({ summary: 'Obtener ciudadano por ID' })
  @ApiResponse({ status: 200, description: 'Ciudadano encontrado' })
  @ApiResponse({ status: 404, description: 'Ciudadano no encontrado' })
  async findOne(@Param('id') id: string, @TenantScope() scope: any) {
    return this.ciudadanosService.findOne(id, scope);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Editar datos del ciudadano (no permite cambiar CURP)',
  })
  @ApiResponse({ status: 200, description: 'Ciudadano actualizado' })
  @ApiResponse({ status: 404, description: 'Ciudadano no encontrado' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateCiudadanoDto,
    @TenantScope() scope: any,
  ) {
    return this.ciudadanosService.update(id, dto, scope);
  }

  @Patch(':id/desactivar')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Baja lógica del ciudadano (activo: false). Historial de pagos y apoyos queda intacto.',
  })
  @ApiResponse({ status: 200, description: 'Ciudadano desactivado' })
  @ApiResponse({ status: 404, description: 'Ciudadano no encontrado' })
  async desactivar(@Param('id') id: string, @TenantScope() scope: any) {
    return this.ciudadanosService.desactivar(id, scope);
  }
}
