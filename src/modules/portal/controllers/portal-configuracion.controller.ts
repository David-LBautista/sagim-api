import {
  Controller,
  Get,
  Patch,
  Post,
  Delete,
  Body,
  Param,
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
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';

import { PortalService } from '../portal.service';
import {
  UpdatePortalGeneralDto,
  UpdatePortalAparienciaDto,
  UpdatePortalRedesSocialesDto,
  UpdatePortalFooterDto,
} from '../dto/portal.dto';
import {
  CreatePortalAvisoDto,
  UpdatePortalAvisoDto,
} from '../dto/portal-aviso.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards';
import { Roles, MunicipalityId, CurrentUser } from '@/common/decorators';
import { UserRole } from '@/shared/enums';

@ApiTags('Portal — Configuración (Interno)')
@ApiBearerAuth()
@Controller('portal/configuracion')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PortalConfiguracionController {
  constructor(private readonly portalService: PortalService) {}

  // ── GET ──────────────────────────────────────────────────────────────────────

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_MUNICIPIO)
  @ApiOperation({ summary: 'Obtener configuración actual del portal' })
  async getConfiguracion(@MunicipalityId() municipioId: string) {
    return this.portalService.getConfiguracion(municipioId);
  }

  // ── PATCH por sección ────────────────────────────────────────────────────────

  @Patch('general')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_MUNICIPIO)
  @ApiOperation({
    summary:
      'Actualizar sección general (mensaje, subtítulo, toggles, mantenimiento)',
  })
  async updateGeneral(
    @MunicipalityId() municipioId: string,
    @Body() dto: UpdatePortalGeneralDto,
    @CurrentUser() user: any,
  ) {
    return this.portalService.updateGeneral(
      municipioId,
      dto,
      user._id?.toString(),
    );
  }

  @Patch('apariencia')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_MUNICIPIO)
  @ApiOperation({
    summary: 'Actualizar colores y texto alternativo del banner',
  })
  async updateApariencia(
    @MunicipalityId() municipioId: string,
    @Body() dto: UpdatePortalAparienciaDto,
    @CurrentUser() user: any,
  ) {
    return this.portalService.updateApariencia(
      municipioId,
      dto,
      user._id?.toString(),
    );
  }

  @Patch('redes-sociales')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_MUNICIPIO)
  @ApiOperation({ summary: 'Actualizar redes sociales y sitio web oficial' })
  async updateRedesSociales(
    @MunicipalityId() municipioId: string,
    @Body() dto: UpdatePortalRedesSocialesDto,
    @CurrentUser() user: any,
  ) {
    return this.portalService.updateRedesSociales(
      municipioId,
      dto,
      user._id?.toString(),
    );
  }

  @Patch('footer')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_MUNICIPIO)
  @ApiOperation({
    summary:
      'Actualizar footer (contacto, columnas de links, números de emergencia)',
  })
  async updateFooter(
    @MunicipalityId() municipioId: string,
    @Body() dto: UpdatePortalFooterDto,
    @CurrentUser() user: any,
  ) {
    return this.portalService.updateFooter(
      municipioId,
      dto,
      user._id?.toString(),
    );
  }

  // ── Upload banner ─────────────────────────────────────────────────────────────

  @Post('banner')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_MUNICIPIO)
  @ApiOperation({
    summary: 'Subir banner principal del portal (imagen, max 5 MB)',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['banner'],
      properties: {
        banner: { type: 'string', format: 'binary' },
      },
    },
  })
  @UseInterceptors(FileInterceptor('banner'))
  async uploadBanner(
    @MunicipalityId() municipioId: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: any,
  ) {
    if (!file) {
      throw new BadRequestException(
        'Debe enviar un archivo de imagen en el campo "banner"',
      );
    }
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedMimes.includes(file.mimetype)) {
      throw new BadRequestException(
        'Solo se permiten imágenes JPEG, PNG o WebP',
      );
    }
    if (file.size > 5 * 1024 * 1024) {
      throw new BadRequestException('La imagen no puede superar 5 MB');
    }
    return this.portalService.uploadBanner(
      municipioId,
      file,
      user._id?.toString(),
    );
  }

  // ── AVISOS ──────────────────────────────────────────────────────────────

  @Get('avisos')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_MUNICIPIO)
  @ApiOperation({
    summary: 'Listar todos los avisos del portal (incluye expirados)',
  })
  async getAvisos(@MunicipalityId() municipioId: string) {
    return this.portalService.getAvisos(municipioId);
  }

  @Post('avisos')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_MUNICIPIO)
  @ApiOperation({ summary: 'Crear aviso/noticia del portal público' })
  async createAviso(
    @MunicipalityId() municipioId: string,
    @Body() dto: CreatePortalAvisoDto,
    @CurrentUser() user: any,
  ) {
    return this.portalService.createAviso(
      municipioId,
      dto,
      user._id?.toString(),
    );
  }

  @Patch('avisos/:id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_MUNICIPIO)
  @ApiOperation({
    summary: 'Editar aviso (contenido, vigencia, orden, activo)',
  })
  async updateAviso(
    @MunicipalityId() municipioId: string,
    @Param('id') avisoId: string,
    @Body() dto: UpdatePortalAvisoDto,
    @CurrentUser() user: any,
  ) {
    return this.portalService.updateAviso(
      municipioId,
      avisoId,
      dto,
      user._id?.toString(),
    );
  }

  @Delete('avisos/:id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_MUNICIPIO)
  @ApiOperation({ summary: 'Eliminar aviso del portal' })
  async deleteAviso(
    @MunicipalityId() municipioId: string,
    @Param('id') avisoId: string,
  ) {
    return this.portalService.deleteAviso(municipioId, avisoId);
  }

  @Post('avisos/:id/imagen')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_MUNICIPIO)
  @ApiOperation({ summary: 'Subir imagen ilustrativa de un aviso (max 3 MB)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['imagen'],
      properties: { imagen: { type: 'string', format: 'binary' } },
    },
  })
  @UseInterceptors(FileInterceptor('imagen'))
  async uploadImagenAviso(
    @MunicipalityId() municipioId: string,
    @Param('id') avisoId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file)
      throw new BadRequestException(
        'Debe enviar una imagen en el campo "imagen"',
      );
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedMimes.includes(file.mimetype)) {
      throw new BadRequestException(
        'Solo se permiten imágenes JPEG, PNG o WebP',
      );
    }
    if (file.size > 3 * 1024 * 1024) {
      throw new BadRequestException('La imagen no puede superar 3 MB');
    }
    return this.portalService.uploadImagenAviso(municipioId, avisoId, file);
  }
}
