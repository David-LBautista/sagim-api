import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsInt,
  IsEnum,
  IsDateString,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

export type TipoAviso = 'informativo' | 'alerta' | 'urgente';

export class CreatePortalAvisoDto {
  @ApiProperty({
    example: 'Paga tu predial antes del 31 de marzo',
    maxLength: 120,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  titulo: string;

  @ApiPropertyOptional({
    example: 'Evita recargos y aprovecha el descuento del 10% por pronto pago.',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  cuerpo?: string;

  @ApiPropertyOptional({
    enum: ['informativo', 'alerta', 'urgente'],
    default: 'informativo',
    description: 'informativo=azul | alerta=amarillo | urgente=rojo',
  })
  @IsOptional()
  @IsEnum(['informativo', 'alerta', 'urgente'])
  tipo?: TipoAviso;

  @ApiPropertyOptional({
    example: '/servicios/predial',
    description: 'URL interna o externa al que apunta el aviso',
  })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  url?: string;

  @ApiPropertyOptional({
    example: 'Ir a pagos',
    description: 'Texto del botón de acción (solo si se define url)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  urlTexto?: string;

  @ApiProperty({
    example: '2026-03-01T00:00:00.000Z',
    description: 'Fecha desde la que el aviso es visible (ISO 8601)',
  })
  @IsDateString()
  vigenciaInicio: string;

  @ApiProperty({
    example: '2026-03-31T23:59:59.000Z',
    description: 'Fecha en la que el aviso expira (ISO 8601)',
  })
  @IsDateString()
  vigenciaFin: string;

  @ApiPropertyOptional({
    default: 0,
    description: 'Orden en el listado (menor = primero)',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  orden?: number;
}

export class UpdatePortalAvisoDto extends PartialType(CreatePortalAvisoDto) {
  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  activo?: boolean;
  // imagenUrl se actualiza vía POST /portal/configuracion/avisos/:id/imagen
}
