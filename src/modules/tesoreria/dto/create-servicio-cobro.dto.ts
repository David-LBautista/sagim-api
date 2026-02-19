import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  Min,
  IsBoolean,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateServicioCobroDto {
  @ApiProperty({
    description: 'Nombre del servicio',
    example: 'Acta de Nacimiento Certificada',
  })
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @ApiProperty({
    description: 'Descripción del servicio',
    example: 'Emisión de acta certificada',
    required: false,
  })
  @IsOptional()
  @IsString()
  descripcion?: string;

  @ApiProperty({
    description: 'Costo del servicio en pesos',
    example: 150,
  })
  @IsNumber()
  @Min(0)
  costo: number;

  @ApiProperty({
    description: 'Si el servicio está activo',
    default: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
