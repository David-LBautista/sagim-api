import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NotificacionesService } from './notificaciones.service';

@Module({
  imports: [ConfigModule],
  providers: [NotificacionesService],
  exports: [NotificacionesService],
})
export class NotificacionesModule {}
