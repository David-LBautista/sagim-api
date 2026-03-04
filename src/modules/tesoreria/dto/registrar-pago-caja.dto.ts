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
}
