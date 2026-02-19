import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class PagarOrdenDto {
  @ApiProperty({
    description: 'ID del PaymentIntent de Stripe generado por el frontend',
    example: 'pi_3ABC123XYZ456',
  })
  @IsString()
  @IsNotEmpty()
  stripePaymentIntentId: string;
}
