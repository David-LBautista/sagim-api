import {
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsString,
  IsOptional,
  IsDateString,
  Min,
  IsArray,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

class ItemApoyoDto {
  @ApiProperty({ example: '697bf7fd36f2d5ed398d1ecd' })
  @IsMongoId()
  @IsNotEmpty()
  inventarioId: string;

  @ApiProperty({ example: 1 })
  @IsNumber()
  @Min(1)
  @IsNotEmpty()
  cantidad: number;
}

export class CreateApoyoDto {
  @ApiProperty({ example: '697bf7fd36f2d5ed398d1ecd' })
  @IsMongoId()
  @IsNotEmpty()
  beneficiarioId: string;

  @ApiProperty({ example: '697bf7fd36f2d5ed398d1ecd' })
  @IsMongoId()
  @IsNotEmpty()
  programaId: string;

  @ApiProperty({
    example: '2026-02-01',
    description: 'Fecha de entrega (YYYY-MM-DD)',
  })
  @IsDateString()
  @IsNotEmpty()
  fecha: string;

  @ApiProperty({
    example: 'DESPENSA',
    description: 'Clave del tipo de apoyo del catálogo',
  })
  @IsString()
  @IsNotEmpty()
  tipo: string;

  @ApiProperty({ example: 0, required: false })
  @IsNumber()
  @Min(0)
  @IsOptional()
  monto?: number;

  @ApiProperty({
    example: 1,
    description: 'Cantidad de recursos entregados',
    required: false,
  })
  @IsNumber()
  @Min(1)
  @IsOptional()
  cantidad?: number;

  @ApiProperty({
    type: [ItemApoyoDto],
    required: false,
    description: 'Items del inventario a entregar',
    example: [
      { inventarioId: '697bf7fd36f2d5ed398d1ecd', cantidad: 2 },
      { inventarioId: '697bf7fd36f2d5ed398d1ece', cantidad: 1 },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ItemApoyoDto)
  @ArrayMinSize(1)
  @IsOptional()
  items?: ItemApoyoDto[];

  @ApiProperty({ example: 'Entrega en comunidad', required: false })
  @IsString()
  @IsOptional()
  observaciones?: string;
}
