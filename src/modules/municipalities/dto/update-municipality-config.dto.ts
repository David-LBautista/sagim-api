import { ApiProperty } from '@nestjs/swagger';
import { IsObject, ValidateNested, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { MunicipalityConfig } from '@/shared/interfaces';

class ModulosConfigDto {
  @ApiProperty({ example: true, required: false })
  @IsOptional()
  PRESIDENCIA?: boolean;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  SECRETARIA_AYUNTAMIENTO?: boolean;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  COMUNICACION_SOCIAL?: boolean;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  UIPPE?: boolean;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  CONTRALORIA?: boolean;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  SEGURIDAD_PUBLICA?: boolean;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  SERVICIOS_PUBLICOS?: boolean;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  DESARROLLO_URBANO?: boolean;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  DESARROLLO_ECONOMICO?: boolean;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  DESARROLLO_SOCIAL?: boolean;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  TESORERIA?: boolean;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  DIF?: boolean;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  ORGANISMO_AGUA?: boolean;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  USUARIOS?: boolean;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  REPORTES?: boolean;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  CITAS?: boolean;
}

class ConfigDto {
  @ApiProperty({ type: ModulosConfigDto })
  @ValidateNested()
  @Type(() => ModulosConfigDto)
  modulos: ModulosConfigDto;
}

export class UpdateMunicipalityConfigDto {
  @ApiProperty({
    type: ConfigDto,
    description: 'Configuración de módulos del municipio',
  })
  @IsObject()
  @ValidateNested()
  @Type(() => ConfigDto)
  config: MunicipalityConfig;
}
