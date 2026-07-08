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
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';

import { Permissions } from '@/common/decorators/permissions.decorator';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { SessionAuthGuard } from '@/common/guards/session-auth.guard';
import type { SessionPayload } from '@/modules/auth/session.service';

import { CreateDokusyaDto } from './dto/create-dokusya.dto';
import { SearchDokusyaDto } from './dto/search-dokusya.dto';
import { SearchReplaceDokusyaDto } from './dto/search-replace-dokusya.dto';
import { ReplaceHanbaitenDto } from './dto/replace-hanbaiten.dto';
import { UpdateDokusyaDto } from './dto/update-dokusya.dto';
import { ImportDokusyaDto } from './dto/import-dokusya.dto';
import { DokusyaRirekiQueryDto } from './dto/dokusya-rireki-query.dto';
import { TorikeshiRirekiDto } from './dto/torikeshi-rireki.dto';
import {
  DokusyaHistoryResponseDto,
} from './dto/dokusya-history-response.dto';
import {
  DokusyaMutationResponseDto,
  DokusyaResponseEnvelopeDto,
} from './dto/dokusya-response.dto';
import { DokusyaService } from './dokusya.service';

/**
 * ACSMS-SCR-011 — 購読者情報登録画面.
 *
 * Six endpoints exposed under `/api/v1/dokusya`. The global prefix
 * `api/v1` is applied centrally in `main.ts` via `setGlobalPrefix` —
 * controllers declare the unprefixed segment only.
 *
 * Both guards (`SessionAuthGuard` + `PermissionsGuard`) wrap every
 * endpoint. The `@Permissions('dokusya.*')` decorator names the
 * permission codes from `seeder.md §3` each role must hold:
 *   - `dokusya.view`   — GET detail + GET history
 *   - `dokusya.create` — POST
 *   - `dokusya.update` — PUT + approve / reject
 */
@ApiTags('dokusya')
@ApiCookieAuth('session_id')
@Controller('dokusya')
@UseGuards(SessionAuthGuard, PermissionsGuard)
export class DokusyaController {
  constructor(private readonly service: DokusyaService) {}

  // ─── API-014-001 ────────────────────────────────────────────────────
  // NOTE — route order matters. Express/Nest match in declaration order,
  // and `GET /:dokusya_id` would otherwise consume `/`-prefixed paths.
  // The export path declares `GET /export` BEFORE `GET /:dokusya_id` so
  // the literal segment wins over the numeric param. SCR-014's search
  // (GET /) also lives ahead of detail so the SCR-011 detail handler
  // continues to receive only numeric ids.
  @Get()
  @HttpCode(HttpStatus.OK)
  @Permissions('dokusya.view')
  @ApiOperation({ summary: '購読者明細検索画面 — 一覧検索（SCR-014）' })
  @ApiResponse({ status: 200, description: '購読者一覧（data/meta envelope）' })
  @ApiResponse({ status: 400, description: 'バリデーションエラー' })
  @ApiResponse({ status: 401, description: 'セッションが切れました。再度ログインしてください。' })
  @ApiResponse({ status: 403, description: 'この画面へのアクセス権限がありません。' })
  async search(
    @Query() query: SearchDokusyaDto,
    @Req() req: Request & { user: SessionPayload },
  ) {
    return this.service.search(query, req.user);
  }

