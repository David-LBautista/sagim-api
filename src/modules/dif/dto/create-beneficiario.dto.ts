import {
  IsNotEmpty,
  IsArray,
  IsString,
  IsOptional,
  IsEmail,
  IsDateString,
  Matches,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class CreateBeneficiarioDto {
  @ApiProperty({ example: 'Pedro' })
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @ApiProperty({ example: 'Ramírez' })
  @IsString()
  @IsNotEmpty()
  apellidoPaterno: string;

  @ApiProperty({ example: 'Cruz', required: false })
  @IsString()
  @IsOptional()
  apellidoMaterno?: string;

  @ApiProperty({ example: 'RACP650415HVZMRD03' })
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => value?.toUpperCase())
  @Matches(/^[A-Z]{4}\d{6}[HM][A-Z]{5}[0-9A-Z]\d$/i, {
    message: 'CURP debe tener el formato válido',
  })
  curp: string;

  @ApiProperty({ example: '1965-04-15', required: false })
  @IsDateString()
  @IsOptional()
  fechaNacimiento?: string;

  @ApiProperty({ example: 'M', enum: ['M', 'F'], required: false, description: 'M = Masculino, F = Femenino' })
  @IsString()
  @IsOptional()
  @Matches(/^[MF]$/i, {
    message: 'sexo debe ser M (Masculino) o F (Femenino)',
  })
  @Transform(({ value }) => value?.toUpperCase())
  sexo?: string;

  @ApiProperty({ example: '2281112233', required: false })
  @IsString()
  @IsOptional()
  telefono?: string;

  @ApiProperty({ example: 'pedro.ramirez@gmail.com', required: false })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiProperty({ example: 'Calle Allende #45, La Perla', required: false })
  @IsString()
  @IsOptional()
  domicilio?: string;

  @ApiProperty({ example: 'Cabecera Municipal', required: false })
  @IsString()
  @IsOptional()
  localidad?: string;

  @ApiProperty({
    isArray: true,
    example: ['ADULTO_MAYOR'],
    description: 'Claves de grupos vulnerables del catálogo',
  })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty()
  grupoVulnerable: string[];

  @ApiProperty({
    example: 'Vive solo, requiere apoyo alimentario',
    required: false,
  })
  @IsString()
  @IsOptional()
  observaciones?: string;
}
