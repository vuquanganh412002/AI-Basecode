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
import { UPLOAD_DOWNLOAD_THROTTLE } from '@/common/constants/rate-limit.constant';
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
  MAX_FILE_SIZE_BYTES,
  type UploadedMulterFile,
} from './file-upload.service';

@ApiTags('file-upload')
@ApiCookieAuth('session_id')
@Controller('file-upload')
@UseGuards(SessionAuthGuard, PermissionsGuard)
export class FileUploadController {
  private readonly logger = new Logger(FileUploadController.name);

  constructor(private readonly service: FileUploadService) {}

  // ACSMS-API-022-001
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

  // ACSMS-SCR-023 — POST /api/v1/file-upload (multipart upload)
  @Post()
  @Permissions('file.upload')
  // [throttle-upload] このパスは WAF body-inspection バイパス(大バイナリが managed
  // XSS/SQLi ルールに誤検知。nestjs.md §WAF body-inspection bypass)で edge rate-limit
  // を失うため、app 側で厳格化(20/min/IP、グローバルは 100)。実 viewer IP は
  // `trust proxy`(main.ts)で取得(ALB でない)。
  @Throttle(UPLOAD_DOWNLOAD_THROTTLE)
  // [http-202] api.md §概要 が 202 Accepted 指定(通知メール送信は worker で非同期)。
  @HttpCode(HttpStatus.ACCEPTED)
  // [multer-files] FilesInterceptor が multipart の `files` を Express.Multer.File[]
  // へ。max 20(api.md は N 上限なしだが数千は受けない)。1 ファイル 30MB — screen-design.md 機能定義 4.2。
  @UseInterceptors(
    FilesInterceptor('files', 20, { limits: { fileSize: MAX_FILE_SIZE_BYTES } }),
  )
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
    // [multipart-validation] このエンドポイントだけグローバル ValidationPipe を上書き。
    // multer が multipart テキスト欄を req.body へ入れるため、グローバルの
    // `forbidNonWhitelisted: true` が FE が ja_ids[] と一緒に送る scheduled_delete_date
    // 等を拒否してしまう。whitelist: true は strip-unknown を維持し、
    // forbidNonWhitelisted: false で拒否だけ抑止(transform + 共通 exceptionFactory は維持)。
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
    // [utf8-filename] Busboy は multipart `filename` を既定 latin1 で decode するため
    // 日本語/ベトナム語名が originalname で化ける。S3 キー + file_name 列
    // (file-upload.service.ts)や下の diag log へ流れる前に、単一入口でここで復元。
    for (const f of files ?? []) {
      f.originalname = decodeMultipartFilename(f.originalname);
    }

    // [diag] 段階トレース — multer が multipart body を parse した確認。ここで
    // file_count: 0 なら FE の欄名が FilesInterceptor('files') 不一致で S3 に届かない(silent no-op)。
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

  // ACSMS-SCR-023 — DELETE /api/v1/file-upload/:id
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

  // ACSMS-SCR-023 — GET /api/v1/file-upload/:id/preview
  @Get(':file_upload_id/preview')
  @Permissions('file.download')
  @ApiOperation({ summary: 'プレビュー用署名付き URL を取得する' })
  async getPreview(
    @Param('file_upload_id', new ParseIntPipe()) fileUploadId: number,
    @Req() req: Request & { user?: SessionPayload },
  ): Promise<{ data: { preview_url: string; file_name: string } }> {
    return this.service.getPreview(fileUploadId, req.user as SessionPayload);
  }

  // ACSMS-SCR-023 — GET /api/v1/file-upload/:id/download
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

  // ACSMS-SCR-023 — POST /api/v1/file-upload/download-zip
  @Post('download-zip')
  @HttpCode(HttpStatus.OK)
  @Permissions('file.download')
  @Throttle(UPLOAD_DOWNLOAD_THROTTLE)
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
