import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsEnum,
  IsInt,
  Min,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

// ─── Agregar documento a una sección ─────────────────────────
export class AgregarDocumentoDto {
  @ApiProperty({ example: 'Reglamento de Tránsito 2026' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  nombre: string;

  @ApiPropertyOptional({
    example: 'Reglamento vigente aprobado en sesión de cabildo agosto 2026',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  descripcion?: string;

  @ApiProperty({ enum: ['pdf', 'excel', 'link', 'texto'] })
  @IsEnum(['pdf', 'excel', 'link', 'texto'])
  tipo: 'pdf' | 'excel' | 'link' | 'texto';

  @ApiPropertyOptional({
    example: 'https://ejemplo.com/documento.pdf',
    description: 'Requerido si tipo = link',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  url?: string;

  @ApiPropertyOptional({
    example: 'Contenido textual de la obligación...',
    description: 'Requerido si tipo = texto',
  })
  @IsOptional()
  @IsString()
  texto?: string;

  @ApiPropertyOptional({
    example: 'Q1 2026',
    description: "Período que cubre: 'Q1 2026', '2026', 'Enero 2026'",
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  periodoReferencia?: string;

  @ApiPropertyOptional({
    example: '2026',
    description: 'Ejercicio fiscal al que pertenece el documento',
  })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  ejercicio?: string;

  @ApiPropertyOptional({
    example: 'ingresos',
    description:
      'Clave de subsección (requerido si la sección tiene subsecciones)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  subseccionClave?: string;
}

// ─── Eliminar documento ───────────────────────────────────────
export class EliminarDocumentoDto {
  @ApiProperty({ example: 0, description: 'Índice del documento en el array' })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  documentoIndex: number;

  @ApiPropertyOptional({
    example: 'ingresos',
    description:
      'Clave de subsección (requerido si la sección tiene subsecciones)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  subseccionClave?: string;
}

// ─── Marcar al corriente ──────────────────────────────────────
export class MarcarCorrienteDto {
  @ApiProperty()
  @IsBoolean()
  alCorriente: boolean;
}

// ─── Nota interna ─────────────────────────────────────────────
export class UpdateNotaDto {
  @ApiProperty({
    example: 'En espera del informe de contraloría',
    maxLength: 500,
  })
  @IsString()
  @MaxLength(500)
  notaInterna: string;
}

// ─── Filtros para GET /transparencia ─────────────────────────
export class FiltrosSeccionesDto {
  @IsOptional()
  @IsEnum(['comun', 'municipal'])
  tipo?: 'comun' | 'municipal';

  @IsOptional()
  @IsEnum(['al_corriente', 'con_documentos', 'sin_documentos'])
  estado?: 'al_corriente' | 'con_documentos' | 'sin_documentos';

  @IsOptional()
  @IsString()
  area?: string;

  @IsOptional()
  @IsEnum(['Trimestral', 'Anual', 'Permanente'])
  periodo?: string;
}
