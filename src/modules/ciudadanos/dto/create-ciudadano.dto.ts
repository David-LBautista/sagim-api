import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEmail,
  Matches,
  Length,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class DireccionDto {
  @ApiProperty({ example: 'Xometla', required: false })
  @IsString()
  @IsOptional()
  localidad?: string;

  @ApiProperty({ example: 'Centro', required: false })
  @IsString()
  @IsOptional()
  colonia?: string;

  @ApiProperty({ example: 'Principal', required: false })
  @IsString()
  @IsOptional()
  calle?: string;

  @ApiProperty({ example: 'S/N', required: false })
  @IsString()
  @IsOptional()
  numero?: string;

  @ApiProperty({ example: '91680', required: false })
  @IsString()
  @IsOptional()
  codigoPostal?: string;

  @ApiProperty({ example: 'Frente a la plaza', required: false })
  @IsString()
  @IsOptional()
  referencias?: string;
}

export class CreateCiudadanoDto {
  @ApiProperty({
    example: 'PEPJ900101HVERRN09',
    description: 'CURP del ciudadano (18 caracteres)',
  })
  @IsString()
  @IsNotEmpty()
  @Length(18, 18, { message: 'CURP debe tener exactamente 18 caracteres' })
  @Matches(/^[A-Z]{4}\d{6}[HM][A-Z]{5}[0-9A-Z]\d$/, {
    message: 'CURP no válido',
  })
  curp: string;

  @ApiProperty({ example: 'Pedro', description: 'Nombre(s)' })
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @ApiProperty({ example: 'Pérez', description: 'Apellido paterno' })
  @IsString()
  @IsNotEmpty()
  apellidoPaterno: string;

  @ApiProperty({ example: 'Juárez', description: 'Apellido materno' })
  @IsString()
  @IsNotEmpty()
  apellidoMaterno: string;

  @ApiProperty({ example: '2721234567', required: false })
  @IsString()
  @IsOptional()
  @Matches(/^\d{10}$/, { message: 'Teléfono debe tener 10 dígitos' })
  telefono?: string;

  @ApiProperty({ example: 'pedro@gmail.com', required: false })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiProperty({ type: DireccionDto, required: false })
  @ValidateNested()
  @Type(() => DireccionDto)
  @IsOptional()
  direccion?: DireccionDto;
}
