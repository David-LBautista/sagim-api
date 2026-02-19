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
import { SupportType } from '@/shared/enums';
import { ApiProperty } from '@nestjs/swagger';

export class CreateEntradaInventarioDto {
  @ApiProperty({ example: '697bf7fd36f2d5ed398d1ecd' })
  @IsMongoId()
  @IsNotEmpty()
  programaId: string;

  @ApiProperty({ enum: SupportType, example: SupportType.DESPENSA })
  @IsEnum(SupportType)
  @IsNotEmpty()
  tipo: SupportType;

  @ApiProperty({ example: 1500, description: 'Cantidad que ingresa' })
  @IsNumber()
  @Min(1)
  @IsNotEmpty()
  cantidad: number;

  @ApiProperty({
    example: 'Donación DIF Nacional',
    description: 'Concepto del ingreso',
  })
  @IsString()
  @IsNotEmpty()
  concepto: string;

  @ApiProperty({ example: '2026-01-30', description: 'Fecha del ingreso' })
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
}
