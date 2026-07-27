import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
  Res,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
  ValidationPipe,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import {
  ApiBody,
  ApiConsumes,
  ApiCookieAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';

import { Permissions } from '@/common/decorators/permissions.decorator';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { SessionAuthGuard } from '@/common/guards/session-auth.guard';
import { decodeMultipartFilename } from '@/common/utils/multipart-filename';
import type { PaginatedResponse } from '@/common/utils/paginate';
import {
  sendBinaryAttachment,
  type DownloadResult,
} from '@/common/utils/file-delivery';
import type { SessionPayload } from '@/modules/auth/session.service';

import { SuccessMessageDto } from '@/common/dto/responses.dto';
import { SearchFileUploadDto } from './dto/search-file-upload.dto';
import { UploadDownloadZipDto } from './dto/download-zip.dto';
import { UploadFileUploadDto } from './dto/upload-file-upload.dto';
import {
  FileUploadCreatedItemDto,
  FileUploadCreatedResponseDto,
  FileUploadListItemDto,
  FileUploadListResponseDto,
} from './dto/file-upload-response.dto';
import {
  FileUploadService,
  type UploadedMulterFile,
} from './file-upload.service';

@ApiTags('file-upload')
@ApiCookieAuth('session_id')
@Controller('file-upload')
@UseGuards(SessionAuthGuard, PermissionsGuard)
export class FileUploadController {
  private readonly logger = new Logger(FileUploadController.name);

  constructor(private readonly service: FileUploadService) {}

  // ──────────────────────────────────────────────────────────────
  // ACSMS-API-022-001
  // ──────────────────────────────────────────────────────────────
  @Get()
  @Permissions('file.download')
  @ApiOperation({ summary: 'アップロード済みファイル一覧を取得する' })
  @ApiResponse({ status: 200, type: FileUploadListResponseDto })
  async findAll(
    @Query() query: SearchFileUploadDto,
    @Req() req: Request & { user?: SessionPayload },
  ): Promise<PaginatedResponse<FileUploadListItemDto>> {
    return this.service.findAll(query, req.user as SessionPayload, req);
  }

  // ══════════════════════════════════════════════════════════════
  // SCR-023 — POST /api/v1/file-upload (multipart upload)
  // ══════════════════════════════════════════════════════════════
  @Post()
  @Permissions('file.upload')
  // [throttle-upload] This path is WAF-body-inspection-bypassed (large binary
  // bodies false-positive on managed XSS/SQLi rules — see .claude/rules/
  // nestjs.md §WAF body-inspection bypass), so it lost the edge rate-limit.
  // A stricter app-level cap (20/min/IP vs the global 100) replaces it. Relies
  // on `trust proxy` (main.ts) keying on the real viewer IP, not the ALB.
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  // [http-202] api.md §概要 specifies 202 Accepted (not 200/201) — the
  // notification email send is decoupled and runs in a worker.
  @HttpCode(HttpStatus.ACCEPTED)
  // [multer-files] FilesInterceptor parses `multipart/form-data`'s
  // `files` field into an array of Express.Multer.File. Max 20 files
  // is generous; api.md doesn't cap N but the BE shouldn't accept
  // thousands either.
  // 30MB cap per file — screen-design.md 機能定義 4.2.
  @UseInterceptors(FilesInterceptor('files', 20, { limits: { fileSize: 30 * 1024 * 1024 } }))
  @ApiOperation({ summary: 'ファイルをアップロードする (multipart/form-data)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'ja_ids[] と files をmultipartで送信',
    schema: {
      type: 'object',
      properties: {
        'ja_ids[]': { type: 'array', items: { type: 'integer' } },
        files: { type: 'array', items: { type: 'string', format: 'binary' } },
      },
    },
  })
  @ApiResponse({ status: 202, type: FileUploadCreatedResponseDto })
  async upload(
    // [multipart-validation] Override the global ValidationPipe for this
    // endpoint. Multer parses multipart text fields into req.body — the
    // global `forbidNonWhitelisted: true` rejects helper fields like
    // `scheduled_delete_date` that the FE sends alongside `ja_ids[]`.
    // `whitelist: true` keeps the strip-unknown behaviour (so only
    // declared DTO props reach the service); `forbidNonWhitelisted:
    // false` silences the reject. The same transform + global
    // exceptionFactory still apply.
    @Body(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: false,
      }),
    )
    body: UploadFileUploadDto,
    @UploadedFiles() files: UploadedMulterFile[],
    @Req() req: Request & { user?: SessionPayload },
  ): Promise<{ data: FileUploadCreatedItemDto[]; message: string }> {
    // [utf8-filename] Busboy decodes the multipart `filename` as latin1
    // by default, so Japanese / Vietnamese names arrive mangled in
    // `originalname`. Recover the real UTF-8 name here, at the single
    // ingestion point, BEFORE it flows into the S3 key + file_name
    // column (file-upload.service.ts) or the diag log below.
    for (const f of files ?? []) {
      f.originalname = decodeMultipartFilename(f.originalname);
    }

    // [diag] Step-by-step trace — confirms multer parsed the multipart
    // body. If `file_count: 0` here, the FE field name doesn't match
    // FilesInterceptor('files') so nothing reaches S3 — silent no-op.
    this.logger.log({
      event: 'file_upload.request.received',
      content_type: req.headers['content-type'] ?? '',
      content_length: req.headers['content-length'] ?? '',
      ja_ids: body?.ja_ids ?? null,
      file_count: Array.isArray(files) ? files.length : 0,
      files: (files ?? []).map((f) => ({
        fieldname: f.fieldname,
        originalname: f.originalname,
        mimetype: f.mimetype,
        size: f.size,
      })),
      login_id: req.user?.login_id ?? null,
    });
    return this.service.upload(
      body.ja_ids,
      files ?? [],
      req.user as SessionPayload,
      req,
      body.scheduled_delete_date,
    );
  }

  // ══════════════════════════════════════════════════════════════
  // SCR-023 — DELETE /api/v1/file-upload/:id
  // ══════════════════════════════════════════════════════════════
  @Delete(':file_upload_id')
  @Permissions('file.upload')
  @ApiOperation({ summary: 'アップロード済みファイルを論理削除する' })
  @ApiResponse({ status: 200, type: SuccessMessageDto })
  async remove(
    @Param('file_upload_id', new ParseIntPipe()) fileUploadId: number,
    @Req() req: Request & { user?: SessionPayload },
  ): Promise<{ message: string }> {
    return this.service.remove(fileUploadId, req.user as SessionPayload, req);
  }

  // ══════════════════════════════════════════════════════════════
  // SCR-023 — GET /api/v1/file-upload/:id/preview
  // ══════════════════════════════════════════════════════════════
  @Get(':file_upload_id/preview')
  @Permissions('file.download')
  @ApiOperation({ summary: 'プレビュー用署名付き URL を取得する' })
  async getPreview(
    @Param('file_upload_id', new ParseIntPipe()) fileUploadId: number,
    @Req() req: Request & { user?: SessionPayload },
  ): Promise<{ data: { preview_url: string; file_name: string } }> {
    return this.service.getPreview(fileUploadId, req.user as SessionPayload);
  }

  // ══════════════════════════════════════════════════════════════
  // SCR-023 — GET /api/v1/file-upload/:id/download
  // ══════════════════════════════════════════════════════════════
  @Get(':file_upload_id/download')
  @Permissions('file.download')
  @ApiOperation({ summary: 'アップロード済みファイルをダウンロードする' })
  @ApiResponse({
    status: 200,
    description: 'File binary as attachment.',
    content: { 'application/octet-stream': {} },
  })
  async download(
    @Param('file_upload_id', new ParseIntPipe()) fileUploadId: number,
    @Req() req: Request & { user?: SessionPayload },
    @Res() res: Response,
  ): Promise<void> {
    const result = await this.service.download(
      fileUploadId,
      req.user as SessionPayload,
      req,
    );
    this.sendBinary(res, result);
  }

  // ══════════════════════════════════════════════════════════════
  // SCR-023 — POST /api/v1/file-upload/download-zip
  // ══════════════════════════════════════════════════════════════
  @Post('download-zip')
  @HttpCode(HttpStatus.OK)
  @Permissions('file.download')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @ApiOperation({
    summary: '選択した複数ファイルを ZIP に1つにまとめてダウンロードする',
  })
  @ApiResponse({
    status: 200,
    description: 'ZIP (application/zip) を attachment で返す。',
    content: { 'application/zip': {} },
  })
  async downloadZip(
    @Body() dto: UploadDownloadZipDto,
    @Req() req: Request & { user?: SessionPayload },
    @Res() res: Response,
  ): Promise<void> {
    const result = await this.service.downloadZip(
      dto.file_upload_ids,
      req.user as SessionPayload,
      req,
    );
    this.sendBinary(res, result);
  }

  /** バイナリ添付レスポンスは共通ユーティリティ `sendBinaryAttachment` に集約。 */
  private sendBinary(res: Response, result: DownloadResult): void {
    sendBinaryAttachment(res, result);
  }
}
