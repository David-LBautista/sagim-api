import {
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsString,
  IsOptional,
  IsObject,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ReportType } from '@/shared/enums';
import { ApiProperty } from '@nestjs/swagger';

export class CreateReporteDto {
  @ApiProperty({
    example: 'Juan Pérez',
    required: false,
    description: 'Nombre del ciudadano (opcional para reportes anónimos)',
  })
  @IsString()
  @IsOptional()
  nombre?: string;

  @ApiProperty({
    example: '5551234567',
    required: false,
    description: 'Teléfono de contacto (opcional)',
  })
  @IsString()
  @IsOptional()
  telefono?: string;

  @ApiProperty({ enum: ReportType, example: ReportType.BACHE })
  @IsEnum(ReportType)
  @IsNotEmpty()
  tipo: ReportType;

  @ApiProperty({ example: 'No pasó el camión de basura' })
  @IsString()
  @IsNotEmpty()
  descripcion: string;

  @ApiProperty({ example: { lat: 18.876, lng: -97.123 } })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return JSON.parse(value);
    }
    return value;
  })
  @IsObject()
  @IsNotEmpty()
  ubicacion: { lat: number; lng: number };

  @ApiProperty({ example: 'Centro', required: false })
  @IsString()
  @IsOptional()
  colonia?: string;

  @ApiProperty({ example: 'Av. Hidalgo #123', required: false })
  @IsString()
  @IsOptional()
  calle?: string;
}
