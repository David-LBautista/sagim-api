import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEmail,
  IsBoolean,
  IsIn,
  IsNumber,
  Min,
  Max,
  MinLength,
  MaxLength,
  ValidateNested,
  IsPhoneNumber,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CATALOGO_CATEGORIAS_REPORTES } from '../schemas/reporte.schema';

const CLAVES_CATEGORIAS = CATALOGO_CATEGORIAS_REPORTES.map((c) => c.clave);
const ESTADOS_REPORTE = ['pendiente', 'en_proceso', 'resuelto', 'cancelado'];

// ─────────────────────────────────────────────────────────────
// Subdocuments
// ─────────────────────────────────────────────────────────────

export class UbicacionReporteDto {
  @ApiProperty({ example: 'Calle Hidalgo entre 5 de Mayo y Morelos' })
  @IsString()
  @IsNotEmpty()
  descripcion: string;

  @ApiPropertyOptional({ example: 'Centro' })
  @IsString()
  @IsOptional()
  colonia?: string;

  @ApiPropertyOptional({ example: 'Frente al parque central' })
  @IsString()
  @IsOptional()
  referencia?: string;

  @ApiPropertyOptional({ example: 19.4326 })
  @IsNumber()
  @IsOptional()
  @Min(-90)
  @Max(90)
  latitud?: number;

  @ApiPropertyOptional({ example: -99.1332 })
  @IsNumber()
  @IsOptional()
  @Min(-180)
  @Max(180)
  longitud?: number;
}

// ─────────────────────────────────────────────────────────────
// Crear reporte público
// ─────────────────────────────────────────────────────────────

export class CrearReportePublicoDto {
  @ApiProperty({ example: 'infraestructura_vial', enum: CLAVES_CATEGORIAS })
  @IsString()
  @IsNotEmpty()
  @IsIn(CLAVES_CATEGORIAS, {
    message: `La categoría debe ser una de: ${CLAVES_CATEGORIAS.join(', ')}`,
  })
  categoria: string;

  @ApiProperty({
    example: 'Hay un bache grande que ocupa la mitad de la calle',
    minLength: 10,
    maxLength: 500,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(10, {
    message: 'La descripción debe tener al menos 10 caracteres',
  })
  @MaxLength(500, { message: 'La descripción no puede exceder 500 caracteres' })
  descripcion: string;

  @ApiProperty({ type: UbicacionReporteDto })
  @ValidateNested()
  @Type(() => UbicacionReporteDto)
  ubicacion: UbicacionReporteDto;

  @ApiPropertyOptional({ example: 'María González López' })
  @IsString()
  @IsOptional()
  nombre?: string;

  @ApiPropertyOptional({ example: '2281234567' })
  @IsString()
  @IsOptional()
  telefono?: string;

  @ApiPropertyOptional({ example: 'ciudadano@correo.com' })
  @IsEmail()
  @IsOptional()
  correo?: string;

  @ApiPropertyOptional({ default: false })
  @IsBoolean()
  @IsOptional()
  recibirNotificaciones?: boolean;
}

// ─────────────────────────────────────────────────────────────
// Consultar reporte (folio + token | CURP)
// ─────────────────────────────────────────────────────────────

export class ConsultarReporteDto {
  @ApiProperty({ example: 'REP-2506-0001' })
  @IsString()
  @IsNotEmpty()
  folio: string;

  @ApiPropertyOptional({
    description: 'Token UUID recibido por correo, o CURP del ciudadano',
    example: 'a1b2c3d4-...',
  })
  @IsString()
  @IsOptional()
  token?: string;
}

// ─────────────────────────────────────────────────────────────
// Actualizar estado (uso interno)
// ─────────────────────────────────────────────────────────────

export class ActualizarEstadoReporteDto {
  @ApiProperty({ enum: ESTADOS_REPORTE })
  @IsString()
  @IsNotEmpty()
  @IsIn(ESTADOS_REPORTE)
  estado: string;

  @ApiPropertyOptional({ example: 'Se envió brigada al lugar' })
  @IsString()
  @IsOptional()
  comentarioPublico?: string;

  @ApiPropertyOptional({ example: 'Asignado a cuadrilla 3' })
  @IsString()
  @IsOptional()
  notaInterna?: string;
}

// ─────────────────────────────────────────────────────────────
// Crear reporte interno (funcionario / recepcionista)
// ─────────────────────────────────────────────────────────────

export class CrearReporteInternoDto {
  @ApiProperty({ example: 'infraestructura_vial', enum: CLAVES_CATEGORIAS })
  @IsString()
  @IsNotEmpty()
  @IsIn(CLAVES_CATEGORIAS, {
    message: `La categoría debe ser una de: ${CLAVES_CATEGORIAS.join(', ')}`,
  })
  categoria: string;

  @ApiProperty({ example: 'Ciudadano reporta bache en calle Hidalgo' })
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  @MaxLength(500)
  descripcion: string;

  @ApiProperty({ type: UbicacionReporteDto })
  @ValidateNested()
  @Type(() => UbicacionReporteDto)
  ubicacion: UbicacionReporteDto;

  @ApiPropertyOptional({ example: 'Juan Carlos Lopez' })
  @IsString()
  @IsOptional()
  nombre?: string;

  @ApiPropertyOptional({ example: '2721234567' })
  @IsString()
  @IsOptional()
  telefono?: string;

  @ApiPropertyOptional({
    enum: ['baja', 'normal', 'alta', 'urgente'],
    default: 'normal',
  })
  @IsString()
  @IsOptional()
  @IsIn(['baja', 'normal', 'alta', 'urgente'])
  prioridad?: string;

  @ApiPropertyOptional({
    enum: ['interno', 'telefono'],
    default: 'interno',
  })
  @IsString()
  @IsOptional()
  @IsIn(['interno', 'telefono'])
  origen?: 'interno' | 'telefono';
}

// ─────────────────────────────────────────────────────────────
// Asignar reporte a un funcionario
// ─────────────────────────────────────────────────────────────

export class AsignarReporteDto {
  @ApiProperty({ example: '63a1b2c3d4e5f6a7b8c9d0e1' })
  @IsString()
  @IsNotEmpty()
  usuarioId: string;

  @ApiPropertyOptional({ example: 'Juan Funcionario García' })
  @IsString()
  @IsOptional()
  nombreAsignado?: string;

  @ApiPropertyOptional({ example: 'Asignado por prioridad alta' })
  @IsString()
  @IsOptional()
  notaInterna?: string;
}

// ─────────────────────────────────────────────────────────────
// Cambiar prioridad
// ─────────────────────────────────────────────────────────────

export class CambiarPrioridadDto {
  @ApiProperty({ enum: ['baja', 'normal', 'alta', 'urgente'] })
  @IsString()
  @IsNotEmpty()
  @IsIn(['baja', 'normal', 'alta', 'urgente'])
  prioridad: string;
}

// ─────────────────────────────────────────────────────────────
// Cambiar visibilidad
// ─────────────────────────────────────────────────────────────

export class CambiarVisibilidadDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  visible: boolean;
}

// ─────────────────────────────────────────────────────────────
// Query params para métricas
// ─────────────────────────────────────────────────────────────

export class MetricasQueryDto {
  @ApiPropertyOptional({
    example: 4,
    description: 'Mes (1-12), default mes actual',
  })
  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(12)
  @Type(() => Number)
  mes?: number;

