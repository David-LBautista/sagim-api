import {
  IsDateString,
  IsOptional,
  IsString,
  IsEnum,
  IsIn,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export type TipoReporteDIF =
  | 'apoyos'
  | 'beneficiarios'
  | 'inventario'
  | 'fondos';

export class FiltrosReporteDto {
  @ApiProperty({ example: '2026-01-01', description: 'Fecha inicio del rango' })
  @IsDateString()
  fechaInicio: string;

  @ApiProperty({ example: '2026-02-28', description: 'Fecha fin del rango' })
  @IsDateString()
  fechaFin: string;

  @ApiPropertyOptional({ example: '67a1b2c3d4e5f6789012abcd' })
  @IsOptional()
  @IsString()
  programaId?: string;

  @ApiPropertyOptional({ example: 'Centro' })
  @IsOptional()
  @IsString()
  localidad?: string;

  @ApiPropertyOptional({ example: 'ADULTO_MAYOR' })
  @IsOptional()
  @IsString()
  grupoVulnerable?: string;

  @ApiPropertyOptional({
    enum: ['apoyos', 'beneficiarios', 'inventario', 'fondos'],
    description: 'Tipo de reporte a generar',
  })
  @IsOptional()
  @IsIn(['apoyos', 'beneficiarios', 'inventario', 'fondos'])
  tipo?: TipoReporteDIF;

  @ApiPropertyOptional({
    example: 300,
    description: 'Segundos de validez del link firmado (default: 300)',
  })
  @IsOptional()
  expiresIn?: number;
}
