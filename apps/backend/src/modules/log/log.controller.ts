import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';

import { Permissions } from '@/common/decorators/permissions.decorator';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { SessionAuthGuard } from '@/common/guards/session-auth.guard';
import type { SessionPayload } from '@/modules/auth/session.service';

import { ExportLogDto } from './dto/export-log.dto';
import { SearchLogDto } from './dto/search-log.dto';
import { LogService } from './log.service';

@ApiTags('log')
@Controller('log')
@UseGuards(SessionAuthGuard, PermissionsGuard)
@ApiCookieAuth('session_id')
export class LogController {
  constructor(private readonly logService: LogService) {}

  // ─── ACSMS-API-030-001 — GET /api/v1/log ────────────────────────
  @Get()
  @HttpCode(HttpStatus.OK)
  @Permissions('log.view')
  @ApiOperation({ summary: '操作ログ一覧取得 — ACSMS-API-030-001' })
  @ApiResponse({ status: 200, description: '正常にログ一覧を取得しました' })
  @ApiResponse({ status: 401, description: 'セッションが切れました。再度ログインしてください。' })
  @ApiResponse({ status: 403, description: 'この画面へのアクセス権限がありません。' })
  async getLogList(
    @Query() query: SearchLogDto,
    @Req() req: Request & { user?: SessionPayload },
  ) {
    const session = req.user as SessionPayload;
    return this.logService.getLogList(query, session);
  }

  // ─── ACSMS-API-030-002 — GET /api/v1/log/export ─────────────────
  @Get('export')
  @HttpCode(HttpStatus.OK)
  @Permissions('log.view')
  @ApiOperation({ summary: '操作ログCSV出力 — ACSMS-API-030-002' })
  @ApiResponse({ status: 200, description: '正常にCSVをダウンロードしました' })
  @ApiResponse({ status: 401, description: 'セッションが切れました。再度ログインしてください。' })
  @ApiResponse({ status: 403, description: 'この画面へのアクセス権限がありません。' })
  @ApiResponse({ status: 409, description: '検索結果が5,000件を超えています。条件を絞り込んでください。' })
  async exportLogCsv(
    @Query() query: ExportLogDto,
    @Req() req: Request & { user?: SessionPayload },
    @Res() res: Response,
  ): Promise<void> {
    const session = req.user as SessionPayload;
    const { buffer, filename } = await this.logService.exportLogCsv(
      query,
      session,
      req,
    );
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${filename}"`,
    );
    res.status(HttpStatus.OK).send(buffer);
  }
}