  @ApiPropertyOptional({
    example: 2026,
    description: 'Año, default año actual',
  })
  @IsNumber()
  @IsOptional()
  @Min(2020)
  @Type(() => Number)
  anio?: number;

  @ApiPropertyOptional({ example: 'ORGANISMO_AGUA' })
  @IsString()
  @IsOptional()
  modulo?: string;
}

// ─────────────────────────────────────────────────────────────
// Filtros para listado interno
// ─────────────────────────────────────────────────────────────

export class FiltrosReportesDto {
  @ApiPropertyOptional({ enum: CLAVES_CATEGORIAS })
  @IsString()
  @IsOptional()
  categoria?: string;

  @ApiPropertyOptional({ enum: ESTADOS_REPORTE })
  @IsString()
  @IsOptional()
  estado?: string;

  @ApiPropertyOptional({ example: 'DESARROLLO_URBANO' })
  @IsString()
  @IsOptional()
  modulo?: string;

  @ApiPropertyOptional({ enum: ['baja', 'normal', 'alta', 'urgente'] })
  @IsString()
  @IsOptional()
  prioridad?: string;

  @ApiPropertyOptional({ enum: ['portal_publico', 'interno', 'telefono'] })
  @IsString()
  @IsOptional()
  origen?: string;

  @ApiPropertyOptional({ description: 'Filtrar por userId asignado' })
  @IsString()
  @IsOptional()
  asignadoA?: string;

  @ApiPropertyOptional({ example: '2026-04-01' })
  @IsString()
  @IsOptional()
  fechaInicio?: string;

  @ApiPropertyOptional({ example: '2026-04-30' })
  @IsString()
  @IsOptional()
  fechaFin?: string;

  @ApiPropertyOptional({ example: 'fuga de agua' })
  @IsString()
  @IsOptional()
  buscar?: string;

  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsNumber()
  @IsOptional()
  @Min(1)
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({ example: 20, default: 20 })
  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number;
}

// ─────────────────────────────────────────────────────────────
// Alias para compat
// ─────────────────────────────────────────────────────────────

export class CreateReporteDto extends CrearReportePublicoDto {}
