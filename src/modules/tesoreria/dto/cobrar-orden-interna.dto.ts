import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MetodoPago } from '@/shared/enums';

export class CobrarOrdenInternaDto {
  @ApiProperty({
    enum: MetodoPago,
    description: 'Método de pago con el que el ciudadano liquida la orden',
    example: MetodoPago.EFECTIVO,
  })
  @IsEnum(MetodoPago)
  metodoPago: MetodoPago;

  @ApiPropertyOptional({
    description: 'Observaciones adicionales del cajero',
    example: 'Pago recibido en ventanilla 3',
  })
  @IsOptional()
  @IsString()
  observaciones?: string;

  @ApiPropertyOptional({
    description:
      'Nombre del contribuyente cuando no está registrado en el sistema. Sobreescribe el de la orden si se envía.',
    example: 'David Lucas Bautista',
  })
  @IsOptional()
  @IsString()
  nombreContribuyente?: string;

  @ApiPropertyOptional({
    description:
      'Folio o referencia del documento relacionado (ej. folio del acta). Se puede editar aquí si difiere del registrado en la orden.',
    example: 'RC-2026-F4C2',
  })
  @IsOptional()
  @IsString()
  folioDocumento?: string;
}
