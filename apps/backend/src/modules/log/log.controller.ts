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

import { LogListResponseDto } from './dto/log-response.dto';
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
  @ApiResponse({ status: 200, type: LogListResponseDto })
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
  // CSV ダウンロード — バイナリ body、型付き JSON なし。FE wrapper は
  // response を Blob として消費しダウンロードを起動するため `type:` は付けない。
  @ApiResponse({
    status: 200,
    description: 'CSV file (text/csv; charset=utf-8) as attachment.',
    content: { 'text/csv': {} },
  })
  @ApiResponse({ status: 401, description: 'セッションが切れました。再度ログインしてください。' })
  @ApiResponse({ status: 403, description: 'この画面へのアクセス権限がありません。' })
  // Export は画面ページを反映 — GET /log と同じ filters/sort/page/per_page
  // のため SearchLogDto を使用（全件エクスポート・行数上限なし）。
  async exportLogCsv(
    @Query() query: SearchLogDto,
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
