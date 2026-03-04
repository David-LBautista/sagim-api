import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { CiudadanosService } from './ciudadanos.service';
import { CreateCiudadanoDto } from './dto';
import { TenantScope, MunicipalityId } from '@/common/decorators';

@ApiTags('Ciudadanos')
@ApiBearerAuth()
@Controller('ciudadanos')
export class CiudadanosController {
  constructor(private readonly ciudadanosService: CiudadanosService) {}

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

  @Get()
  @ApiOperation({
    summary: 'Buscar ciudadano por CURP exacto o por nombre parcial',
  })
  @ApiQuery({
    name: 'curp',
    required: false,
    description: 'CURP exacto del ciudadano (18 caracteres)',
  })
  @ApiQuery({
    name: 'busqueda',
    required: false,
    description:
      'Búsqueda parcial por nombre, apellido o CURP (mín. 2 caracteres)',
  })
  @ApiResponse({ status: 200, description: 'Ciudadano(s) encontrado(s)' })
  @ApiResponse({ status: 404, description: 'Ciudadano no encontrado' })
  async findByCurp(
    @Query('curp') curp: string,
    @Query('busqueda') busqueda: string,
    @TenantScope() scope: any,
  ) {
    if (busqueda) {
      return this.ciudadanosService.buscar(busqueda, scope);
    }
    return this.ciudadanosService.findByCurp(curp, scope);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener ciudadano por ID' })
  @ApiResponse({ status: 200, description: 'Ciudadano encontrado' })
  @ApiResponse({ status: 404, description: 'Ciudadano no encontrado' })
  async findOne(@Param('id') id: string, @TenantScope() scope: any) {
    return this.ciudadanosService.findOne(id, scope);
  }
}
