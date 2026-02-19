import { Injectable, Inject, LoggerService } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

@Injectable()
export class HealthService {
  constructor(
    @InjectConnection() private readonly connection: Connection,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
  ) {}

  check() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
    };
  }

  async checkDatabase() {
    try {
      const state = this.connection.readyState;
      const states = {
        0: 'disconnected',
        1: 'connected',
        2: 'connecting',
        3: 'disconnecting',
      };

      const isHealthy = state === 1;

      if (!isHealthy) {
        this.logger.warn(
          `Database connection state: ${states[state]}`,
          'HealthCheck',
        );
      }

      return {
        status: isHealthy ? 'ok' : 'error',
        database: {
          state: states[state],
          name: this.connection.name,
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(
        'Database health check failed',
        error.stack,
        'HealthCheck',
      );
      return {
        status: 'error',
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }
}
