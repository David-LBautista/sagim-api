import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsInt,
  Min,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

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
  @IsBoolean()
  montoVariable?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  requiereContribuyente?: boolean;

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
