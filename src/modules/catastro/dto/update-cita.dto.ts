import { IsEnum, IsOptional, IsString } from 'class-validator';
import { AppointmentStatus } from '@/shared/enums';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateCitaDto {
  @ApiProperty({
    enum: AppointmentStatus,
    example: AppointmentStatus.CONFIRMADA,
    required: false,
  })
  @IsEnum(AppointmentStatus)
  @IsOptional()
  estado?: AppointmentStatus;

  @ApiProperty({
    example: 'Cita confirmada para las 10:00 AM',
    required: false,
  })
  @IsString()
  @IsOptional()
  observaciones?: string;
}
