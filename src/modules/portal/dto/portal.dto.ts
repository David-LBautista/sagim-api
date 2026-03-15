import {
  IsString,
  IsOptional,
  IsBoolean,
  IsHexColor,
  IsEmail,
  IsUrl,
  IsArray,
  ValidateNested,
  MaxLength,
  IsPhoneNumber,
  ArrayMaxSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

// ─── Footer sub-DTOs ────────────────────────────────────────────

export class FooterLinkItemDto {
  @ApiPropertyOptional({ example: 'Pago del Predial' })
  @IsString()
  @MaxLength(60)
  texto: string;

  @ApiPropertyOptional({ example: '/citas' })
  @IsString()
  @MaxLength(300)
  url: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  externo?: boolean;
}

export class FooterColumnaDto {
  @ApiPropertyOptional({ example: 'Lo más consultado' })
  @IsString()
  @MaxLength(60)
  titulo: string;

  @ApiPropertyOptional({ type: [FooterLinkItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMaxSize(6)
  @Type(() => FooterLinkItemDto)
  links: FooterLinkItemDto[];
}

export class FooterNumeroEmergenciaDto {
  @ApiPropertyOptional({ example: '01 800 716 34 10' })
  @IsString()
  @MaxLength(30)
  numero: string;

  @ApiPropertyOptional({ example: 'Protección Civil' })
  @IsString()
  @MaxLength(60)
  servicio: string;
}

// ─── Sección: General ───────────────────────────────────────────

export class UpdatePortalGeneralDto {
  @ApiPropertyOptional({ example: 'H. Ayuntamiento de La Perla' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  subtitulo?: string;

  @ApiPropertyOptional({
    example:
      'Aquí podrás realizar tus trámites de manera ágil, oportuna y transparente.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  mensajeBienvenida?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  mostrarCitas?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  mostrarReportes?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  mostrarTransparencia?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  enMantenimiento?: boolean;

  @ApiPropertyOptional({ example: 'El portal estará disponible en breve.' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  mensajeMantenimiento?: string;
}

// ─── Sección: Apariencia ────────────────────────────────────────

export class UpdatePortalAparienciaDto {
  @ApiPropertyOptional({ example: '#1e3a5f' })
  @IsOptional()
  @IsHexColor()
  colorPrimario?: string;

  @ApiPropertyOptional({ example: '#c9a84c' })
  @IsOptional()
  @IsHexColor()
  colorSecundario?: string;

  @ApiPropertyOptional({ example: 'Escudo del municipio de La Perla' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  bannerAlt?: string;
  // bannerUrl se actualiza vía endpoint separado de upload (S3)
}

// ─── Sección: Redes Sociales ────────────────────────────────────

export class UpdatePortalRedesSocialesDto {
  @ApiPropertyOptional({ example: 'https://facebook.com/municipioperla' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  facebook?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  twitter?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  instagram?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  youtube?: string;

  @ApiPropertyOptional({ example: 'https://laperla.gob.mx' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  sitioWeb?: string;
}

// ─── Sección: Footer ────────────────────────────────────────────

export class UpdatePortalFooterDto {
  @ApiPropertyOptional({ example: 'Zaragoza esq. M. Molina S/N Col. Centro' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  direccion?: string;

  @ApiPropertyOptional({ example: 'contacto@laperla.gob.mx' })
  @IsOptional()
  @IsEmail()
  correo?: string;

  @ApiPropertyOptional({ example: '272 123 4567' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  telefono?: string;

  @ApiPropertyOptional({ type: [FooterColumnaDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMaxSize(3)
  @Type(() => FooterColumnaDto)
  columnas?: FooterColumnaDto[];

  @ApiPropertyOptional({ type: [FooterNumeroEmergenciaDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMaxSize(10)
  @Type(() => FooterNumeroEmergenciaDto)
  numerosEmergencia?: FooterNumeroEmergenciaDto[];

  @ApiPropertyOptional({
    example:
      '© 2026 H. Ayuntamiento de La Perla. Todos los derechos reservados.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  textoLegal?: string;
}
