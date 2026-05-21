import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Put,
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

import { HanbaitenService } from './hanbaiten.service';
import { CreateHanbaitenDto } from './dto/create-hanbaiten.dto';
import { ImportHanbaitenDto } from './dto/import-hanbaiten.dto';
import { SearchHanbaitenDto } from './dto/search-hanbaiten.dto';
import { UpdateHanbaitenDto } from './dto/update-hanbaiten.dto';
import { SessionAuthGuard } from '@/common/guards/session-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { Permissions } from '@/common/decorators/permissions.decorator';
import type { SessionPayload } from '@/modules/auth/session.service';

/**
 * ACSMS-SCR-018 — 販売店明細検索画面.
 *
 * Two endpoints:
 *   - GET    /api/v1/hanbaiten             search + paginate
 *   - DELETE /api/v1/hanbaiten/:id         soft-delete with FK guard
 *
 * Both endpoints sit behind `SessionAuthGuard` + `PermissionsGuard`; the
 * `@Permissions(...)` decorator names the `model.action` row each role
 * must hold (seeder.md §3). NICHINO_STAFF / CHUOKAI / JA_HONTEN /
 * JA_KANRI_SHITEN all have `hanbaiten.view`; only CHUOKAI / JA_HONTEN /
 * JA_KANRI_SHITEN have `hanbaiten.delete` (NICHINO_STAFF deliberately
 * does NOT — it's a 代行入力 role, not an editorial one).
 */
@ApiTags('hanbaiten')
@ApiCookieAuth('session_id')
@Controller('hanbaiten')
@UseGuards(SessionAuthGuard, PermissionsGuard)
export class HanbaitenController {
  constructor(private readonly service: HanbaitenService) {}

  @Get()
  @Permissions('hanbaiten.view')
  @ApiOperation({ summary: '販売店明細検索画面 — 販売店一覧取得' })
  @ApiResponse({ status: 200 })
  async findAll(
    @Query() query: SearchHanbaitenDto,
    @Req() req: Request & { user: SessionPayload },
  ) {
    return this.service.findAll(query, req.user);
  }

  // ─── ACSMS-API-019-001 — GET /api/v1/hanbaiten/import/template ───────
  //
  // Declared BEFORE `@Get(':hanbaiten_id')` so the static path wins; if
  // ordering flips, NestJS treats `import` as a numeric :hanbaiten_id
  // and ParseIntPipe 400's the request.
  @Get('import/template')
  @HttpCode(HttpStatus.OK)
  @Permissions('hanbaiten.import')
  @ApiOperation({
    summary: '販売店Excelデータ取込画面 — テンプレートDL (ACSMS-API-019-001)',
  })
  @ApiResponse({ status: 200, description: 'XLSXバイナリ' })
  @ApiResponse({ status: 401, description: 'セッションが切れました。再度ログインしてください。' })
  @ApiResponse({ status: 403, description: 'この画面へのアクセス権限がありません。' })
  async downloadImportTemplate(
    @Req() req: Request & { user: SessionPayload },
    @Res() res: Response,
  ): Promise<void> {
    const buffer = await this.service.downloadImportTemplate(req.user);
    // [content-disposition-encoding]
    // Node's HTTP `validateHeader` rejects literal non-ASCII chars in
    // header values (CRLF / 0x80-0xFF blocked). The Japanese filename
    // therefore goes ONLY through the RFC 6266 `filename*=UTF-8''…`
    // percent-encoded form. The `filename="..."` fallback uses an ASCII
    // approximation so legacy clients still get a sensible attachment
    // name instead of nothing.
    const filename = '販売店Excelデータ取込_テンプレート.xlsx';
    const utf8Filename = encodeURIComponent(filename);
    const asciiFallback = 'hanbaiten_import_template.xlsx';
    res.set({
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${asciiFallback}"; filename*=UTF-8''${utf8Filename}`,
      'Content-Length': String(buffer.length),
    });
    res.send(buffer);
  }

