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

import { MeiboReportQueryDto } from './dto/meibo-report-query.dto';
import { ZougenHanbaitenQueryDto } from './dto/zougen-hanbaiten-query.dto';
import { ReportService } from './report.service';

@ApiTags('report')
@Controller('report')
@UseGuards(SessionAuthGuard, PermissionsGuard)
@ApiCookieAuth('session_id')
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  // ─── ACSMS-API-026-001 — GET /api/v1/report/meibo/preview ────────
  @Get('meibo/preview')
  @HttpCode(HttpStatus.OK)
  @Permissions('report.export_meibo')
  @ApiOperation({ summary: '購読者名簿プレビュー取得 — ACSMS-API-026-001' })
  @ApiResponse({ status: 200, description: 'プレビューデータ（グループ化済み）' })
  @ApiResponse({ status: 401, description: 'セッションが切れました。再度ログインしてください。' })
  @ApiResponse({ status: 403, description: 'この画面へのアクセス権限がありません。' })
  async previewMeibo(
    @Query() query: MeiboReportQueryDto,
    @Req() req: Request & { user?: SessionPayload },
  ) {
    const session = req.user as SessionPayload;
    const data = await this.reportService.previewMeibo(query, session);
    return { data };
  }

  // ─── ACSMS-API-026-002 — GET /api/v1/report/meibo/export ─────────
  @Get('meibo/export')
  @HttpCode(HttpStatus.OK)
  @Permissions('report.export_meibo')
  @ApiOperation({ summary: '購読者名簿Excel出力 — ACSMS-API-026-002' })
  @ApiResponse({
    status: 200,
    description: 'Excel file (.xlsx) as attachment.',
    content: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {},
    },
  })
  @ApiResponse({ status: 401, description: 'セッションが切れました。再度ログインしてください。' })
  @ApiResponse({ status: 403, description: 'この画面へのアクセス権限がありません。' })
  @ApiResponse({ status: 404, description: '対象のデータが存在しません。' })
  async exportMeiboExcel(
    @Query() query: MeiboReportQueryDto,
    @Req() req: Request & { user?: SessionPayload },
    @Res() res: Response,
  ): Promise<void> {
    const session = req.user as SessionPayload;
    const { buffer, filename } = await this.reportService.exportMeiboExcel(
      query,
      session,
      req,
    );
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(filename)}"`,
    );
    res.status(HttpStatus.OK).send(buffer);
  }

  // ─── ACSMS-API-028-001 — GET /api/v1/report/zougen-hanbaiten/preview ──
  @Get('zougen-hanbaiten/preview')
  @HttpCode(HttpStatus.OK)
  @Permissions('report.export_zougen_hanbaiten')
  @ApiOperation({ summary: '増減連絡票（販売店）プレビュー取得 — ACSMS-API-028-001' })
  @ApiResponse({ status: 200, description: 'プレビューデータ（販売店＋管理支店ごと）' })
  @ApiResponse({ status: 401, description: 'セッションが切れました。再度ログインしてください。' })
  @ApiResponse({ status: 403, description: 'この画面へのアクセス権限がありません。' })
  @ApiResponse({ status: 404, description: '対象のデータが存在しません。' })
  async previewZougenHanbaiten(
    @Query() query: ZougenHanbaitenQueryDto,
    @Req() req: Request & { user?: SessionPayload },
  ) {
    const session = req.user as SessionPayload;
    const data = await this.reportService.previewZougenHanbaiten(query, session);
    return { data };
  }

  // ─── ACSMS-API-028-002 — POST /api/v1/report/zougen-hanbaiten/export ──
  @Post('zougen-hanbaiten/export')
  @HttpCode(HttpStatus.OK)
  @Permissions('report.export_zougen_hanbaiten')
  @ApiOperation({ summary: '増減連絡票（販売店）PDF出力 — ACSMS-API-028-002' })
  @ApiResponse({
    status: 200,
    description: 'PDF file as attachment.',
    content: { 'application/pdf': {} },
  })
  @ApiResponse({ status: 401, description: 'セッションが切れました。再度ログインしてください。' })
  @ApiResponse({ status: 403, description: 'この画面へのアクセス権限がありません。' })
  @ApiResponse({ status: 404, description: '対象のデータが存在しません。' })
  async exportZougenHanbaitenPdf(
    @Body() body: ZougenHanbaitenQueryDto,
    @Req() req: Request & { user?: SessionPayload },
    @Res() res: Response,
  ): Promise<void> {
    const session = req.user as SessionPayload;
    const { buffer, filename, asciiFilename } =
      await this.reportService.exportZougenHanbaitenPdf(body, session, req);
    res.setHeader('Content-Type', 'application/pdf');
    // ASCII別名は filename、日本語名は RFC 5987 の filename* に設定する。
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${asciiFilename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
    );
    res.status(HttpStatus.OK).send(buffer);
  }
}
