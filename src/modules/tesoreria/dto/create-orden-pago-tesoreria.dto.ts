import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsEmail,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateOrdenPagoTesoreriaDto {
  @ApiProperty({
    description: 'ID del servicio cobrable',
    example: '697bf7fd36f2d5ed398d1ecd',
  })
  @IsString()
  @IsNotEmpty()
  servicioId: string;

  @ApiProperty({
    description:
      'ID del ciudadano (opcional — vincula el pago y obtiene nombre/email)',
    required: false,
  })
  @IsOptional()
  @IsString()
  ciudadanoId?: string;

  @ApiProperty({
    description: 'Monto a cobrar (puede ajustarse del costo base)',
    example: 150,
  })
  @IsNumber()
  @Min(0.01)
  monto: number;

  @ApiProperty({
    description: 'Concepto del pago',
    example: 'Acta certificada 2026',
  })
  @IsString()
  @IsNotEmpty()
  concepto: string;

  @ApiProperty({
    description:
      'Email del ciudadano para enviar link (opcional si se provee ciudadanoId con email)',
    example: 'usuario@gmail.com',
    required: false,
  })
  @IsOptional()
  @IsEmail()
  emailCiudadano?: string;

  @ApiProperty({
    description: 'Horas de validez del link (default 48)',
    required: false,
    default: 48,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(72)
  horasValidez?: number;
}
