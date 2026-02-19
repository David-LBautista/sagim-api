import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  Min,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateOrdenPagoDto {
  @ApiProperty({
    description: 'ID del servicio municipal',
    example: '697bf7fd36f2d5ed398d1ecd',
    required: false,
  })
  @IsOptional()
  @IsString()
  servicioId?: string;

  @ApiProperty({
    description: 'ID del ciudadano (opcional)',
    required: false,
  })
  @IsOptional()
  @IsString()
  ciudadanoId?: string;

  @ApiProperty({
    description: 'Monto del pago en pesos',
    example: 150,
  })
  @IsNumber()
  @Min(0.01)
  monto: number;

  @ApiProperty({
    description: 'Concepto/descripción del pago',
    example: 'Acta de Nacimiento Certificada',
  })
  @IsString()
  @IsNotEmpty()
  descripcion: string;

  @ApiProperty({
    description: 'Área responsable del servicio',
    example: 'REGISTRO_CIVIL',
    required: false,
  })
  @IsOptional()
  @IsString()
  areaResponsable?: string;

  @ApiProperty({
    description: 'Horas de validez del token (24-72)',
    default: 48,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  horasValidez?: number; // Default 48 horas
}
