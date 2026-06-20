import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
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

import { HaitatsuryoQueryDto } from './dto/haitatsuryo-query.dto';
import { HaitatsuryoService } from './haitatsuryo.service';

const XLSX_MIME =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

@ApiTags('haitatsuryo')
@Controller('haitatsuryo')
@UseGuards(SessionAuthGuard, PermissionsGuard)
@ApiCookieAuth('session_id')
export class HaitatsuryoController {
  constructor(private readonly haitatsuryoService: HaitatsuryoService) {}

  // ─── ACSMS-API-021-001 — GET /api/v1/haitatsuryo/preview ────────────
  @Get('preview')
  @HttpCode(HttpStatus.OK)
  @Permissions('haitatsuryo.export')
  @ApiOperation({ summary: '配達手数料支払情報プレビュー取得 — ACSMS-API-021-001' })
  @ApiResponse({
    status: 200,
    description: '集計データ（販売店ごと）+ meta サマリ。対象0件のときは data:[]。',
  })
  @ApiResponse({ status: 401, description: 'セッションが切れました。再度ログインしてください。' })
  @ApiResponse({ status: 403, description: 'この画面へのアクセス権限がありません。' })
  async previewHaitatsuryo(
    @Query() query: HaitatsuryoQueryDto,
    @Req() req: Request & { user?: SessionPayload },
  ) {
    const session = req.user as SessionPayload;
    return this.haitatsuryoService.previewHaitatsuryo(query, session);
  }

  // ─── ACSMS-API-021-002 — POST /api/v1/haitatsuryo/export ────────────
  @Post('export')
  @HttpCode(HttpStatus.OK)
  @Permissions('haitatsuryo.export')
  @ApiOperation({ summary: '配達手数料支払情報 Excel 出力 — ACSMS-API-021-002' })
  @ApiResponse({
    status: 200,
    description:
      'Excel file (.xlsx) as attachment。対象0件のときは application/json で { data: [] } を返す。',
    content: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {},
      'application/json': {},
    },
  })
  @ApiResponse({ status: 401, description: 'セッションが切れました。再度ログインしてください。' })
  @ApiResponse({ status: 403, description: 'この画面へのアクセス権限がありません。' })
  async exportHaitatsuryoExcel(
    @Body() body: HaitatsuryoQueryDto,
    @Req() req: Request & { user?: SessionPayload },
    @Res() res: Response,
  ): Promise<void> {
    const session = req.user as SessionPayload;
    const result = await this.haitatsuryoService.exportHaitatsuryoExcel(
      body,
      session,
      req,
    );
    // 対象0件 → Excel は生成せず 200 + 空配列(JSON)で応答する。FE は Blob の
    // content-type が application/json のとき画面内メッセージを表示する。
    if (result.empty) {
      res.status(HttpStatus.OK).json({ data: [] });
      return;
    }
    res.setHeader('Content-Type', XLSX_MIME);
    // ASCII別名は filename、日本語名は RFC 5987 の filename* に設定する。
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${result.asciiFilename}"; filename*=UTF-8''${encodeURIComponent(result.filename)}`,
    );
    res.setHeader('Content-Length', String(result.buffer.length));
    res.setHeader('Cache-Control', 'no-store');
    res.status(HttpStatus.OK).send(result.buffer);
  }
}
