import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
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
import type { PaginatedResponse } from '@/common/utils/paginate';
import {
  sendBinaryAttachment,
  type DownloadResult,
} from '@/common/utils/file-delivery';
import type { SessionPayload } from '@/modules/auth/session.service';

import { DownloadZipDto } from './dto/download-zip.dto';
import {
  FileDownloadListItemDto,
  FileDownloadListResponseDto,
  FilePreviewEnvelopeDto,
} from './dto/file-download-response.dto';
import { SearchFileDownloadDto } from './dto/search-file-download.dto';
import { FileDownloadService } from './file-download.service';

/**
 * SCR-022 ファイルダウンロード画面。データソースは t_file_download。
 * 一覧 / プレビュー / 単体DL / 一括ZIP。DL 実行は t_log のみ記録し、
 * t_file_download への INSERT は行わない（帳票各画面が生成時に登録する）。
 */
@ApiTags('file-download')
@Controller('file-download')
@UseGuards(SessionAuthGuard, PermissionsGuard)
@ApiCookieAuth('session_id')
export class FileDownloadController {
  constructor(private readonly service: FileDownloadService) {}

  // ── ACSMS-API-022-001 — GET /api/v1/file-download ─────────────────
  @Get()
  @Permissions('file.download')
  @ApiOperation({ summary: 'ダウンロード対象ファイル一覧を取得する' })
  @ApiResponse({ status: 200, type: FileDownloadListResponseDto })
  async findAll(
    @Query() query: SearchFileDownloadDto,
    @Req() req: Request & { user?: SessionPayload },
  ): Promise<PaginatedResponse<FileDownloadListItemDto>> {
    return this.service.findAll(query, req.user as SessionPayload);
  }

  // ── ACSMS-API-022-002 — GET /api/v1/file-download/:id/preview ─────
  @Get(':file_download_id/preview')
  @Permissions('file.download')
  @ApiOperation({ summary: 'プレビュー用署名付き URL を取得する' })
  @ApiResponse({ status: 200, type: FilePreviewEnvelopeDto })
  async getPreview(
    @Param('file_download_id', new ParseIntPipe()) fileDownloadId: number,
    @Req() req: Request & { user?: SessionPayload },
  ): Promise<{ data: { preview_url: string; file_name: string } }> {
    return this.service.getPreview(fileDownloadId, req.user as SessionPayload);
  }

  // ── ACSMS-API-022-003 — GET /api/v1/file-download/:id/download ─────
  @Get(':file_download_id/download')
  @Permissions('file.download')
  @ApiOperation({ summary: 'ファイルバイナリをダウンロードする' })
  @ApiResponse({
    status: 200,
    description: 'File binary (content-type derived from extension) as attachment.',
    content: { 'application/octet-stream': {} },
  })
  async download(
    @Param('file_download_id', new ParseIntPipe()) fileDownloadId: number,
    @Req() req: Request & { user?: SessionPayload },
    @Res() res: Response,
  ): Promise<void> {
    const result = await this.service.download(
      fileDownloadId,
      req.user as SessionPayload,
      req,
    );
    this.sendBinary(res, result);
  }

  // ── ACSMS-API-022-004 — POST /api/v1/file-download/download-zip ────
  @Post('download-zip')
  @HttpCode(HttpStatus.OK)
  @Permissions('file.download')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @ApiOperation({
    summary: '選択した複数ファイルを ZIP に1つにまとめてダウンロードする',
  })
  @ApiResponse({
    status: 200,
    description:
      'ZIP (application/zip) を attachment で返す（一括ダウンロード_yyyyMMddHHmmss.zip）。',
    content: { 'application/zip': {} },
  })
  async downloadZip(
    @Body() dto: DownloadZipDto,
    @Req() req: Request & { user?: SessionPayload },
    @Res() res: Response,
  ): Promise<void> {
    const result = await this.service.downloadZip(
      dto.file_download_ids,
      req.user as SessionPayload,
      req,
    );
    this.sendBinary(res, result);
  }

  /**
   * バイナリ添付レスポンスは共通ユーティリティ `sendBinaryAttachment` に集約
   * （SCR-023 アップロード画面と同一処理）。
   */
  private sendBinary(res: Response, result: DownloadResult): void {
    sendBinaryAttachment(res, result);
  }
}
