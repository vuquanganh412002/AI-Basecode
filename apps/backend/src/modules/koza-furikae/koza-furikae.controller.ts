import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
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
import { ShitenRestrictedGuard } from '@/common/guards/shiten-restricted.guard';
import type { SessionPayload } from '@/modules/auth/session.service';

import { ExportKozaFurikaeDto } from './dto/export-koza-furikae.dto';
import { PreviewKozaFurikaeDto } from './dto/preview-koza-furikae.dto';
import { KozaFurikaeService } from './koza-furikae.service';

const XLSX_MIME =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

@ApiTags('koza-furikae')
@Controller('koza-furikae')
@UseGuards(SessionAuthGuard, PermissionsGuard, ShitenRestrictedGuard)
@ApiCookieAuth('session_id')
export class KozaFurikaeController {
  constructor(private readonly kozaFurikaeService: KozaFurikaeService) {}

  // ─── ACSMS-API-020-001 — GET /api/v1/koza-furikae/initial ───────────
  @Get('initial')
  @HttpCode(HttpStatus.OK)
  @Permissions('koza_furikae.export')
  @ApiOperation({ summary: '口座振替データ出力 初期データ取得 — ACSMS-API-020-001' })
  @ApiResponse({ status: 200, description: 'JASTEM 委託者情報 + 最終使用金融機関支店情報。' })
  @ApiResponse({ status: 401, description: 'セッションが切れました。再度ログインしてください。' })
  @ApiResponse({ status: 403, description: 'この画面へのアクセス権限がありません。' })
  async getInitial(@Req() req: Request & { user?: SessionPayload }) {
    const session = req.user as SessionPayload;
    return this.kozaFurikaeService.getInitialData(session);
  }

  // ─── ACSMS-API-020-003 — POST /api/v1/koza-furikae/preview ──────────
  @Post('preview')
  @HttpCode(HttpStatus.OK)
  @Permissions('koza_furikae.export')
  @ApiOperation({ summary: '口座振替データ プレビュー一覧取得 — ACSMS-API-020-003' })
  @ApiResponse({
    status: 200,
    description: '集計した振替対象の一覧（{ data, meta }）。編集用に金額を含む。',
  })
  @ApiResponse({ status: 400, description: '入力値が不正です。' })
  @ApiResponse({ status: 401, description: 'セッションが切れました。再度ログインしてください。' })
  @ApiResponse({ status: 403, description: 'この画面へのアクセス権限がありません。' })
  @ApiResponse({ status: 404, description: '対象データがありません。' })
  async preview(
    @Body() body: PreviewKozaFurikaeDto,
    @Req() req: Request & { user?: SessionPayload },
  ) {
    const session = req.user as SessionPayload;
    return this.kozaFurikaeService.previewData(body, session);
  }

  // ─── ACSMS-API-020-002 — POST /api/v1/koza-furikae/export ───────────
  @Post('export')
  @HttpCode(HttpStatus.OK)
  @Permissions('koza_furikae.export')
  @ApiOperation({ summary: '口座振替データ（全銀フォーマット固定長）出力 — ACSMS-API-020-002' })
  @ApiResponse({
    status: 200,
    description:
      '全銀フォーマット固定長テキスト（Shift_JIS, 1レコード120バイト）を attachment（ファイル名 口座振替データ_YYYY年MM月DD日）で返却。',
    content: { 'application/octet-stream': {} },
  })
  @ApiResponse({ status: 400, description: '入力値が不正です。' })
  @ApiResponse({ status: 401, description: 'セッションが切れました。再度ログインしてください。' })
  @ApiResponse({ status: 403, description: 'この画面へのアクセス権限がありません。' })
  @ApiResponse({ status: 404, description: '対象データがありません。' })
  async export(
    @Body() body: ExportKozaFurikaeDto,
    @Req() req: Request & { user?: SessionPayload },
    @Res() res: Response,
  ): Promise<void> {
    const session = req.user as SessionPayload;
    const result = await this.kozaFurikaeService.exportCsv(body, session, req);
    // Content-Type は application/octet-stream 固定（text/plain 等の既知タイプだと
    // 拡張子なしファイル名でも Chrome 等が .txt を自動付与してしまうため。
    // file-delivery.ts の contentTypeFor() が未知拡張子で返す既定値と同じ規約）。
    res.setHeader('Content-Type', 'application/octet-stream');
    // ASCII別名は filename、日本語名は RFC 5987 の filename* に設定する。
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${result.asciiFilename}"; filename*=UTF-8''${encodeURIComponent(result.filename)}`,
    );
    res.setHeader('Content-Length', String(result.buffer.length));
    res.setHeader('Cache-Control', 'no-store');
    res.status(HttpStatus.OK).send(result.buffer);
  }

  // ─── ACSMS-API-020-004 — POST /api/v1/koza-furikae/export-excel ─────
  @Post('export-excel')
  @HttpCode(HttpStatus.OK)
  @Permissions('koza_furikae.export')
  @ApiOperation({ summary: '口座振替データ（レポートプレビュー内容）Excel 出力 — ACSMS-API-020-004' })
  @ApiResponse({
    status: 200,
    description:
      'レポートプレビューと同じ内容（預金者名/引落支店/口座番号/金額）の Excel を attachment（ファイル名 口座振替データ_YYYY年MM月DD日.xlsx）で返却。',
    content: { [XLSX_MIME]: {} },
  })
  @ApiResponse({ status: 400, description: '入力値が不正です。' })
  @ApiResponse({ status: 401, description: 'セッションが切れました。再度ログインしてください。' })
  @ApiResponse({ status: 403, description: 'この画面へのアクセス権限がありません。' })
  @ApiResponse({ status: 404, description: '対象データがありません。' })
  async exportExcel(
    @Body() body: ExportKozaFurikaeDto,
    @Req() req: Request & { user?: SessionPayload },
    @Res() res: Response,
  ): Promise<void> {
    const session = req.user as SessionPayload;
    const result = await this.kozaFurikaeService.exportExcel(body, session, req);
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
