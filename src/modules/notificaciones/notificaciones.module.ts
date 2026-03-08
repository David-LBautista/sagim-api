import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { NotificacionesService } from './notificaciones.service';
import { SagimGateway } from './sagim.gateway';

@Module({
  imports: [
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [NotificacionesService, SagimGateway],
  exports: [NotificacionesService, SagimGateway],
})
export class NotificacionesModule {}
