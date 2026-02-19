import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { WinstonModule } from 'nest-winston';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { winstonConfig } from './config/winston.config';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { MunicipalityGuard } from './common/guards/municipality.guard';
import { AuditInterceptor } from './modules/auditoria/interceptors/audit.interceptor';
import { HealthModule } from './modules/health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { MunicipalitiesModule } from './modules/municipalities/municipalities.module';
import { CiudadanosModule } from './modules/ciudadanos/ciudadanos.module';
import { ReportesModule } from './modules/reportes/reportes.module';
import { DifModule } from './modules/dif/dif.module';
import { CatastroModule } from './modules/catastro/catastro.module';
import { PagosModule } from './modules/pagos/pagos.module';
import { TesoreriaModule } from './modules/tesoreria/tesoreria.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { S3Module } from './modules/s3/s3.module';
import { NotificacionesModule } from './modules/notificaciones/notificaciones.module';
import { AuditoriaModule } from './modules/auditoria/auditoria.module';
import { ModulosModule } from './modules/modulos/modulos.module';
import { CatalogosModule } from './modules/catalogos/catalogos.module';

@Module({
  imports: [
    // Global configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `.env.${process.env.NODE_ENV || 'development'}`,
      cache: true,
    }),

    // Winston logging
    WinstonModule.forRoot(winstonConfig),

    // MongoDB connection
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI'),
        retryAttempts: 3,
        retryDelay: 1000,
      }),
      inject: [ConfigService],
    }),

    // Feature modules
    HealthModule,
    AuthModule,
    UsersModule,
    MunicipalitiesModule,
    CiudadanosModule,
    ReportesModule,
    DifModule,
    CatastroModule,
    PagosModule,
    TesoreriaModule,
    DashboardModule,
    S3Module, // Módulo global para S3
    NotificacionesModule,
    AuditoriaModule,
    ModulosModule,
    CatalogosModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: APP_GUARD,
      useClass: MunicipalityGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
  ],
})
export class AppModule {}
