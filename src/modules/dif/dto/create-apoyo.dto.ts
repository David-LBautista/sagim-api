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

  @ApiProperty({ enum: SupportType, example: SupportType.DESPENSA })
  @IsEnum(SupportType)
  @IsNotEmpty()
  tipo: SupportType;

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

  @ApiProperty({ example: 'Entrega en comunidad', required: false })
  @IsString()
  @IsOptional()
  observaciones?: string;
}
