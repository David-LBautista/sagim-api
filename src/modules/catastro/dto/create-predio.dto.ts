import {
  IsMongoId,
  IsNotEmpty,
  IsString,
  IsNumber,
  IsEnum,
  IsOptional,
  Min,
} from 'class-validator';
import { PropertyUse } from '@/shared/enums';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePredioDto {
  @ApiProperty({ example: 'LP-001-002' })
  @IsString()
  @IsNotEmpty()
  claveCatastral: string;

  @ApiProperty({ example: '697bf7fd36f2d5ed398d1ecd' })
  @IsMongoId()
  @IsNotEmpty()
  propietarioId: string;

  @ApiProperty({ example: 'Col. Centro, Calle Hidalgo #123' })
  @IsString()
  @IsNotEmpty()
  ubicacion: string;

  @ApiProperty({ example: 120, description: 'Superficie en m²' })
  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  superficie: number;

  @ApiProperty({ enum: PropertyUse, example: PropertyUse.HABITACIONAL })
  @IsEnum(PropertyUse)
  @IsNotEmpty()
  uso: PropertyUse;

  @ApiProperty({ example: 'Centro', required: false })
  @IsString()
  @IsOptional()
  colonia?: string;

  @ApiProperty({ example: 'Av. Hidalgo', required: false })
  @IsString()
  @IsOptional()
  calle?: string;

  @ApiProperty({ example: '123', required: false })
  @IsString()
  @IsOptional()
  numero?: string;

  @ApiProperty({ example: 500000, required: false })
  @IsNumber()
  @Min(0)
  @IsOptional()
  valorCatastral?: number;

  @ApiProperty({ example: 'Predio con escrituras', required: false })
  @IsString()
  @IsOptional()
  observaciones?: string;
}
