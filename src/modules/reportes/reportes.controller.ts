import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ReportesService } from './reportes.service';
import { CreateReporteDto, UpdateReporteDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards';
import { Roles, MunicipalityId, TenantScope } from '@/common/decorators';
import { UserRole, ReportType, ReportStatus } from '@/shared/enums';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';

@ApiTags('Reportes')
@ApiBearerAuth()
@Controller('reportes')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReportesController {
  constructor(private readonly reportesService: ReportesService) {}

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_MUNICIPIO, UserRole.OPERATIVO)
  @ApiOperation({ summary: 'Crear un nuevo reporte ciudadano con imágenes' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FilesInterceptor('evidencia', 10))
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        ciudadanoId: { type: 'string', example: '697bf7fd36f2d5ed398d1ecd' },
        tipo: {
          type: 'string',
          enum: ['BASURA', 'ALUMBRADO', 'BACHE', 'AGUA', 'DRENAJE', 'OTRO'],
          example: 'BACHE',
        },
        descripcion: {
          type: 'string',
          example: 'Bache grande en la calle principal',
        },
        ubicacion: { type: 'string', example: '{"lat":18.876,"lng":-97.123}' },
        colonia: { type: 'string', example: 'Centro' },
        calle: { type: 'string', example: 'Av. Hidalgo #123' },
        evidencia: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
        },
      },
    },
  })
  async create(
    @Body() createReporteDto: CreateReporteDto,
    @UploadedFiles() files: Express.Multer.File[],
    @MunicipalityId() municipioId: string,
  ) {
    return this.reportesService.create(createReporteDto, municipioId, files);
  }

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_MUNICIPIO, UserRole.OPERATIVO)
  @ApiOperation({ summary: 'Listar todos los reportes con filtros' })
  @ApiQuery({ name: 'tipo', required: false, enum: ReportType })
  @ApiQuery({ name: 'estado', required: false, enum: ReportStatus })
  @ApiQuery({ name: 'colonia', required: false })
  findAll(
    @TenantScope() scope: any,
    @Query('tipo') tipo?: string,
    @Query('estado') estado?: string,
    @Query('colonia') colonia?: string,
  ) {
    return this.reportesService.findAll(scope, { tipo, estado, colonia });
  }

  @Get(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_MUNICIPIO, UserRole.OPERATIVO)
  @ApiOperation({ summary: 'Obtener un reporte por ID' })
  findOne(@Param('id') id: string, @TenantScope() scope: any) {
    return this.reportesService.findOne(id, scope);
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_MUNICIPIO, UserRole.OPERATIVO)
  @ApiOperation({ summary: 'Actualizar estado de un reporte' })
  update(
    @Param('id') id: string,
    @Body() updateReporteDto: UpdateReporteDto,
    @MunicipalityId() municipioId: string,
  ) {
    return this.reportesService.update(id, updateReporteDto, municipioId);
  }

  @Post('upload')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_MUNICIPIO, UserRole.OPERATIVO)
  @ApiOperation({ summary: 'Subir imágenes a Cloudinary' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
        },
      },
    },
  })
  @UseInterceptors(FilesInterceptor('files', 10))
  async uploadImages(@UploadedFiles() files: Express.Multer.File[]) {
    return this.reportesService.uploadImages(files);
  }
}
