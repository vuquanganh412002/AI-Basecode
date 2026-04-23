import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { DataSource } from 'typeorm';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly dataSource: DataSource) {}

  @Get()
  @ApiOperation({ summary: 'Liveness check' })
  check() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  @Get('ready')
  @ApiOperation({ summary: 'Readiness check (DB connection)' })
  async readiness() {
    try {
      await this.dataSource.query('SELECT 1');
      return { status: 'ok', db: 'connected' };
    } catch {
      throw new ServiceUnavailableException({
        status: 'error',
        db: 'disconnected',
      });
    }
  }
}
