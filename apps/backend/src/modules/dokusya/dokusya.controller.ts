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
import { SuccessMessage } from '@/common/constants/success-message.constant';

import { ApproveDokusyaDto } from './dto/approve-dokusya.dto';
import { RejectDokusyaDto } from './dto/reject-dokusya.dto';
import { RegisterTankaDokusyaDto } from './dto/register-tanka-dokusya.dto';
import { CreateDokusyaDto } from './dto/create-dokusya.dto';
import { SearchDokusyaDto } from './dto/search-dokusya.dto';
import { SearchReplaceDokusyaDto } from './dto/search-replace-dokusya.dto';
import { ReplaceHanbaitenDto } from './dto/replace-hanbaiten.dto';
import { UpdateDokusyaDto } from './dto/update-dokusya.dto';
import { StopDokusyaDto } from './dto/stop-dokusya.dto';
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
 * `/api/v1/dokusya` 配下のエンドポイント群。グローバルプレフィックス `api/v1` は
 * `main.ts` の `setGlobalPrefix` で一括付与 — コントローラは未付与セグメントのみ宣言。
 *
 * 全エンドポイントを両ガード (`SessionAuthGuard` + `PermissionsGuard`) で保護。
 * `@Permissions('dokusya.*')` は各ロールが保持すべき権限コード（seeder.md §3）:
 *   - `dokusya.view`   — GET 詳細 + GET 履歴
 *   - `dokusya.create` — POST
 *   - `dokusya.update` — PUT + approve / reject
 */
@ApiTags('dokusya')
@ApiCookieAuth('session_id')
@Controller('dokusya')
@UseGuards(SessionAuthGuard, PermissionsGuard)
export class DokusyaController {
  constructor(private readonly service: DokusyaService) {}

  // ─── ACSMS-API-014-001 ────────────────────────────────────────────────────
  // 注意 — ルート宣言順が重要。Express/Nest は宣言順にマッチするため、
  // `GET /:dokusya_id` を先に置くとリテラルパスを飲み込む。`GET /export` を
  // `GET /:dokusya_id` より前に宣言しリテラルセグメントを数値パラメータより
  // 優先させる。ACSMS-SCR-014 の検索 (GET /) も詳細より前に置き、ACSMS-SCR-011 の詳細
  // ハンドラが数値 id のみ受け取るようにする。
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

  // ─── ACSMS-API-014-003 ────────────────────────────────────────────────────
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
    // RFC 6266 filename*=UTF-8'' で多バイト日本語名（購読者一覧出力_…）が
    // Node のヘッダ値制限を通るようにする。
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
  // リテラル `replace-hanbaiten/search` は `GET /:dokusya_id` より前に置くこと。
  // 数値パラメータルートがリテラルセグメントを飲み込まないようにする。
  @Get('replace-hanbaiten/search')
  @HttpCode(HttpStatus.OK)
  @Permissions('dokusya.replace_hanbaiten')
  @ApiOperation({ summary: '統廃合販売店読者移行画面 — 対象検索（SCR-015）' })
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
  @ApiOperation({ summary: '統廃合販売店読者移行画面 — 一括置換実行（SCR-015）' })
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
  // SCR-016 — 購読者Excelデータ取込画面. リテラル `import/template` + `import`
  // は `GET /:dokusya_id` より前に置くこと。数値パラメータルートがこれらの
  // リテラルセグメントを飲み込まないようにする。
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
    // RFC 6266 filename*=UTF-8'' で多バイト日本語名が Node のヘッダ値制限を
    // 通るようにする（生の多バイトは拒否される）。
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
  // [throttle-import] このパスは WAF ボディ検査をバイパスするため（大量の
  // 自由文 JSON 行がマネージドルールに誤検知 — .claude/rules/nestjs.md
  // §WAF body-inspection bypass 参照）、エッジのレート制限を失う。10/min/IP に
  // 制限（1回で最大5,000行のため upload より重い）。
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
  // SCR-010 メニュー画面 — 電子版承認待ち件数. リテラル `pending-approval/count`
  // は `GET /:dokusya_id` より前に置くこと。数値パラメータルートに捕捉されない
  // ようにする。
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

