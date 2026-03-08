import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsMongoId,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateOrdenInternaDto {
  @ApiPropertyOptional({
    description:
      'ID del ciudadano registrado en el sistema. Si no se proporciona, usar nombreContribuyente.',
    example: '65e0bf7d36f2d5ed398d1abc',
  })
  @IsOptional()
  @IsMongoId()
  ciudadanoId?: string;

  @ApiPropertyOptional({
    description:
      'Nombre del contribuyente cuando no existe registro en el sistema. Obligatorio si no se provee ciudadanoId.',
    example: 'Juan López García',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  nombreContribuyente?: string;

  @ApiProperty({
    description: 'ID del servicio cobrable',
    example: '697bf7fd36f2d5ed398d1ecd',
  })
  @IsMongoId()
  servicioId: string;

  @ApiProperty({
    description: 'Monto a cobrar en pesos',
    example: 50,
  })
  @IsNumber()
  @Min(0.01)
  monto: number;

  @ApiProperty({
    description: 'Descripción del trámite',
    example: 'Acta de Nacimiento Certificada',
  })
  @IsString()
  @IsNotEmpty()
  descripcion: string;

  @ApiProperty({
    description: 'Área responsable del trámite',
    example: 'Registro Civil',
    required: false,
  })
  @IsOptional()
  @IsString()
  areaResponsable?: string;

  @ApiProperty({
    description: 'Observaciones adicionales',
    required: false,
  })
  @IsOptional()
  @IsString()
  observaciones?: string;

  @ApiProperty({
    description: 'Folio del documento tramitado (acta, licencia, etc.)',
    example: 'RC-2026-00123',
    required: false,
  })
  @IsOptional()
  @IsString()
  folioDocumento?: string;
}
