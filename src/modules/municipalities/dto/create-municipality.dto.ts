import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsObject,
  IsEmail,
  MinLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { MunicipalityConfig } from '@/shared/interfaces';

export class CreateMunicipalityDto {
  @ApiProperty({ example: 'La Perla', description: 'Nombre del municipio' })
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @ApiProperty({ example: 'Veracruz', description: 'Estado' })
  @IsString()
  @IsNotEmpty()
  estado: string;

  @ApiProperty({
    example: '30082',
    description: 'Clave INEGI del municipio',
    required: false,
  })
  @IsString()
  @IsOptional()
  claveInegi?: string;

  @ApiProperty({ example: 25000, description: 'Población', required: false })
  @IsNumber()
  @IsOptional()
  poblacion?: number;

  @ApiProperty({
    example: {
      modulos: {
        PRESIDENCIA: true,
        SECRETARIA_AYUNTAMIENTO: true,
        TESORERIA: true,
        DIF: true,
        USUARIOS: true,
        REPORTES: true,
        CITAS: true,
      },
    },
    description:
      'Configuración de módulos del municipio (enviar como string JSON en multipart)',
  })
  @IsObject()
  @Transform(({ value }) => {
    // Si viene como string (desde multipart/form-data), parsearlo
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch (error) {
        throw new Error('config debe ser un JSON válido');
      }
    }
    return value;
  })
  config: MunicipalityConfig;

  @ApiProperty({
    example: 'admin@laperla.gob.mx',
    required: false,
    description: 'Email de contacto',
  })
  @IsString()
  @IsOptional()
  contactoEmail?: string;

  @ApiProperty({
    example: '2291234567',
    required: false,
    description: 'Teléfono de contacto',
  })
  @IsString()
  @IsOptional()
  contactoTelefono?: string;

  @ApiProperty({
    example: 'Av. Principal #123, Centro',
    required: false,
    description: 'Dirección',
  })
  @IsString()
  @IsOptional()
  direccion?: string;

  @ApiProperty({
    example: 'admin@laperla.gob.mx',
    description: 'Email del administrador del municipio',
  })
  @IsEmail()
  @IsNotEmpty()
  adminEmail: string;

  @ApiProperty({
    example: 'Admin123!',
    description: 'Contraseña del administrador del municipio',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  adminPassword: string;

  @ApiProperty({
    example: 'Juan Pérez',
    description: 'Nombre completo del administrador del municipio',
  })
  @IsString()
  @IsNotEmpty()
  adminNombre: string;
}