  // ─── API-014-003 ────────────────────────────────────────────────────
  @Get('export')
  @HttpCode(HttpStatus.OK)
  @Permissions('dokusya.view')
  @ApiOperation({ summary: '購読者明細検索画面 — Excel出力（SCR-014）' })
  @ApiResponse({ status: 200, description: 'Excelバイナリ' })
  @ApiResponse({ status: 401, description: 'セッションが切れました。再度ログインしてください。' })
  @ApiResponse({ status: 403, description: 'この画面へのアクセス権限がありません。' })
  @ApiResponse({ status: 404, description: '出力データがありません。' })
  @ApiResponse({ status: 409, description: '出力データ件数が30000件を超えています。' })
  async exportExcel(
    @Query() query: SearchDokusyaDto,
    @Req() req: Request & { user: SessionPayload },
    @Res() res: Response,
  ): Promise<void> {
    const { buffer, filename } = await this.service.exportExcel(
      query,
      req.user,
      req,
    );
    // RFC 6266 filename*=UTF-8'' so the multibyte Japanese name
    // (購読者一覧出力_…) survives Node's header-value restriction.
    const encoded = encodeURIComponent(filename);
    res.set({
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename*=UTF-8''${encoded}`,
      'Content-Length': String(buffer.length),
    });
    res.send(buffer);
  }

  // ─── API-015-001 ────────────────────────────────────────────────────
  // Literal `replace-hanbaiten/search` MUST precede `GET /:dokusya_id`
  // so the numeric-param route doesn't swallow the literal segment.
  @Get('replace-hanbaiten/search')
  @HttpCode(HttpStatus.OK)
  @Permissions('dokusya.replace_hanbaiten')
  @ApiOperation({ summary: '購読者販売店一括置換画面 — 対象検索（SCR-015）' })
  @ApiResponse({ status: 200, description: '置換対象購読者一覧（data/meta envelope）' })
  @ApiResponse({ status: 400, description: 'バリデーションエラー / 日付範囲エラー' })
  @ApiResponse({ status: 401, description: 'セッションが切れました。再度ログインしてください。' })
  @ApiResponse({ status: 403, description: 'この画面へのアクセス権限がありません。' })
  async searchForReplace(
    @Query() query: SearchReplaceDokusyaDto,
    @Req() req: Request & { user: SessionPayload },
  ) {
    return this.service.searchForReplace(query, req.user);
  }

  // ─── API-015-002 ────────────────────────────────────────────────────
  @Post('replace-hanbaiten')
  @HttpCode(HttpStatus.OK)
  @Permissions('dokusya.replace_hanbaiten')
  @ApiOperation({ summary: '購読者販売店一括置換画面 — 一括置換実行（SCR-015）' })
  @ApiResponse({ status: 200, description: '置換結果サマリ + メッセージ' })
  @ApiResponse({ status: 400, description: 'バリデーション / SAME_HANBAITEN / INELIGIBLE_DOKUSYA' })
  @ApiResponse({ status: 401, description: 'セッションが切れました。再度ログインしてください。' })
  @ApiResponse({ status: 403, description: 'この画面へのアクセス権限がありません。' })
  @ApiResponse({ status: 404, description: '指定された購読者が見つかりません。' })
  async replaceHanbaiten(
    @Body() dto: ReplaceHanbaitenDto,
    @Req() req: Request & { user: SessionPayload },
  ) {
    return this.service.replaceHanbaiten(dto, req.user, req);
  }

  // ─── API-016-001 ────────────────────────────────────────────────────
  // SCR-016 — 購読者Excelデータ取込画面. Literal `import/template` +
  // `import` MUST precede `GET /:dokusya_id` so the numeric-param route
  // doesn't swallow these literal segments.
  @Get('import/template')
  @HttpCode(HttpStatus.OK)
  @Permissions('dokusya.import')
  @ApiOperation({ summary: '購読者Excelデータ取込画面 — テンプレートDL（SCR-016）' })
  @ApiResponse({ status: 200, description: 'Excelテンプレートバイナリ' })
  @ApiResponse({ status: 401, description: 'セッションが切れました。再度ログインしてください。' })
  @ApiResponse({ status: 403, description: 'この画面へのアクセス権限がありません。' })
  async downloadImportTemplate(
    @Req() req: Request & { user: SessionPayload },
    @Res() res: Response,
  ): Promise<void> {
    const { buffer, filename } = await this.service.downloadImportTemplate(
      req.user,
    );
    // RFC 6266 filename*=UTF-8'' so the multibyte Japanese name survives
    // Node's header-value restriction (raw multibyte is rejected).
    const encoded = encodeURIComponent(filename);
    res.set({
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename*=UTF-8''${encoded}`,
      'Content-Length': String(buffer.length),
    });
    res.send(buffer);
  }

