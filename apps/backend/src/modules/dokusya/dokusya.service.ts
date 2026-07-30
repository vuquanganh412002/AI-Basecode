import { Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import {
  DataSource,
  EntityManager,
  IsNull,
  LessThanOrEqual,
  Not,
  Repository,
} from 'typeorm';
import type { Request } from 'express';

import { Dokusya } from '@/database/entities/dokusya.entity';
import { DokusyaRireki } from '@/database/entities/dokusya-rireki.entity';
import { Shiten } from '@/database/entities/shiten.entity';
import { KanriShiten } from '@/database/entities/kanri-shiten.entity';
import { Hanbaiten } from '@/database/entities/hanbaiten.entity';
import { Tanka } from '@/database/entities/tanka.entity';
import {
  ConflictException,
  NotFoundException,
  ValidationException,
} from '@/common/exceptions/common.exceptions';
import { buildAuditCtx } from '@/common/utils/audit-context';
import {
  todayIsoJst,
  normalizeDbDate,
} from '@/common/utils/datetime';
import {
  applyBranchScope,
  assertBranchScope,
  applyShitenScope,
  assertShitenScope,
  fetchFkInJa,
} from '@/common/utils/data-scope';
import { assertMCodeValues } from '@/common/utils/m-code-validation';
import { paginate, clampPerPage, type PaginatedResponse } from '@/common/utils/paginate';
import {
  AuditOperation,
  DenshiShoninStatus,
  DokusyaShubetsu,
  ShiharaiHoho,
  TetsuzukiShurui,
} from '@/common/enums';
import { ZEI_KUBUN_UCHIZEI } from '@/common/constants/zei-kubun.constant';
import { YUBIN_KUBUN_NASHI } from '@/common/constants/yubin-kubun.constant';
import { AuditLogService } from '@/modules/audit-log/audit-log.service';
import { CodeService } from '@/modules/code/code.service';
import type { SessionPayload } from '@/modules/auth/session.service';

import { CreateDokusyaDto } from './dto/create-dokusya.dto';
import {
  UpdateDokusyaDto,
  type DokusyaChangeMode,
} from './dto/update-dokusya.dto';
import { SearchDokusyaDto } from './dto/search-dokusya.dto';
import { SearchReplaceDokusyaDto } from './dto/search-replace-dokusya.dto';
import { ReplaceHanbaitenDto } from './dto/replace-hanbaiten.dto';
import { StopDokusyaDto } from './dto/stop-dokusya.dto';
import { DokusyaRirekiQueryDto } from './dto/dokusya-rireki-query.dto';
import {
  DokusyaHistoryItemDto,
  DokusyaHistoryResponseDto,
} from './dto/dokusya-history-response.dto';
import { DokusyaResponseDto } from './dto/dokusya-response.dto';
import { DuplicateEmailException } from './exceptions/duplicate-email.exception';
import { InvalidDokusyaStatusException } from './exceptions/invalid-dokusya-status.exception';
import { DokusyaReadOnlyException } from './exceptions/dokusya-read-only.exception';
import { TorikeshiNotAllowedException } from './exceptions/torikeshi-not-allowed.exception';
import { DokusyaAccountFlagService } from './dokusya-account-flag.service';
import { DokusyaImportService } from './dokusya-import.service';
import { DokusyaRirekiService } from './dokusya-rireki-helper.service';
import {
  applyChange,
  applyTorikeshi,
  canTorikeshi,
  insertResubscribe,
  insertScheduledKaiyaku,
} from './dokusya-history.writer';
import {
  loadEffectiveRow,
  nextRirekiNo,
  insertRow,
} from './dokusya-history.query';
import { mapRirekiToMaster, buildRirekiRow } from './dokusya-history.builder';
import {
  collectTekiyoDateViolations,
  collectChushiViolations,
  collectChushiVsMaxJoho,
  tekiyoViolationField,
} from './dokusya-tekiyo-date.rules';
import { DokusyaSearchService } from './dokusya-search.service';
import { DokusyaReplaceService } from './dokusya-replace.service';
import {
  DenshibanPushService,
  type PushAction,
} from '@/modules/denshiban/denshiban-push.service';
import { ImportDokusyaDto } from './dto/import-dokusya.dto';
import {
  DokusyaJoinFields,
  DokusyaListItem,
  DokusyaRirekiListItem,
  isDokusyaReadOnly,
  toDokusyaHistoryItem,
  toDokusyaRirekiListItem,
  toDokusyaResponse,
  type ReplaceSearchItem,
} from './dokusya.mapper';
import {
  isDigitalOrBoth,
  collectDigitalBusuViolation,
  collectTodayModeReportViolations,
  computeChangedReportFields,
  SHUBETSU_MSG,
} from './dokusya-shubetsu.rules';

/** 遠未来 asOf — 取消可否判定でチェーン末尾(有効レコード)取得に使う（canTorikeshi と同値・未来 joho でも末尾を拾う）。*/
const TORIKESHI_TAIL_ASOF = '9999-12-31';

/** Per-screen audit-context labels (api.md §4.5 INSERT INTO t_log). */
const SCREEN_NAME = '購読者情報登録画面 (ACSMS-SCR-011)';
const TABLE_NAME = 't_dokusya';

/** SCR-014 — 購読者明細検索画面 audit ラベル。SCR-011 と分け t_log.gamen_name が発生元画面(検索/削除/Excel出力)を正しく表す。*/
const SCREEN_NAME_SCR014 = '購読者明細検索画面 (ACSMS-SCR-014)';

/** SCR-013 — 購読者履歴情報画面. 履歴の取消(赤伝)はこの画面から実行する。*/
const SCREEN_NAME_SCR013 = '購読者履歴情報画面 (ACSMS-SCR-013)';
/** 取消は t_dokusya_rireki に対する操作なので target_table を分ける。*/
const TABLE_NAME_RIREKI = 't_dokusya_rireki';

// 日付正規化は時刻系集約方針（nestjs.md §Timestamp policy）に従い
// `@/common/utils/datetime` に集約。本ファイルは import して利用。

/**
 * raw `getRawMany()` の列(実行時は常にスカラー)を primitive へ narrow し
 * String() の `[object Object]` 経路を防ぐ。`unknown` を受けるため assertion 必須。
 */
function asScalar(value: unknown): string | number {
  return value as string | number;
}

/**
 * SCR-013 履歴一覧 sort-by allow-list → `r`(t_dokusya_rireki) の列名。
 * DokusyaRirekiQueryDto の @IsIn と一致必須。既定 rireki_no（機能定義 1.2 履歴番号降順）。
 */
const RIREKI_SORT_COLUMN_MAP: Record<string, string> = {
  rireki_no: 'r.rireki_no',
  dokusya_kaishi_date: 'r.dokusya_kaishi_date',
  joho_henko_tekiyo_date: 'r.joho_henko_tekiyo_date',
  created_at: 'r.created_at',
};

/**
 * t_dokusya を FK 参照する子テーブル。SCR-014 削除は該当行が残る間ブロック。
 * 現状 t_koza_furikae(口座振替データ)のみ（配列は将来拡張用）。unit spec は
 * dataSource.query をこのテーブル名で mock する。
 */
const RELATED_TABLES: readonly string[] = ['t_koza_furikae'] as const;

// 購読種別/支払方法/手続種類/承認ステータス は Group A enum → '@/common/enums' の
// DokusyaShubetsu / ShiharaiHoho / TetsuzukiShurui / DenshiShoninStatus を使う
// （前3つは FE ミラー・enum-sync test が drift 監視）。DenshiShoninStatus は BE専用（m_code なし）。

/** 電子版・併読で email 未入力時のメッセージ（共通ルール由来）。 */
const EMAIL_REQUIRED_DIGITAL_MSG = SHUBETSU_MSG.EMAIL_REQUIRED_DIGITAL;

/** 電子版・併読で 読者属性 未選択時のメッセージ（共通ルール由来）。 */
const DOKUSYASO_BUNRUI_REQUIRED_DIGITAL_MSG =
  SHUBETSU_MSG.DOKUSYASO_BUNRUI_REQUIRED_DIGITAL;

/**
 * 電子版停止で請求開始月(seikyu_kaishi_month)未設定時のメッセージ
 * （料金徴収未開始の読者は停止予約不可・顧客要件 2026-07）。BE/FE 共通文言。
 */
const SEIKYU_NOT_STARTED_MSG = 'この読者料金の徴収はまだ開始されていません。';

/** 'YYYYMM'（seikyu_kaishi_month / 月比較値）→ 'YYYY/MM'（顧客向けメッセージ用）。 */
function fmtYearMonth(ym: string): string {
  return `${ym.slice(0, 4)}/${ym.slice(4, 6)}`;
}

/** 購読中止日 'YYYY-MM-DD' → 電子版 cancel の cancel_ym 'YYYYMM'（解約対象月）。 */
function toCancelYm(chushiDate: string): string {
  return chushiDate.replaceAll('-', '').slice(0, 6);
}

/**
 * 電子版(2)は購読部数=1固定（顧客要件 2026-06）。新規・更新とも解約以外で busu≠1 を拒否。
 * FE も入力不可だが改竄リクエストはここで弾く。解約(手続種類=0)は 0 許容。
 */
function assertDigitalBusu(
  shubetsu: number,
  busu: number,
  tetsuzuki: number,
): void {
  const violations = collectDigitalBusuViolation(shubetsu, busu, tetsuzuki);
  if (violations.length > 0) {
    throw fieldValidationError(violations[0].field, violations[0].message);
  }
}

/**
 * 1フィールドの errors[] を持つ VALIDATION_ERROR を投げる。ValidationPipe と同形状に
 * して FE の useApiForm が `<a-form-item :help>` へ DTO 失敗と同様にマップできる。
 */
function fieldValidationError(
  field: string,
  message: string,
): ValidationException {
  return new ValidationException([{ field, message }]);
}

/**
 * SCR-011 — 購読者情報登録画面.
 *
 * Six endpoints (api.md §1):
 *   - GET  /dokusya/:id           getDetail
 *   - POST /dokusya               create
 *   - PUT  /dokusya/:id           update
 *   - PUT  /dokusya/:id/approve   approve (denshi_shonin_status = 1)
 *   - PUT  /dokusya/:id/reject    reject  (denshi_shonin_status = 2)
 *   - GET  /dokusya/:id/history   getHistory
 *
 * Audit-log contract (api.md §4.5 + nestjs.md §Audit Log):
 *   - operation は素の 'CREATE'/'UPDATE'/'DELETE'（'DOKUSYA_' 接頭辞禁止）。approve/reject も 'UPDATE'。
 *   - 本体 DML + audit 行は 1 つの dataSource.transaction を共有（監査が実状態と食い違わない）。
 *   - error log(log_type=3) は rollback 外で発火（失敗トレースを残す）。
 */
@Injectable()
export class DokusyaService {

  constructor(
    @InjectRepository(Dokusya)
    private readonly dokusyaRepo: Repository<Dokusya>,
    @InjectRepository(DokusyaRireki)
    private readonly rirekiRepo: Repository<DokusyaRireki>,
    @InjectRepository(Shiten)
    private readonly shitenRepo: Repository<Shiten>,
    @InjectRepository(KanriShiten)
    private readonly kanriShitenRepo: Repository<KanriShiten>,
    @InjectRepository(Hanbaiten)
    private readonly hanbaitenRepo: Repository<Hanbaiten>,
    @InjectRepository(Tanka)
    private readonly tankaRepo: Repository<Tanka>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly auditLog: AuditLogService,
    private readonly codeService: CodeService,
    private readonly accountFlags: DokusyaAccountFlagService,
    private readonly importService: DokusyaImportService,
    private readonly rireki: DokusyaRirekiService,
    private readonly searchService: DokusyaSearchService,
    private readonly replaceService: DokusyaReplaceService,
    private readonly denshiPush: DenshibanPushService,
  ) {}

  /**
   * SCR-011 の各書き込み(create/update/reread/approve/reject)と SCR-014 の購読中止
   * (cancel)から呼ぶ cloud → 電子版 push の共通入口。`source: 'UI'` を固定するだけの
   * 薄いラッパで、**push 対象かの判定は一切ここで行わない**。
   *
   * 対象判定は `pushOnWrite` → `isPushTarget` に一本化してある
   * （push 有効化 / 電子版・併読か / campaign 単価か）。呼び出し側で
   * `isDigitalOrBoth` を先出しすると「3条件のうち1つだけ」を各所に写した状態になり、
   * 条件が増えたときに更新漏れが起きる。非対象は pushOnWrite が no-op で返す。
   *
   * @param opts.immediateJohoDate 指定時、適用日==当日 のみ即 push（未来適用は push しない）。
   *   create/approve/cancel 等の即時操作では省略。
   * @param opts.cancelYm action='cancel' の解約対象月（YYYYMM）。
   */
  private async pushUiIfDenshi(
    manager: EntityManager,
    action: PushAction,
    after: Dokusya,
    opts: { immediateJohoDate?: string; cancelYm?: string } = {},
  ): Promise<void> {
    await this.denshiPush.pushOnWrite(manager, {
      action,
      after,
      source: 'UI',
      immediateJohoDate: opts.immediateJohoDate,
      cancelYm: opts.cancelYm,
    });
  }

  // ════════════════════════════════════════════════════════════════════
  // API-011-001 — GET /api/v1/dokusya/:dokusya_id
  // ════════════════════════════════════════════════════════════════════
  /**
   * 購読者詳細を取得。m_hanbaiten.hanbaiten_name / m_tanka.tanka_name と、
   * shiharai_hoho=1 のとき m_shiten 逆引き(bank_shiten_id + jastem)を結合する。
   *
   * DataScope (api.md §4.2): CHUOKAI/JA_HONTEN は ja_id、JA_KANRI_SHITEN は
   * kanri_shiten_id も、NICHINO_* は bypass。範囲外は 404 マスク（assertBranchScope）。
   *
   * join は raw query でなく dokusyaRepo.createQueryBuilder() を使う
   * （unit spec の dokusyaQb.getRawOne mock が確実に発火するため）。
   */
  async getDetail(
    id: number,
    session: SessionPayload,
  ): Promise<DokusyaResponseDto> {
    const entity = await this.fetchInScope(id, session);
    const joins = await this.fetchJoinFieldsViaQB(id);
    // 履歴メタ（解約予約ガード用）。master は未来解約を反映しないため履歴から算出。
    const [activeKaiyaku, maxJoho] = await Promise.all([
      this.hasActiveKaiyaku(id),
      this.loadMaxJoho(id),
    ]);
    return toDokusyaResponse(entity, joins, {
      has_active_kaiyaku: activeKaiyaku,
      max_joho_date: maxJoho,
    });
  }

  // ════════════════════════════════════════════════════════════════════
  // API-011-004 — GET /api/v1/dokusya/{dokusya_id}/effective-at?joho=YYYY-MM-DD
  // ════════════════════════════════════════════════════════════════════
  /**
   * 予約変更(未来日)編集の基準行を返す (SCR-011・顧客要件2026-07)。
   *
   * 指定 joho 時点で有効な履歴行 = loadEffectiveRow(joho)（writer の findBefore と同条件:
   * joho_henko_tekiyo_date <= joho の (joho, rireki_no) 最大・取消除外）を詳細レスポンス形へマップ。
   *
   * FE はこれを基準(predecessor)としてロードし editGuard の baseline にもする。未来予約が
   * 積み重なっても「直前行と異なる変更」だけ検出でき BE の timeline-diff(applyChange)と一致。
   * 直前行が無い(joho が作成日より前 等)は master 詳細へフォールバック。
   */
  async getEffectiveAt(
    id: number,
    joho: string,
    session: SessionPayload,
  ): Promise<DokusyaResponseDto> {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(joho ?? '')) {
      throw fieldValidationError('joho', '情報変更適用日の形式が不正です。');
    }
    const master = await this.fetchInScope(id, session);
    const predecessor = await loadEffectiveRow(this.dataSource.manager, id, joho);
    // 直前行なし(joho が最初の履歴より前) → 現行 master を基準にする。
    if (!predecessor) return this.getDetail(id, session);

    // predecessor の業務値を master の識別子(ja_id 等)へ上書きした基準エンティティ。
    const merged = this.dokusyaRepo.create({
      ...master,
      ...mapRirekiToMaster(predecessor),
    });
    const [joins, activeKaiyaku, maxJoho] = await Promise.all([
      this.fetchJoinFieldsForEntity(merged),
      this.hasActiveKaiyaku(id),
      this.loadMaxJoho(id),
    ]);
    return toDokusyaResponse(merged, joins, {
      has_active_kaiyaku: activeKaiyaku,
      max_joho_date: maxJoho,
    });
  }

  // ════════════════════════════════════════════════════════════════════
  // API-010-002 — GET /api/v1/dokusya/pending-approval/count (SCR-010)
  // ════════════════════════════════════════════════════════════════════
  /**
   * 電子版読者の承認待ち件数(denshi_shonin_status=0)を DataScope 込みで返す。
   * メニュー画面(SCR-010)の「電子版読者承認」バナーで使用。NICHINO_* は
   * applyBranchScope がスコープ条件を付けず全件カウントだが FE でバナー自体を非表示。
   */
  async getPendingApprovalCount(
    session: SessionPayload,
  ): Promise<{ count: number; ja_id: number | null }> {
    const qb = this.dokusyaRepo
      .createQueryBuilder('d')
      .where('d.denshi_shonin_status = :status', {
        status: DenshiShoninStatus.PENDING,
      })
      .andWhere('d.deleted_at IS NULL');
    applyBranchScope(
      qb,
      'd',
      { jaIdField: 'jaId', kanriShitenIdField: 'kanriShitenId' },
      session,
    );
    applyShitenScope(qb, 'd', 'shitenId', session);
    const count = await qb.getCount();
    return { count, ja_id: session.ja_id ?? null };
  }

  // ════════════════════════════════════════════════════════════════════
  // API-011-002 — POST /api/v1/dokusya
  // ════════════════════════════════════════════════════════════════════
  /**
   * 購読者を作成 + 最初の t_dokusya_rireki 行を書く。
   *
   * Flow (api.md §4):
   *   §4.1 入力チェック(DTO + m_code allow-list + joho_henko_tekiyo_date 未来日ガード)
   *   §4.2 ja_id は session から（body の ja_id は無視 — security）
   *   §4.3 email 重複ガード（session ja_id スコープ）
   *   §4.4 ステップ0 bank_shiten_id 逆引き(shiharai_hoho=1 のみ)・miss → 400 VALIDATION_ERROR(bank_shiten_id)
   *   §4.4 INSERT t_dokusya + t_dokusya_rireki (rireki_no=1, saishin_data_flg=true, 新規は shinki_flg=true)
   *   §4.5 audit logCreate を IN-TX で素の 'CREATE' 記録
   *   §4.7 error → logError を rollback 外で記録
   */
  async create(
    dto: CreateDokusyaDto,
    session: SessionPayload,
    req: Request,
  ): Promise<DokusyaResponseDto> {
    this.assertCodeMasterValues(dto);
    // 併読(3) は本システムで新規作成不可（顧客要件）。併読データは外部の電子版読者管理
    // システムが管理しバッチ連携で同期。本画面での作成/編集/停止/削除は全て不可 — 作成は
    // ここ、編集/停止/削除は isDokusyaReadOnly で 403(DOKUSYA_READ_ONLY)。Excel取込も併読
    // 不可(dokusya-import-validator)。FE の disabled は UX、境界は本ガード（security.md Layer 3 同様）。
    if (Number(dto.dokusya_shubetsu) === DokusyaShubetsu.BOTH) {
      throw fieldValidationError(
        'dokusya_shubetsu',
        '併読（紙版＋電子版）はバッチ連携で管理されるため、新規登録できません。',
      );
    }
    // 新規登録では手続種類に解約(0)不可。解約は既存購読者への更新操作（FE もラジオ disabled）。
    if (dto.tetsuzuki_shurui === TetsuzukiShurui.KAIYAKU) {
      throw fieldValidationError(
        'tetsuzuki_shurui',
        '新規登録では手続種類に解約を指定できません。',
      );
    }
    // 新規登録は購読部数 >0（上で解約は弾き済み＝常に新規）。
    if (Number(dto.dokusya_busu) <= 0) {
      throw fieldValidationError(
        'dokusya_busu',
        '購読部数は1以上で入力してください。',
      );
    }
    // 電子版は購読部数=1固定（新規）。
    assertDigitalBusu(
      Number(dto.dokusya_shubetsu),
      Number(dto.dokusya_busu),
      Number(dto.tetsuzuki_shurui),
    );
    this.assertDigitalPaymentMethod(dto);
    this.assertTekiyoDateNotPast(
      dto.joho_henko_tekiyo_date,
      'joho_henko_tekiyo_date',
      '情報変更適用日に過去日は指定できません。',
    );
    // 購読開始日は新規登録のみ対象（更新では before に pin・不変）。顧客要件 2026-07:
    // 新規の適用日(=購読開始日)は未来日のみ（当日・過去日不可）。ただし電子版(2)は
    // ラジオ「今日/翌月1日」の特例で支払方法を問わず当日許容（過去日のみ不可）。FE(isDigitalCreate)と同基準。
    const isDigitalCreate =
      Number(dto.dokusya_shubetsu) === DokusyaShubetsu.DIGITAL;
    if (isDigitalCreate) {
      this.assertTekiyoDateNotPast(
        dto.dokusya_kaishi_date,
        'dokusya_kaishi_date',
        '購読開始日は本日以降の日付を入力してください。',
      );
    } else {
      this.assertTekiyoDateFuture(
        dto.dokusya_kaishi_date,
        'dokusya_kaishi_date',
        '購読開始日は本日より後の日付を入力してください。',
      );
    }
    // 入力解約予定日の整合性（購読開始日以降・過去日不可。顧客要件 2026-07）。新規で
    // 解約予定日を入力した場合のみ発火（未入力はスキップ）。参照開始日は dto.dokusya_kaishi_date。
    const createChushiViolations = collectChushiViolations({
      chushiDate: dto.dokusya_chushi_date,
      kaishiDate: dto.dokusya_kaishi_date,
      today: todayIsoJst(),
    });
    if (createChushiViolations.length > 0) {
      throw new ValidationException(
        createChushiViolations.map((v) => ({
          field: tekiyoViolationField(v.kind),
          message: v.message,
        })),
      );
    }
    // 紙版→paper_flg / 電子版→denshi_flg required (account_concept.md §139-145).
    await this.accountFlags.assertShubetsuFlag(dto.dokusya_shubetsu, session);

    const effectiveJaId = Number(session.ja_id ?? 0);
    if (!effectiveJaId) {
      // 防御的措置 — SessionAuthGuard 下では CHUOKAI/JA_HONTEN/JA_KANRI_SHITEN は
      // ja_id が null にならないが、NICHINO_*(ja_id=null)が直接書くとここへ到達。
      // SCR-011 は dokusya の NICHINO 代行入力フォームを提供しない。
      throw fieldValidationError('ja_id', 'JA IDを特定できません。');
    }

    // [layer4-fk-guard] 書き込み前にテナント跨ぎ FK 検証。
    await this.assertFkScope(dto, effectiveJaId);

    // 電子版・併読は email 必須＋電子版/併読レコード間で一意（紙版は任意・重複可）。
    this.assertEmailRequiredForShubetsu(dto.email, dto.dokusya_shubetsu);
    this.assertDokusyaSoBunruiRequiredForShubetsu(
      dto.dokusyaso_bunrui,
      dto.dokusya_shubetsu,
    );
    await this.assertEmailUnique(
      dto.email,
      dto.dokusya_shubetsu,
      effectiveJaId,
      null,
    );

    const bankBranch = await this.resolveBankBranch(
      dto.shiharai_hoho,
      dto.bank_shiten_id,
      effectiveJaId,
    );

    const auditCtxFactory = (targetId: number | null) =>
      buildAuditCtx(session, req, SCREEN_NAME, TABLE_NAME, targetId);

    let saved: Dokusya;
    try {
      saved = await this.dataSource.transaction(async (manager) => {
        const payload = this.buildInsertPayload(
          dto,
          effectiveJaId,
          bankBranch,
          session,
        );
        // 新規の情報変更適用日(joho)=購読開始日(dokusya_kaishi_date)（顧客要件 2026-07。
        // 以前は「CREATE joho=当日」固定）。開始日が当日なら即 t_dokusya 反映、未来なら joho も
        // 未来で有効レコードは開始日から。recomputeMaster(当日)は未来行を有効化しないため
        // saishin_data_flg は夜間バッチが開始日到来時に立てる（マスタ本体は ensureMaster が全項目
        // 書き込むので一覧には即表示）。
        const johoDate = normalizeDbDate(dto.dokusya_kaishi_date);
        payload.johoHenkoTekiyoDate = johoDate;
        // 紙版は承認ワークフロー外(null)。電子版/併読 の画面登録は職員操作のため
        // 承認済(1)で登録（Excel一括取込と同方針 — 顧客要件）。
        payload.denshiShoninStatus =
          Number(dto.dokusya_shubetsu) === DokusyaShubetsu.PAPER
            ? null
            : DenshiShoninStatus.APPROVED;

        // 履歴書き込みは共通ライタ applyChange に集約 (Pha3)。CREATE = ensureMaster +
        // rireki #1(shinki) + recomputeMaster(当日) を1トランザクションで実行。
        // t_dokusya は有効レコードから再計算で確定。
        const result = await applyChange(manager, {
          mode: 'CREATE',
          values: payload,
          johoDate,
          source: 'UI',
          actor: String(session.account_id),
        });

        // cloud → 電子版 push（新規会員・同期 Saga）。紙版は helper が判定して呼ばない。
        await this.pushUiIfDenshi(manager, 'create', result.after);

        await this.auditLog.logCreate(
          auditCtxFactory(result.dokusyaId),
          result.after,
          manager,
        );

        return result.after;
      });
    } catch (err) {
      await this.auditLog.logError(auditCtxFactory(null), AuditOperation.CREATE, err as Error);
      throw err;
    }

    // レスポンスは in-tx の saved entity から構築（post-tx 再読込は unit-test mock
    // に脆いため — spec で save 後の dokusyaRepo.findOne は未 mock）。JOIN 解決項目
    // (hanbaiten_name / tanka_name)は fetchJoinFieldsViaQB で DB から取得し初回でも表示。
    const joins = await this.fetchJoinFieldsViaQB(Number(saved.dokusyaId));
    return toDokusyaResponse(saved, joins);
  }

  // ════════════════════════════════════════════════════════════════════
  // API-011-003 — PUT /api/v1/dokusya/:dokusya_id
  // ════════════════════════════════════════════════════════════════════
  /**
   * 購読者を更新 + 履歴行を1件追加。
   *
   * dokusya_id は URL、body の ja_id は無視(不変)。email 重複チェックは自身を除外
   * (dokusya_id <> :dokusya_id)。
   */
  /**
   * [digital-today-only] 電子版は当日変更のみ（顧客要件 2026-07）。電子版は帳票を生成せず
   * 即時反映のため変更は常に本日適用、予約変更(未来日)は不可。FE は電子版でモードバーを
   * 出さず当日固定で送るが改竄/退行に備え BE でも弾く（購読種別は before の保存値で判定・spoof 不可）。
   * 例外: 再購読(解約済み→新規)は未来開始日で作る別フローのため対象外。
   */
  private assertDigitalChangeModeAllowed(
    before: Dokusya,
    changeMode: DokusyaChangeMode,
    isResubscribe: boolean,
  ): void {
    if (
      !isResubscribe &&
      Number(before.dokusyaShubetsu) === DokusyaShubetsu.DIGITAL &&
      changeMode !== 'today'
    ) {
      throw fieldValidationError(
        'change_mode',
        '電子版は当日変更のみ可能です。予約変更はできません。',
      );
    }
  }

  async update(
    id: number,
    dto: UpdateDokusyaDto,
    session: SessionPayload,
    req: Request,
  ): Promise<DokusyaResponseDto> {
    this.assertCodeMasterValues(dto);
    // 情報変更モード（顧客要件2026-07）。未指定は後方互換で予約変更(未来日のみ)。
    const changeMode: DokusyaChangeMode = dto.change_mode ?? 'reserved';
    // 情報変更適用日 (joho_henko_tekiyo_date) はモードで分岐:
    // - 当日変更(today): 適用日=本日に固定（送信値は信頼しない）。
    // - 予約変更(reserved): 必須・未来日のみ（従来動作）。
    // 販売店のみ変更で joho が追随する場合も dto.joho_henko_tekiyo_date に同値が入り
    // buildUpdatePartial 経由で master/履歴へ反映される。
    if (changeMode === 'today') {
      dto.joho_henko_tekiyo_date = todayIsoJst();
    } else {
      if (!dto.joho_henko_tekiyo_date?.trim()) {
        throw fieldValidationError(
          'joho_henko_tekiyo_date',
          '情報変更適用日を入力してください。',
        );
      }
      this.assertTekiyoDateFuture(
        dto.joho_henko_tekiyo_date,
        'joho_henko_tekiyo_date',
        '情報変更適用日は本日より後の日付を指定してください。',
      );
    }

    const before = await this.fetchInScope(id, session);
    const effectiveJaId = Number(before.jaId);

    // [resubscribe] 再購読（顧客要件 2026-07）: 解約済み(master が解約状態)を編集画面で
    // 手続種類=新規 に切替えた場合、新しい購読開始日で再加入。この場合のみ購読開始日を
    // 編集可(dto 値を採用)にし新規(再購読)履歴行を挿入。それ以外は開始日を before へ pin(不変)。
    const isResubscribe =
      Number(before.tetsuzukiShurui) === TetsuzukiShurui.KAIYAKU &&
      Number(dto.tetsuzuki_shurui) === TetsuzukiShurui.SHINKI;

    this.assertDigitalChangeModeAllowed(before, changeMode, isResubscribe);

    if (isResubscribe) {
      // 再購読の購読開始日は新規登録同様 未来日のみ（当日・過去日不可）。
      if (!dto.dokusya_kaishi_date?.trim()) {
        throw fieldValidationError(
          'dokusya_kaishi_date',
          '購読開始日を入力してください。',
        );
      }
      this.assertTekiyoDateFuture(
        dto.dokusya_kaishi_date,
        'dokusya_kaishi_date',
        '購読開始日は本日より後の日付を指定してください。',
      );
    }

    // 購読部数 >0（解約以外）。解約(手続種類=0)は 0 許容（バッチ処理前提）。
    // 部分更新で省略された項目は既存値で補完して判定。
    const effectiveTetsuzuki =
      dto.tetsuzuki_shurui ?? Number(before.tetsuzukiShurui);
    const effectiveBusu = dto.dokusya_busu ?? Number(before.dokusyaBusu);
    if (
      effectiveTetsuzuki !== TetsuzukiShurui.KAIYAKU &&
      Number(effectiveBusu) <= 0
    ) {
      throw fieldValidationError(
        'dokusya_busu',
        '購読部数は1以上で入力してください。',
      );
    }
    // 電子版は購読部数=1固定（編集）。購読種別は編集で不変なので before で判定。
    assertDigitalBusu(
      Number(before.dokusyaShubetsu),
      Number(effectiveBusu),
      Number(effectiveTetsuzuki),
    );

    // [read-only guard] 併読(3) と 電子版クレカ決済者 は全アカウント編集不可。
    // seeder.md §425 / api.md §is_read_only。VIEW は許可、更新は 403。delete と同じ境界。
    if (
      isDokusyaReadOnly(
        Number(before.dokusyaShubetsu),
        Number(before.shiharaiHoho),
      )
    ) {
      throw new DokusyaReadOnlyException();
    }

    // [today-mode-field-restriction] 当日変更モード(joho=本日)の帳票影響項目の変更制限
    // （顧客要件2026-07）。電子版は全項目 当日反映可、紙版は帳票影響項目(部数・販売店・
    // 購読者住所・配達先住所・購読中止日)を当日反映不可とし予約変更(未来日)へ誘導。
    // 併読/電子版クレカは上の read-only(403) で到達しない。
    if (changeMode === 'today') {
      this.assertTodayModeFieldRestriction(dto, before);
    }

    // [tekiyo-date-consistency] 適用日の範囲整合性（顧客要件 2026-07）。read-only(403) の後に
    // 置き編集不可レコードは先に 403。未来日(> today)は上の assertTekiyoDateFuture、ここは範囲:
    //   - 購読開始日(kaishi) <= joho/hanbaiten <= 解約予定日(chushi・両端 等号可)
    //   - 解約予定日(chushi) >= 購読開始日 かつ chushi > today
    // 開始日は編集不可＝before 値。chushi の上限参照は「joho 時点で有効な解約予定日」= その日
    // 以前で joho 最も近い履歴行(writer の findBefore と同基準)の解約日。未来日のみ運用では
    // master は作成時点を保持し未来解約日が入らず、master 由来だと NULL で joho<=解約予定日
    // チェックが素通り（解約予定後に情報変更を挿入できる不具合）。本編集で解約日を入力/変更した
    // 場合はその値を優先。再購読(解約済み→新規)は旧解約予定日が無関係で joho=新開始日のため
    // 旧解約日を上限参照にすると誤って弾かれる → chushi=null で無効化。
    await this.assertUpdateDateConsistency(id, dto, before, isResubscribe);

    // [shubetsu-immutable] 購読種別(dokusya_shubetsu)は編集で read-only — FE ラジオは
    // disabled だが画面はフォーム全体を送るため body に届く。保存値へ pin し、改竄値
    // （や FE の disable 退行）が種別を変えられないようにする。以降の全ステップ(FK guard・
    // payload build・履歴 snapshot)はこの pin 値を読む。紙版↔電子版↔併読 の変換は専用フロー。
    dto.dokusya_shubetsu = Number(before.dokusyaShubetsu);

    // 編集権限: 紙版→paper_flg / 電子版→denshi_flg (account_concept.md §139-145)。
    // pin 済み購読種別=行の保存値。併読(3)は read-only でここには来ない。
    await this.accountFlags.assertShubetsuFlag(Number(before.dokusyaShubetsu), session);

    // [kaishi-date-immutable] 購読開始日 は作成時に確定し変更不可 — FE は編集で picker を
    // disable するが画面はフォーム全体を送るため dokusya_kaishi_date が届く。保存値へ pin
    // して改変不可（FE disable は UX、ここが境界）。購読中止日は編集可。
    // 例外: 再購読(isResubscribe)は新開始日で再加入するため pin しない（上で未来日検証済み）。
    if (!isResubscribe) {
      dto.dokusya_kaishi_date = before.dokusyaKaishiDate;
    }

    // 購読者氏名(氏/名)と購読者かな(氏/名)は編集でも変更可（顧客要件 2026-07）。DTO で
    // 必須＋漢字/ひらがな検証済みの送信値をそのまま buildUpdatePartial で保存・履歴化（name-pin 撤廃）。

    // [layer4-fk-guard] body FK id を session でなく既存行の JA で検証し、編集が行の
    // テナントに縛られるようにする。
    await this.assertFkScope(dto, effectiveJaId);

    // [kanri-shiten-immutable] 管理支店 は作成時に確定し編集では変更不可（顧客要件 2026-07）。
    // FE はグレーアウトするが画面はフォーム全体を送るため body に届く。FK guard の後に保存値へ
    // pin し改変（や FE disable 退行）で書き換えられないようにする（FE disable は UX、ここが境界）。
    // pin を FK guard の後に置くのは、行自身の管理支店を再 FK 検証して冗長に 400 を出さないため
    // （送信 0=未設定のスキップ動作を維持）。
    dto.kanri_shiten_id = Number(before.kanriShitenId);

    // dto.dokusya_shubetsu は上で before に固定済み（購読種別は編集不可）。
    // 電子版・併読は email 必須＋電子版/併読レコード間で一意（自身は除外）。
    this.assertEmailRequiredForShubetsu(dto.email, dto.dokusya_shubetsu);
    this.assertDokusyaSoBunruiRequiredForShubetsu(
      dto.dokusyaso_bunrui,
      dto.dokusya_shubetsu,
    );
    await this.assertEmailUnique(
      dto.email,
      dto.dokusya_shubetsu,
      effectiveJaId,
      id,
    );

    const bankBranch = await this.resolveBankBranch(
      dto.shiharai_hoho,
      dto.bank_shiten_id,
      effectiveJaId,
    );

    const auditCtx = buildAuditCtx(session, req, SCREEN_NAME, TABLE_NAME, id);

    let refreshed: Dokusya;
    try {
      refreshed = await this.dataSource.transaction(async (manager) => {
        // [rireki-no-race] master 行を FOR UPDATE でロックしてから採番・更新（直列化）。
        // 同時更新が両方 MAX+1 を読み同じ rireki_no を INSERT → unique 制約違反(500)を防ぐ。
        // applyChange 内部の nextRirekiNo/recomputeMaster もこのロック下で直列化。
        await this.rireki.lockDokusyaRow(manager, id);

        // [cancel-separated] 購読停止(解約予約)は本APIから分離（顧客要件 2026-07）。停止は
        // 専用エンドポイント POST /dokusya/:id/stop (service.stop → insertScheduledKaiyaku)。
        // update は情報変更・販売店変更・再購読のみ扱い、購読中止日は受け付けない（DTO @IsEmpty で 400）。

        // [resubscribe] 再購読（解約済み → 手続種類=新規 + 新開始日）。継続情報変更でなく
        // 「新規(再購読)」履歴行を挿入: shinki_flg=true・tetsuzuki=1・kaiyaku_flg=false・
        // chushi=null・新開始日。初回開始日(shoki)は不変。recomputeMaster が新開始日到来時に反映。
        if (isResubscribe) {
          const reValues = this.buildUpdatePartial(
            dto,
            effectiveJaId,
            bankBranch,
            session,
            0,
          );
          reValues.shokiDokusyaKaishiDate = before.shokiDokusyaKaishiDate;
          reValues.denshiDokusyaShubetsu = before.denshiDokusyaShubetsu;
          const rv = { ...reValues } as Record<string, unknown>;
          delete rv.rirekiNo;
          delete (rv as { updatedBy?: string }).updatedBy;

          const result = await insertResubscribe(manager, {
            dokusyaId: id,
            kaishiDate: normalizeDbDate(dto.dokusya_kaishi_date) as string,
            values: rv,
            actor: String(session.account_id),
          });
          await manager.update(
            Dokusya,
            { dokusyaId: id },
            { updatedBy: String(session.account_id) },
          );
          // 再購読は電子版では reread（解約済み会員の再有効化）。当日開始のみ即 push
          // （未来開始の併読は到来日に recompute バッチ反映）。
          await this.pushUiIfDenshi(manager, 'reread', result.after, {
            immediateJohoDate: normalizeDbDate(dto.dokusya_kaishi_date),
          });
          await this.auditLog.logUpdate(auditCtx, before, result.after, manager);
          return result.after;
        }

        // 業務項目の新値を組み立てる。master 固有項目のピン止め(初回購読開始日・
        // 電子版読者種別・承認状態)は before に固定。newRirekiNo は applyChange が採番する
        // ので 0 を渡し後で rireki_no を除外。
        const updatePartial = this.buildUpdatePartial(
          dto,
          effectiveJaId,
          bankBranch,
          session,
          0,
        );
        // [shoki-immutable] 初回購読開始日 は不変。dto.dokusya_kaishi_date(before に pin 済み)
        // から shoki も上書きされるため既存の初回日へ戻す。
        updatePartial.shokiDokusyaKaishiDate = before.shokiDokusyaKaishiDate;
        // [denshi-subtype-preserve] 電子版読者種別 は編集対象外 — 既存値を維持。
        updatePartial.denshiDokusyaShubetsu = before.denshiDokusyaShubetsu;
        // 紙版 は Web 承認ワークフロー対象外 → denshi_shonin_status を null に揃える
        // （電子版/併読は buildUpdatePartial が key を落として既存値を維持）。
        if (Number(before.dokusyaShubetsu) === DokusyaShubetsu.PAPER) {
          updatePartial.denshiShoninStatus = null;
        }

        // applyChange の values は履歴業務項目の新値。predecessor(適用日時点の有効レコード)と
        // 差分をとり変更項目のみ履歴イベント化するため、ピン止め済み不変項目(購読種別・氏名・
        // 購読開始日等)は predecessor と一致し差分に出ない。identity/監査専用列(rireki_no・updatedBy)は除外。
        const values = { ...updatePartial } as Record<string, unknown>;
        delete values.rirekiNo;
        delete (values as { updatedBy?: string }).updatedBy;

        // ── 履歴書き込み + master 再計算を共通ライタへ集約 (Pha3)。─────────────
        // 販売店含む全変更を単一の適用日(joho)で1件の履歴行にまとめる（顧客要件 2026-07:
        // 販売店適用日を廃止し joho に統一）。recomputeMaster が有効レコードから t_dokusya を
        // 確定するため master の明示 UPDATE 不要（未来日 joho は当日時点で未反映＝正しい挙動）。
        const result = await applyChange(manager, {
          mode: 'UPDATE',
          dokusyaId: id,
          values,
          johoDate: updatePartial.johoHenkoTekiyoDate as string,
          source: 'UI',
          actor: String(session.account_id),
        });

        // updatedBy は rireki に無い列で recompute 対象外 → master へ明示スタンプ
        // （updatedAt は @UpdateDateColumn が recompute の UPDATE 時に自動更新）。
        await manager.update(
          Dokusya,
          { dokusyaId: id },
          { updatedBy: String(session.account_id) },
        );

        // cloud → 電子版 push（情報変更）。当日適用のみ即 push。未来適用(併読の予約変更)は
        // 到来日に recompute バッチ反映のため即 push しない（二重・先行反映防止）。
        // null 安全化: 未設定なら '' で当日判定に一致せず push を batch へ委譲。
        await this.pushUiIfDenshi(manager, 'update', result.after, {
          immediateJohoDate: String(updatePartial.johoHenkoTekiyoDate ?? ''),
        });

        await this.auditLog.logUpdate(auditCtx, before, result.after, manager);
        return result.after;
      });
    } catch (err) {
      await this.auditLog.logError(auditCtx, AuditOperation.UPDATE, err as Error);
      throw err;
    }

    const joins = await this.fetchJoinFieldsViaQB(id);
    return toDokusyaResponse(refreshed, joins);
  }

  // ════════════════════════════════════════════════════════════════════
  // API-014-004 — POST /api/v1/dokusya/:dokusya_id/stop
  // ════════════════════════════════════════════════════════════════════
  /**
   * 購読停止(解約予約) — SCR-014 一覧の「購読を停止する」ボタン専用。購読中止日(解約予定日)
   * だけ受け取り Phase 1 の予約行(insertScheduledKaiyaku)を1件挿入する slim エンドポイント。
   *
   * バリデーション（購読種別で分岐）:
   *   - 共通: 編集不可レコード(併読/電子版クレカ)は 403、二重解約は VALIDATION_ERROR。
   *   - 紙版(1): 解約予定日 >= 購読開始日 / > 本日 / > 最終変更適用日(同日不可)。
   *   - 電子版(2): 請求開始月(seikyu_kaishi_month)未設定なら停止不可(料金徴収未開始)。
   *     選択月(中止日の YYYYMM)は 請求開始月以降 かつ 当月以降。中止日は選択月の月末日(FE が丸めて送る)。
   *
   * 反映は Phase 1 と同じ — 予約行は未来日(saishin=false)なので到来日バッチ(Phase 2)が master 確定。
   * 監査は SCR-014 画面名で 't_dokusya' 対象の UPDATE として記録。
   */
  async stop(
    id: number,
    dto: StopDokusyaDto,
    session: SessionPayload,
    req: Request,
  ): Promise<DokusyaResponseDto> {
    const chushi = normalizeDbDate(dto.dokusya_chushi_date);
    const before = await this.fetchInScope(id, session);

    // [read-only guard] 併読(3) / 電子版クレカ決済者 は編集不可 → 停止も不可(403)。
    if (
      isDokusyaReadOnly(
        Number(before.dokusyaShubetsu),
        Number(before.shiharaiHoho),
      )
    ) {
      throw new DokusyaReadOnlyException();
    }

    // [double-cancel] 既に有効な解約予約あり → 二重解約は不可（履歴画面で取消要）。
    if (await this.hasActiveKaiyaku(id)) {
      throw fieldValidationError(
        'dokusya_chushi_date',
        '既に解約予約されています。変更する場合は履歴画面で解約を取消してください。',
      );
    }

    const shubetsu = Number(before.dokusyaShubetsu);
    if (shubetsu === DokusyaShubetsu.DIGITAL) {
      // 電子版: 請求開始月が未設定＝料金徴収未開始 → 停止予約不可。
      const seikyu = (before.seikyuKaishiMonth ?? '').trim();
      if (!seikyu) {
        throw fieldValidationError('dokusya_chushi_date', SEIKYU_NOT_STARTED_MSG);
      }
      // 選択月 = 中止日(月末日)の YYYYMM。請求開始月以降 かつ 当月以降。
      const chushiMonth = chushi.slice(0, 4) + chushi.slice(5, 7); // YYYYMM
      const currentMonth = (() => {
        const today = todayIsoJst(); // YYYY-MM-DD
        return today.slice(0, 4) + today.slice(5, 7);
      })();
      if (chushiMonth < seikyu) {
        throw fieldValidationError(
          'dokusya_chushi_date',
          `購読中止日は請求開始月（${fmtYearMonth(seikyu)}）以降の月を選択してください。`,
        );
      }
      if (chushiMonth < currentMonth) {
        throw fieldValidationError(
          'dokusya_chushi_date',
          '購読中止日は当月以降の月を選択してください。',
        );
      }
    } else {
      // 紙版: 解約予定日ルール（購読開始日以降・未来日・最終変更適用日より後）。
      const violations = [
        ...collectChushiViolations({
          chushiDate: chushi,
          kaishiDate: before.dokusyaKaishiDate,
          today: todayIsoJst(),
        }),
        ...collectChushiVsMaxJoho({
          chushiDate: chushi,
          maxJoho: await this.loadMaxJoho(id),
        }),
      ];
      if (violations.length > 0) {
        throw new ValidationException(
          violations.map((v) => ({
            field: tekiyoViolationField(v.kind),
            message: v.message,
          })),
        );
      }
    }

    const auditCtx = buildAuditCtx(
      session,
      req,
      SCREEN_NAME_SCR014,
      TABLE_NAME,
      id,
    );

    let refreshed: Dokusya;
    try {
      refreshed = await this.dataSource.transaction(async (manager) => {
        // rireki_no 採番の直列化（update と同じ理由）。
        await this.rireki.lockDokusyaRow(manager, id);
        const result = await insertScheduledKaiyaku(manager, {
          dokusyaId: id,
          chushiDate: chushi,
          shubetsu,
          actor: String(session.account_id),
        });
        await manager.update(
          Dokusya,
          { dokusyaId: id },
          { updatedBy: String(session.account_id) },
        );
        // 電子版へ cancel を push（顧客要件 2026-07: 解約の外部連携は到来日バッチ
        // ではなく本操作が担う）。tx 内で実行するので、push 失敗（DenshibanPush
        // Exception）はここで throw → 予約履歴行・master・監査ログもろとも
        // ロールバックされ、cloud と電子版の状態が食い違わない（同期 Saga）。
        //
        // immediateJohoDate は渡さない: 予約行の適用日(=購読中止日)は未来になり得るが、
        // 解約対象月は cancel_ym で電子版へ伝えるため、予約した時点で push する。
        // 到来日を待つと、その間に電子版側で課金が進んでしまう。
        //
        // 実際に push されるのは 電子版(2)・非クレカ・非campaign単価 のみ:
        //   - 紙版(1)            … pushUiIfDenshi が種別で早期 return
        //   - 併読(3)/電子版クレカ … 冒頭の read-only ガードで 403（ここへ来ない）
        //   - campaign 単価      … pushOnWrite 内の isPushTarget が false を返す
        //     （キャンペーン読者は電子版側の管理対象外。pull の dokusya-sync も
        //      Campagna_flg 立ちを取込対象から外しており、方向は逆でも同じ方針）
        //   - DENSHIBAN_PUSH_ENABLED=false … 同じく isPushTarget が false
        // いずれも throw せず no-op なので、cloud 側の解約予約はそのまま成立する。
        await this.pushUiIfDenshi(manager, 'cancel', result.after, {
          cancelYm: toCancelYm(chushi),
        });
        await this.auditLog.logUpdate(auditCtx, before, result.after, manager);
        return result.after;
      });
    } catch (err) {
      await this.auditLog.logError(auditCtx, AuditOperation.UPDATE, err as Error);
      throw err;
    }

    const joins = await this.fetchJoinFieldsViaQB(id);
    return toDokusyaResponse(refreshed, joins);
  }

  // ════════════════════════════════════════════════════════════════════
  // API-011-004 — PUT /api/v1/dokusya/:dokusya_id/approve
  // ════════════════════════════════════════════════════════════════════
  async approve(
    id: number,
    session: SessionPayload,
    req: Request,
    tankaId?: number,
  ): Promise<{ data: DokusyaResponseDto; message: string }> {
    return this.changeApprovalStatus(id, session, req, {
      newStatus: DenshiShoninStatus.APPROVED,
      message: '承認しました。',
      tankaId,
    });
  }

  // ════════════════════════════════════════════════════════════════════
  // API-011-005 — PUT /api/v1/dokusya/:dokusya_id/reject
  // ════════════════════════════════════════════════════════════════════
  async reject(
    id: number,
    session: SessionPayload,
    req: Request,
  ): Promise<{ data: DokusyaResponseDto; message: string }> {
    return this.changeApprovalStatus(id, session, req, {
      newStatus: DenshiShoninStatus.REJECTED,
      message: '否認しました。',
    });
  }

  // ════════════════════════════════════════════════════════════════════
  // API-011-006 — GET /api/v1/dokusya/:dokusya_id/history
  // ════════════════════════════════════════════════════════════════════
  /**
   * 購読者の履歴を rireki_no DESC で取得。各行は m_code 解決した tetsuzuki_shurui_label
   * を持つ（no-label ルールの意図的例外 — dokusya-history-response.dto.ts ヘッダ参照）。
   */
  async getHistory(
    id: number,
    session: SessionPayload,
  ): Promise<DokusyaHistoryResponseDto> {
    // existence + DataScope gate.
    await this.fetchInScope(id, session);
    const rows = await this.rirekiRepo.find({
      where: { dokusyaId: id },
      order: { rirekiNo: 'DESC' },
    });
    const data: DokusyaHistoryItemDto[] = rows.map((row) =>
      toDokusyaHistoryItem(
        row,
        this.codeService.getLabel('TETSUZUKI_SHURUI', Number(row.tetsuzukiShurui)),
      ),
    );
    return { data };
  }

  // ════════════════════════════════════════════════════════════════════
  // SCR-013 — 購読者履歴情報画面
  // API-013-001 — GET /api/v1/dokusya/:dokusya_id/rireki
  // ════════════════════════════════════════════════════════════════════
  /**
   * 購読者のフル履歴一覧(ページング) (api.md §API-013-001)。
   *
   * getHistory(SCR-011 /history — 軽量・label 付き)と別: 管理支店/支店/都道府県(×3)/
   * 販売店(×2)の名称を join し rireki_no DESC(既定)でページング、CODE VALUE のみ返す
   * (*_label なし — FE が useCodesStore で解決・api.md §m_code note)。
   *
   * §4.2-4.3 存在 + DataScope gate は fetchInScope を再利用（範囲外は 404 マスク・
   * module 慣習 / security.md Layer 2）。
   *
   * §4.7 read-only — audit-log 書き込みなし。DB 失敗は GlobalExceptionFilter(500)へ。
   */
  async getRirekiList(
    id: number,
    query: DokusyaRirekiQueryDto,
    session: SessionPayload,
  ): Promise<PaginatedResponse<DokusyaRirekiListItem>> {
    // 存在 + DataScope gate（miss / 範囲外は 404 マスク）。
    await this.fetchInScope(id, session);

    const sortColumn =
      RIREKI_SORT_COLUMN_MAP[query.sort_by ?? 'rireki_no'] ?? 'r.rireki_no';
    const sortOrder: 'ASC' | 'DESC' =
      (query.sort_order ?? 'desc').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    const page = Math.max(1, Number(query.page ?? 1));
    const perPage = clampPerPage(query.per_page);

    const qb = this.rirekiRepo
      .createQueryBuilder('r')
      .leftJoin(
        'm_kanri_shiten',
        'ks',
        'ks.kanri_shiten_id = r.kanri_shiten_id AND ks.deleted_at IS NULL',
      )
      .leftJoin('m_shiten', 's', 's.shiten_id = r.shiten_id AND s.deleted_at IS NULL')
      .leftJoin('m_todofuken', 'td', 'td.todofuken_code = r.todofuken_code')
      .leftJoin('m_todofuken', 'ht', 'ht.todofuken_code = r.haitatsu_todofuken_code')
      .leftJoin('m_todofuken', 'zt', 'zt.todofuken_code = r.zenkai_todofuken_code')
      .leftJoin(
        'm_hanbaiten',
        'h',
        'h.hanbaiten_id = r.hanbaiten_id AND h.deleted_at IS NULL',
      )
      .leftJoin(
        'm_hanbaiten',
        'zh',
        'zh.hanbaiten_id = r.zenkai_hanbaiten_id AND zh.deleted_at IS NULL',
      )
      // 新聞単価(m_tanka)と、金額を税区分で解決するための JA(m_ja)を結合。金額は JA の
      // zei_kubun で税込/税抜を切替（単価ドロップダウン・haitatsuryo.mapper と同方式）。
      // 履歴の単価名は削除済みでも表示したいので deleted_at で絞らない（LEFT JOIN でスナップショット名称を残す）。
      .leftJoin('m_tanka', 't', 't.tanka_id = r.tanka_id')
      .leftJoin('m_ja', 'ja', 'ja.ja_id = r.ja_id')
      .select([
        'r.dokusya_rireki_id AS dokusya_rireki_id',
        'r.dokusya_id AS dokusya_id',
        'r.rireki_no AS rireki_no',
        'r.ja_id AS ja_id',
        'r.kanri_shiten_id AS kanri_shiten_id',
        'ks.kanri_shiten_name AS kanri_shiten_name',
        'r.shiten_id AS shiten_id',
        's.shiten_name AS shiten_name',
        'r.kumiaiin_code AS kumiaiin_code',
        'r.shimei_sei AS shimei_sei',
        'r.shimei_mei AS shimei_mei',
        'r.todofuken_code AS todofuken_code',
        'td.todofuken_name AS todofuken_name',
        'r.shikuchoson AS shikuchoson',
        'r.chome_banchi AS chome_banchi',
        'r.tatemono_mei AS tatemono_mei',
        'r.renrakusaki_1 AS renrakusaki_1',
        'r.renrakusaki_2 AS renrakusaki_2',
        'r.email AS email',
        'r.mail_magazine_flg AS mail_magazine_flg',
        'r.birth_year AS birth_year',
        'r.gender AS gender',
        'r.dokusyaso_bunrui AS dokusyaso_bunrui',
        'r.nogyosya_bunrui AS nogyosya_bunrui',
        'r.tanka_id AS tanka_id',
        't.tanka_name AS tanka_name',
        // 金額は JA の税区分で解決（内税→税込、他→税抜）。
        `CASE WHEN ja.zei_kubun = ${ZEI_KUBUN_UCHIZEI} THEN t.kingaku_zeikomi ELSE t.kingaku_zeinuki END AS tanka_kingaku`,
        'r.dokusya_busu AS dokusya_busu',
        'r.zenkai_dokusya_busu AS zenkai_dokusya_busu',
        'r.haitatsu_yubin_no AS haitatsu_yubin_no',
        'r.zenkai_yubin_no AS zenkai_yubin_no',
        'r.haitatsu_todofuken_code AS haitatsu_todofuken_code',
        'ht.todofuken_name AS haitatsu_todofuken_name',
        'r.haitatsu_shikuchoson AS haitatsu_shikuchoson',
        'r.haitatsu_chome_banchi AS haitatsu_chome_banchi',
        'r.haitatsu_tatemono_mei AS haitatsu_tatemono_mei',
        'r.haitatsu_shimei_sei AS haitatsu_shimei_sei',
        'r.haitatsu_shimei_mei AS haitatsu_shimei_mei',
        'r.zenkai_todofuken_code AS zenkai_todofuken_code',
        'zt.todofuken_name AS zenkai_todofuken_name',
        'r.zenkai_shikuchoson AS zenkai_shikuchoson',
        'r.zenkai_chome_banchi AS zenkai_chome_banchi',
        'r.zenkai_tatemono_mei AS zenkai_tatemono_mei',
        'r.hanbaiten_id AS hanbaiten_id',
        'h.hanbaiten_name AS hanbaiten_name',
        'r.zenkai_hanbaiten_id AS zenkai_hanbaiten_id',
        'zh.hanbaiten_name AS zenkai_hanbaiten_name',
        'r.tetsuzuki_shurui AS tetsuzuki_shurui',
        'r.shoki_dokusya_kaishi_date AS shoki_dokusya_kaishi_date',
        'r.dokusya_kaishi_date AS dokusya_kaishi_date',
        'r.dokusya_chushi_date AS dokusya_chushi_date',
        'r.joho_henko_tekiyo_date AS joho_henko_tekiyo_date',
        // 購読種別は can_torikeshi 判定（紙版のみ取消可・顧客要件2026-07）と
        // 一覧表示（履歴番号の直後の列）の両方で使う。
        'r.dokusya_shubetsu AS dokusya_shubetsu',
        // 購読種別に続く電子版2列（顧客要件 2026-07・SCR-013 一覧）。紙版は null。
        'r.denshi_dokusya_shubetsu AS denshi_dokusya_shubetsu',
        'r.denshi_shonin_status AS denshi_shonin_status',
        'r.saishin_data_flg AS saishin_data_flg',
        'r.zougen_hokoku_flg AS zougen_hokoku_flg',
        'r.shinki_flg AS shinki_flg',
        'r.kaiyaku_flg AS kaiyaku_flg',
        'r.torikeshi_flg AS torikeshi_flg',
        'r.biko AS biko',
        'r.shiharai_hoho AS shiharai_hoho',
        'r.yubin_kubun AS yubin_kubun',
        'r.dokusyaryo_shiharai_cycle AS dokusyaryo_shiharai_cycle',
        'r.hikiotoshi_yokin_shubetsu AS hikiotoshi_yokin_shubetsu',
        'r.bank_branch_code AS bank_branch_code',
        'r.bank_branch_name AS bank_branch_name',
        'r.hikiotoshi_koza_no AS hikiotoshi_koza_no',
        'r.hikiotoshi_koza_meigi AS hikiotoshi_koza_meigi',
        'r.created_at AS created_at',
        'r.created_by AS created_by',
      ])
      .where('r.dokusya_id = :dokusya_id', { dokusya_id: id });

    qb.orderBy(sortColumn, sortOrder);
    // limit/offset を使う(take/skip 不可): take/skip は getMany() のみページングし
    // getRawMany() では無視されるため、per_page が効かず全行返っていた。
    // getCount() は limit/offset を無視するので total は正しいまま。
    qb.limit(perPage);
    qb.offset((page - 1) * perPage);

    // 取消可否(can_torikeshi)判定用にチェーン末尾(有効レコード)の rireki_id を取得。
    // writer の canTorikeshi/loadEffectiveRow と同条件: torikeshi_flg=false かつ
    // joho<=遠未来 の行のうち (joho, rireki_no) 最大の行。
    const tailRow = await this.rirekiRepo
      .createQueryBuilder('r')
      .select('r.dokusya_rireki_id', 'id')
      .where('r.dokusya_id = :id', { id })
      .andWhere('r.torikeshi_flg = false')
      .andWhere('r.joho_henko_tekiyo_date <= :tailAsOf', {
        tailAsOf: TORIKESHI_TAIL_ASOF,
      })
      .orderBy('r.joho_henko_tekiyo_date', 'DESC')
      .addOrderBy('r.rireki_no', 'DESC')
      .limit(1)
      .getRawOne<{ id: number | string }>();
    const tailRirekiId = tailRow ? Number(tailRow.id) : null;

    const [rows, total] = await Promise.all([
      qb.getRawMany<Record<string, unknown>>(),
      qb.getCount(),
    ]);

    const data = rows.map((row) => toDokusyaRirekiListItem(row, tailRirekiId));
    return paginate(data, Number(total), page, perPage);
  }

  // ════════════════════════════════════════════════════════════════════
  // API-013-002 — POST /api/v1/dokusya/:dokusya_id/rireki/:dokusya_rireki_id/torikeshi
  // 履歴の取消(赤伝): 対象行を torikeshi_flg + 打ち消し行を追加し、master を再計算。
  // ════════════════════════════════════════════════════════════════════
  async torikeshiRireki(
    dokusyaId: number,
    rirekiId: number,
    reason: string,
    session: SessionPayload,
    req: Request,
  ): Promise<{ message: string }> {
    // 存在 + DataScope チェック（購読者が見えなければ 404 マスク）。
    await this.fetchInScope(dokusyaId, session);

    // 対象履歴が当該購読者に属するか + 取消可否を事前検証。approve/reject と同方針で
    // トランザクション前に弾き、期待される検証失敗(400)を error-log(log_type=3)に残さない。
    // canTorikeshi は境界の再検証も兼ね applyTorikeshi 内部でも再度ガードされる。
    const target = await this.rirekiRepo.findOne({
      where: { dokusyaRirekiId: rirekiId, dokusyaId },
    });
    if (!target) {
      throw new NotFoundException('履歴');
    }
    if (!(await canTorikeshi(this.rirekiRepo.manager, dokusyaId, target))) {
      throw new TorikeshiNotAllowedException();
    }

    const auditCtx = buildAuditCtx(
      session,
      req,
      SCREEN_NAME_SCR013,
      TABLE_NAME_RIREKI,
      rirekiId,
    );
    try {
      await this.dataSource.transaction(async (manager) => {
        // [rireki-no-race] 打ち消し行の採番前に master 行をロック（他 UPDATE と直列化）。
        await this.rireki.lockDokusyaRow(manager, dokusyaId);
        await applyTorikeshi(
          manager,
          dokusyaId,
          rirekiId,
          reason,
          String(session.account_id),
        );
        // 取消理由を t_log(afterValue)に記録。取消理由は備考にも記録済み。
        await this.auditLog.logUpdate(
          auditCtx,
          { dokusya_rireki_id: rirekiId },
          { dokusya_rireki_id: rirekiId, torikeshi_reason: reason },
          manager,
        );
      });
    } catch (err) {
      await this.auditLog.logError(auditCtx, AuditOperation.UPDATE, err as Error);
      throw err;
    }
    return { message: '取消しました。' };
  }

  // ─── private helpers ────────────────────────────────────────────────

  /**
   * 行を SELECT し、存在＋session が見える場合のみ返す。範囲外は 404 マスク（存在リークガード）。
   */
  private async fetchInScope(
    id: number,
    session: SessionPayload,
  ): Promise<Dokusya> {
    const row = await this.dokusyaRepo.findOne({
      where: { dokusyaId: id, deletedAt: IsNull() },
    });
    if (!row) throw new NotFoundException('購読者');
    assertBranchScope(row.jaId, row.kanriShitenId, session, '購読者');
    assertShitenScope(row.shitenId, session, '購読者');
    return row;
  }

  /**
   * hanbaiten_name / tanka_name と m_shiten 逆引きを単一 QueryBuilder で解決
   * （unit spec の dokusyaQb.getRawOne mock が発火するため）。LEFT JOIN なので
   * 親行欠落は throw せず null になる。
   */
  private async fetchJoinFieldsViaQB(
    dokusyaId: number,
  ): Promise<DokusyaJoinFields> {
    const raw = await this.dokusyaRepo
      .createQueryBuilder('d')
      .leftJoin('m_hanbaiten', 'h', 'h.hanbaiten_id = d.hanbaiten_id')
      .leftJoin('m_tanka', 't', 't.tanka_id = d.tanka_id')
      .leftJoin(
        'm_shiten',
        'bs',
        // CAST(... AS text) は pg-mem 対策。shiten_code(varchar10) と bank_branch_code(varchar3)
        // を直接比較すると pg-mem が varchar(3)側へ coerce し 3桁超の shiten_code で
        // "value too long" になる。text 比較に統一すれば実 Postgres・pg-mem 双方で正しく一致。
        'bs.ja_id = d.ja_id AND bs.shiten_code = CAST(d.bank_branch_code AS text) AND bs.kinyu_shiten_flg = TRUE AND bs.deleted_at IS NULL',
      )
      .select([
        'h.hanbaiten_name AS hanbaiten_name',
        't.tanka_name AS tanka_name',
        'bs.shiten_id AS bank_shiten_id',
        'bs.jastem_toriatsukai_tenpo_code AS jastem_toriatsukai_tenpo_code',
        'bs.jastem_tenpo_name AS jastem_tenpo_name',
      ])
      .where('d.dokusya_id = :id', { id: dokusyaId })
      .getRawOne<Record<string, unknown>>();

    // 引落口座支店は支払方法に関わらず保存・表示 (顧客要件)。逆引きが bank_branch_code
    // から見つけた shiten_id をそのまま返す。引落口座が無い行は bank_branch_code='' で lookup が null。
    const rawBankShitenId = raw?.bank_shiten_id;
    const bankShitenId = rawBankShitenId == null ? null : Number(rawBankShitenId);

    // getRawMany() の列は常にスカラー — cast で `unknown` を narrow し String() の
    // [object Object] 経路を防ぐ。
    const str = (v: unknown): string =>
      v == null ? '' : String(asScalar(v));
    return {
      hanbaiten_name: str(raw?.hanbaiten_name),
      tanka_name: str(raw?.tanka_name),
      bank_shiten_id: bankShitenId,
      jastem_toriatsukai_tenpo_code: str(raw?.jastem_toriatsukai_tenpo_code),
      jastem_tenpo_name: str(raw?.jastem_tenpo_name),
    };
  }

  /**
   * fetchJoinFieldsViaQB の「任意エンティティ版」。dokusya_id でなく渡されたエンティティの
   * FK 値(hanbaiten_id / tanka_id / bank_branch_code)から結合値を解決。getEffectiveAt が
   * predecessor(直前行)の FK を基準に名称・引落支店を引くために使う（master の FK でなく predecessor の FK 基準）。
   */
  private async fetchJoinFieldsForEntity(
    entity: Dokusya,
  ): Promise<DokusyaJoinFields> {
    const str = (v: unknown): string => (v == null ? '' : String(asScalar(v)));
    const [hb, tk, bs] = await Promise.all([
      entity.hanbaitenId == null
        ? Promise.resolve([])
        : this.dataSource.query(
            `SELECT hanbaiten_name FROM m_hanbaiten
              WHERE hanbaiten_id = $1 AND deleted_at IS NULL`,
            [entity.hanbaitenId],
          ),
      entity.tankaId == null
        ? Promise.resolve([])
        : this.dataSource.query(
            `SELECT tanka_name FROM m_tanka
              WHERE tanka_id = $1 AND deleted_at IS NULL`,
            [entity.tankaId],
          ),
      !entity.bankBranchCode
        ? Promise.resolve([])
        : this.dataSource.query(
            // CAST(... AS text) は fetchJoinFieldsViaQB と同じ pg-mem 対策。
            `SELECT shiten_id, jastem_toriatsukai_tenpo_code, jastem_tenpo_name
               FROM m_shiten
              WHERE ja_id = $1 AND shiten_code = CAST($2 AS text)
                AND kinyu_shiten_flg = TRUE AND deleted_at IS NULL`,
            [entity.jaId, entity.bankBranchCode],
          ),
    ]);
    const bankShitenId = bs?.[0]?.shiten_id;
    return {
      hanbaiten_name: str(hb?.[0]?.hanbaiten_name),
      tanka_name: str(tk?.[0]?.tanka_name),
      bank_shiten_id: bankShitenId == null ? null : Number(bankShitenId),
      jastem_toriatsukai_tenpo_code: str(bs?.[0]?.jastem_toriatsukai_tenpo_code),
      jastem_tenpo_name: str(bs?.[0]?.jastem_tenpo_name),
    };
  }

  /**
   * [layer4-fk-guard] body の全 FK id が保存前に caller の JA に属することを検証。
   * 無いと JA-scoped ユーザが他テナントの 管理支店/支店/販売店/単価 id を POST/PUT でき、
   * 行は caller の ja_id を保存しつつ FK は別 JA を指す（テナント跨ぎ破壊 + id 列挙）。
   * security.md §Layer 4 参照。JA外→DataScopeViolation(403)、id 欠落→BadRequest(400)（共に fetchFkInJa）。
   *
   * kanri_shiten_id は DTO 任意で present 時のみ検証。shiten_id/hanbaiten_id/tanka_id は必須。
   */
  private async assertFkScope(
    dto: CreateDokusyaDto,
    effectiveJaId: number,
  ): Promise<void> {
    // kanri_shiten_id / shiten_id は任意。未設定は null だが、過去にレスポンスが 0 に丸めて
    // 返した経緯で FE が 0 を送り返すことがある。0(以下)は「未設定」とみなし FK 検証をスキップ
    // （id=0 を実在 ID として探して 400 になるのを防ぐ）。
    if (dto.kanri_shiten_id != null && Number(dto.kanri_shiten_id) > 0) {
      await fetchFkInJa(
        this.kanriShitenRepo,
        'kanriShitenId',
        dto.kanri_shiten_id,
        effectiveJaId,
        '管理支店',
      );
    }
    if (dto.shiten_id != null && Number(dto.shiten_id) > 0) {
      await fetchFkInJa(
        this.shitenRepo,
        'shitenId',
        dto.shiten_id,
        effectiveJaId,
        '支店',
      );
    }
    await fetchFkInJa(
      this.hanbaitenRepo,
      'hanbaitenId',
      dto.hanbaiten_id,
      effectiveJaId,
      '販売店',
    );
    await fetchFkInJa(
      this.tankaRepo,
      'tankaId',
      dto.tanka_id,
      effectiveJaId,
      '単価',
    );
  }

  /**
   * m_shiten を (ja_id, shiten_id) で逆引きし、create/update が t_dokusya へ保存する
   * (bank_branch_code, bank_branch_name) を返す。
   *
   * 口座引落(shiharai_hoho=1)は bank_shiten_id 必須。他の支払方法は任意 — 顧客要件で
   * 全支払方法に引落口座情報を保存可能にするため、指定あれば検証・解決、未指定は空('')で保存。
   * 指定値が不正(他テナント/非存在/金融機関支店でない)は支払方法を問わず VALIDATION_ERROR(bank_shiten_id)。
   */
  private async resolveBankBranch(
    shiharaiHoho: number,
    bankShitenId: number | null | undefined,
    effectiveJaId: number,
  ): Promise<{ code: string; name: string }> {
    if (bankShitenId === null || bankShitenId === undefined) {
      if (shiharaiHoho === ShiharaiHoho.KOZA_HIKIOTOSHI) {
        throw fieldValidationError(
          'bank_shiten_id',
          '銀行支店IDは口座引落の場合は必須です。',
        );
      }
      return { code: '', name: '' };
    }
    // [layer4-fk-guard] 逆引きを caller の JA に限定し、他テナントの銀行支店を参照できない
    // ようにする（テナント跨ぎ FK 注入）。JA外/非存在 id → 同じ VALIDATION_ERROR。
    const row = await this.shitenRepo.findOne({
      where: {
        shitenId: Number(bankShitenId),
        jaId: effectiveJaId,
        kinyuShitenFlg: true,
        deletedAt: IsNull(),
      },
    });
    if (!row) {
      throw fieldValidationError(
        'bank_shiten_id',
        '指定された銀行支店が見つかりません。',
      );
    }
    // 顧客要件 2026-07: bank_branch_code は m_shiten.shiten_code を保存。SCR-020 口座振替の
    // `s.shiten_code = d.bank_branch_code` JOIN と整合させ引落口座支店の絞込・集計を一致させるため。
    // 金融機関支店の shiten_code は半角数字3桁固定(create-shiten DTO で検証済み)かつ作成後変更不可
    // (kinyu_shiten_flg 同様)なので varchar(3) に収まる。bank_branch_name は全銀ファイルのカナ表記
    // フォールバック用に jastem_tenpo_name(半角カナ)を維持。
    return {
      code: row.shitenCode ?? '',
      name: row.jastemTenpoName ?? '',
    };
  }

  /**
   * m_code バインド列が customer-editable キャッシュに無いとき per-field errors[] 付き
   * VALIDATION_ERROR を投げる。undefined フィールドはスキップし create + update 部分編集を同一呼出でカバー。
   */
  private assertCodeMasterValues(
    dto: CreateDokusyaDto | UpdateDokusyaDto,
  ): void {
    assertMCodeValues(this.codeService, [
      {
        field: 'dokusya_shubetsu',
        value: dto.dokusya_shubetsu,
        category: 'DOKUSYA_SHUBETSU',
        label: '購読者種別',
      },
      {
        field: 'tetsuzuki_shurui',
        value: dto.tetsuzuki_shurui,
        category: 'TETSUZUKI_SHURUI',
        label: '手続種類',
      },
      {
        field: 'yubin_kubun',
        value: dto.yubin_kubun,
        category: 'YUBIN_KUBUN',
        label: '郵送区分',
      },
      {
        field: 'shiharai_hoho',
        value: dto.shiharai_hoho,
        category: 'SHIHARAI_HOHO',
        label: '支払方法',
      },
    ]);
  }

  /**
   * CREATE で購読種別=電子版(dokusya_shubetsu=2)はクレジットカード(shiharai_hoho=6)のみ除外
   * — クレカは電子版読者管理システム連携専用で手動 create フォームから選べない(screen-design §7.3)。
   * 口座引落/現金集金/振込集金/JA施設等/給与天引き/その他 は選択可。FE の DokusyaFormView の
   * option filter をミラー。update は意図的に非ガード（既存電子版は同システム同期のクレカを正当に持ちうる）。
   */
  private assertDigitalPaymentMethod(dto: CreateDokusyaDto): void {
    if (
      Number(dto.dokusya_shubetsu) === DokusyaShubetsu.DIGITAL &&
      Number(dto.shiharai_hoho) === ShiharaiHoho.CREDIT_CARD
    ) {
      throw fieldValidationError(
        'shiharai_hoho',
        '電子版の場合、クレジットカードは選択できません。',
      );
    }
  }

  /**
   * 適用日(情報変更適用日 joho_henko_tekiyo_date。販売店適用日 hanbaiten_tekiyo_date は廃止し
   * joho に一本化・顧客要件 2026-07)は当日以降（過去日不可・当日は即日適用として許可）。本日基準は
   * JST 暦日(todayIsoJst)。toISOString().slice(0,10) は UTC で JST 09:00 前に前日へずれるため不使用。
   *
   * 区切り文字を正規化してから比較（YYYY/MM/DD 入力も対応。lexicographic では '/' > '-' なので
   * 正規化しないと年内の過去日を「未来」と誤読）。
   */
  private assertTekiyoDateNotPast(
    value: string | null | undefined,
    field: string,
    message: string,
  ): void {
    if (!value) return;
    if (normalizeDbDate(value) < todayIsoJst()) {
      throw fieldValidationError(field, message);
    }
  }

  /**
   * 情報変更適用日(joho_henko_tekiyo_date)等「未来日のみ許可」フィールド用。当日・過去日は不可
   * （顧客要件 2026-07: 情報変更適用日は未来日のみ）。assertTekiyoDateNotPast(当日可)と使い分け。本日基準は JST 暦日。
   */
  private assertTekiyoDateFuture(
    value: string | null | undefined,
    field: string,
    message: string,
  ): void {
    if (!value) return;
    if (normalizeDbDate(value) <= todayIsoJst()) {
      throw fieldValidationError(field, message);
    }
  }

  /**
   * 当日変更モード(joho=本日)のフィールド制限（顧客要件2026-07）。
   *
   * - 電子版(2): 全項目 当日反映可(紙帳票を生成しない)→ 制限なし。
   * - 紙版(1): 帳票影響項目は当日反映不可 → 予約変更(未来日)で行う。対象＝部数(dokusya_busu)・
   *   販売店(hanbaiten_id)・購読者住所(郵便番号/都道府県/市区町村/丁目番地/建物名)・配達先住所(同項目)・
   *   購読中止日(dokusya_chushi_date)。
   * - 併読(3)・電子版クレカ は上流の read-only(403) で弾かれ到達しない。
   *
   * 送信値が既存値(before)と異なる場合のみ違反（画面は全項目を送るため）。
   */
  private assertTodayModeFieldRestriction(
    dto: UpdateDokusyaDto,
    before: Dokusya,
  ): void {
    // 当日変更モードで到達(joho=本日)。共通ルールに委譲（UI/取込/置換で統一）。
    // 紙版のみ制限(電子版は全項目 当日可)。変更された帳票影響項目があれば予約変更を要求。
    const today = todayIsoJst();
    const changedReportFields = computeChangedReportFields(
      dto as unknown as Record<string, unknown>,
      before as unknown as Record<string, unknown>,
    );
    const violations = collectTodayModeReportViolations({
      shubetsu: Number(before.dokusyaShubetsu),
      joho: today,
      today,
      changedReportFields,
    });
    if (violations.length > 0) {
      throw new ValidationException(violations);
    }
  }

  /** 電子版(2)・併読(3) は email 必須、紙版(1)は任意（顧客要件: メールは電子版/併読でのみ必須・一意）。*/
  private assertEmailRequiredForShubetsu(
    email: string | null | undefined,
    dokusyaShubetsu: number | null | undefined,
  ): void {
    if (isDigitalOrBoth(dokusyaShubetsu) && !email?.trim()) {
      throw fieldValidationError('email', EMAIL_REQUIRED_DIGITAL_MSG);
    }
  }

  /**
   * 電子版(2)・併読(3) は 読者属性(dokusyaso_bunrui) を1つ以上選択(CSV 空文字＝未選択)、紙版(1)は任意。
   * email 必須と同じ電子版判定(isDigitalOrBoth)を使うため create/update 双方から呼ぶ。
   */
  private assertDokusyaSoBunruiRequiredForShubetsu(
    dokusyaSoBunrui: string | null | undefined,
    dokusyaShubetsu: number | null | undefined,
  ): void {
    if (isDigitalOrBoth(dokusyaShubetsu) && !dokusyaSoBunrui?.trim()) {
      throw fieldValidationError(
        'dokusyaso_bunrui',
        DOKUSYASO_BUNRUI_REQUIRED_DIGITAL_MSG,
      );
    }
  }

  /**
   * Email 重複ガード。email が blank/null（匿名 dokusya は設計上許可）または行が紙版のとき NO-OP。
   * 顧客要件: 一意性は電子版(2)・併読(3) のレコード間のみ担保、紙版は重複可。既存行側も
   * dokusya_shubetsu IN (2,3) に絞るため同メールの紙版は衝突扱いしない。exclusion 句で
   * UPDATE 経路が自身の行をフラグしないようにする。
   */
  private async assertEmailUnique(
    email: string | null | undefined,
    dokusyaShubetsu: number | null | undefined,
    jaId: number,
    excludeDokusyaId: number | null,
  ): Promise<void> {
    if (!email || !isDigitalOrBoth(dokusyaShubetsu)) return;
    const qb = this.dokusyaRepo
      .createQueryBuilder('d')
      .where(
        `d.ja_id = :ja_id AND d.email = :email AND d.deleted_at IS NULL
           AND d.dokusya_shubetsu IN (:...digital)`,
        {
          ja_id: jaId,
          email,
          digital: [DokusyaShubetsu.DIGITAL, DokusyaShubetsu.BOTH],
        },
      );
    if (excludeDokusyaId !== null) {
      qb.andWhere('d.dokusya_id <> :dokusya_id', {
        dokusya_id: excludeDokusyaId,
      });
    }
    const count = await qb.getCount();
    if (count > 0) {
      throw new DuplicateEmailException();
    }
  }

  /**
   * t_dokusya の snake_case → camelCase INSERT payload を組み立てる。
   *
   * 解約による購読部数=0 への自動セットは行わない（顧客要件 2026-06）。解約処理(部数0化・
   * 解約フラグ・ステータス遷移)は日次バッチが dokusya_chushi_date(解約予定日)に基づき実行。
   * UPDATE API は解約予定日を保存するだけで部数はユーザー入力値をそのまま採用。
   */
  private buildInsertPayload(
    dto: CreateDokusyaDto,
    jaId: number,
    bankBranch: { code: string; name: string },
    session: SessionPayload,
  ): Partial<Dokusya> {
    const busu = Number(dto.dokusya_busu);
    // 支店 は任意（顧客要件 2026-07）。未指定は NULL 保存（0 に丸めない）。所属支店が設定された
    // アカウント(session.shiten_id != null)が追加する読者はその支店へ固定。優先順位: session 固定 > dto 指定 > NULL。
    const rawShitenId = session.shiten_id ?? dto.shiten_id;
    const shitenId = rawShitenId != null ? Number(rawShitenId) : null;
    return {
      jaId,
      // 管理支店は任意（顧客要件 2026-07）。未指定/0 は NULL 保存（0 に丸めない・shiten_id と同方針）。
      // 0 を入れると存在しない m_kanri_shiten.id=0 への FK 違反(fk_t_dokusya_m_kanri_shiten)で INSERT が 500。
      kanriShitenId:
        dto.kanri_shiten_id != null && Number(dto.kanri_shiten_id) > 0
          ? Number(dto.kanri_shiten_id)
          : null,
      shitenId,
      kumiaiinCode: dto.kumiaiin_code ?? '',
      dokusyaShubetsu: Number(dto.dokusya_shubetsu),
      tetsuzukiShurui: Number(dto.tetsuzuki_shurui),
      denshiDokusyaShubetsu: null,
      shimeiSei: dto.shimei_sei,
      shimeiMei: dto.shimei_mei,
      shimeiKanaSei: dto.shimei_kana_sei,
      shimeiKanaMei: dto.shimei_kana_mei,
      dokusyaBusu: busu,
      yubinNo: dto.yubin_no,
      todofukenCode: dto.todofuken_code,
      shikuchoson: dto.shikuchoson,
      chomeBanchi: dto.chome_banchi,
      tatemonoMei: dto.tatemono_mei ?? '',
      renrakusaki1: dto.renrakusaki_1,
      renrakusaki2: dto.renrakusaki_2 ?? '',
      email: dto.email ?? '',
      // メールマガジンは電子版用項目。紙版時は未選択(null)→ NULL 保存（0 に丸めない）。
      mailMagazineFlg:
        dto.mail_magazine_flg != null ? Number(dto.mail_magazine_flg) : null,
      birthYear: dto.birth_year ?? null,
      gender: dto.gender ?? null,
      haitatsuSameFlg: dto.haitatsu_same_flg,
      haitatsuYubinNo: dto.haitatsu_yubin_no ?? '',
      haitatsuTodofukenCode: dto.haitatsu_todofuken_code ?? '',
      haitatsuShikuchoson: dto.haitatsu_shikuchoson ?? '',
      haitatsuChomeBanchi: dto.haitatsu_chome_banchi ?? '',
      haitatsuTatemonoMei: dto.haitatsu_tatemono_mei ?? '',
      haitatsuRenrakusaki1: dto.haitatsu_renrakusaki_1 ?? '',
      haitatsuRenrakusaki2: dto.haitatsu_renrakusaki_2 ?? '',
      haitatsuShimeiSei: dto.haitatsu_shimei_sei ?? '',
      haitatsuShimeiMei: dto.haitatsu_shimei_mei ?? '',
      haitatsuShimeiKanaSei: dto.haitatsu_shimei_kana_sei ?? '',
      haitatsuShimeiKanaMei: dto.haitatsu_shimei_kana_mei ?? '',
      hanbaitenId: Number(dto.hanbaiten_id),
      tankaId: Number(dto.tanka_id),
      yubinKubun: dto.yubin_kubun ?? YUBIN_KUBUN_NASHI,
      shiharaiHoho: Number(dto.shiharai_hoho),
      dokusyaryoShiharaiCycle: dto.dokusyaryo_shiharai_cycle ?? null,
      bankBranchCode: bankBranch.code,
      bankBranchName: bankBranch.name,
      hikiotoshiYokinShubetsu: dto.hikiotoshi_yokin_shubetsu ?? null,
      hikiotoshiKozaNo: dto.hikiotoshi_koza_no ?? '',
      hikiotoshiKozaMeigi: dto.hikiotoshi_koza_meigi ?? '',
      dokusyasoBunrui: dto.dokusyaso_bunrui ?? '',
      nogyosyaBunrui: dto.nogyosya_bunrui ?? '',
      shokiDokusyaKaishiDate: normalizeDbDate(dto.dokusya_kaishi_date),
      dokusyaKaishiDate: normalizeDbDate(dto.dokusya_kaishi_date),
      dokusyaChushiDate: normalizeDbDate(dto.dokusya_chushi_date ?? null),
      johoHenkoTekiyoDate: normalizeDbDate(dto.joho_henko_tekiyo_date ?? null),
      seikyuKaishiMonth: dto.seikyu_kaishi_month ?? '',
      biko: dto.biko ?? '',
      // [rireki-no-db-default] rireki_no は INSERT payload に含めない — DB column が
      // `INTEGER NOT NULL DEFAULT 1` で新規作成時の不変値(常に 1)は Postgres が自動補完
      // （entity の `@Column({ default: 1 })` と一致）。UPDATE/APPROVE/REJECT は service が
      // MAX+1 で明示セット(nextRirekiNo)。また単体テスト txManager.save mock が rirekiNo を
      // master vs history の discriminator に使うため、master payload に含めると mock が history 分岐に誤入する。
      denshiShoninStatus: DenshiShoninStatus.PENDING,
      createdBy: String(session.account_id),
      updatedBy: String(session.account_id),
    };
  }

  /** Same shape as INSERT but excludes `jaId` + `createdBy`. */
  private buildUpdatePartial(
    dto: UpdateDokusyaDto,
    jaId: number,
    bankBranch: { code: string; name: string },
    session: SessionPayload,
    newRirekiNo: number,
  ): Partial<Dokusya> {
    const base = this.buildInsertPayload(dto, jaId, bankBranch, session);
    delete (base as Partial<Dokusya> & { createdBy?: string }).createdBy;
    // [denshi-shonin-preserve] 承認状態(denshi_shonin_status)は編集対象外。create が承認待ち(0)を
    // 立て、状態遷移は approve/reject 専用ワークフローのみが担う。編集ペイロードに含めると承認済み(1)/
    // 否認(2)の記録を編集しただけで承認待ち(0)へ戻り承認・登録/承認しないボタンが再表示される。
    // UPDATE は既存値を維持(key を落として touch しない)。紙版→null 正規化は update() 側で明示的に行う。
    delete (base as Partial<Dokusya> & { denshiShoninStatus?: number | null })
      .denshiShoninStatus;
    return {
      ...base,
      rirekiNo: newRirekiNo,
    };
  }

  /**
   * 変更適用日(asOfJoho)時点で有効な解約予定日 = その日以前で joho 最も近い履歴行
   * (取消除外・`joho <= asOfJoho` で `(joho, rireki_no)` 最大 = writer の findBefore と同基準)の
   * dokusya_chushi_date。未来日のみ運用では master は最早行(作成時点)を保持し未来解約日が入らないため、
   * joho<=解約予定日 の上限参照には「変更適用日の直前行」を使う。該当行なしは null。
   */
  private async loadScheduledChushiAsOf(
    dokusyaId: number,
    asOfJoho: string | null | undefined,
  ): Promise<string | null> {
    if (!asOfJoho) return null;
    const row = await this.rirekiRepo.findOne({
      where: {
        dokusyaId,
        torikeshiFlg: false,
        johoHenkoTekiyoDate: LessThanOrEqual(normalizeDbDate(asOfJoho)),
      },
      order: { johoHenkoTekiyoDate: 'DESC', rirekiNo: 'DESC' },
    });
    return row?.dokusyaChushiDate ?? null;
  }

  /**
   * 履歴の最終変更適用日 = MAX(joho_henko_tekiyo_date)(取消除外)。解約予定日はこの日以降のみ許可
   * （顧客要件 2026-07）。履歴なしは null。
   */
  private async loadMaxJoho(dokusyaId: number): Promise<string | null> {
    const row = await this.rirekiRepo.findOne({
      where: { dokusyaId, torikeshiFlg: false },
      order: { johoHenkoTekiyoDate: 'DESC', rirekiNo: 'DESC' },
    });
    return row?.johoHenkoTekiyoDate
      ? normalizeDbDate(row.johoHenkoTekiyoDate)
      : null;
  }

  /**
   * 有効な解約予約が存在するか。存在する間は追加の解約予約を禁止（変更は履歴画面で当該解約を
   * 取消してから・顧客要件 2026-07）。
   *
   * 検出キー = 購読中止日(dokusya_chushi_date)が入った未取消行。Phase 1(2フェーズ化)で予約行は
   * kaiyaku_flg=false(解約確定はバッチ)になり kaiyaku_flg では検出できない。中止日は解約予約行に
   * のみ入るため「予約あり」の判定キーになる（Phase 2 バッチが作る実解約行にも中止日は入る）。
   */
  private async hasActiveKaiyaku(dokusyaId: number): Promise<boolean> {
    const row = await this.rirekiRepo.findOne({
      where: { dokusyaId, torikeshiFlg: false, dokusyaChushiDate: Not(IsNull()) },
      order: { johoHenkoTekiyoDate: 'DESC', rirekiNo: 'DESC' },
    });
    return row != null;
  }

  /**
   * 更新の適用日 範囲整合性（顧客要件 2026-07）。購読開始日 <= joho/hanbaiten <= 解約予定日、
   * および入力解約予定日の範囲。chushi の上限参照は「joho 時点で有効な解約予定日」= その日以前で
   * joho 最も近い履歴行の解約日。本編集で解約日を入力/変更した場合はその値を優先。再購読(解約済み→
   * 新規)は旧解約予定日を無効化(chushi=null)。違反があれば VALIDATION_ERROR。
   */
  private async assertUpdateDateConsistency(
    id: number,
    dto: UpdateDokusyaDto,
    before: Dokusya,
    isResubscribe: boolean,
  ): Promise<void> {
    // 購読中止日は本APIでは扱わない（停止は専用エンドポイントへ分離・顧客要件 2026-07）。
    // ただし joho の上限参照として「変更適用日時点で有効な解約予定日」(履歴の既存予約行)は残す —
    // 解約予約後にその予定日より後の情報変更を挿入させない不整合防止(joho <= 解約予定日)。再購読時は旧解約予定日を無効化。
    const effectiveChushi = isResubscribe
      ? null
      : await this.loadScheduledChushiAsOf(id, dto.joho_henko_tekiyo_date);
    const dateViolations = collectTekiyoDateViolations({
      johoDate: dto.joho_henko_tekiyo_date,
      kaishiDate: before.dokusyaKaishiDate,
      chushiDate: effectiveChushi,
    });
    if (dateViolations.length > 0) {
      throw new ValidationException(
        dateViolations.map((v) => ({
          field: tekiyoViolationField(v.kind),
          message: v.message,
        })),
      );
    }
  }

  /**
   * approve/reject 共通のトランザクション内更新 (api.md §4.4 ステップ3)。master のステータスを
   * 反転、新履歴行がスナップショットを記録、audit 行も同一 tx で commit。
   */
  private async changeApprovalStatus(
    id: number,
    session: SessionPayload,
    req: Request,
    options: {
      newStatus: number;
      message: string;
      tankaId?: number;
    },
  ): Promise<{ data: DokusyaResponseDto; message: string }> {
    const before = await this.fetchInScope(id, session);
    // 承認/否認 は電子版(dokusya_shubetsu=2)ワークフロー → denshi_flg 必須(account_concept.md §143)。
    // 権限ゲートを status チェック前に置き、flag なしアカウントは 400 でなく 403 になる。
    await this.accountFlags.assertShubetsuFlag(Number(before.dokusyaShubetsu), session);
    if (Number(before.denshiShoninStatus) !== DenshiShoninStatus.PENDING) {
      throw new InvalidDokusyaStatusException();
    }

    // 承認時のみ「新聞単価」を編集可（顧客要件）。指定時はテナント跨ぎ FK 検証(存在＋自JA)を
    // 先に済ませてから承認確定。否認は tankaId を渡さない。
    const updateTanka = options.tankaId != null && Number(options.tankaId) > 0;
    if (updateTanka) {
      await fetchFkInJa(
        this.tankaRepo,
        'tankaId',
        options.tankaId,
        Number(before.jaId),
        '単価',
      );
    }
    const tankaPatch = updateTanka ? { tankaId: Number(options.tankaId) } : {};

    const auditCtx = buildAuditCtx(session, req, SCREEN_NAME, TABLE_NAME, id);

    let refreshed: Dokusya;
    try {
      refreshed = await this.dataSource.transaction(async (manager) => {
        // rireki_no 採番の直列化（同一購読者への同時 approve/update 競合を防ぐ）。
        await this.rireki.lockDokusyaRow(manager, id);

        // 承認/否認 は即時のワークフロー状態変更。顧客要件 2026-07 の「情報変更適用日は未来日のみ」は
        // 情報変更への制約で承認状態には適用しない。よって recomputeMaster の当日基準でなく、現行
        // (saishin_data_flg=true)履歴行を起点に「承認/否認イベント」を 1 件追加し即 saishin に昇格して
        // t_dokusya へ反映する（未来購読開始日の購読者でも即時確定できる）。
        const patch: Record<string, unknown> = {
          denshiShoninStatus: options.newStatus,
          ...tankaPatch,
        };

        // 現行の有効履歴行（master が指す行）。不変条件により 1 行だけ存在。
        const currentSaishin = await manager.findOne(DokusyaRireki, {
          where: { dokusyaId: id, saishinDataFlg: true },
        });

        if (currentSaishin) {
          // 承認/否認イベント行を現行行から carry-forward で組み立てる（適用日は現行行と同じ＝
          // 情報変更でないため。zenkai_* は buildRirekiRow が補填し、業務項目に変化が無いので zougen_hokoku_flg=false）。
          const no = await nextRirekiNo(manager, id);
          const eventRow = buildRirekiRow(
            currentSaishin,
            {
              // 承認/否認は電子版(dokusya_shubetsu=2)専用ワークフロー。電子版は適用日(joho)が常に
              // 当日のため承認/否認イベント行の適用日も当日に揃える(現行行の joho を carry-forward しない)。
              // 電子版の joho は常に <= 当日なので、当日・最大 rireki_no のこの行が到来日バッチ後も有効行のまま。
              joho: todayIsoJst(),
              values: patch,
            },
            {
              dokusyaId: id,
              rirekiNo: no,
              actor: String(session.account_id),
            },
          );
          // 承認/否認は即時反映 → 旧 saishin を降格しこの行を saishin に昇格。
          await manager.update(
            DokusyaRireki,
            { dokusyaId: id, saishinDataFlg: true },
            { saishinDataFlg: false },
          );
          eventRow.saishinDataFlg = true;
          const saved = await insertRow(manager, eventRow);
          // master へ即時反映（承認状態 + 承認時は単価 + 有効履歴行ポインタ rireki_no）。
          await manager.update(
            Dokusya,
            { dokusyaId: id },
            { ...patch, rirekiNo: saved.rirekiNo, updatedBy: String(session.account_id) },
          );
        } else {
          // 履歴行が無い異常系（通常発生しない）— master のみ即時更新して確定。
          await manager.update(
            Dokusya,
            { dokusyaId: id },
            { ...patch, updatedBy: String(session.account_id) },
          );
        }

        // 変更後スナップショット = before に新ステータス(＋承認時は単価)を重ねたもの。
        const after = {
          ...before,
          denshiShoninStatus: options.newStatus,
          updatedBy: String(session.account_id),
          ...tankaPatch,
        } as Dokusya;

        // cloud → 電子版 push（承認=approve / 否認=unapprove）。承認ワークフローは電子版専用だが
        // helper の種別ガードで一貫させる（紙版は push を呼ばない）。campaign 単価で承認した会員は
        // ファサード内の対象判定で push されない。
        await this.pushUiIfDenshi(
          manager,
          options.newStatus === DenshiShoninStatus.APPROVED
            ? 'approve'
            : 'unapprove',
          after,
        );

        await this.auditLog.logUpdate(auditCtx, before, after, manager);
        return after;
      });
    } catch (err) {
      await this.auditLog.logError(auditCtx, AuditOperation.UPDATE, err as Error);
      throw err;
    }

    const joins = await this.fetchJoinFieldsViaQB(id);
    return { data: toDokusyaResponse(refreshed, joins), message: options.message };
  }

  // ════════════════════════════════════════════════════════════════════
  // SCR-014 — 購読者明細検索画面
  // ════════════════════════════════════════════════════════════════════

  // ─── API-014-001 — GET /api/v1/dokusya (search) ─────────────────────
  /**
   * 購読者一覧検索（ページング + sort + filter + DataScope）。
   *
   * Flow (api.md §API-014-001):
   *   §4.1 DTO が field 形状 + sort_by allow-list を検証。本メソッドは追加で m_code 値
   *        (dokusya_shubetsu / shiharai_hoho / tetsuzuki_shurui / denshi_shonin_status)を
   *        runtime allow-list で再検証（DTO の @IsIn は文書化値のみで顧客追加 m_code をカバーしない）。
   *   §4.2 DataScope は applyBranchScope（CHUOKAI/JA_HONTEN→ja_id, JA_KANRI_SHITEN→kanri_shiten_id, NICHINO_* bypass）。
   *   §4.3 パラメータ毎に 等価 + ILIKE + 範囲 filter。
   *   §4.4 + §4.5 getCount() で COUNT(*) 付き単一 SELECT（spec の getCount.mockResolvedValue(N) が meta.total を制御）。
   *   §4.6 paginate() が行を正規 envelope に包む。
   *
   * Joho-henko-tekiyo-date 分岐:
   *   - 両端空 → t_dokusya の live 行（saishin_data_flg は master 表に暗黙）、t_dokusya_rireki への JOIN なし。
   *   - 片側でもあり → t_dokusya_rireki を INNER JOIN し履歴の joho_henko_tekiyo_date でフィルタ。
   */
  search(
    query: SearchDokusyaDto,
    session: SessionPayload,
  ): Promise<PaginatedResponse<DokusyaListItem>> {
    return this.searchService.search(query, session);
  }

  // ─── API-014-002 — DELETE /api/v1/dokusya/:dokusya_id ───────────────
  /**
   * 購読者をソフトデリート + audit 行を atomically 書く。
   *
   * Flow (api.md §API-014-002):
   *   §4.2 DataScope は範囲外行を assertBranchScope で 404 マスク。
   *   §4.3 Read-only guard — 電子版+クレカ(shubetsu=2 AND hoho=6) または 併読(shubetsu=3)は削除不可。
   *   §4.3 FK conflict guard — assertNoRelatedRows が t_koza_furikae をチェック。
   *   §4.4 + §4.5 soft-delete + audit log を単一 tx で包む。
   *   §4.7 error log は rollback 外に書きトレースを残す。
   */
  async remove(
    id: number,
    session: SessionPayload,
    req: Request,
  ): Promise<{ message: string }> {
    const target = await this.dokusyaRepo.findOne({
      where: { dokusyaId: id, deletedAt: IsNull() },
    });
    if (!target) throw new NotFoundException('購読者');

    // DataScope（存在チェック後、404 マスク）。
    assertBranchScope(target.jaId, target.kanriShitenId, session, '購読者');
    assertShitenScope(target.shitenId, session, '購読者');

    // Read-only guard (api.md §4.3 / err:DOKUSYA_READ_ONLY)。
    if (
      isDokusyaReadOnly(
        Number(target.dokusyaShubetsu),
        Number(target.shiharaiHoho),
      )
    ) {
      throw new DokusyaReadOnlyException();
    }

    // 削除権限: 紙版→paper_flg / 電子版→denshi_flg (account_concept §139-145)。
    // 併読 は上の read-only guard で既にブロック済み。
    await this.accountFlags.assertShubetsuFlag(Number(target.dokusyaShubetsu), session);

    // FK conflict guard — 最初の非ゼロ子テーブル件数で 409 CONFLICT。共有の
    // assertNoRelatedRows は使わない（integration test 環境は t_koza_furikae なしで動くため）。
    // COUNT(*) をインライン化して unit spec の dataSource.query mock を発火させる
    // （1テーブルのためだけに helper を import せず assertNoRelatedRows 相当の署名に合わせる）。
    for (const table of RELATED_TABLES) {
      // t_koza_furikae は deleted_at を持たない出力スナップショット表。`AND deleted_at IS NULL`
      // を付けると本番で「column "deleted_at" does not exist」で 500 になるため付けない。
      // 行が 1 件でも存在すれば FK 参照あり → 削除不可 (409 CONFLICT)。
      const rows = await this.dataSource.query(
        `SELECT COUNT(*) AS count FROM ${table} WHERE dokusya_id = $1`,
        [id],
      );
      const count = Number(rows?.[0]?.count ?? 0);
      if (count > 0) {
        throw new ConflictException();
      }
    }

    const auditCtx = buildAuditCtx(
      session,
      req,
      SCREEN_NAME_SCR014,
      TABLE_NAME,
      id,
    );

    try {
      await this.dataSource.transaction(async (manager) => {
        await manager.update(
          Dokusya,
          { dokusyaId: id },
          {
            deletedAt: new Date(),
            updatedBy: String(session.account_id),
          },
        );
        await this.auditLog.logDelete(auditCtx, target, manager);
      });
    } catch (err) {
      await this.auditLog.logError(auditCtx, AuditOperation.DELETE, err as Error);
      throw err;
    }

    return { message: '削除しました。' };
  }

  // ─── API-014-003 — GET /api/v1/dokusya/export ───────────────────────
  /**
   * Excel出力（検索条件で絞り込んだ購読者一覧の xlsx 生成）。本体は DokusyaSearchService に
   * 分離、controller 呼び出し互換のため薄く委譲。
   */
  exportExcel(
    query: SearchDokusyaDto,
    session: SessionPayload,
    req: Request,
  ): Promise<{ buffer: Buffer; filename: string; headers: readonly string[] }> {
    return this.searchService.exportExcel(query, session, req);
  }

  // ════════════════════════════════════════════════════════════════════════
  // SCR-015 — 購読者販売店一括置換画面
  // ════════════════════════════════════════════════════════════════════════
  //
  // 一括置換（候補検索 + 一括置換 + 候補事前検証）の本体は DokusyaReplaceService に分離。
  // 本サービスは facade として薄く委譲（controller 呼び出し互換を維持）。

  // ─── API-015-001 — GET /api/v1/dokusya/replace-hanbaiten/search ─────────
  searchForReplace(
    query: SearchReplaceDokusyaDto,
    session: SessionPayload,
  ): Promise<PaginatedResponse<ReplaceSearchItem>> {
    return this.replaceService.searchForReplace(query, session);
  }

  // ─── API-015-002 — POST /api/v1/dokusya/replace-hanbaiten ───────────────
  replaceHanbaiten(
    dto: ReplaceHanbaitenDto,
    session: SessionPayload,
    req: Request,
  ): ReturnType<DokusyaReplaceService['replaceHanbaiten']> {
    return this.replaceService.replaceHanbaiten(dto, session, req);
  }

  // ════════════════════════════════════════════════════════════════════════
  // SCR-016 — 購読者Excelデータ取込画面
  // ════════════════════════════════════════════════════════════════════════
  //
  // 取込（テンプレートDL + 一括取込）の本体は DokusyaImportService に分離。
  // 本サービスは facade として薄く委譲（controller 呼び出し互換を維持）。

  // ─── API-016-001 — GET /api/v1/dokusya/import/template ──────────────────
  downloadImportTemplate(
    session: SessionPayload,
  ): Promise<{ buffer: Buffer; filename: string }> {
    return this.importService.downloadImportTemplate(session);
  }

  // ─── API-016-002 — POST /api/v1/dokusya/import ──────────────────────────
  importExcel(
    dto: ImportDokusyaDto,
    session: SessionPayload,
    req: Request,
  ): ReturnType<DokusyaImportService['importExcel']> {
    return this.importService.importExcel(dto, session, req);
  }
}
