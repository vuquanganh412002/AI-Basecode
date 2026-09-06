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
 * 主エンドポイント：GET /api/v1/hanbaiten（検索+ページング）、
 * DELETE /api/v1/hanbaiten/:id（FK ガード付きソフト削除）。
 *
 * 各エンドポイントは `SessionAuthGuard` + `PermissionsGuard` 配下。`@Permissions(...)`
 * が各役の必要 `model.action`(seeder.md §3)を指定。NICHINO_STAFF / CHUOKAI /
 * JA_HONTEN / JA_KANRI_SHITEN は全て `hanbaiten.view` を持つ。`hanbaiten.delete` は
 * CHUOKAI / JA_HONTEN / JA_KANRI_SHITEN のみ（NICHINO_STAFF は 代行入力 役で編集役でないため意図的に無し）。
 */
@ApiTags('hanbaiten')
@ApiCookieAuth('session_id')
@Controller('hanbaiten')
@UseGuards(SessionAuthGuard, PermissionsGuard)
export class HanbaitenController {
  constructor(private readonly service: HanbaitenService) {}

  @Get()
  // [perm-any-of] OR 意味 — NICHINO_STAFF は `hanbaiten.daiko_input`(代行入力)を
  // 持つが `hanbaiten.view` は持たない。検索一覧は FE の役対応 JA フィルタ配下で両フロー共有。
  @Permissions('hanbaiten.view', 'hanbaiten.daiko_input')
  @ApiOperation({ summary: '販売店明細検索画面 — 販売店一覧取得' })
  @ApiResponse({ status: 200, type: HanbaitenListResponseDto })
  async findAll(
    @Query() query: SearchHanbaitenDto,
    @Req() req: Request & { user: SessionPayload },
  ) {
    return this.service.findAll(query, req.user);
  }

  // ─── ACSMS-API-018-003 — GET /api/v1/hanbaiten/export ─────────────────
  //
  // 静的パス優先のため `@Get(':hanbaiten_id')` より前に宣言（dropdown /
  // import/template と同じ理由）。
  @Get('export')
  @HttpCode(HttpStatus.OK)
  @Permissions('hanbaiten.view', 'hanbaiten.daiko_input')
  @ApiOperation({ summary: '販売店明細検索画面 — Excel出力 (ACSMS-API-018-003)' })
  @ApiResponse({
    status: 200,
    description: 'XLSX file (xlsx) as attachment.',
    content: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {},
    },
  })
  @ApiResponse({ status: 401, description: 'セッションが切れました。再度ログインしてください。' })
  @ApiResponse({ status: 403, description: 'この画面へのアクセス権限がありません。' })
  @ApiResponse({ status: 404, description: '出力データがありません。' })
  @ApiResponse({ status: 409, description: '出力データ件数が5000件を超えています。' })
  async exportExcel(
    @Query() query: SearchHanbaitenDto,
    @Req() req: Request & { user: SessionPayload },
    @Res() res: Response,
  ): Promise<void> {
    const { buffer, filename } = await this.service.exportExcel(
      query,
      req.user,
      req,
    );
    // [content-disposition-encoding] import/template と同じ RFC 6266 対応。
    const utf8Filename = encodeURIComponent(filename);
    res.set({
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="hanbaiten_export.xlsx"; filename*=UTF-8''${utf8Filename}`,
      'Content-Length': String(buffer.length),
    });
    res.send(buffer);
  }

  // ─── ACSMS-API-COMMON — GET /api/v1/hanbaiten/dropdown (ACSMS-SCR-011) ─────
  //
  // 購読者情報登録(ACSMS-SCR-011)フォームの 販売店コード picker が利用。最小射影
  // (hanbaiten_id / code / name)。service の `applyJaScope` で自 JA に限定、
  // NICHINO_* は `ja_id` 指定時のみ絞込。
  // 静的パス優先のため `@Get(':hanbaiten_id')` より前に宣言。
  @Get('dropdown')
  @HttpCode(HttpStatus.OK)
  // 認証済みのみ — 販売店 picker が必要な画面権限を持つログインユーザーが呼べる。
  // 個別権限ゲートは画面ルート側で、共有 dropdown には掛けない。
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
      active_only?: string;
      dummy?: string;
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
        active_only: query.active_only === 'true',
        // 未知の値は「絞らない」に倒す（既存の呼び出しは dummy を送らない）。
        dummy:
          query.dummy === 'only' || query.dummy === 'exclude'
            ? query.dummy
            : undefined,
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
  // 静的パス優先のため `@Get(':hanbaiten_id')` より前に宣言。順序が逆だと
  // NestJS が `import` を数値 :hanbaiten_id と見なし ParseIntPipe が 400 になる。
  @Get('import/template')
  @HttpCode(HttpStatus.OK)
  @Permissions('hanbaiten.import')
  @ApiOperation({
    summary: '販売店Excelデータ取込画面 — テンプレートDL (ACSMS-API-019-001)',
  })
  // XLSX バイナリ DL — 型付き JSON body 無し。Orval は返り値 `void`、FE wrapper は
  // Blob として消費し添付保存。明示 content type で swagger.json が JSON schema を
  // 主張せず mime-type を記す。
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
    // Node の HTTP `validateHeader` はヘッダ値のリテラル非 ASCII を拒否
    // (CRLF / 0x80-0xFF)。日本語ファイル名は RFC 6266 `filename*=UTF-8''…`
    // percent-encoded 形のみで渡す。`filename="..."` fallback は ASCII 近似で
    // レガシークライアントも無名でなく妥当な添付名を得る。
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
  // POST '/' と POST '/import' は衝突しないため `@Post()`(ACSMS-SCR-017) より前に置く
  // 必要はないが、ACSMS-SCR-019 のペアを隣接させ ACSMS-SCR-018 / ACSMS-SCR-017 / ACSMS-SCR-019 の
  // ドキュメント区分に合わせる。
  @Post('import')
  @HttpCode(HttpStatus.OK)
  @Permissions('hanbaiten.import')
  // [throttle-import] このパスは WAF のボディ検査をバイパスする（大量の自由記述
  // JSON 行が managed ルールに誤検知するため — .claude/rules/nestjs.md §WAF
  // body-inspection bypass）ため、エッジのレート制限を失う。10/分/IP に制限。
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
  // [perm-any-of] 編集フォームも詳細から hydrate する — 上の一覧エンドポイントと
  // 同じ二重権限の理由。
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
  // [perm-any-of] NICHINO_STAFF は `hanbaiten.daiko_input`(代行入力)で販売店を登録する。
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
  // [perm-any-of] NICHINO_STAFF は `hanbaiten.daiko_input`(代行入力)で販売店を更新する。
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
