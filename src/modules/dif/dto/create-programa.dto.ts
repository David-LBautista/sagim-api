import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateProgramaDto {
  @ApiProperty({ example: 'Despensas DIF Municipal' })
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @ApiProperty({
    example: 'Apoyo alimentario con despensas básicas y especiales',
  })
  @IsString()
  @IsNotEmpty()
  descripcion: string;

  @ApiProperty({ example: 'DESPENSAS_DIF', required: false })
  @IsString()
  @IsOptional()
  clave?: string;

  @ApiProperty({
    example: 'municipal',
    enum: ['municipal', 'estatal', 'federal'],
    required: false,
  })
  @IsEnum(['municipal', 'estatal', 'federal'])
  @IsOptional()
  nivel?: string;

  @ApiProperty({ example: 'Alimentación', required: false })
  @IsString()
  @IsOptional()
  categoria?: string;

  @ApiProperty({
    example: ['Despensa básica', 'Despensa especial (adulto mayor)'],
    required: false,
    type: [String],
  })
  @IsArray()
  @IsOptional()
  tiposApoyo?: string[];

  @ApiProperty({ example: 'Programa de apoyo alimentario', required: false })
  @IsString()
  @IsOptional()
  observaciones?: string;
}