  // ─── API-011-004 ────────────────────────────────────────────────────
  @Get(':dokusya_id/effective-at')
  @HttpCode(HttpStatus.OK)
  @Permissions('dokusya.view')
  @ApiOperation({
    summary: '購読者情報登録画面 — 指定適用日(joho)時点で有効な履歴行を取得',
  })
  @ApiQuery({ name: 'joho', required: true, description: '情報変更適用日 (YYYY-MM-DD)' })
  @ApiResponse({ status: 200, type: DokusyaResponseEnvelopeDto })
  @ApiResponse({ status: 400, description: '情報変更適用日の形式が不正です。' })
  @ApiResponse({ status: 403, description: 'この画面へのアクセス権限がありません。' })
  @ApiResponse({ status: 404, description: '指定された購読者が見つかりません。' })
  async getEffectiveAt(
    @Param('dokusya_id', ParseIntPipe) dokusyaId: number,
    @Query('joho') joho: string,
    @Req() req: Request & { user: SessionPayload },
  ) {
    const data = await this.service.getEffectiveAt(dokusyaId, joho, req.user);
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
    return { data, message: SuccessMessage.CREATED };
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
    return { data, message: SuccessMessage.UPDATED };
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
    @Body() dto: ApproveDokusyaDto,
    @Req() req: Request & { user: SessionPayload },
  ) {
    return this.service.approve(dokusyaId, req.user, req, dto);
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
    @Body() dto: RejectDokusyaDto,
    @Req() req: Request & { user: SessionPayload },
  ) {
    return this.service.reject(dokusyaId, req.user, req, dto);
  }

  // ─── API-011-007（2026-08 追加） ─────────────────────────────────────
  @Put(':dokusya_id/register-tanka')
  @HttpCode(HttpStatus.OK)
  @Permissions('dokusya.update')
  @ApiOperation({ summary: '購読者情報登録画面 — 承認ワークフロー対象外読者の単価初回登録' })
  @ApiResponse({ status: 200, type: DokusyaMutationResponseDto })
  @ApiResponse({ status: 400, description: 'INVALID_STATUS — 対象外の読者、または単価登録済み' })
  @ApiResponse({ status: 401, description: 'セッションが切れました。再度ログインしてください。' })
  @ApiResponse({ status: 403, description: 'この画面へのアクセス権限がありません。' })
  @ApiResponse({ status: 404, description: '指定された購読者が見つかりません。' })
  async registerTanka(
    @Param('dokusya_id', ParseIntPipe) dokusyaId: number,
    @Body() dto: RegisterTankaDokusyaDto,
    @Req() req: Request & { user: SessionPayload },
  ) {
    return this.service.registerTanka(dokusyaId, req.user, req, dto);
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

  // ─── API-014-004 ────────────────────────────────────────────────────
  // SCR-014 一覧の「購読中止」ボタン専用 — 購読中止日(解約予定日)だけを受け取り
  // Phase 1 の解約予約行を挿入する。フル更新 DTO を要さない slim API。
  // body の値で 3 操作を兼ねる（顧客要件 2026-08）: 日付=新規予約 / 予約ありなら変更
  // （電子版のみ）/ 空文字=予約取消（電子版のみ）。
  // 権限は更新系(dokusya.update)。two-segment path なので GET /:dokusya_id と衝突しない。
  @Post(':dokusya_id/stop')
  @HttpCode(HttpStatus.OK)
  @Permissions('dokusya.update')
  @ApiOperation({
    summary: '購読者明細検索画面 — 購読中止（解約予約・予約変更・予約取消）（SCR-014）',
  })
  @ApiResponse({ status: 200, type: DokusyaMutationResponseDto })
  @ApiResponse({ status: 400, description: 'VALIDATION_ERROR（購読中止日の相対チェック / 電子版の請求開始月未設定 / 解約確定済み など）' })
  @ApiResponse({ status: 401, description: 'セッションが切れました。再度ログインしてください。' })
  @ApiResponse({ status: 403, description: 'この画面へのアクセス権限がありません。 / 編集不可レコード（併読・電子版クレカ）' })
  @ApiResponse({ status: 404, description: '指定された購読者が見つかりません。' })
  async stop(
    @Param('dokusya_id', ParseIntPipe) dokusyaId: number,
    @Body() dto: StopDokusyaDto,
    @Req() req: Request & { user: SessionPayload },
  ) {
    // message は service が決める（新規予約・予約変更＝「購読停止を予約しました。」/
    // 予約取消＝「購読中止を取り消しました。」）。操作の分岐は body の値で決まるため、
    // 判定を持たない controller 側では文言を固定できない。
    return this.service.stop(dokusyaId, dto, req.user, req);
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
  // SCR-013 — 購読者履歴情報画面: ページネーション付きフル履歴一覧。
  // 2セグメントパス — `GET /:dokusya_id`（詳細）や
  // `GET /:dokusya_id/history`（SCR-011 の軽量履歴）とは別。
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
