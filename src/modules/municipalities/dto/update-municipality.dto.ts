import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEmail,
  IsObject,
  IsBoolean,
  IsNumber,
  Min,
  Max,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type, Transform, plainToInstance } from 'class-transformer';

class ModulosUpdateDto {
  @IsOptional() @IsBoolean() PRESIDENCIA?: boolean;
  @IsOptional() @IsBoolean() SECRETARIA_AYUNTAMIENTO?: boolean;
  @IsOptional() @IsBoolean() COMUNICACION_SOCIAL?: boolean;
  @IsOptional() @IsBoolean() UIPPE?: boolean;
  @IsOptional() @IsBoolean() CONTRALORIA?: boolean;
  @IsOptional() @IsBoolean() SEGURIDAD_PUBLICA?: boolean;
  @IsOptional() @IsBoolean() SERVICIOS_PUBLICOS?: boolean;
  @IsOptional() @IsBoolean() DESARROLLO_URBANO?: boolean;
  @IsOptional() @IsBoolean() DESARROLLO_ECONOMICO?: boolean;
  @IsOptional() @IsBoolean() DESARROLLO_SOCIAL?: boolean;
  @IsOptional() @IsBoolean() TESORERIA?: boolean;
  @IsOptional() @IsBoolean() DIF?: boolean;
  @IsOptional() @IsBoolean() ORGANISMO_AGUA?: boolean;
  @IsOptional() @IsBoolean() USUARIOS?: boolean;
  @IsOptional() @IsBoolean() REPORTES?: boolean;
  @IsOptional() @IsBoolean() CITAS?: boolean;
  @IsOptional() @IsBoolean() REGISTRO_CIVIL?: boolean;
  @IsOptional() @IsBoolean() AUDITORIA?: boolean;
}

class ConfigUpdateDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => ModulosUpdateDto)
  modulos?: ModulosUpdateDto;
}

export class UpdateMunicipalityDto {
  // ==================== INFORMACIÓN DE CONTACTO ====================

  @ApiProperty({
    example: 'contacto@municipio.gob.mx',
    required: false,
    description: 'Email de contacto del municipio',
  })
  @IsEmail()
  @IsOptional()
  contactoEmail?: string;

  @ApiProperty({
    example: '2721234567',
    required: false,
    description: 'Teléfono de contacto del municipio',
  })
  @IsString()
  @IsOptional()
  contactoTelefono?: string;

  @ApiProperty({
    example: 'Av. Principal #123, Centro',
    required: false,
    description: 'Dirección del municipio',
  })
  @IsString()
  @IsOptional()
  direccion?: string;

  // ==================== DATOS DEL ADMINISTRADOR ====================

  @ApiProperty({
    example: 'Ruth García Meza',
    required: false,
    description: 'Nombre completo del administrador del municipio',
  })
  @IsString()
  @IsOptional()
  adminNombre?: string;

  @ApiProperty({
    example: 'ruth.garcia@laperla.sagim.com',
    required: false,
    description: 'Email del administrador del municipio',
  })
  @IsEmail()
  @IsOptional()
  adminEmail?: string;

  @ApiProperty({
    example: 'NuevoPassword123!',
    required: false,
    description:
      'Nueva contraseña del administrador (dejar vacío para no cambiar)',
  })
  @IsString()
  @IsOptional()
  @MinLength(8)
  adminPassword?: string;

  @ApiProperty({
    example: '2721234567',
    required: false,
    description: 'Teléfono del administrador del municipio',
  })
  @IsString()
  @IsOptional()
  adminTelefono?: string;

  // ==================== CONFIGURACIÓN FISCAL ====================

  @ApiProperty({
    example: 10,
    required: false,
    description:
      'Porcentaje de contribución incluido en el precio de los servicios (0–100). Usado para desglosar el recibo de caja.',
  })
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  porcentajeContribucion?: number;

  // ==================== MÓDULOS ====================

  @ApiProperty({
    required: false,
    description: 'Configuración de módulos habilitados',
    example: {
      modulos: {
        PRESIDENCIA: true,
        DIF: true,
        USUARIOS: true,
      },
    },
  })
  @IsObject()
  @IsOptional()
  @ValidateNested()
  @Type(() => ConfigUpdateDto)
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        return plainToInstance(ConfigUpdateDto, JSON.parse(value));
      } catch {
        return value;
      }
    }
    return value instanceof ConfigUpdateDto
      ? value
      : plainToInstance(ConfigUpdateDto, value);
  })
  config?: ConfigUpdateDto;
}
