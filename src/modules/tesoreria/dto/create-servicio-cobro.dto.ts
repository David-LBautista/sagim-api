import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  Min,
  IsBoolean,
  IsInt,
  IsEnum,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum TipoTramite {
  TRAMITE = 'tramite',
  SERVICIO = 'servicio',
}

export class CreateServicioCobroDto {
  @ApiProperty({ example: 'ACTA_NACIMIENTO' })
  @IsString()
  @IsNotEmpty()
  clave: string;

  @ApiProperty({ example: 'Acta de Nacimiento' })
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @ApiProperty({ required: false, example: 'Expedición de copia certificada' })
  @IsOptional()
  @IsString()
  descripcion?: string;

  @ApiProperty({ example: 'Registro Civil' })
  @IsString()
  @IsNotEmpty()
  categoria: string;

  @ApiProperty({
    example: 'Registro Civil',
    description: 'Área o departamento municipal responsable del trámite',
  })
  @IsString()
  @IsNotEmpty()
  areaResponsable: string;

  @ApiProperty({ example: 50, description: 'Costo base en pesos MXN' })
  @IsNumber()
  @Min(0)
  costo: number;

  @ApiProperty({
    required: false,
    description: 'Costo en pesos MXN cuando se tiene precio fijo',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  costoPesos?: number;

  @ApiProperty({
    required: false,
    description: 'Costo expresado en Unidades de Medida y Actualización (UMA)',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  costoUMA?: number;

  @ApiProperty({ default: false, required: false })
  @IsOptional()
  @IsBoolean()
  montoVariable?: boolean;

  @ApiProperty({ default: false, required: false })
  @IsOptional()
  @IsBoolean()
  requiereContribuyente?: boolean;

  @ApiProperty({
    required: false,
    description: 'Indica si el servicio aplica algún tipo de descuento',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  tieneDescuento?: boolean;

  @ApiProperty({
    required: false,
    enum: TipoTramite,
    description:
      'Clasificación del servicio: trámite administrativo o servicio municipal',
  })
  @IsOptional()
  @IsEnum(TipoTramite)
  tipoTramite?: TipoTramite;

  @ApiProperty({ default: 0, required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  orden?: number;

  @ApiProperty({ default: true, required: false })
  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
