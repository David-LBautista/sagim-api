import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  IsBoolean,
  Min,
} from 'class-validator';

export class CategoriaServicioResponseDto {
  @ApiProperty({ example: '65f1a2b3c4d5e6f7a8b9c0d1' })
  _id: string;

  @ApiProperty({ example: 'Registro Civil' })
  nombre: string;

  @ApiProperty({ example: 'Dirección de Registro Civil' })
  areaResponsable: string;

  @ApiProperty({ example: 1 })
  orden: number;

  @ApiProperty({ example: true })
  activo: boolean;
}

export class CreateCategoriaServicioDto {
  @ApiProperty({ example: 'Registro Civil' })
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @ApiProperty({ example: 'Dirección de Registro Civil' })
  @IsString()
  @IsNotEmpty()
  areaResponsable: string;

  @ApiProperty({ required: false, example: 1 })
  @IsOptional()
  @IsInt()
  @Min(0)
  orden?: number;

  @ApiProperty({ required: false, default: true })
  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
