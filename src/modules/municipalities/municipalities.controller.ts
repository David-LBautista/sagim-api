import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { MunicipalitiesService } from './municipalities.service';
import {
  CreateMunicipalityDto,
  UpdateMunicipalityConfigDto,
  UpdateMunicipalityDto,
} from './dto';
import { Roles } from '@/common/decorators/roles.decorator';
import { UserRole } from '@/shared/enums';

@ApiTags('Municipalities')
@ApiBearerAuth()
@Controller('municipios')
export class MunicipalitiesController {
  constructor(private readonly municipalitiesService: MunicipalitiesService) {}

  @Post()
  @Roles(UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('logo'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Crear nuevo municipio con logo (Solo SUPER_ADMIN)',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        logo: {
          type: 'string',
          format: 'binary',
          description: 'Logo del municipio (opcional)',
        },
        nombre: { type: 'string', example: 'La Perla' },
        estado: { type: 'string', example: 'Veracruz' },
        claveInegi: { type: 'string', example: '30091' },
        poblacion: { type: 'number', example: 10000 },
        contactoEmail: { type: 'string', example: 'contacto@laperla.gob.mx' },
        contactoTelefono: { type: 'string', example: '2721234567' },
        direccion: { type: 'string', example: 'Plaza Principal S/N' },
        config: {
          type: 'string',
          example: '{"modulos":{"DIF":true,"USUARIOS":true}}',
          description: 'Configuración en formato JSON string',
        },
      },
      required: ['nombre', 'estado', 'config'],
    },
  })
  @ApiResponse({ status: 201, description: 'Municipio creado exitosamente' })
  @ApiResponse({ status: 409, description: 'Municipio ya existe' })
  @ApiResponse({ status: 403, description: 'No autorizado' })
  async create(
    @Body() createMunicipalityDto: CreateMunicipalityDto,
    @UploadedFile() logo?: Express.Multer.File,
  ) {
    return this.municipalitiesService.create(createMunicipalityDto, logo);
  }

  @Get()
  @ApiOperation({ summary: 'Obtener listado de municipios' })
  @ApiResponse({ status: 200, description: 'Lista de municipios' })
  async findAll() {
    return this.municipalitiesService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener municipio por ID' })
  @ApiResponse({ status: 200, description: 'Municipio encontrado' })
  @ApiResponse({ status: 404, description: 'Municipio no encontrado' })
  async findOne(@Param('id') id: string) {
    return this.municipalitiesService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_MUNICIPIO)
  @UseInterceptors(FileInterceptor('logo'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary:
      'Actualizar municipio: contacto, admin, módulos y logo (SUPER_ADMIN o ADMIN)',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        logo: {
          type: 'string',
          format: 'binary',
          description: 'Logo del municipio (opcional)',
        },
        contactoEmail: { type: 'string', example: 'contacto@municipio.gob.mx' },
        contactoTelefono: { type: 'string', example: '2721234567' },
        direccion: { type: 'string', example: 'Av. Principal #123' },
        adminNombre: { type: 'string', example: 'Ruth Garcia Meza' },
        adminEmail: {
          type: 'string',
          example: 'ruth.garcia@laperla.sagim.com',
        },
        adminPassword: { type: 'string', example: 'NuevoPassword123!' },
        adminTelefono: {
          type: 'string',
          example: '2721234567',
          description: 'Teléfono del administrador',
        },
        config: {
          type: 'string',
          example: '{"modulos":{"PRESIDENCIA":true,"DIF":true}}',
          description: 'Configuración de módulos en formato JSON string',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Municipio actualizado exitosamente',
  })
  @ApiResponse({ status: 404, description: 'Municipio no encontrado' })
  @ApiResponse({ status: 403, description: 'No autorizado' })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateMunicipalityDto,
    @UploadedFile() logo?: Express.Multer.File,
  ) {
    return this.municipalitiesService.update(id, updateDto, logo);
  }

  @Patch(':id/config')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_MUNICIPIO)
  @ApiOperation({
    summary:
      'Actualizar configuración de módulos del municipio (SUPER_ADMIN o ADMIN)',
  })
  @ApiResponse({
    status: 200,
    description: 'Configuración actualizada exitosamente',
  })
  @ApiResponse({ status: 404, description: 'Municipio no encontrado' })
  @ApiResponse({ status: 403, description: 'No autorizado' })
  async updateConfig(
    @Param('id') id: string,
    @Body() updateConfigDto: UpdateMunicipalityConfigDto,
  ) {
    return this.municipalitiesService.updateConfig(id, updateConfigDto);
  }

  // ─────────────────────────────────────────────────────
  // ONBOARDING
  // ─────────────────────────────────────────────────────

  @Get(':id/onboarding')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_MUNICIPIO)
  @ApiOperation({
    summary:
      'Obtener estado del onboarding (pasos completados y datos del municipio)',
  })
  @ApiResponse({ status: 200, description: 'Estado del onboarding' })
  @ApiResponse({ status: 404, description: 'Municipio no encontrado' })
  async getOnboarding(@Param('id') id: string) {
    return this.municipalitiesService.getOnboarding(id);
  }

  @Patch(':id/onboarding/datos')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_MUNICIPIO)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Paso 1 — Admin verificó los datos del municipio y continuó',
  })
  @ApiResponse({
    status: 200,
    description: 'Paso datos marcado como completado',
  })
  @ApiResponse({ status: 404, description: 'Municipio no encontrado' })
  async completeOnboardingDatos(@Param('id') id: string) {
    return this.municipalitiesService.completeOnboardingDatos(id);
  }

  @Patch(':id/onboarding/servicios')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_MUNICIPIO)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Paso 2 — Admin revisó el catálogo de servicios y continuó',
  })
  @ApiResponse({
    status: 200,
    description: 'Paso servicios marcado como completado',
  })
  @ApiResponse({ status: 404, description: 'Municipio no encontrado' })
  async completeOnboardingServicios(@Param('id') id: string) {
    return this.municipalitiesService.completeOnboardingServicios(id);
  }

  @Patch(':id/onboarding/equipo')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_MUNICIPIO)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Paso 3 — Valida ≥1 operador activo y marca el paso como completado',
  })
  @ApiResponse({
    status: 200,
    description: 'Paso equipo marcado como completado',
  })
  @ApiResponse({ status: 400, description: 'Sin operadores registrados' })
  @ApiResponse({ status: 404, description: 'Municipio no encontrado' })
  async completeOnboardingEquipo(@Param('id') id: string) {
    return this.municipalitiesService.completeOnboardingEquipo(id);
  }

  @Patch(':id/onboarding/padron')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_MUNICIPIO)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Paso 4 — Importó padrón o lo saltó (paso opcional)',
  })
  @ApiResponse({
    status: 200,
    description: 'Paso padrón marcado como completado',
  })
  @ApiResponse({ status: 404, description: 'Municipio no encontrado' })
  async completeOnboardingPadron(
    @Param('id') id: string,
    @Body('saltado') saltado?: boolean,
  ) {
    return this.municipalitiesService.completeOnboardingPadron(id, saltado);
  }

  @Patch(':id/onboarding/completar')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_MUNICIPIO)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Paso final — Valida pasos requeridos y marca el municipio como activo en el sistema',
  })
  @ApiResponse({ status: 200, description: 'Onboarding completado' })
  @ApiResponse({ status: 400, description: 'Pasos requeridos sin completar' })
  @ApiResponse({ status: 404, description: 'Municipio no encontrado' })
  async completarOnboarding(@Param('id') id: string) {
    return this.municipalitiesService.completarOnboarding(id);
  }
}
