import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';

export class ImportCiudadanosDto {
  @ApiProperty({
    description: 'Archivo Excel (.xlsx / .xls) o CSV con el padrón',
    type: 'string',
    format: 'binary',
  })
  archivo: Express.Multer.File;

  @ApiProperty({
    description:
      'JSON string con el mapeo columna-excel → campo-sistema. ' +
      'Ej: {"CURP":"curp","NOMBRE":"nombre","AP_PATERNO":"apellidoPaterno",...}',
    example:
      '{"CURP":"curp","NOMBRE":"nombre","AP_PATERNO":"apellidoPaterno","AP_MATERNO":"apellidoMaterno","TELEFONO":"telefono","EMAIL":"email","FECHA_NAC":"fechaNacimiento","LOCALIDAD":"localidad","COLONIA":"colonia","CALLE":"calle","NUMERO":"numero","CP":"codigoPostal"}',
  })
  mapeo: string; // JSON string — se parsea en el service

  @ApiProperty({
    description: 'Qué hacer si el CURP ya existe en el municipio',
    enum: ['ignorar', 'actualizar'],
    default: 'ignorar',
    required: false,
  })
  @IsIn(['ignorar', 'actualizar'])
  @IsOptional()
  accionDuplicados?: 'ignorar' | 'actualizar';
}
