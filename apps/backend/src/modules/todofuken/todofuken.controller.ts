import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { TodofukenService } from './todofuken.service';
import { SessionAuthGuard } from '@/common/guards/session-auth.guard';

@ApiTags('todofuken')
@ApiCookieAuth('session_id')
@Controller('api/v1/todofuken')
@UseGuards(SessionAuthGuard)
export class TodofukenController {
  constructor(private readonly service: TodofukenService) {}

  @Get()
  @ApiOperation({ summary: '都道府県一覧取得 (ACSMS-API-COMMON-001)' })
  @ApiResponse({
    status: 200,
    description: 'List of prefectures',
    schema: {
      properties: {
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              todofuken_code: { type: 'string', example: '13' },
              todofuken_name: { type: 'string', example: '東京都' },
            },
          },
        },
      },
    },
  })
  async list() {
    const data = await this.service.list();
    return { data };
  }
}
