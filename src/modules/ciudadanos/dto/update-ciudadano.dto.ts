import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEmail,
  IsDateString,
  Matches,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class DireccionUpdateDto {
  @IsString() @IsOptional() localidad?: string;
  @IsString() @IsOptional() colonia?: string;
  @IsString() @IsOptional() calle?: string;
  @IsString() @IsOptional() numero?: string;
  @IsString() @IsOptional() codigoPostal?: string;
  @IsString() @IsOptional() referencias?: string;
}

export class UpdateCiudadanoDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  nombre?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  apellidoPaterno?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  apellidoMaterno?: string;

  @ApiProperty({ example: '2721234567', required: false })
  @IsString()
  @IsOptional()
  @Matches(/^\d{10}$/, { message: 'Teléfono debe tener 10 dígitos' })
  telefono?: string;

  @ApiProperty({ required: false })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiProperty({ example: '1990-01-15', required: false })
  @IsDateString()
  @IsOptional()
  fechaNacimiento?: string;

  @ApiProperty({ type: DireccionUpdateDto, required: false })
  @ValidateNested()
  @Type(() => DireccionUpdateDto)
  @IsOptional()
  direccion?: DireccionUpdateDto;
}
