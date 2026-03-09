import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

export class CompleteOnboardingPadronDto {
  @ApiProperty({
    example: true,
    description:
      'true = el admin saltó el paso (registrará ciudadanos en ventanilla). false (o ausente) = importó el padrón.',
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  saltado?: boolean;
}
