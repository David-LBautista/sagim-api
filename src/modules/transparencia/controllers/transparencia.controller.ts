import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UploadedFile,
  UseInterceptors,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';

import { TransparenciaService } from '../transparencia.service';
import {
  AgregarDocumentoDto,
  EliminarDocumentoDto,
  MarcarCorrienteDto,
  UpdateNotaDto,
  FiltrosSeccionesDto,
} from '../dto/transparencia.dto';
import {
  CurrentUser,
  MunicipalityId,
  UserId,
} from '../../../common/decorators/user.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { MunicipalityGuard } from '../../../common/guards/municipality.guard';
import { UserRole } from '../../../shared/enums';

@ApiTags('Transparencia — Panel Interno')
@ApiBearerAuth()
@UseGuards(MunicipalityGuard, RolesGuard)
@Controller('transparencia')
export class TransparenciaController {
  constructor(private readonly transparenciaService: TransparenciaService) {}

  // ── GET /transparencia ───────────────────────────────────────────────────────

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_MUNICIPIO)
  @ApiOperation({
    summary: 'Listar secciones con estado + resumen de cumplimiento',
  })
  @ApiQuery({ name: 'tipo', enum: ['comun', 'municipal'], required: false })
  @ApiQuery({
    name: 'estado',
    enum: ['al_corriente', 'con_documentos', 'sin_documentos'],
    required: false,
  })
  @ApiQuery({ name: 'area', type: String, required: false })
  @ApiQuery({
    name: 'periodo',
    enum: ['Trimestral', 'Anual', 'Permanente'],
    required: false,
  })
  getSecciones(
    @MunicipalityId() municipioId: string,
    @Query() filtros: FiltrosSeccionesDto,
  ) {
    return this.transparenciaService.getSecciones(municipioId, filtros);
  }

  // ── GET /transparencia/cumplimiento ─────────────────────────────────────────

  @Get('cumplimiento')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_MUNICIPIO)
  @ApiOperation({ summary: 'Semáforo de cumplimiento para dashboard' })
  getCumplimiento(@MunicipalityId() municipioId: string) {
    return this.transparenciaService.getResumenCumplimiento(municipioId);
  }

  // ── GET /transparencia/:clave ────────────────────────────────────────────────

  @Get(':clave')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_MUNICIPIO)
  @ApiOperation({
    summary: 'Detalle completo de una sección (incluye notaInterna)',
  })
  @ApiParam({ name: 'clave', example: 'marco_normativo' })
  getSeccion(
    @MunicipalityId() municipioId: string,
    @Param('clave') clave: string,
  ) {
    return this.transparenciaService.getSeccion(municipioId, clave);
  }

  // ── POST /transparencia/:clave/documentos ────────────────────────────────────

  @Post(':clave/documentos')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_MUNICIPIO)
  @ApiOperation({
    summary:
      'Agregar documento (PDF multipart, link o texto). tipo determina el formato.',
  })
  @ApiParam({ name: 'clave', example: 'marco_normativo' })
  @ApiConsumes('multipart/form-data', 'application/json')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['nombre', 'tipo'],
      properties: {
        archivo: {
          type: 'string',
          format: 'binary',
          description: 'Requerido si tipo = pdf (max 10 MB)',
        },
        nombre: { type: 'string', example: 'Reglamento de Tránsito 2026' },
        descripcion: { type: 'string' },
        tipo: { type: 'string', enum: ['pdf', 'link', 'texto'] },
        url: {
          type: 'string',
          example: 'https://...',
          description: 'Si tipo = link',
        },
        texto: { type: 'string', description: 'Si tipo = texto' },
        periodoReferencia: { type: 'string', example: 'Marzo 2026' },
      },
    },
  })
  @UseInterceptors(FileInterceptor('archivo'))
  async agregarDocumento(
    @MunicipalityId() municipioId: string,
    @Param('clave') clave: string,
    @Body() dto: AgregarDocumentoDto,
    @UploadedFile() file: Express.Multer.File | undefined,
    @UserId() userId: string,
    @CurrentUser() user: any,
  ) {
    if (dto.tipo === 'pdf') {
      if (!file) {
        throw new BadRequestException(
          'Debe enviar un archivo en el campo "archivo" cuando tipo = pdf',
        );
      }
      const allowedPdfMimes = [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/msword',
      ];
      if (!allowedPdfMimes.includes(file.mimetype)) {
        throw new BadRequestException(
          'Solo se permiten archivos PDF o Word cuando tipo = pdf',
        );
      }
      if (file.size > 10 * 1024 * 1024) {
        throw new BadRequestException('El archivo no puede superar 10 MB');
      }
    }

    if (dto.tipo === 'excel') {
      if (!file) {
        throw new BadRequestException(
          'Debe enviar un archivo en el campo "archivo" cuando tipo = excel',
        );
      }
      const allowedExcelMimes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
        'text/csv',
      ];
      if (!allowedExcelMimes.includes(file.mimetype)) {
        throw new BadRequestException(
          'Solo se permiten archivos Excel (.xlsx, .xls) o CSV cuando tipo = excel',
        );
      }
      if (file.size > 10 * 1024 * 1024) {
        throw new BadRequestException('El archivo no puede superar 10 MB');
      }
    }

    return this.transparenciaService.agregarDocumento(
      municipioId,
      clave,
      dto,
      file,
      userId,
      user.nombre ?? user.email ?? userId,
    );
  }

  // ── DELETE /transparencia/:clave/documentos ──────────────────────────────────

  @Delete(':clave/documentos')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_MUNICIPIO)
  @ApiOperation({
    summary:
      'Eliminar un documento por índice (elimina de S3 si es PDF). Incluir subseccionClave si la sección tiene subsecciones.',
  })
  @ApiParam({ name: 'clave', example: 'marco_normativo' })
  eliminarDocumento(
    @MunicipalityId() municipioId: string,
    @Param('clave') clave: string,
    @Body() dto: EliminarDocumentoDto,
    @UserId() userId: string,
  ) {
    return this.transparenciaService.eliminarDocumento(
      municipioId,
      clave,
      dto,
      userId,
    );
  }

  // ── PATCH /transparencia/:clave/corriente ────────────────────────────────────

  @Patch(':clave/corriente')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_MUNICIPIO)
  @ApiOperation({
    summary:
      'Marcar/desmarcar sección "al corriente". Requiere al menos 1 documento.',
  })
  @ApiParam({ name: 'clave', example: 'marco_normativo' })
  marcarCorriente(
    @MunicipalityId() municipioId: string,
    @Param('clave') clave: string,
    @Body() dto: MarcarCorrienteDto,
    @UserId() userId: string,
  ) {
    return this.transparenciaService.marcarCorriente(
      municipioId,
      clave,
      dto.alCorriente,
      userId,
    );
  }

  // ── PATCH /transparencia/:clave/nota ─────────────────────────────────────────

  @Patch(':clave/nota')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_MUNICIPIO)
  @ApiOperation({
    summary: 'Actualizar nota interna de una sección (solo visible para admin)',
  })
  @ApiParam({ name: 'clave', example: 'marco_normativo' })
  updateNota(
    @MunicipalityId() municipioId: string,
    @Param('clave') clave: string,
    @Body() dto: UpdateNotaDto,
    @UserId() userId: string,
  ) {
    return this.transparenciaService.updateNota(
      municipioId,
      clave,
      dto.notaInterna,
      userId,
    );
  }
}
