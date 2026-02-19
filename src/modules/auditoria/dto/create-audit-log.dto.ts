import { IsEnum, IsOptional, IsString, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AuditAction, AuditModule } from '../schemas/audit-log.schema';

export class CreateAuditLogDto {
  @ApiProperty({ enum: AuditModule })
  @IsEnum(AuditModule)
  modulo: AuditModule;

  @ApiProperty({ enum: AuditAction })
  @IsEnum(AuditAction)
  accion: AuditAction;

  @ApiProperty({ example: 'Apoyo' })
  @IsString()
  entidad: string;

  @ApiPropertyOptional({ example: '697abc123...' })
  @IsString()
  @IsOptional()
  entidadId?: string;

  @ApiPropertyOptional({
    example: {
      antes: { estado: 'PENDIENTE' },
      despues: { estado: 'ENTREGADO' },
    },
  })
  @IsObject()
  @IsOptional()
  cambios?: {
    antes?: Record<string, any>;
    despues?: Record<string, any>;
  };

  @ApiPropertyOptional({ example: 'Apoyo entregado a beneficiario' })
  @IsString()
  @IsOptional()
  descripcion?: string;

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}
