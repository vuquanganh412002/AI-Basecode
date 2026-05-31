import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiProperty, ApiResponse } from '@nestjs/swagger';
import { DataSource } from 'typeorm';

class HealthCheckResponseDto {
  @ApiProperty({ example: 'ok' }) status: string;
  @ApiProperty({ description: 'ISO 8601' }) timestamp: string;
}

class ReadinessResponseDto {
  @ApiProperty({ example: 'ok' }) status: string;
  @ApiProperty({ example: 'connected' }) db: string;
}

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly dataSource: DataSource) {}

  @Get()
  @ApiOperation({ summary: 'Liveness check' })
  @ApiResponse({ status: 200, type: HealthCheckResponseDto })
  check() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  @Get('ready')
  @ApiOperation({ summary: 'Readiness check (DB connection)' })
  @ApiResponse({ status: 200, type: ReadinessResponseDto })
  @ApiResponse({ status: 503, description: 'DB unreachable.' })
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
