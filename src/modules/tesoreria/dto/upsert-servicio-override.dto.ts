import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsInt,
  IsEnum,
  Min,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { TipoTramite } from './create-servicio-cobro.dto';

/**
 * DTO para que un municipio cree o actualice un override de un servicio global.
 * Solo se envían los campos que se desean sobreescribir.
 */
export class UpsertServicioOverrideDto {
  @ApiProperty({
    required: false,
    example: 75,
    description: 'Nuevo costo del servicio para este municipio',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  costo?: number;

  @ApiProperty({ required: false, description: 'Costo en pesos MXN' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  costoPesos?: number;

  @ApiProperty({ required: false, description: 'Costo en UMA' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  costoUMA?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  nombre?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  descripcion?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  areaResponsable?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  montoVariable?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  requiereContribuyente?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  tieneDescuento?: boolean;

  @ApiProperty({ required: false, enum: TipoTramite })
  @IsOptional()
  @IsEnum(TipoTramite)
  tipoTramite?: TipoTramite;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  orden?: number;

  @ApiProperty({
    required: false,
    description: 'false = desactivar este servicio para el municipio',
  })
  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
