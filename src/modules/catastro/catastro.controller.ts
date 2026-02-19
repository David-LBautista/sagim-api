/* eslint-disable @typescript-eslint/no-unsafe-argument */
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CatastroService } from './catastro.service';
import { CreatePredioDto, CreateCitaDto, UpdateCitaDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards';
import {
  Roles,
  MunicipalityId,
  CurrentUser,
  TenantScope,
} from '@/common/decorators';
import { UserRole, AppointmentStatus } from '@/shared/enums';
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

  // ==================== CITAS ====================
  @Post('citas')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_MUNICIPIO, UserRole.OPERATIVO)
  @ApiOperation({ summary: 'Agendar una nueva cita de catastro' })
  createCita(
    @Body() createCitaDto: CreateCitaDto,
    @MunicipalityId() municipioId: string,
  ) {
    return this.catastroService.createCita(createCitaDto, municipioId);
  }

  @Get('citas')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_MUNICIPIO, UserRole.OPERATIVO)
  @ApiOperation({ summary: 'Listar citas con filtro por estado' })
  @ApiQuery({ name: 'estado', required: false, enum: AppointmentStatus })
  findCitas(@TenantScope() scope: any, @Query('estado') estado?: string) {
    return this.catastroService.findCitas(scope, estado);
  }

  @Get('citas/:id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_MUNICIPIO, UserRole.OPERATIVO)
  @ApiOperation({ summary: 'Obtener una cita por ID' })
  findCitaById(@Param('id') id: string, @TenantScope() scope: any) {
    return this.catastroService.findCitaById(id, scope);
  }

  @Patch('citas/:id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_MUNICIPIO, UserRole.OPERATIVO)
  @ApiOperation({ summary: 'Actualizar estado de una cita' })
  updateCita(
    @Param('id') id: string,
    @Body() updateCitaDto: UpdateCitaDto,
    @MunicipalityId() municipioId: string,
    @CurrentUser() user: any,
  ) {
    return this.catastroService.updateCita(
      id,
      updateCitaDto,
      municipioId,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      user.id,
    );
  }
}
