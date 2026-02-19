import { IsNotEmpty, IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateProgramaDto {
  @ApiProperty({ example: 'Despensas Adulto Mayor' })
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @ApiProperty({ example: 'Apoyo mensual de despensas' })
  @IsString()
  @IsNotEmpty()
  descripcion: string;

  @ApiProperty({ example: 'Programa de apoyo alimentario', required: false })
  @IsString()
  @IsOptional()
  observaciones?: string;
}
