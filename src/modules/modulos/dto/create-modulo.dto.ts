import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class CreateModuloDto {
  @ApiProperty({ example: 'Catastro' })
  @IsString()
  nombre: string;

  @ApiProperty({ example: 'Gestión de predios y citas', required: false })
  @IsOptional()
  @IsString()
  descripcion?: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  activo: boolean;
}
