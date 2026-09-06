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
import { ShitenRestrictedGuard } from '@/common/guards/shiten-restricted.guard';
import type { SessionPayload } from '@/modules/auth/session.service';

import { MeiboReportQueryDto } from './dto/meibo-report-query.dto';
import { ZougenHanbaitenQueryDto } from './dto/zougen-hanbaiten-query.dto';
import { ZougenNichinoQueryDto } from './dto/zougen-nichino-query.dto';
import { ReportService } from './report.service';

@ApiTags('report')
@Controller('report')
@UseGuards(SessionAuthGuard, PermissionsGuard, ShitenRestrictedGuard)
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
    const { buffer, filename, asciiFilename } =
      await this.reportService.exportMeiboExcel(query, session, req);
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    // ASCII別名は filename、日本語名は RFC 5987 の filename* に設定する。
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${asciiFilename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
    );
    res.status(HttpStatus.OK).send(buffer);
  }

  // ─── ACSMS-API-028-001 — GET /api/v1/report/zougen-hanbaiten/preview ──
  @Get('zougen-hanbaiten/preview')
  @HttpCode(HttpStatus.OK)
  @Permissions('report.export_zougen_hanbaiten')
  @ApiOperation({ summary: '増減連絡票（販売店）プレビュー取得 — ACSMS-API-028-001' })
  @ApiResponse({
    status: 200,
    description: 'プレビューデータ（販売店＋管理支店ごと）。対象0件のときは reports:[]。',
  })
  @ApiResponse({ status: 401, description: 'セッションが切れました。再度ログインしてください。' })
  @ApiResponse({ status: 403, description: 'この画面へのアクセス権限がありません。' })
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
    description:
      'PDF file as attachment。対象0件のときは application/json で { data: { reports: [] } } を返す。',
    content: { 'application/pdf': {}, 'application/json': {} },
  })
  @ApiResponse({ status: 401, description: 'セッションが切れました。再度ログインしてください。' })
  @ApiResponse({ status: 403, description: 'この画面へのアクセス権限がありません。' })
  async exportZougenHanbaitenPdf(
    @Body() body: ZougenHanbaitenQueryDto,
    @Req() req: Request & { user?: SessionPayload },
    @Res() res: Response,
  ): Promise<void> {
    const session = req.user as SessionPayload;
    const result = await this.reportService.exportZougenHanbaitenPdf(
      body,
      session,
      req,
    );
    // 対象0件 → PDFは生成せず 200 + 空配列(JSON)で応答する。FE は Blob の
    // content-type が application/json のとき「対象のデータが存在しません。」を
    // 画面内表示する（ダウンロードはしない）。
    if (result.empty) {
      res.status(HttpStatus.OK).json({ data: { reports: [] } });
      return;
    }
    res.setHeader('Content-Type', 'application/pdf');
    // ASCII別名は filename、日本語名は RFC 5987 の filename* に設定する。
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${result.asciiFilename}"; filename*=UTF-8''${encodeURIComponent(result.filename)}`,
    );
    res.status(HttpStatus.OK).send(result.buffer);
  }

  // ─── ACSMS-API-028-003 — POST /api/v1/report/zougen-hanbaiten/export-excel ──
  @Post('zougen-hanbaiten/export-excel')
  @HttpCode(HttpStatus.OK)
  @Permissions('report.export_zougen_hanbaiten')
  @ApiOperation({ summary: '増減連絡票（販売店）Excel出力 — ACSMS-API-028-003' })
  @ApiResponse({
    status: 200,
    description:
      'Excel file (.xlsx) as attachment。対象0件のときは application/json で { data: { reports: [] } } を返す。',
    content: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {},
      'application/json': {},
    },
  })
  @ApiResponse({ status: 401, description: 'セッションが切れました。再度ログインしてください。' })
  @ApiResponse({ status: 403, description: 'この画面へのアクセス権限がありません。' })
  async exportZougenHanbaitenExcel(
    @Body() body: ZougenHanbaitenQueryDto,
    @Req() req: Request & { user?: SessionPayload },
    @Res() res: Response,
  ): Promise<void> {
    const session = req.user as SessionPayload;
    const result = await this.reportService.exportZougenHanbaitenExcel(
      body,
      session,
      req,
    );
    // 対象0件 → Excelは生成せず 200 + 空配列(JSON)で応答する（PDF export と同じ）。
    if (result.empty) {
      res.status(HttpStatus.OK).json({ data: { reports: [] } });
      return;
    }
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    // ASCII別名は filename、日本語名は RFC 5987 の filename* に設定する。
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${result.asciiFilename}"; filename*=UTF-8''${encodeURIComponent(result.filename)}`,
    );
    res.status(HttpStatus.OK).send(result.buffer);
  }

  // ─── ACSMS-API-029-001 — GET /api/v1/report/zougen-nichino/preview ────
  @Get('zougen-nichino/preview')
  @HttpCode(HttpStatus.OK)
  @Permissions('report.export_zougen_nichino')
  @ApiOperation({ summary: '増減通知（日本農業新聞）プレビュー取得 — ACSMS-API-029-001' })
  @ApiResponse({
    status: 200,
    description: 'プレビューデータ（管理支店ごと）。対象0件のときは reports:[]。',
  })
  @ApiResponse({ status: 401, description: 'セッションが切れました。再度ログインしてください。' })
  @ApiResponse({ status: 403, description: 'この画面へのアクセス権限がありません。' })
  async previewZougenNichino(
    @Query() query: ZougenNichinoQueryDto,
    @Req() req: Request & { user?: SessionPayload },
  ) {
    const session = req.user as SessionPayload;
    const data = await this.reportService.previewZougenNichino(query, session);
    return { data };
  }

  // ─── ACSMS-API-029-002 — POST /api/v1/report/zougen-nichino/export ────
  @Post('zougen-nichino/export')
  @HttpCode(HttpStatus.OK)
  @Permissions('report.export_zougen_nichino')
  @ApiOperation({ summary: '増減通知（日本農業新聞）出力 — ACSMS-API-029-002' })
  @ApiResponse({
    status: 200,
    description:
      'PDFはブラウザへ返さず S3 へ保存し日農担当者へメール通知する。' +
      '成功時は { data: { file_name, recipient_count } }。' +
      '対象0件のときは { data: { reports: [] } }。',
    content: { 'application/json': {} },
  })
  @ApiResponse({ status: 401, description: 'セッションが切れました。再度ログインしてください。' })
  @ApiResponse({ status: 403, description: 'この画面へのアクセス権限がありません。' })
  async exportZougenNichinoPdf(
    @Body() body: ZougenNichinoQueryDto,
    @Req() req: Request & { user?: SessionPayload },
    @Res() res: Response,
  ): Promise<void> {
    const session = req.user as SessionPayload;
    const result = await this.reportService.exportZougenNichinoPdf(
      body,
      session,
      req,
    );
    // 対象0件 → ファイル生成せず 200 + 空配列(JSON)で応答する。
    if (result.empty) {
      res.status(HttpStatus.OK).json({ data: { reports: [] } });
      return;
    }
    // PDFは S3 保存 + メール通知のみ（ブラウザはダウンロードしない）。
    res.status(HttpStatus.OK).json({
      data: {
        file_name: result.fileName,
        recipient_count: result.recipientCount,
      },
    });
  }

  // ─── ACSMS-API-029-003 — POST /api/v1/report/zougen-nichino/export-excel ──
  @Post('zougen-nichino/export-excel')
  @HttpCode(HttpStatus.OK)
  @Permissions('report.export_zougen_nichino')
  @ApiOperation({ summary: '増減通知（日本農業新聞）Excel出力 — ACSMS-API-029-003' })
  @ApiResponse({
    status: 200,
    description:
      'Excelはブラウザへ返さず S3 へ保存し日農担当者へメール通知する。' +
      '成功時は { data: { file_name, recipient_count } }。' +
      '対象0件のときは { data: { reports: [] } }。',
    content: { 'application/json': {} },
  })
  @ApiResponse({ status: 401, description: 'セッションが切れました。再度ログインしてください。' })
  @ApiResponse({ status: 403, description: 'この画面へのアクセス権限がありません。' })
  async exportZougenNichinoExcel(
    @Body() body: ZougenNichinoQueryDto,
    @Req() req: Request & { user?: SessionPayload },
    @Res() res: Response,
  ): Promise<void> {
    const session = req.user as SessionPayload;
    const result = await this.reportService.exportZougenNichinoExcel(
      body,
      session,
      req,
    );
    if (result.empty) {
      res.status(HttpStatus.OK).json({ data: { reports: [] } });
      return;
    }
    // Excelは S3 保存 + メール通知のみ（ブラウザはダウンロードしない）。
    res.status(HttpStatus.OK).json({
      data: {
        file_name: result.fileName,
        recipient_count: result.recipientCount,
      },
    });
  }
}
