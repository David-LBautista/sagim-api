import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  Min,
  IsBoolean,
  IsInt,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateServicioCobroDto {
  @ApiProperty({ example: 'ACTA_NACIMIENTO' })
  @IsString()
  @IsNotEmpty()
  clave: string;

  @ApiProperty({ example: 'Acta de Nacimiento' })
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @ApiProperty({ required: false, example: 'Expedición de copia certificada' })
  @IsOptional()
  @IsString()
  descripcion?: string;

  @ApiProperty({ example: 'Registro Civil' })
  @IsString()
  @IsNotEmpty()
  categoria: string;

  @ApiProperty({ example: 50, description: 'Costo base en pesos MXN' })
  @IsNumber()
  @Min(0)
  costo: number;

  @ApiProperty({ default: false, required: false })
  @IsOptional()
  @IsBoolean()
  montoVariable?: boolean;

  @ApiProperty({ default: false, required: false })
  @IsOptional()
  @IsBoolean()
  requiereContribuyente?: boolean;

  @ApiProperty({ default: 0, required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  orden?: number;

  @ApiProperty({ default: true, required: false })
  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
