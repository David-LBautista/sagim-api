import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { DifReportesService } from './dif-reportes.service';
import { FiltrosReporteDto } from './dto/filtros-reporte.dto';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles, MunicipalityId } from '@/common/decorators';
import { UserRole } from '@/shared/enums';

@ApiTags('DIF — Reportes PDF')
@ApiBearerAuth()
@Controller('dif/reportes')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DifReportesController {
  constructor(private readonly difReportesService: DifReportesService) {}

  @Post('generar')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_MUNICIPIO, UserRole.OPERATIVO)
  @ApiOperation({
    summary: 'Generar reporte PDF DIF y obtener URL firmada de S3',
    description: `
Genera un PDF con los datos del DIF municipal según el tipo solicitado:
- **apoyos**: listado de apoyos entregados con filtros de fecha, programa, localidad y grupo vulnerable
- **beneficiarios**: padrón de beneficiarios con estadísticas de apoyos recibidos
- **inventario**: estado del inventario físico con semáforo de stock
- **fondos**: resumen financiero de fondos monetarios con balance del período

El PDF se sube a S3 en la ruta \`{municipioId}/reportes/\` y se devuelve una URL firmada temporal.
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'URL firmada del PDF generado',
    schema: {
      example: {
        url: 'https://sagim-documents.s3.amazonaws.com/...?X-Amz-Signature=...',
        key: '67a1b2c3/reportes/dif-apoyos-1709059200000.pdf',
        expiraEn: 300,
      },
    },
  })
  async generarReporte(
    @MunicipalityId() municipioId: string,
    @Body() filtros: FiltrosReporteDto,
  ) {
    const municipioIdStr = municipioId?.toString();
    const municipioNombre = `Municipio (${municipioIdStr.slice(-4).toUpperCase()})`;

    return this.difReportesService.generarReporte(
      municipioIdStr,
      municipioNombre,
      filtros,
    );
  }
}
