import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ReportStatus } from '@/shared/enums';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateReporteDto {
  @ApiProperty({
    enum: ReportStatus,
    example: ReportStatus.ATENDIDO,
    required: false,
  })
  @IsEnum(ReportStatus)
  @IsOptional()
  estado?: ReportStatus;

  @ApiProperty({ example: 'Ya se atendió el reporte', required: false })
  @IsString()
  @IsOptional()
  comentario?: string;
}