  // ─── API-016-002 ────────────────────────────────────────────────────
  @Post('import')
  @HttpCode(HttpStatus.OK)
  @Permissions('dokusya.import')
  // [throttle-import] WAF body inspection is bypassed for this path (large
  // free-text JSON rows false-positive on managed rules — see .claude/rules/
  // nestjs.md §WAF body-inspection bypass), so it lost the edge rate-limit.
  // Cap at 10/min/IP (heavier than upload: up to 30,000 rows per call).
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: '購読者Excelデータ取込画面 — 一括取込（SCR-016）' })
  @ApiResponse({ status: 200, description: '取込結果サマリ + メッセージ' })
  @ApiResponse({ status: 400, description: 'VALIDATION / IMPORT_VALIDATION / ROW_LIMIT / FILE_FORMAT' })
  @ApiResponse({ status: 401, description: 'セッションが切れました。再度ログインしてください。' })
  @ApiResponse({ status: 403, description: 'この画面へのアクセス権限がありません。 / DATA_SCOPE_VIOLATION' })
  async importExcel(
    @Body() dto: ImportDokusyaDto,
    @Req() req: Request & { user: SessionPayload },
  ) {
    return this.service.importExcel(dto, req.user, req);
  }

  // ─── API-010-002 ────────────────────────────────────────────────────
  // SCR-010 メニュー画面 — 電子版承認待ち件数. Literal `pending-approval/count`
  // MUST precede `GET /:dokusya_id` so the numeric-param route doesn't
  // capture it.
  @Get('pending-approval/count')
  @HttpCode(HttpStatus.OK)
  @Permissions('dokusya.view')
  @ApiOperation({ summary: 'メニュー画面 — 電子版読者承認待ち件数（SCR-010）' })
  @ApiResponse({ status: 200, description: '承認待ち件数（data.count / data.ja_id）' })
  @ApiResponse({ status: 401, description: 'セッションが切れました。再度ログインしてください。' })
  @ApiResponse({ status: 403, description: 'この画面へのアクセス権限がありません。' })
  async pendingApprovalCount(
    @Req() req: Request & { user: SessionPayload },
  ) {
    const data = await this.service.getPendingApprovalCount(req.user);
    return { data };
  }

  // ─── API-011-001 ────────────────────────────────────────────────────
  @Get(':dokusya_id')
  @HttpCode(HttpStatus.OK)
  @Permissions('dokusya.view')
  @ApiOperation({ summary: '購読者情報登録画面 — 購読者詳細取得' })
  @ApiResponse({ status: 200, type: DokusyaResponseEnvelopeDto })
  @ApiResponse({ status: 401, description: 'セッションが切れました。再度ログインしてください。' })
  @ApiResponse({ status: 403, description: 'この画面へのアクセス権限がありません。' })
  @ApiResponse({ status: 404, description: '指定された購読者が見つかりません。' })
  async getDetail(
    @Param('dokusya_id', ParseIntPipe) dokusyaId: number,
    @Req() req: Request & { user: SessionPayload },
  ) {
    const data = await this.service.getDetail(dokusyaId, req.user);
    return { data };
  }

  // ─── API-011-002 ────────────────────────────────────────────────────
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Permissions('dokusya.create')
  @ApiOperation({ summary: '購読者情報登録画面 — 購読者登録' })
  @ApiResponse({ status: 201, type: DokusyaMutationResponseDto })
  @ApiResponse({ status: 400, description: 'バリデーションエラー / メール重複 など' })
  @ApiResponse({ status: 401, description: 'セッションが切れました。再度ログインしてください。' })
  @ApiResponse({ status: 403, description: 'この画面へのアクセス権限がありません。' })
  async create(
    @Body() dto: CreateDokusyaDto,
    @Req() req: Request & { user: SessionPayload },
  ) {
    const data = await this.service.create(dto, req.user, req);
    return { data, message: '登録しました。' };
  }

  // ─── API-011-003 ────────────────────────────────────────────────────
  @Put(':dokusya_id')
  @HttpCode(HttpStatus.OK)
  @Permissions('dokusya.update')
  @ApiOperation({ summary: '購読者情報登録画面 — 購読者更新' })
  @ApiResponse({ status: 200, type: DokusyaMutationResponseDto })
  @ApiResponse({ status: 400, description: 'バリデーションエラー / メール重複 など' })
  @ApiResponse({ status: 401, description: 'セッションが切れました。再度ログインしてください。' })
  @ApiResponse({ status: 403, description: 'この画面へのアクセス権限がありません。' })
  @ApiResponse({ status: 404, description: '指定された購読者が見つかりません。' })
  async update(
    @Param('dokusya_id', ParseIntPipe) dokusyaId: number,
    @Body() dto: UpdateDokusyaDto,
    @Req() req: Request & { user: SessionPayload },
  ) {
    const data = await this.service.update(dokusyaId, dto, req.user, req);
    return { data, message: '更新しました。' };
  }

  // ─── API-011-004 ────────────────────────────────────────────────────
  @Put(':dokusya_id/approve')
  @HttpCode(HttpStatus.OK)
  @Permissions('dokusya.update')
  @ApiOperation({ summary: '購読者情報登録画面 — 電子版承認' })
  @ApiResponse({ status: 200, type: DokusyaMutationResponseDto })
  @ApiResponse({ status: 400, description: 'INVALID_STATUS — 承認待ち以外' })
  @ApiResponse({ status: 401, description: 'セッションが切れました。再度ログインしてください。' })
  @ApiResponse({ status: 403, description: 'この画面へのアクセス権限がありません。' })
  @ApiResponse({ status: 404, description: '指定された購読者が見つかりません。' })
  async approve(
    @Param('dokusya_id', ParseIntPipe) dokusyaId: number,
    @Req() req: Request & { user: SessionPayload },
  ) {
    return this.service.approve(dokusyaId, req.user, req);
  }

  // ─── API-011-005 ────────────────────────────────────────────────────
  @Put(':dokusya_id/reject')
  @HttpCode(HttpStatus.OK)
  @Permissions('dokusya.update')
  @ApiOperation({ summary: '購読者情報登録画面 — 電子版否認' })
  @ApiResponse({ status: 200, type: DokusyaMutationResponseDto })
  @ApiResponse({ status: 400, description: 'INVALID_STATUS — 承認待ち以外' })
  @ApiResponse({ status: 401, description: 'セッションが切れました。再度ログインしてください。' })
  @ApiResponse({ status: 403, description: 'この画面へのアクセス権限がありません。' })
  @ApiResponse({ status: 404, description: '指定された購読者が見つかりません。' })
  async reject(
    @Param('dokusya_id', ParseIntPipe) dokusyaId: number,
    @Req() req: Request & { user: SessionPayload },
  ) {
    return this.service.reject(dokusyaId, req.user, req);
  }

  // ─── API-014-002 ────────────────────────────────────────────────────
  @Delete(':dokusya_id')
  @HttpCode(HttpStatus.OK)
  @Permissions('dokusya.delete')
  @ApiOperation({ summary: '購読者明細検索画面 — 購読者削除（論理削除）' })
  @ApiResponse({ status: 200, description: '削除完了メッセージ' })
  @ApiResponse({ status: 401, description: 'セッションが切れました。再度ログインしてください。' })
  @ApiResponse({ status: 403, description: 'この画面へのアクセス権限がありません。' })
  @ApiResponse({ status: 404, description: '指定された購読者が見つかりません。' })
  @ApiResponse({ status: 409, description: '関連データが存在するため削除できません。' })
  async remove(
    @Param('dokusya_id', ParseIntPipe) dokusyaId: number,
    @Req() req: Request & { user: SessionPayload },
  ) {
    return this.service.remove(dokusyaId, req.user, req);
  }

  // ─── API-011-006 ────────────────────────────────────────────────────
  @Get(':dokusya_id/history')
  @HttpCode(HttpStatus.OK)
  @Permissions('dokusya.view')
  @ApiOperation({ summary: '購読者情報登録画面 — 履歴表示' })
  @ApiResponse({ status: 200, type: DokusyaHistoryResponseDto })
  @ApiResponse({ status: 401, description: 'セッションが切れました。再度ログインしてください。' })
  @ApiResponse({ status: 403, description: 'この画面へのアクセス権限がありません。' })
  @ApiResponse({ status: 404, description: '指定された購読者が見つかりません。' })
  async getHistory(
    @Param('dokusya_id', ParseIntPipe) dokusyaId: number,
    @Req() req: Request & { user: SessionPayload },
  ) {
    return this.service.getHistory(dokusyaId, req.user);
  }

  // ─── API-013-001 ────────────────────────────────────────────────────
  // SCR-013 — 購読者履歴情報画面: paginated FULL history list.
  // Two-segment path — distinct from `GET /:dokusya_id` (detail) and
  // `GET /:dokusya_id/history` (SCR-011 lighter history).
  @Get(':dokusya_id/rireki')
  @HttpCode(HttpStatus.OK)
  @Permissions('dokusya.view')
  @ApiOperation({ summary: '購読者履歴情報画面 — 履歴一覧（ページネーション）' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'per_page', required: false, type: Number })
  @ApiQuery({ name: 'sort_by', required: false, type: String })
  @ApiQuery({ name: 'sort_order', required: false, enum: ['asc', 'desc'] })
  @ApiResponse({ status: 200, description: '履歴一覧（data/meta envelope）' })
  @ApiResponse({ status: 400, description: 'バリデーションエラー' })
  @ApiResponse({ status: 401, description: 'セッションが切れました。再度ログインしてください。' })
  @ApiResponse({ status: 403, description: 'この画面へのアクセス権限がありません。' })
  @ApiResponse({ status: 404, description: '指定された購読者が見つかりません。' })
  async getRirekiList(
    @Param('dokusya_id', ParseIntPipe) dokusyaId: number,
    @Query() query: DokusyaRirekiQueryDto,
    @Req() req: Request & { user: SessionPayload },
  ) {
    return this.service.getRirekiList(dokusyaId, query, req.user);
  }

  // ─── API-013-002 ────────────────────────────────────────────────────
  // SCR-013 — 履歴の取消(赤伝): 対象行を torikeshi_flg + 打ち消し行を追加。
  @Post(':dokusya_id/rireki/:dokusya_rireki_id/torikeshi')
  @HttpCode(HttpStatus.OK)
  @Permissions('dokusya.update')
  @ApiOperation({ summary: '購読者履歴情報画面 — 履歴の取消（赤伝）' })
  @ApiResponse({ status: 200, description: '取消完了メッセージ' })
  @ApiResponse({ status: 400, description: 'TORIKESHI_NOT_ALLOWED / バリデーションエラー' })
  @ApiResponse({ status: 401, description: 'セッションが切れました。再度ログインしてください。' })
  @ApiResponse({ status: 403, description: 'この画面へのアクセス権限がありません。' })
  @ApiResponse({ status: 404, description: '指定された購読者/履歴が見つかりません。' })
  async torikeshiRireki(
    @Param('dokusya_id', ParseIntPipe) dokusyaId: number,
    @Param('dokusya_rireki_id', ParseIntPipe) rirekiId: number,
    @Body() dto: TorikeshiRirekiDto,
    @Req() req: Request & { user: SessionPayload },
  ) {
    return this.service.torikeshiRireki(
      dokusyaId,
      rirekiId,
      dto.reason,
      req.user,
      req,
    );
  }
}
