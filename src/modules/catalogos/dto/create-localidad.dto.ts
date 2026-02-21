import { IsString, IsNotEmpty, IsArray, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateLocalidadDto {
  @ApiProperty({ example: '65f1234567890abcdef11111' })
  @IsString()
  @IsNotEmpty()
  municipioId: string;

  @ApiProperty({ example: 'La Perla' })
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @ApiProperty({ example: '001', required: false })
  @IsString()
  @IsOptional()
  clave?: string;

  @ApiProperty({ example: 5000, required: false })
  @IsOptional()
  poblacion?: number;

  @ApiProperty({ example: '94730', required: false })
  @IsString()
  @IsOptional()
  codigoPostal?: string;
}

export class CreateLocalidadesBulkDto {
  @ApiProperty({ example: '65f1234567890abcdef11111' })
  @IsString()
  @IsNotEmpty()
  municipioId: string;

  @ApiProperty({
    example: ['La Perla', 'Chilapa', 'La Ciénaga'],
    description: 'Array de nombres de localidades',
  })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty()
  localidades: string[];
}