  // ─── ACSMS-API-019-002 — POST /api/v1/hanbaiten/import ───────────────
  //
  // Declared BEFORE `@Post()` for SCR-017 isn't strictly necessary
  // because POST '/' and POST '/import' don't collide, but keeping the
  // SCR-019 pair adjacent matches the SCR-018 / SCR-017 / SCR-019
  // documentation grouping.
  @Post('import')
  @HttpCode(HttpStatus.OK)
  @Permissions('hanbaiten.import')
  @ApiOperation({
    summary: '販売店Excelデータ取込画面 — Excel取込 (ACSMS-API-019-002)',
  })
  @ApiResponse({ status: 200, description: '正常に取り込みました。' })
  @ApiResponse({ status: 400, description: '入力値エラー / 取込データエラー' })
  @ApiResponse({ status: 401, description: 'セッションが切れました。再度ログインしてください。' })
  @ApiResponse({ status: 403, description: 'この画面へのアクセス権限がありません。' })
  async importExcel(
    @Body() dto: ImportHanbaitenDto,
    @Req() req: Request & { user: SessionPayload },
  ) {
    return this.service.importExcel(dto, req.user, req);
  }

  // ─── ACSMS-API-017-001 — GET /api/v1/hanbaiten/:hanbaiten_id ─────────
  @Get(':hanbaiten_id')
  @HttpCode(HttpStatus.OK)
  @Permissions('hanbaiten.view')
  @ApiOperation({ summary: '販売店情報登録画面 — 販売店詳細取得 (ACSMS-API-017-001)' })
  @ApiResponse({ status: 200, description: '正常に販売店詳細を取得しました' })
  @ApiResponse({ status: 401, description: 'セッションが切れました。再度ログインしてください。' })
  @ApiResponse({ status: 403, description: 'この画面へのアクセス権限がありません。' })
  @ApiResponse({ status: 404, description: '指定された販売店が見つかりません。' })
  async getDetail(
    @Param('hanbaiten_id', ParseIntPipe) hanbaitenId: number,
    @Req() req: Request & { user: SessionPayload },
  ) {
    return this.service.getHanbaitenDetail(hanbaitenId, req.user);
  }

  // ─── ACSMS-API-017-002 — POST /api/v1/hanbaiten ──────────────────────
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Permissions('hanbaiten.create')
  @ApiOperation({ summary: '販売店情報登録画面 — 販売店登録 (ACSMS-API-017-002)' })
  @ApiResponse({ status: 201, description: '登録しました。' })
  @ApiResponse({ status: 400, description: '入力内容にエラーがあります' })
  @ApiResponse({ status: 401, description: 'セッションが切れました。再度ログインしてください。' })
  @ApiResponse({ status: 403, description: 'この画面へのアクセス権限がありません。' })
  async create(
    @Body() dto: CreateHanbaitenDto,
    @Req() req: Request & { user: SessionPayload },
  ) {
    return this.service.createHanbaiten(dto, req.user, req);
  }

  // ─── ACSMS-API-017-003 — PUT /api/v1/hanbaiten/:hanbaiten_id ─────────
  @Put(':hanbaiten_id')
  @HttpCode(HttpStatus.OK)
  @Permissions('hanbaiten.update')
  @ApiOperation({ summary: '販売店情報登録画面 — 販売店更新 (ACSMS-API-017-003)' })
  @ApiResponse({ status: 200, description: '更新しました。' })
  @ApiResponse({ status: 400, description: '入力内容にエラーがあります' })
  @ApiResponse({ status: 401, description: 'セッションが切れました。再度ログインしてください。' })
  @ApiResponse({ status: 403, description: 'この画面へのアクセス権限がありません。' })
  @ApiResponse({ status: 404, description: '指定された販売店が見つかりません。' })
  async update(
    @Param('hanbaiten_id', ParseIntPipe) hanbaitenId: number,
    @Body() dto: UpdateHanbaitenDto,
    @Req() req: Request & { user: SessionPayload },
  ) {
    return this.service.updateHanbaiten(hanbaitenId, dto, req.user, req);
  }

  @Delete(':id')
  @Permissions('hanbaiten.delete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '販売店明細検索画面 — 販売店論理削除' })
  @ApiResponse({ status: 200 })
  async remove(
    @Param('id', ParseIntPipe) hanbaitenId: number,
    @Req() req: Request & { user: SessionPayload },
  ) {
    return this.service.remove(hanbaitenId, req.user, req);
  }
}
