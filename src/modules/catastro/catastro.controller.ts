import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CatastroService } from './catastro.service';
import { CreatePredioDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards';
import { Roles, MunicipalityId, TenantScope } from '@/common/decorators';
import { UserRole } from '@/shared/enums';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
} from '@nestjs/swagger';

@ApiTags('Catastro')
@ApiBearerAuth()
@Controller('catastro')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CatastroController {
  constructor(private readonly catastroService: CatastroService) {}

  // ==================== PREDIOS ====================
  @Post('predios')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_MUNICIPIO, UserRole.OPERATIVO)
  @ApiOperation({ summary: 'Registrar un nuevo predio' })
  createPredio(
    @Body() createPredioDto: CreatePredioDto,
    @MunicipalityId() municipioId: string,
  ) {
    return this.catastroService.createPredio(createPredioDto, municipioId);
  }

  @Get('predios')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_MUNICIPIO, UserRole.OPERATIVO)
  @ApiOperation({ summary: 'Listar predios con filtro por propietario' })
  @ApiQuery({ name: 'propietarioId', required: false })
  findPredios(
    @TenantScope() scope: any,
    @Query('propietarioId') propietarioId?: string,
  ) {
    return this.catastroService.findPredios(scope, propietarioId);
  }

  @Get('predios/:id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_MUNICIPIO, UserRole.OPERATIVO)
  @ApiOperation({ summary: 'Obtener un predio por ID' })
  findPredioById(@Param('id') id: string, @TenantScope() scope: any) {
    return this.catastroService.findPredioById(id, scope);
  }

  @Get('predios/clave/:clave')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_MUNICIPIO, UserRole.OPERATIVO)
  @ApiOperation({ summary: 'Buscar predio por clave catastral' })
  findPredioByClave(@Param('clave') clave: string, @TenantScope() scope: any) {
    return this.catastroService.findPredioByClave(clave, scope);
  }
}
