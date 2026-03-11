import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsArray,
  IsDateString,
  IsIn,
  ValidateNested,
  Min,
  Max,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DiaSemana } from '../schemas/cita-configuracion.schema';

// ─── Configuración ──────────────────────────────────────────

export class CreateBloqueHorarioDto {
  @ApiProperty({ example: '09:00' })
  @IsString()
  @IsNotEmpty()
  inicio: string;

  @ApiProperty({ example: '14:00' })
  @IsString()
  @IsNotEmpty()
  fin: string;

  @ApiProperty({ example: 1, default: 1 })
  @IsNumber()
  @Min(1)
  @IsOptional()
  capacidadPorSlot?: number;
}

export class CreateHorarioDiaDto {
  @ApiProperty({
    enum: [
      'lunes',
      'martes',
      'miercoles',
      'jueves',
      'viernes',
      'sabado',
      'domingo',
    ],
  })
  @IsIn([
    'lunes',
    'martes',
    'miercoles',
    'jueves',
    'viernes',
    'sabado',
    'domingo',
  ])
  dia: DiaSemana;

  @ApiProperty({ default: true })
  @IsBoolean()
  @IsOptional()
  activo?: boolean;

  @ApiProperty({ type: [CreateBloqueHorarioDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateBloqueHorarioDto)
  @IsOptional()
  bloques?: CreateBloqueHorarioDto[];
}

export class CreateCitaConfiguracionDto {
  @ApiProperty({ example: 'Registro Civil' })
  @IsString()
  @IsNotEmpty()
  area: string;

  @ApiProperty({ example: 'REGISTRO_CIVIL' })
  @IsString()
  @IsNotEmpty()
  modulo: string;

  @ApiProperty({ default: 30 })
  @IsNumber()
  @Min(10)
  @Max(120)
  @IsOptional()
  duracionSlotMinutos?: number;

  @ApiProperty({ default: 0 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  diasAnticipacionMinima?: number;

  @ApiProperty({ default: 30 })
  @IsNumber()
  @Min(1)
  @IsOptional()
  diasAnticipacionMaxima?: number;

  @ApiProperty({
    type: [String],
    example: ['Acta de Nacimiento', 'Matrimonio Civil'],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tramites?: string[];

  @ApiProperty({ example: 'Traer original y copia de identificación oficial' })
  @IsString()
  @IsOptional()
  instrucciones?: string;

  @ApiProperty({ type: [CreateHorarioDiaDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateHorarioDiaDto)
  @IsOptional()
  horarios?: CreateHorarioDiaDto[];
}

export class UpdateCitaConfiguracionDto extends CreateCitaConfiguracionDto {}

export class ToggleCitaConfiguracionDto {
  @ApiProperty({
    required: false,
    description: 'Si no se envía, invierte el estado actual',
  })
  @IsBoolean()
  @IsOptional()
  activo?: boolean;
}

export class CreateBloqueoDto {
  @ApiProperty({ example: '2026-04-17T00:00:00' })
  @IsDateString()
  fechaInicio: string;

  @ApiProperty({ example: '2026-04-18T23:59:59' })
  @IsDateString()
  fechaFin: string;

  @ApiProperty({ example: 'Semana Santa' })
  @IsString()
  @IsNotEmpty()
  motivo: string;
}

// ─── Cita pública ────────────────────────────────────────────

export class CrearCitaPublicaDto {
  @ApiProperty({ example: 'Registro Civil' })
  @IsString()
  @IsNotEmpty()
  area: string;

  @ApiProperty({ example: 'Acta de Nacimiento' })
  @IsString()
  @IsNotEmpty()
  tramite: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  servicioId?: string;

  @ApiProperty({ example: '2026-04-15' })
  @IsDateString()
  fechaCita: string;

  @ApiProperty({ example: '09:00' })
  @Matches(/^\d{2}:\d{2}$/, { message: 'horario debe tener formato HH:mm' })
  horario: string;

  @ApiProperty({ example: 'LOGL950101HVZRZN09' })
  @IsString()
  @IsNotEmpty()
  curp: string;

  @ApiProperty({ example: 'JUAN CARLOS LOPEZ GONZALEZ' })
  @IsString()
  @IsNotEmpty()
  nombreCompleto: string;

  @ApiProperty({ example: '2721234567' })
  @IsString()
  @IsNotEmpty()
  telefono: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  correo?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  notasCiudadano?: string;
}

// ─── Cita interna (recepción) ─────────────────────────────────

export class CrearCitaInternaDto extends CrearCitaPublicaDto {}

// ─── Cambio de estado ─────────────────────────────────────────

export class CambiarEstadoCitaDto {
  @ApiProperty({ enum: ['atendida', 'no_se_presento', 'cancelada'] })
  @IsIn(['atendida', 'no_se_presento', 'cancelada'])
  estado: 'atendida' | 'no_se_presento' | 'cancelada';

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  notasFuncionario?: string;

  @ApiProperty({
    required: false,
    description: 'Requerido si estado = cancelada',
  })
  @IsString()
  @IsOptional()
  motivo?: string;
}

// ─── Reagendar ────────────────────────────────────────────────

export class ReagendarCitaDto {
  @ApiProperty({ example: '2026-04-20' })
  @IsDateString()
  fechaCita: string;

  @ApiProperty({ example: '10:00' })
  @Matches(/^\d{2}:\d{2}$/, { message: 'horario debe tener formato HH:mm' })
  horario: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  motivo?: string;
}

// ─── Cancelar desde portal ────────────────────────────────────

export class CancelarCitaPublicaDto {
  @ApiProperty({ example: 'CIT-2604-0001' })
  @IsString()
  @IsNotEmpty()
  folio: string;

  @ApiPropertyOptional({ description: 'Token recibido por correo (UUID)' })
  @IsString()
  @IsOptional()
  token?: string;

  @ApiPropertyOptional({
    description: 'CURP del ciudadano (alternativa al token)',
  })
  @IsString()
  @IsOptional()
  curp?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  motivo?: string;
}
