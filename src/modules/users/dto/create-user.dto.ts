import {
  IsEmail,
  IsString,
  IsEnum,
  IsBoolean,
  IsOptional,
  MinLength,
  IsMongoId,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '@/shared/enums';

export class CreateUserDto {
  @ApiPropertyOptional({
    description:
      'ID del municipio (requerido para ADMIN_MUNICIPIO y OPERATIVO)',
  })
  @IsOptional()
  @IsMongoId()
  municipioId?: string;

  @ApiPropertyOptional({
    description: 'ID del módulo (requerido solo para rol OPERATIVO)',
  })
  @IsOptional()
  @IsMongoId()
  moduloId?: string;

  @ApiProperty({ example: 'Juan Pérez' })
  @IsString()
  nombre: string;

  @ApiProperty({ example: 'juan@municipio.gob.mx' })
  @IsEmail({}, { message: 'Email inválido' })
  email: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  password: string;

  @ApiProperty({ enum: UserRole, example: UserRole.ADMIN_MUNICIPIO })
  @IsEnum(UserRole, { message: 'Rol inválido' })
  rol: UserRole;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  activo?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  telefono?: string;
}
