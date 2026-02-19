import {
  IsMongoId,
  IsNotEmpty,
  IsString,
  IsDateString,
  IsOptional,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCitaDto {
  @ApiProperty({ example: '697bf7fd36f2d5ed398d1ecd', required: false })
  @IsMongoId()
  @IsOptional()
  predioId?: string;

  @ApiProperty({ example: '697bf7fd36f2d5ed398d1ecd' })
  @IsMongoId()
  @IsNotEmpty()
  ciudadanoId: string;

  @ApiProperty({
    example: '2026-03-10',
    description: 'Fecha de la cita (YYYY-MM-DD)',
  })
  @IsDateString()
  @IsNotEmpty()
  fecha: string;

  @ApiProperty({ example: 'Deslinde de predio' })
  @IsString()
  @IsNotEmpty()
  motivo: string;

  @ApiProperty({
    example: 'Cliente requiere revisión urgente',
    required: false,
  })
  @IsString()
  @IsOptional()
  observaciones?: string;
}
