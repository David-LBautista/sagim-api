import {
  IsMongoId,
  IsNotEmpty,
  IsEnum,
  IsNumber,
  IsString,
  IsOptional,
  IsDateString,
  Min,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum TipoMovimientoInventario {
  IN = 'IN',
  OUT = 'OUT',
}

export class CreateMovimientoInventarioDto {
  @ApiProperty({
    enum: TipoMovimientoInventario,
    example: TipoMovimientoInventario.IN,
  })
  @IsEnum(TipoMovimientoInventario)
  @IsNotEmpty()
  type: TipoMovimientoInventario;

  @ApiProperty({ example: '697bf7fd36f2d5ed398d1ecd' })
  @IsMongoId()
  @IsNotEmpty()
  programaId: string;

  @ApiProperty({
    example: 'DESPENSA',
    description: 'Clave del tipo de apoyo del catálogo',
  })
  @IsString()
  @IsNotEmpty()
  tipo: string;

  @ApiProperty({ example: 1500, description: 'Cantidad del movimiento' })
  @IsNumber()
  @Min(1)
  @IsNotEmpty()
  cantidad: number;

  @ApiProperty({
    example: 'Donación DIF Nacional',
    description: 'Concepto del movimiento',
  })
  @IsString()
  @IsNotEmpty()
  concepto: string;

  @ApiProperty({ example: '2026-01-30', description: 'Fecha del movimiento' })
  @IsDateString()
  @IsNotEmpty()
  fecha: string;

  @ApiProperty({ example: 'OFICIO-DIF-2026-001', required: false })
  @IsString()
  @IsOptional()
  comprobante?: string;

  @ApiProperty({
    example: 'Despensas completas de 20 productos',
    required: false,
  })
  @IsString()
  @IsOptional()
  observaciones?: string;

  @ApiProperty({
    example: 150,
    description: 'Valor unitario en pesos',
    required: false,
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  valorUnitario?: number;

  @ApiProperty({
    example: '697bf7fd36f2d5ed398d1ecd',
    description: 'ID del apoyo relacionado (solo para type: OUT)',
    required: false,
  })
  @IsMongoId()
  @IsOptional()
  apoyoId?: string;
}
