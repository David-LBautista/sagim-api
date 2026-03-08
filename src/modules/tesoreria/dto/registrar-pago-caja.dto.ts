import {
  IsMongoId,
  IsNumber,
  Min,
  IsEnum,
  IsOptional,
  IsString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MetodoPago } from '@/shared/enums';

export class RegistrarPagoCajaDto {
  @ApiProperty({ description: 'ID del servicio cobrable (ObjectId)' })
  @IsMongoId()
  servicioId: string;

  @ApiProperty({ description: 'Monto del pago en MXN', example: 250 })
  @IsNumber()
  @Min(0)
  monto: number;

  @ApiProperty({ enum: MetodoPago, description: 'Método de pago' })
  @IsEnum(MetodoPago)
  metodoPago: MetodoPago;

  @ApiPropertyOptional({
    description:
      'ID del ciudadano (requerido si el servicio requiere contribuyente)',
  })
  @IsOptional()
  @IsMongoId()
  ciudadanoId?: string;

  @ApiPropertyOptional({ description: 'Observaciones adicionales del cajero' })
  @IsOptional()
  @IsString()
  observaciones?: string;

  @ApiPropertyOptional({
    description:
      'Folio o referencia del documento relacionado (ej. folio del acta, número de expediente, clave catastral)',
    example: 'RC-2026-00142',
  })
  @IsOptional()
  @IsString()
  referenciaDocumento?: string;

  @ApiPropertyOptional({
    description:
      'ID de la orden interna generada por el departamento (Registro Civil, Secretaría, etc.). Al proveerlo, la orden se marca automáticamente como PAGADA.',
    example: '67c9f1a2ab3cd4ef56789012',
  })
  @IsOptional()
  @IsMongoId()
  ordenInternaId?: string;

  @ApiPropertyOptional({
    description:
      'Nombre del contribuyente cuando no está registrado en el sistema. Se imprime en el recibo.',
    example: 'Juan López García',
  })
  @IsOptional()
  @IsString()
  nombreContribuyente?: string;
}
