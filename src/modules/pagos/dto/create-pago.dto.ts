import {
  IsMongoId,
  IsNotEmpty,
  IsEnum,
  IsNumber,
  IsString,
  IsOptional,
  Min,
} from 'class-validator';
import { PaymentConcept } from '@/shared/enums';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePagoDto {
  @ApiProperty({ example: '697bf7fd36f2d5ed398d1ecd', required: false })
  @IsMongoId()
  @IsOptional()
  predioId?: string;

  @ApiProperty({ example: '697bf7fd36f2d5ed398d1ecd', required: false })
  @IsMongoId()
  @IsOptional()
  ciudadanoId?: string;

  @ApiProperty({ enum: PaymentConcept, example: PaymentConcept.PREDIAL })
  @IsEnum(PaymentConcept)
  @IsNotEmpty()
  concepto: PaymentConcept;

  @ApiProperty({ example: 1250, description: 'Monto en pesos' })
  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  monto: number;

  @ApiProperty({ example: 'pi_1234567890abcdef' })
  @IsString()
  @IsNotEmpty()
  stripePaymentIntentId: string;

  @ApiProperty({ example: 'Pago predial 2026', required: false })
  @IsString()
  @IsOptional()
  descripcion?: string;
}
