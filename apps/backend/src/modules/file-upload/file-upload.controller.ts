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
import type { PaginatedResponse } from '@/common/utils/paginate';
import type { SessionPayload } from '@/modules/auth/session.service';

import { SuccessMessageDto } from '@/common/dto/responses.dto';
import { SearchFileUploadDto } from './dto/search-file-upload.dto';
import { UploadFileUploadDto } from './dto/upload-file-upload.dto';
import {
  FilePreviewEnvelopeDto,
  FilePreviewResponseDto,
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

  // ──────────────────────────────────────────────────────────────
  // ACSMS-API-022-002
  // ──────────────────────────────────────────────────────────────
  @Get(':file_upload_id/preview')
  @Permissions('file.download')
  @ApiOperation({ summary: 'プレビュー用署名付き URL を取得する' })
  @ApiResponse({ status: 200, type: FilePreviewEnvelopeDto })
  async getPreview(
    @Param('file_upload_id', new ParseIntPipe()) fileUploadId: number,
    @Req() req: Request & { user?: SessionPayload },
  ): Promise<{ data: FilePreviewResponseDto }> {
    return this.service.getPreview(fileUploadId, req.user as SessionPayload, req);
  }

  // ──────────────────────────────────────────────────────────────
  // ACSMS-API-022-003
  // ──────────────────────────────────────────────────────────────
  @Get(':file_upload_id/download')
  @Permissions('file.download')
  @ApiOperation({ summary: 'ファイルバイナリをダウンロードする' })
  // Binary file download — no typed JSON body. Orval emits `void`;
  // FE consumes as Blob and triggers attachment save.
  @ApiResponse({
    status: 200,
    description: 'File binary (content-type derived from extension) as attachment.',
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
    // RFC 5987 / 6266 — `filename*=UTF-8''<URL-encoded>` carries the
    // real name; modern browsers prefer it. The bare `filename="..."`
    // is a legacy-client fallback and MUST stay ASCII — Node's HTTP
    // layer (RFC 7230) refuses to send multibyte bytes in a header
    // value and throws "Invalid character in header content", which
    // bubbles up as a 500. Drop any non-ASCII characters for the
    // fallback; the UTF-8 form preserves the full name for new
    // clients.
    const encodedName = encodeURIComponent(result.fileName);
    const asciiFallback = result.fileName.replaceAll(/[^\x20-\x7e]/g, '_');
    res.setHeader('Content-Type', result.contentType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodedName}`,
    );
    res.setHeader('Content-Length', String(result.contentLength));
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).send(result.body);
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
}
