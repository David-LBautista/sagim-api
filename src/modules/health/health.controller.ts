import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public } from '@/common/decorators/public.decorator';
import { HealthService } from './health.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Check API health status' })
  @ApiResponse({ status: 200, description: 'API is healthy' })
  check() {
    return this.healthService.check();
  }

  @Get('database')
  @Public()
  @ApiOperation({ summary: 'Check database connection' })
  @ApiResponse({ status: 200, description: 'Database is connected' })
  async checkDatabase() {
    return this.healthService.checkDatabase();
  }
}
