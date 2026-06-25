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
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';

import { SuccessMessageDto } from '@/common/dto/responses.dto';
import { HanbaitenService } from './hanbaiten.service';
import { CreateHanbaitenDto } from './dto/create-hanbaiten.dto';
import {
  HanbaitenDetailEnvelopeDto,
  HanbaitenImportResponseDto,
  HanbaitenListResponseDto,
  HanbaitenMutationResponseDto,
} from './dto/hanbaiten-envelopes.dto';
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
  // [perm-any-of] OR semantics — NICHINO_STAFF carries
  // `hanbaiten.daiko_input` (代行入力) but not `hanbaiten.view`; the
  // search list is shared across both flows behind a role-aware JA
  // filter on the FE.
  @Permissions('hanbaiten.view', 'hanbaiten.daiko_input')
  @ApiOperation({ summary: '販売店明細検索画面 — 販売店一覧取得' })
  @ApiResponse({ status: 200, type: HanbaitenListResponseDto })
  async findAll(
    @Query() query: SearchHanbaitenDto,
    @Req() req: Request & { user: SessionPayload },
  ) {
    return this.service.findAll(query, req.user);
  }

  // ─── ACSMS-API-COMMON — GET /api/v1/hanbaiten/dropdown (SCR-011) ─────
  //
  // Consumed by the 購読者情報登録 (SCR-011) form's 販売店コード picker.
  // Minimal projection — just (hanbaiten_id, hanbaiten_code,
  // hanbaiten_name). Scoped to the caller's JA in the service via
  // `applyJaScope`; NICHINO_* see all JAs unless `ja_id` is supplied.
  //
  // Declared BEFORE `@Get(':hanbaiten_id')` so the static path wins.
  @Get('dropdown')
  @HttpCode(HttpStatus.OK)
  // Authenticated-only — any logged-in user with a screen-level
  // permission that needs a 販売店 picker can call. Specific permission
  // gates live on the screen routes, not this shared dropdown.
  @ApiOperation({ summary: '販売店プルダウン (SCR-011 用)' })
  @ApiResponse({ status: 200, description: 'Dropdown projection.' })
  async listHanbaitenDropdown(
    @Query()
    query: {
      ja_id?: string;
      q?: string;
      match_field?: string;
      page?: string;
      per_page?: string;
      include_id?: string;
    },
    @Req() req: Request & { user: SessionPayload },
  ) {
    const num = (v?: string) => (v === undefined ? undefined : Number(v));
    const page = num(query.page);
    const perPage = num(query.per_page);
    const { data, has_more } = await this.service.listDropdown(
      {
        ja_id: num(query.ja_id),
        q: typeof query.q === 'string' ? query.q : undefined,
        match_field: query.match_field === 'name' ? 'name' : 'both',
        page,
        per_page: perPage,
        include_id: num(query.include_id),
      },
      req.user,
    );
    return {
      data,
      meta: {
        total: data.length,
        page: page ?? 1,
        per_page: perPage ?? data.length,
        has_more,
      },
    };
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
  // XLSX binary download — no typed JSON body. Orval emits `void` for
  // the return; FE wrapper consumes as Blob and triggers attachment
  // save. Decorate with explicit content type so swagger.json docs the
  // mime-type without claiming a JSON schema.
  @ApiResponse({
    status: 200,
    description: 'XLSX file (xlsx) as attachment.',
    content: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {},
    },
  })
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
  // [throttle-import] WAF body inspection is bypassed for this path (large
  // free-text JSON rows false-positive on managed rules — see .claude/rules/
  // nestjs.md §WAF body-inspection bypass), so it lost the edge rate-limit.
  // Cap at 10/min/IP.
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({
    summary: '販売店Excelデータ取込画面 — Excel取込 (ACSMS-API-019-002)',
  })
  @ApiResponse({ status: 200, type: HanbaitenImportResponseDto })
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
  // [perm-any-of] Edit form needs to hydrate from detail too — same
  // dual-perm rationale as the list endpoint above.
  @Permissions('hanbaiten.view', 'hanbaiten.daiko_input')
  @ApiOperation({ summary: '販売店情報登録画面 — 販売店詳細取得 (ACSMS-API-017-001)' })
  @ApiResponse({ status: 200, type: HanbaitenDetailEnvelopeDto })
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
  // [perm-any-of] NICHINO_STAFF creates hanbaiten via `hanbaiten.daiko_input`.
  @Permissions('hanbaiten.create', 'hanbaiten.daiko_input')
  @ApiOperation({ summary: '販売店情報登録画面 — 販売店登録 (ACSMS-API-017-002)' })
  @ApiResponse({ status: 201, type: HanbaitenMutationResponseDto })
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
  // [perm-any-of] NICHINO_STAFF updates hanbaiten via `hanbaiten.daiko_input`.
  @Permissions('hanbaiten.update', 'hanbaiten.daiko_input')
  @ApiOperation({ summary: '販売店情報登録画面 — 販売店更新 (ACSMS-API-017-003)' })
  @ApiResponse({ status: 200, type: HanbaitenMutationResponseDto })
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
  @ApiResponse({ status: 200, type: SuccessMessageDto })
  async remove(
    @Param('id', ParseIntPipe) hanbaitenId: number,
    @Req() req: Request & { user: SessionPayload },
  ) {
    return this.service.remove(hanbaitenId, req.user, req);
  }
}
