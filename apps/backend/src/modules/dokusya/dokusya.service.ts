import { Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, IsNull, LessThanOrEqual, Not, Repository } from 'typeorm';
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
import { paginate, type PaginatedResponse } from '@/common/utils/paginate';
import {
  AuditOperation,
  DenshiShoninStatus,
  DokusyaShubetsu,
  ShiharaiHoho,
  TetsuzukiShurui,
} from '@/common/enums';
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
  collectTekiyoDateViolations,
  collectChushiViolations,
  collectChushiVsMaxJoho,
  tekiyoViolationField,
} from './dokusya-tekiyo-date.rules';
import { DokusyaSearchService } from './dokusya-search.service';
import { DokusyaReplaceService } from './dokusya-replace.service';
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

/**
 * 遠未来 asOf — チェーン末尾(有効レコード)を取消可否判定のために取得する際に
 * 使う（canTorikeshi と同一値）。joho が未来でも末尾を拾う。
 */
const TORIKESHI_TAIL_ASOF = '9999-12-31';

/** Per-screen audit-context labels (api.md §4.5 INSERT INTO t_log). */
const SCREEN_NAME = '購読者情報登録画面 (ACSMS-SCR-011)';
const TABLE_NAME = 't_dokusya';

/**
 * SCR-014 — 購読者明細検索画面 audit-context label. Separate from
 * SCR-011 so the t_log.gamen_name accurately reflects which screen
 * triggered the operation (search, delete, Excel export).
 */
const SCREEN_NAME_SCR014 = '購読者明細検索画面 (ACSMS-SCR-014)';

/** SCR-013 — 購読者履歴情報画面. 履歴の取消(赤伝)はこの画面から実行する。*/
const SCREEN_NAME_SCR013 = '購読者履歴情報画面 (ACSMS-SCR-013)';
/** 取消は t_dokusya_rireki に対する操作なので target_table を分ける。*/
const TABLE_NAME_RIREKI = 't_dokusya_rireki';

// 日付正規化（normalizeDbDate / excelSerialToIsoJst / dbDateOrNull）は時刻系
// 集約方針（`.claude/rules/nestjs.md §Timestamp policy`）に従い
// `@/common/utils/datetime` に集約。本ファイルは import して利用する。

/**
 * Narrow a raw `getRawMany()` column (always scalar at runtime) to a
 * primitive so String() can't hit the `[object Object]` path. The
 * assertion is required — the `string | number` receiver does not accept
 * `unknown` without it.
 */
function asScalar(value: unknown): string | number {
  return value as string | number;
}

/**
 * SCR-013 履歴一覧 sort-by allow-list → fully-qualified column on the
 * `r` (t_dokusya_rireki) alias. Mirrors `DokusyaRirekiQueryDto`'s
 * `@IsIn` allow-list — both sides MUST agree. Default `rireki_no`
 * (機能定義 1.2 — 履歴番号降順).
 */
const RIREKI_SORT_COLUMN_MAP: Record<string, string> = {
  rireki_no: 'r.rireki_no',
  dokusya_kaishi_date: 'r.dokusya_kaishi_date',
  joho_henko_tekiyo_date: 'r.joho_henko_tekiyo_date',
  created_at: 'r.created_at',
};

/**
 * Child tables that FK to t_dokusya. SCR-014 delete blocks when any
 * of these still has rows pointing at the target dokusya_id.
 *
 * Currently only t_koza_furikae (口座振替データ) — keeps the array
 * future-extensible (e.g. t_file_download will land here if it ever
 * gains a per-dokusya FK). The unit spec mocks dataSource.query to
 * recognise this table name explicitly.
 */
const RELATED_TABLES: readonly string[] = ['t_koza_furikae'] as const;

// 購読種別 / 支払方法 / 手続種類 / 承認ステータス are Group A enums — use
// DokusyaShubetsu / ShiharaiHoho / TetsuzukiShurui / DenshiShoninStatus from
// '@/common/enums' inline (the first three mirrored to the FE; the enum-sync
// test guards drift). DenshiShoninStatus is BE-only — no m_code, FE doesn't
// branch on the value.

/**
 * 電子版(2)・併読(3) 判定。これらの購読種別は email 必須かつ
 * email の一意性チェック対象。紙版(1) は email 任意・重複可。
 */
function isDigitalOrBoth(shubetsu: number | null | undefined): boolean {
  const n = Number(shubetsu);
  return n === DokusyaShubetsu.DIGITAL || n === DokusyaShubetsu.BOTH;
}

/** 電子版・併読で email 未入力時のメッセージ（BE/FE/取込で共通文言）。 */
const EMAIL_REQUIRED_DIGITAL_MSG =
  'メールアドレスは電子版・併読の場合は必須です。';

/** 電子版で購読部数が1以外のときのメッセージ（BE/FE 共通文言）。 */
const DIGITAL_BUSU_MSG = '電子版の購読部数は1で登録してください。';

/**
 * 電子版の購読停止で 請求開始月(seikyu_kaishi_month) が未設定のときのメッセージ
 * （料金の徴収が始まっていない読者は停止予約できない・顧客要件 2026-07）。BE/FE 共通文言。
 */
const SEIKYU_NOT_STARTED_MSG = 'この読者料金の徴収はまだ開始されていません。';

/** 'YYYYMM'（seikyu_kaishi_month / 月比較値）→ 'YYYY/MM'（顧客向けメッセージ用）。 */
function fmtYearMonth(ym: string): string {
  return `${ym.slice(0, 4)}/${ym.slice(4, 6)}`;
}

/**
 * 電子版(2)は購読部数=1固定（顧客要件 2026-06）。新規・更新とも、解約以外で
 * busu≠1 を拒否する。FE は新規で1強制＋入力不可・編集で入力不可にするが、改竄
 * リクエストはここで弾く。解約 (手続種類=0) は 0 を許容（既存ルール）。
 */
function assertDigitalBusu(
  shubetsu: number,
  busu: number,
  tetsuzuki: number,
): void {
  if (
    Number(shubetsu) === DokusyaShubetsu.DIGITAL &&
    Number(tetsuzuki) !== TetsuzukiShurui.KAIYAKU &&
    Number(busu) !== 1
  ) {
    throw fieldValidationError('dokusya_busu', DIGITAL_BUSU_MSG);
  }
}

/**
 * Raise a single VALIDATION_ERROR with a one-field errors[] payload.
 * Shape matches `ValidationPipe`'s exception so the FE
 * `useApiForm` composable maps the error to `<a-form-item :help>`
 * uniformly with DTO failures.
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
 *   - operation is bare 'CREATE' / 'UPDATE' / 'DELETE' — NEVER prefixed
 *     with 'DOKUSYA_', and approve/reject still emit 'UPDATE' (the
 *     status change is just another UPDATE).
 *   - Main DML + audit row share ONE `dataSource.transaction(...)`
 *     so the audit trail never disagrees with persisted state.
 *   - Error log (`log_type=3`) fires OUTSIDE the rolled-back tx so the
 *     failure trace survives.
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
  ) {}

  // ════════════════════════════════════════════════════════════════════
  // API-011-001 — GET /api/v1/dokusya/:dokusya_id
  // ════════════════════════════════════════════════════════════════════
  /**
   * Fetch a single 購読者 detail, joined with `m_hanbaiten.hanbaiten_name`,
   * `m_tanka.tanka_name`, and (when shiharai_hoho = 1) the reverse-
   * lookup on `m_shiten` for `bank_shiten_id` + jastem fields.
   *
   * DataScope (api.md §4.2): CHUOKAI / JA_HONTEN scope by `ja_id`;
   * JA_KANRI_SHITEN additionally narrows by `kanri_shiten_id`;
   * NICHINO_* bypass. Out-of-scope rows mask as 404 — see
   * `assertBranchScope`.
   *
   * Implementation uses `dokusyaRepo.createQueryBuilder()` for the join
   * lookup (not raw `dataSource.query`) so the unit spec's
   * `dokusyaQb.getRawOne` mock fires deterministically.
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
  // API-010-002 — GET /api/v1/dokusya/pending-approval/count (SCR-010)
  // ════════════════════════════════════════════════════════════════════
  /**
   * 電子版読者の承認待ち件数（denshi_shonin_status = 0）を DataScope 込みで
   * 返す。メニュー画面 (SCR-010) の「電子版読者承認」バナーで使用。
   * NICHINO_* は applyBranchScope がスコープ条件を付与しないため全件
   * カウントになるが、FE 側でこのバナー自体を非表示にする。
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
   * Create a 購読者 + write the first `t_dokusya_rireki` row.
   *
   * Flow (api.md §4):
   *   §4.1 input check (DTO + this method's m_code allow-list + future-
   *        date guard on joho_henko_tekiyo_date)
   *   §4.2 ja_id from session (body's ja_id is ignored — security)
   *   §4.3 email duplicate guard, scoped to the session ja_id
   *   §4.4 ステップ0 bank_shiten_id reverse-lookup (only when
   *        shiharai_hoho = 1); on miss → 400 VALIDATION_ERROR(field=bank_shiten_id)
   *   §4.4 INSERT t_dokusya + INSERT t_dokusya_rireki (rireki_no=1,
   *        saishin_data_flg=true, shinki_flg=true when 新規)
   *   §4.5 audit logCreate IN-TX with bare 'CREATE' operation
   *   §4.7 error → logError OUTSIDE the rolled-back tx
   */
  async create(
    dto: CreateDokusyaDto,
    session: SessionPayload,
    req: Request,
  ): Promise<DokusyaResponseDto> {
    this.assertCodeMasterValues(dto);
    // 併読(3) は本システムで新規作成不可（顧客要件）。紙版＋電子版の併読データは
    // 外部の電子版読者管理システムが管理し、バッチ連携で同期される。よって本画面
    // での作成・編集・停止・削除はすべて不可 — 作成はここで弾き、編集/停止/削除は
    // isDokusyaReadOnly により 403（DOKUSYA_READ_ONLY）で弾く。Excel取込も併読は
    // 取込不可（dokusya-import-validator）。FE はラジオを disabled にするが、これは
    // UX であり実際の境界は本ガード（security.md Layer 3 同様）。
    if (Number(dto.dokusya_shubetsu) === DokusyaShubetsu.BOTH) {
      throw fieldValidationError(
        'dokusya_shubetsu',
        '併読（紙版＋電子版）はバッチ連携で管理されるため、新規登録できません。',
      );
    }
    // 新規登録では手続種類に解約(0)を指定できない。解約は既存購読者に対する
    // 更新操作のため、新規作成画面では選択不可（FE もラジオを disabled）。
    if (dto.tetsuzuki_shurui === TetsuzukiShurui.KAIYAKU) {
      throw fieldValidationError(
        'tetsuzuki_shurui',
        '新規登録では手続種類に解約を指定できません。',
      );
    }
    // 新規登録は購読部数 >0（上記で解約は弾き済みなので常に新規）。
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
    // 購読開始日は新規登録のみ対象（更新では before に pin され不変）。顧客要件
    // 2026-07 改訂: 新規登録の適用日(=購読開始日)は未来日のみ許可（当日・過去日
    // 不可）。ただし 電子版+口座引落 はラジオ「今日/翌月1日」で確定する特例のため
    // 当日を許容（過去日のみ不可）＝従来どおり。
    const isDigitalKozaCreate =
      Number(dto.dokusya_shubetsu) === DokusyaShubetsu.DIGITAL &&
      Number(dto.shiharai_hoho) === ShiharaiHoho.KOZA_HIKIOTOSHI;
    if (isDigitalKozaCreate) {
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
    // 入力された解約予定日の整合性（購読開始日以降・過去日不可。顧客要件 2026-07）。
    // 新規で解約予定日を入力した場合のみ発火（未入力ならスキップ）。参照の
    // 購読開始日は入力値(dto.dokusya_kaishi_date)。
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
      // Defence-in-depth — controllers behind SessionAuthGuard never
      // see a null ja_id for CHUOKAI / JA_HONTEN / JA_KANRI_SHITEN, but
      // NICHINO_* (ja_id=null) writing a 購読者 directly would land
      // here. SCR-011 doesn't ship a NICHINO 代行入力 form for dokusya.
      throw fieldValidationError('ja_id', 'JA IDを特定できません。');
    }

    // [layer4-fk-guard] Cross-tenant FK validation BEFORE any write.
    await this.assertFkScope(dto, effectiveJaId);

    // 電子版・併読は email 必須＋電子版/併読レコード間で一意（紙版は任意・重複可）。
    this.assertEmailRequiredForShubetsu(dto.email, dto.dokusya_shubetsu);
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
        // 新規登録の情報変更適用日(joho)は購読開始日(dokusya_kaishi_date)と同一に
        // する（顧客要件 2026-07 改訂：以前は「CREATE joho=当日」固定だった）。
        // 購読開始日が当日なら即 t_dokusya へ反映され、未来なら joho も未来となり
        // 有効レコードは開始日から。recomputeMaster(当日)は未来行を有効化しないため、
        // saishin_data_flg は夜間バッチが開始日到来時に立てる（マスタ本体は
        // ensureMaster が全項目を書き込むので一覧には即表示される）。
        const johoDate = normalizeDbDate(dto.dokusya_kaishi_date);
        payload.johoHenkoTekiyoDate = johoDate;
        // 紙版は承認ワークフロー外 (null)。電子版/併読 の画面登録は職員操作の
        // ため承認済(1)で登録する（Excel一括取込と同方針 — 顧客要件）。
        payload.denshiShoninStatus =
          Number(dto.dokusya_shubetsu) === DokusyaShubetsu.PAPER
            ? null
            : DenshiShoninStatus.APPROVED;

        // 履歴書き込みは共通ライタ (applyChange) に集約 (Pha3)。CREATE =
        // ensureMaster + rireki #1 (shinki) + recomputeMaster(当日) を1トランザク
        // ションで実行。t_dokusya は有効レコードから再計算で確定する。
        const result = await applyChange(manager, {
          mode: 'CREATE',
          values: payload,
          johoDate,
          source: 'UI',
          actor: String(session.account_id),
          reason: '',
        });

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

    // Build response from the in-tx saved entity (avoids a post-tx
    // re-read that's brittle under unit-test mocking — see
    // dokusya.service.spec.ts where dokusyaRepo.findOne isn't mocked
    // after the save). For the JOIN-resolved fields we still hit the
    // DB via fetchJoinFieldsViaQB so hanbaiten_name / tanka_name are
    // surfaced even on first SELECT.
    const joins = await this.fetchJoinFieldsViaQB(Number(saved.dokusyaId));
    return toDokusyaResponse(saved, joins);
  }

  // ════════════════════════════════════════════════════════════════════
  // API-011-003 — PUT /api/v1/dokusya/:dokusya_id
  // ════════════════════════════════════════════════════════════════════
  /**
   * Update a 購読者 + append a new history row.
   *
   * `dokusya_id` comes from the URL path; body's `ja_id` is ignored
   * (immutable). Email duplicate check EXCLUDES the current row
   * (`dokusya_id <> :dokusya_id`).
   */
  async update(
    id: number,
    dto: UpdateDokusyaDto,
    session: SessionPayload,
    req: Request,
  ): Promise<DokusyaResponseDto> {
    this.assertCodeMasterValues(dto);
    // 情報変更モード（顧客要件2026-07）。未指定は後方互換で予約変更（未来日のみ）。
    const changeMode: DokusyaChangeMode = dto.change_mode ?? 'reserved';
    // 情報変更適用日 (joho_henko_tekiyo_date) の扱いはモードで分岐する:
    // - 当日変更(today): 適用日=本日に固定（クライアント送信値は信頼しない）。
    // - 予約変更(reserved): 必須・未来日のみ（従来動作）。
    // 販売店のみ変更で joho が販売店適用日へ追随する場合も dto.joho_henko_tekiyo_date
    // に同値が入るため、値は buildUpdatePartial 経由で master / 履歴へ反映される。
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

    // [resubscribe] 再購読（顧客要件 2026-07）: 解約済み(master が解約状態)の購読者を
    // 編集画面で 手続種類=新規 に切替えた場合、新しい購読開始日で再加入する。この場合
    // のみ購読開始日を編集可（＝ dto の値を採用）にし、新規(再購読)履歴行を挿入する。
    // それ以外は購読開始日を before へ pin（不変）。
    const isResubscribe =
      Number(before.tetsuzukiShurui) === TetsuzukiShurui.KAIYAKU &&
      Number(dto.tetsuzuki_shurui) === TetsuzukiShurui.SHINKI;

    // [digital-today-only] 電子版は当日変更のみ（顧客要件 2026-07 改訂）。電子版は
    // 帳票を生成せず即時反映のため、変更は常に本日適用とし、予約変更(未来日の予約)は
    // 不可とする。FE は電子版でモードバーを出さず当日固定で送るが、改竄/退行に備え
    // BE でも予約変更を弾く（購読種別は before の保存値で判定 — spoof 不可）。
    // 例外: 再購読(解約済み→新規)は新しい購読を未来開始日で作る別フローなので対象外。
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

    if (isResubscribe) {
      // 再購読の購読開始日は新規登録同様 未来日のみ（当日・過去日 不可）。
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

    // 購読部数 >0（解約以外）。解約 (手続種類=0) は 0 を許容（バッチ処理前提）。
    // 部分更新で省略された項目は既存値で補完して判定する。
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
    // 電子版は購読部数=1固定（編集）。購読種別は編集で不変なので before の版で判定。
    assertDigitalBusu(
      Number(before.dokusyaShubetsu),
      Number(effectiveBusu),
      Number(effectiveTetsuzuki),
    );

    // [read-only guard] 併読(3) と 電子版クレカ決済者 は編集不可（どのアカウント
    // でも）。seeder.md §425 / api.md §is_read_only。VIEW（取得）は許可するが
    // 更新は 403 で弾く。delete と同じ境界。
    if (
      isDokusyaReadOnly(
        Number(before.dokusyaShubetsu),
        Number(before.shiharaiHoho),
      )
    ) {
      throw new DokusyaReadOnlyException();
    }

    // [today-mode-field-restriction] 当日変更モード（joho=本日）の帳票影響項目の
    // 変更制限（顧客要件2026-07）。電子版は全項目 当日反映可、紙版は帳票影響項目
    // （部数・販売店・購読者住所・配達先住所・購読中止日）を当日反映不可とし、
    // 予約変更（未来日）へ誘導する。併読/電子版クレカは上の read-only(403) で到達しない。
    if (changeMode === 'today') {
      this.assertTodayModeFieldRestriction(dto, before);
    }

    // [tekiyo-date-consistency] 適用日の範囲整合性（顧客要件 2026-07 改訂）。read-only
    // (403) より後に置き、編集不可レコードは先に 403 で弾く。未来日(> today)は上の
    // assertTekiyoDateFuture、ここは範囲チェック:
    //   - 購読開始日(kaishi) <= joho/hanbaiten <= 解約予定日(chushi・両端 等号可)
    //   - 解約予定日(chushi) >= 購読開始日 かつ chushi > today
    // 購読開始日は編集不可＝before の値。解約予定日(chushi)の上限参照は「変更適用日
    // (joho)時点で有効な解約予定日」= その日以前で joho が最も近い履歴行(writer の
    // findBefore と同基準)の解約日を使う。未来日のみ運用では master(t_dokusya) は作成
    // 時点を保持し未来予定の解約日が入らないため、master 由来だと NULL になり
    // joho<=解約予定日 チェックが素通りする（解約予定後に情報変更を挿入できてしまう
    // 不具合）。本編集で解約日を入力/変更した場合はその値を優先する。
    // 再購読(解約済み→新規)は新しい購読で旧解約予定日は無関係。joho=新購読開始日
    // なので旧解約日を上限参照にすると「joho <= 旧解約予定日」で誤って弾かれる。
    // よって再購読時は解約予定日参照を無効化する（chushi=null）。
    await this.assertUpdateDateConsistency(id, dto, before, isResubscribe);

    // [shubetsu-immutable] 購読種別 (dokusya_shubetsu) is read-only in edit
    // mode — the FE radio group is disabled, but the screen submits the full
    // form so the field still arrives in the body. Pin it to the stored
    // value so a client that smuggles a changed value (or the FE ever
    // regressing the disable) cannot alter the subscription type. Every
    // downstream step (FK guard, payload build, history snapshot) reads the
    // pinned value from here on. Changing 紙版↔電子版↔併読 is a business
    // conversion handled by dedicated flows, not a plain edit.
    dto.dokusya_shubetsu = Number(before.dokusyaShubetsu);

    // 紙版→paper_flg / 電子版→denshi_flg required to edit (account_concept.md
    // §139-145). Pinned 購読種別 is the row's stored value; 併読 (3) is
    // read-only and never gated here.
    await this.accountFlags.assertShubetsuFlag(Number(before.dokusyaShubetsu), session);

    // [kaishi-date-immutable] 購読開始日 is set once at creation and never
    // changed — the FE disables the picker in edit mode, but the screen
    // submits the full form so dokusya_kaishi_date still arrives. Pin it to
    // the stored value so a client cannot alter it (FE disable is UX, this
    // is the boundary). 購読中止日 stays editable.
    // 例外: 再購読(isResubscribe)は新しい購読開始日で再加入するため pin しない
    // （上で未来日検証済み）。
    if (!isResubscribe) {
      dto.dokusya_kaishi_date = before.dokusyaKaishiDate;
    }

    // 購読者氏名 (氏/名) と 購読者かな (氏/名) は編集でも変更可（顧客要件
    // 2026-07）。DTO で必須＋漢字/ひらがなを検証済みの送信値をそのまま
    // buildUpdatePartial 経由で保存・履歴化する（name-pin は撤廃）。

    // [layer4-fk-guard] Validate body FK ids against the EXISTING row's JA
    // (not session) so editing stays bound to the record's tenant.
    await this.assertFkScope(dto, effectiveJaId);

    // [kanri-shiten-immutable] 管理支店 は作成時に確定し編集では変更不可（顧客
    // 要件 2026-07）。FE はグレーアウトするが画面はフォーム全体を送信するので
    // body に届く。FK guard の後に保存値へ pin して、改変リクエスト（または FE
    // の disable 退行）が管理支店を書き換えられないようにする（FE の disable は
    // UX、ここが境界）。pin を FK guard の後に置くのは、行自身の管理支店を再度
    // FK 検証して冗長に 400 を出さないため（送信 0=未設定はスキップ動作を維持）。
    dto.kanri_shiten_id = Number(before.kanriShitenId);

    // dto.dokusya_shubetsu は上で before の値に固定済み（購読種別は編集不可）。
    // 電子版・併読は email 必須＋電子版/併読レコード間で一意（自身は除外）。
    this.assertEmailRequiredForShubetsu(dto.email, dto.dokusya_shubetsu);
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
        // [rireki-no-race] master 行を FOR UPDATE でロックしてから採番・更新する。
        // 同一購読者への同時更新が両方 MAX+1 を読み、同じ rireki_no を INSERT して
        // unique 制約違反(500)になるのを防ぐ（直列化する）。applyChange 内部の
        // nextRirekiNo/recomputeMaster もこのロックの下で直列化される。
        await this.rireki.lockDokusyaRow(manager, id);

        // [cancel-separated] 購読停止（解約予約）は本APIから分離した（顧客要件
        // 2026-07 改訂）。停止は専用エンドポイント POST /dokusya/:id/stop
        // （service.stop → insertScheduledKaiyaku）で行う。update は情報変更・
        // 販売店変更・再購読のみを扱い、購読中止日は受け付けない（DTO で @IsEmpty
        // により 400）。

        // [resubscribe] 再購読（解約済み → 手続種類=新規 + 新しい購読開始日）。
        // 継続情報変更ではなく「新規(再購読)」履歴行を挿入する: shinki_flg=true・
        // tetsuzuki=1・kaiyaku_flg=false・chushi=null・新 購読開始日。初回購読開始日
        // (shoki)は不変。recomputeMaster が新開始日到来時に t_dokusya へ反映する。
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
          await this.auditLog.logUpdate(auditCtx, before, result.after, manager);
          return result.after;
        }

        // 業務項目の新値を組み立てる。master 固有項目のピン止め（初回購読開始日・
        // 電子版読者種別・承認状態）は従来どおり before の値に固定する。newRirekiNo
        // は applyChange が採番するのでここでは 0 を渡して後で rireki_no を除外。
        const updatePartial = this.buildUpdatePartial(
          dto,
          effectiveJaId,
          bankBranch,
          session,
          0,
        );
        // [shoki-immutable] 初回購読開始日 は不変。dto.dokusya_kaishi_date
        // （before に pin 済み）から shoki も上書きされるため、既存の初回日へ戻す。
        updatePartial.shokiDokusyaKaishiDate = before.shokiDokusyaKaishiDate;
        // [denshi-subtype-preserve] 電子版読者種別 は編集対象外 — 既存値を維持。
        updatePartial.denshiDokusyaShubetsu = before.denshiDokusyaShubetsu;
        // 紙版 は Web 承認ワークフロー対象外 → denshi_shonin_status を null に揃える
        // (電子版/併読は buildUpdatePartial が key を落として既存値を維持)。
        if (Number(before.dokusyaShubetsu) === DokusyaShubetsu.PAPER) {
          updatePartial.denshiShoninStatus = null;
        }

        // applyChange の values は履歴業務項目の新値。predecessor（適用日時点の
        // 有効レコード）と差分をとって変更項目のみ履歴イベント化するため、
        // ピン止め済みの不変項目（購読種別・氏名・購読開始日等）は predecessor と
        // 一致し差分に出ない。identity/監査専用列（rireki_no・updatedBy）は除外。
        const values = { ...updatePartial } as Record<string, unknown>;
        delete values.rirekiNo;
        delete (values as { updatedBy?: string }).updatedBy;

        // ── 履歴書き込み + master 再計算を共通ライタへ集約 (Pha3)。─────────────
        // 販売店を含む全変更を単一の適用日(joho)で1件の履歴行にまとめる（顧客要件
        // 2026-07: 販売店適用日を廃止し joho に統一）。recomputeMaster が有効レコード
        // から t_dokusya を確定するため master の明示 UPDATE は不要（未来日 joho は
        // 当日時点で未反映＝正しい挙動）。
        const result = await applyChange(manager, {
          mode: 'UPDATE',
          dokusyaId: id,
          values,
          johoDate: updatePartial.johoHenkoTekiyoDate as string,
          source: 'UI',
          actor: String(session.account_id),
          reason: '',
        });

        // updatedBy は rireki に無い列で recompute 対象外。master へ明示スタンプ
        // （updatedAt は @UpdateDateColumn が recompute の UPDATE 時に自動更新）。
        await manager.update(
          Dokusya,
          { dokusyaId: id },
          { updatedBy: String(session.account_id) },
        );

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
   * 購読停止（解約予約） — SCR-014 一覧の「購読を停止する」ボタン専用。購読中止日
   * (解約予定日) だけを受け取り、Phase 1 の予約行 (`insertScheduledKaiyaku`) を1件挿入
   * する。フルの更新 DTO を要さない slim エンドポイント。
   *
   * バリデーション（購読種別で分岐）:
   *   - 共通: 編集不可レコード(併読/電子版クレカ)は 403、二重解約は VALIDATION_ERROR。
   *   - 紙版(1): 現行ロジックと同一 — 解約予定日 >= 購読開始日 / > 本日 /
   *     > 最終変更適用日(同日不可)。
   *   - 電子版(2): 請求開始月(seikyu_kaishi_month)が未設定なら停止不可
   *     （料金徴収未開始）。選択月(中止日の YYYYMM)は 請求開始月以降 かつ 当月以降。
   *     中止日は選択月の月末日（FE が丸めて送る）。
   *
   * 反映は Phase 1 と同じ — 予約行は未来日(saishin=false)なので到来日バッチ(Phase 2)
   * が master へ確定する。監査は SCR-014 画面名で 't_dokusya' 対象の UPDATE として記録。
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

    // [double-cancel] 既に有効な解約予約がある → 二重解約は不可（履歴画面で取消要）。
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
      // 選択月 = 中止日(月末日)の YYYYMM。請求開始月以降 かつ 当月以降であること。
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
      // 紙版: 現行の解約予定日ルール（購読開始日以降・未来日・最終変更適用日より後）。
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
  ): Promise<{ data: DokusyaResponseDto; message: string }> {
    return this.changeApprovalStatus(id, session, req, {
      newStatus: DenshiShoninStatus.APPROVED,
      henkoRiyu: '電子版承認',
      message: '承認しました。',
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
      henkoRiyu: '電子版否認',
      message: '否認しました。',
    });
  }

  // ════════════════════════════════════════════════════════════════════
  // API-011-006 — GET /api/v1/dokusya/:dokusya_id/history
  // ════════════════════════════════════════════════════════════════════
  /**
   * Fetch the 履歴 for a 購読者, ordered by `rireki_no DESC`. Each row
   * carries `tetsuzuki_shurui_label` resolved against `m_code`
   * (intentional exception to the no-label rule — see
   * `dokusya-history-response.dto.ts` header).
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
   * Paginated FULL history list for a 購読者 (api.md §API-013-001).
   *
   * Distinct from `getHistory` (SCR-011 /history — lighter, label-bearing):
   * this endpoint joins 管理支店 / 支店 / 都道府県(×3) / 販売店(×2) name
   * lookups, orders by `rireki_no DESC` (default), paginates, and returns
   * CODE VALUES ONLY (no `*_label` — FE resolves via useCodesStore, see
   * api.md §m_code note).
   *
   * §4.2-4.3 existence + DataScope gate reuses `fetchInScope`
   * (dokusyaRepo.findOne + assertBranchScope) — out-of-scope masks as 404
   * per module convention / security.md Layer 2.
   *
   * §4.7 read-only — NO audit-log write. DB failures bubble to the
   * GlobalExceptionFilter (500).
   */
  async getRirekiList(
    id: number,
    query: DokusyaRirekiQueryDto,
    session: SessionPayload,
  ): Promise<PaginatedResponse<DokusyaRirekiListItem>> {
    // Existence + DataScope gate (404-mask on miss / out-of-scope).
    await this.fetchInScope(id, session);

    const sortColumn =
      RIREKI_SORT_COLUMN_MAP[query.sort_by ?? 'rireki_no'] ?? 'r.rireki_no';
    const sortOrder: 'ASC' | 'DESC' =
      (query.sort_order ?? 'desc').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    const page = Math.max(1, Number(query.page ?? 1));
    const perPage = Math.max(1, Math.min(100, Number(query.per_page ?? 20)));

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
        // can_torikeshi 判定用（紙版のみ取消可・顧客要件2026-07）。出力DTOには含めない。
        'r.dokusya_shubetsu AS dokusya_shubetsu',
        'r.saishin_data_flg AS saishin_data_flg',
        'r.zougen_hokoku_flg AS zougen_hokoku_flg',
        'r.shinki_flg AS shinki_flg',
        'r.kaiyaku_flg AS kaiyaku_flg',
        'r.torikeshi_flg AS torikeshi_flg',
        'r.biko AS biko',
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
    // Use limit/offset (NOT take/skip): take/skip only paginate getMany()
    // entity results — they are IGNORED by getRawMany(), so per_page had no
    // effect and every row was returned. getCount() ignores limit/offset,
    // so total stays correct.
    qb.limit(perPage);
    qb.offset((page - 1) * perPage);

    // 取消可否(can_torikeshi)判定用にチェーン末尾(有効レコード)の rireki_id を
    // 取得する。writer の canTorikeshi/loadEffectiveRow と同一条件:
    // torikeshi_flg=false かつ joho<=遠未来 の行のうち (joho, rireki_no) 最大の行。
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

    // 対象履歴が当該購読者に属するか + 取消可否を事前検証する。approve/reject と
    // 同方針でトランザクション前に弾き、期待される検証失敗(400)を error-log
    // (log_type=3) に残さない。canTorikeshi はエンドポイント境界の再検証も兼ね、
    // applyTorikeshi 内部でもう一度ガードされる。
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
        // [rireki-no-race] 打ち消し行の採番前に master 行をロック（他 UPDATE 経路と直列化）。
        await this.rireki.lockDokusyaRow(manager, dokusyaId);
        await applyTorikeshi(
          manager,
          dokusyaId,
          rirekiId,
          reason,
          String(session.account_id),
        );
        // 取消理由を t_log に記録（afterValue）。取消理由は備考にも記録済み。
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
   * SELECT the row, return it only if it exists AND the session can
   * see it. Out-of-scope masks as 404 (existence-leak guard).
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
   * Resolve `hanbaiten_name`, `tanka_name`, and the m_shiten reverse-
   * lookup via a single QueryBuilder so the unit spec's
   * `dokusyaQb.getRawOne` mock fires. The QB joins are LEFT JOINs so
   * missing parent rows surface as null without throwing.
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
        // CAST(... AS text) は pg-mem 対策。shiten_code(varchar10) と
        // bank_branch_code(varchar3) を直接比較すると pg-mem が varchar(3)
        // 側へ coerce し、3桁超の shiten_code で "value too long" になる。
        // text 比較に統一すれば実 Postgres・pg-mem 双方で正しく一致する。
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

    // 引落口座支店は支払方法に関わらず保存・表示する (顧客要件)。reverse-
    // lookup が bank_branch_code から見つけた shiten_id をそのまま返す。
    // 引落口座が無い行は bank_branch_code='' なので lookup が null を返す。
    const rawBankShitenId = raw?.bank_shiten_id;
    const bankShitenId = rawBankShitenId == null ? null : Number(rawBankShitenId);

    // Raw getRawMany() columns are always scalar — the cast narrows away
    // `unknown` so String() can't hit the [object Object] path.
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
   * [layer4-fk-guard] Validate every FK id arriving in the request body
   * belongs to the caller's JA before it is persisted. Without this a
   * JA-scoped user could POST/PUT a 管理支店 / 支店 / 販売店 / 単価 id from
   * another tenant — the row would store the caller's ja_id while the FK
   * points at a different JA (cross-tenant corruption + id enumeration).
   * See security.md §Layer 4. Out-of-JA → DataScopeViolation (403),
   * missing id → BadRequest (400); both via `fetchFkInJa`.
   *
   * `kanri_shiten_id` is optional on the DTO so it is only checked when
   * present; `shiten_id` / `hanbaiten_id` / `tanka_id` are required.
   */
  private async assertFkScope(
    dto: CreateDokusyaDto,
    effectiveJaId: number,
  ): Promise<void> {
    // kanri_shiten_id / shiten_id は任意。未設定は null だが、レスポンスが 0 に
    // 丸めて返していた経緯があり FE が 0 を送り返すことがある。0(以下) は「未設定」
    // とみなして FK 検証をスキップする（id=0 を実在 ID として探して 400 になるのを防ぐ）。
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
   * Reverse-look up `m_shiten` by `(ja_id, shiten_id)` for the
   * Returns the (bank_branch_code, bank_branch_name) pair the create /
   * update persists back into `t_dokusya`.
   *
   * 口座引落 (shiharai_hoho=1) は bank_shiten_id 必須。それ以外の支払方法は
   * 任意 — 顧客要件で全支払方法に引落口座情報を保存可能にするため、指定が
   * あれば検証して解決し、未指定なら空 ('') で保存する。指定値が不正
   * (他テナント / 非存在 / 金融機関支店でない) の場合は支払方法に関わらず
   * VALIDATION_ERROR(field=bank_shiten_id)。
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
    // [layer4-fk-guard] Scope the reverse-lookup to the caller's JA so a
    // bank shiten from another tenant can't be referenced (cross-tenant FK
    // injection). Out-of-JA / non-existent id → the same VALIDATION_ERROR.
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
    // 顧客要件 2026-07: bank_branch_code は m_shiten.shiten_code を保存する。
    // SCR-020 口座振替の `s.shiten_code = d.bank_branch_code` JOIN と整合させ、
    // 引落口座支店の絞込・集計が正しく一致するようにするため。金融機関支店の
    // shiten_code は半角数字3桁固定（create-shiten DTO で検証済み）かつ作成後
    // 変更不可（kinyu_shiten_flg 同様）なので varchar(3) の bank_branch_code に
    // 収まる。bank_branch_name は全銀ファイルのカナ表記フォールバック用途で
    // jastem_tenpo_name（半角カナ）を維持する。
    return {
      code: row.shitenCode ?? '',
      name: row.jastemTenpoName ?? '',
    };
  }

  /**
   * Throw VALIDATION_ERROR with per-field errors[] when any
   * m_code-bound column doesn't exist in the customer-editable cache.
   * Skips `undefined` fields so the same call covers create + update
   * partial-edit semantics.
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
   * 購読種別 = 電子版 (dokusya_shubetsu=2) on CREATE excludes only
   * クレジットカード (shiharai_hoho=6) — クレカは電子版読者管理システム
   * 連携専用で手動 create フォームからは選べない (screen-design §7.3)。
   * 口座引落/現金集金/振込集金/JA施設等/給与天引き/その他 は選択可。
   * Mirrors the FE option filter in DokusyaFormView. Update is
   * intentionally NOT gated: an existing 電子版 record may legitimately
   * carry クレカ synced from that system.
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
   * 適用日系フィールド (販売店適用日 hanbaiten_tekiyo_date / 情報変更適用日
   * joho_henko_tekiyo_date) は当日以降であること（過去日不可・当日は即日適用
   * として許可）。本日基準は JST 暦日 (todayIsoJst)。toISOString().slice(0,10)
   * は UTC で JST 09:00 前に前日へずれるため使わない。
   *
   * 区切り文字を正規化してから比較する（YYYY/MM/DD 入力も対応。lexicographic
   * では '/' > '-' なので正規化しないと年内の過去日を「未来」と誤読する）。
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
   * 情報変更適用日 (joho_henko_tekiyo_date) 等「未来日のみ許可」フィールド用。
   * 当日・過去日は不可（顧客要件 2026-07 改訂: 情報変更適用日は未来日のみ）。
   * assertTekiyoDateNotPast（当日可）と使い分ける。本日基準は JST 暦日。
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
   * 当日変更モード（joho=本日）のフィールド制限（顧客要件2026-07）。
   *
   * - 電子版(2): 全項目 当日反映可（紙の帳票を生成しないため）→ 制限なし。
   * - 紙版(1): 帳票に影響する項目は当日反映不可 → 予約変更（未来日）で行う。
   *   対象＝部数(dokusya_busu)・販売店(hanbaiten_id)・購読者住所(郵便番号/都道府県/
   *   市区町村/丁目番地/建物名)・配達先住所(同項目)・購読中止日(dokusya_chushi_date)。
   * - 併読(3)・電子版クレカ は上流の read-only(403) で弾かれるため到達しない。
   *
   * 送信値が既存値(before)と異なる場合のみ違反とする（画面は全項目を送るため）。
   */
  private assertTodayModeFieldRestriction(
    dto: UpdateDokusyaDto,
    before: Dokusya,
  ): void {
    // 電子版は全項目 当日反映可。制限は紙版のみ。
    if (Number(before.dokusyaShubetsu) !== DokusyaShubetsu.PAPER) return;

    const RESERVE_ONLY =
      '帳票に影響する変更は予約変更（未来日を指定）で行ってください。';
    const violations: { field: string; message: string }[] = [];
    // 送信あり かつ 既存値と差分あり → 帳票影響の変更とみなす。
    const changed = (v: unknown, b: unknown): boolean =>
      v !== undefined && String(v ?? '') !== String(b ?? '');
    const check = (v: unknown, b: unknown, field: string): void => {
      if (changed(v, b)) violations.push({ field, message: RESERVE_ONLY });
    };

    // 購読中止日（解約予約）は本APIでは扱わない（停止は専用エンドポイントへ分離）。
    check(dto.dokusya_busu, before.dokusyaBusu, 'dokusya_busu');
    check(dto.hanbaiten_id, before.hanbaitenId, 'hanbaiten_id');
    // 購読者住所
    check(dto.yubin_no, before.yubinNo, 'yubin_no');
    check(dto.todofuken_code, before.todofukenCode, 'todofuken_code');
    check(dto.shikuchoson, before.shikuchoson, 'shikuchoson');
    check(dto.chome_banchi, before.chomeBanchi, 'chome_banchi');
    check(dto.tatemono_mei, before.tatemonoMei, 'tatemono_mei');
    // 配達先住所（顧客決定2026-07: 帳票影響に含める）
    check(dto.haitatsu_yubin_no, before.haitatsuYubinNo, 'haitatsu_yubin_no');
    check(
      dto.haitatsu_todofuken_code,
      before.haitatsuTodofukenCode,
      'haitatsu_todofuken_code',
    );
    check(
      dto.haitatsu_shikuchoson,
      before.haitatsuShikuchoson,
      'haitatsu_shikuchoson',
    );
    check(
      dto.haitatsu_chome_banchi,
      before.haitatsuChomeBanchi,
      'haitatsu_chome_banchi',
    );
    check(
      dto.haitatsu_tatemono_mei,
      before.haitatsuTatemonoMei,
      'haitatsu_tatemono_mei',
    );

    if (violations.length > 0) {
      throw new ValidationException(violations);
    }
  }

  /**
   * 電子版(2)・併読(3) は email 必須。紙版(1) は任意。
   * 顧客要件: メールは電子版/併読でのみ必須・一意。
   */
  private assertEmailRequiredForShubetsu(
    email: string | null | undefined,
    dokusyaShubetsu: number | null | undefined,
  ): void {
    if (isDigitalOrBoth(dokusyaShubetsu) && !email?.trim()) {
      throw fieldValidationError('email', EMAIL_REQUIRED_DIGITAL_MSG);
    }
  }

  /**
   * Email duplicate guard. NO-OP when `email` is blank/null (anonymous
   * dokusya are allowed by design) OR when the record itself is 紙版 —
   * 顧客要件: 一意性は電子版(2)・併読(3) のレコード間でのみ担保し、紙版は
   * 重複可。既存行側も dokusya_shubetsu IN (2,3) に絞るので、同じメールを
   * 持つ紙版レコードは衝突扱いしない。The exclusion clause keeps the
   * UPDATE path from flagging its own row.
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
   * Build the snake_case → camelCase INSERT payload for `t_dokusya`.
   *
   * 解約による購読部数=0 への自動セットは行わない（顧客要件 2026-06）。
   * 解約処理（部数0化・解約フラグ・ステータス遷移）は日次バッチが
   * `dokusya_chushi_date`（解約予定日）に基づいて実行する。UPDATE API は
   * 解約予定日を保存するだけで、部数はユーザー入力値をそのまま採用する。
   */
  private buildInsertPayload(
    dto: CreateDokusyaDto,
    jaId: number,
    bankBranch: { code: string; name: string },
    session: SessionPayload,
  ): Partial<Dokusya> {
    const busu = Number(dto.dokusya_busu);
    return {
      jaId,
      kanriShitenId: Number(dto.kanri_shiten_id ?? 0),
      // 支店 は任意（顧客要件 2026-07）。未指定は NULL 保存（0 に丸めない）。
      // 所属支店が設定されたアカウント(session.shiten_id != null)が追加する読者は、
      // その支店へ固定する（改変・FE 退行を無視・顧客要件 2026-07）。
      shitenId:
        session.shiten_id != null
          ? Number(session.shiten_id)
          : dto.shiten_id != null
            ? Number(dto.shiten_id)
            : null,
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
      yubinKubun: dto.yubin_kubun ?? '0',
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
      // [rireki-no-db-default] rireki_no は INSERT payload に含めない —
      // DB column が `INTEGER NOT NULL DEFAULT 1` で, 新規作成時の
      // 不変値 (常に 1) は Postgres 側で自動補完される。entity の
      // `@Column({ default: 1 })` 宣言とも一致。UPDATE/APPROVE/REJECT
      // では service が MAX+1 で明示セットする (nextRirekiNo).
      // また, 単体テスト `txManager.save` mock が rirekiNo を master vs
      // history の discriminator として使うため, master payload に
      // 含めると mock が history 分岐に誤って入ってしまう。
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
    // [denshi-shonin-preserve] 承認状態 (denshi_shonin_status) は編集対象外。
    // create が 承認待ち(0) を立て、approve/reject 専用ワークフローだけが
    // 状態遷移を担う。編集ペイロードに含めると 承認済み(1)/否認(2) の記録を
    // 編集しただけで 承認待ち(0) に戻り、承認・登録/承認しないボタンが再表示
    // されてしまう。UPDATE では既存値を維持する (key を落として touch しない)。
    // 紙版→null の正規化は update() 側で明示的に行う。
    delete (base as Partial<Dokusya> & { denshiShoninStatus?: number | null })
      .denshiShoninStatus;
    return {
      ...base,
      rirekiNo: newRirekiNo,
    };
  }

  /**
   * 変更適用日(asOfJoho)時点で有効な解約予定日 = その日以前で joho が最も近い履歴行
   * （取消除外・`joho <= asOfJoho` の中で `(joho, rireki_no)` 最大 = writer の findBefore と
   * 同基準）の `dokusya_chushi_date`。未来日のみ運用では master(t_dokusya) は最早行
   * (作成時点)を保持し未来予定の解約日が入らないため、joho<=解約予定日 の上限参照には
   * 「変更適用日の直前行」を使う。該当行が無ければ null。
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
   * 履歴の最終変更適用日 = MAX(joho_henko_tekiyo_date)（取消除外）。解約予定日は
   * この日以降のみ許可（顧客要件 2026-07）。履歴なしは null。
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
   * 有効な解約予約が存在するか。存在する間は追加の解約予約を禁止（変更は履歴画面で
   * 当該解約を取消してから・顧客要件 2026-07）。
   *
   * 検出キー = 購読中止日(dokusya_chushi_date) が入っている取消されていない行。
   * Phase 1（2フェーズ化）で予約行は kaiyaku_flg=false（解約確定はバッチが行う）に
   * なったため、kaiyaku_flg では検出できない。中止日は解約予約行にのみ入るため、
   * これが「予約あり」の判定キーになる（Phase 2 バッチが作る実解約行にも中止日は入る）。
   */
  private async hasActiveKaiyaku(dokusyaId: number): Promise<boolean> {
    const row = await this.rirekiRepo.findOne({
      where: { dokusyaId, torikeshiFlg: false, dokusyaChushiDate: Not(IsNull()) },
      order: { johoHenkoTekiyoDate: 'DESC', rirekiNo: 'DESC' },
    });
    return row != null;
  }

  /**
   * 更新の適用日 範囲整合性（顧客要件 2026-07 改訂）。購読開始日 <= joho/hanbaiten <=
   * 解約予定日、および入力解約予定日の範囲。解約予定日(chushi)の上限参照は「変更適用日
   * (joho)時点で有効な解約予定日」= その日以前で joho が最も近い履歴行の解約日。本編集で
   * 解約日を入力/変更した場合はその値を優先。再購読(解約済み→新規)は旧解約予定日を無効化
   * (chushi=null)。違反があれば VALIDATION_ERROR。
   */
  private async assertUpdateDateConsistency(
    id: number,
    dto: UpdateDokusyaDto,
    before: Dokusya,
    isResubscribe: boolean,
  ): Promise<void> {
    // 購読中止日は本APIでは扱わない（停止は専用エンドポイントへ分離・顧客要件
    // 2026-07 改訂）。ただし joho の上限参照として「変更適用日時点で有効な解約予定日」
    // (履歴に既にある予約行) は残す — 解約予約後に、その予定日より後の情報変更を
    // 挿入させない不整合防止（joho <= 解約予定日）。再購読時は旧解約予定日を無効化。
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
   * Shared transaction-bounded update for approve/reject (api.md
   * §4.4 ステップ3). Status flips on the master, a new history row
   * captures the snapshot, audit row commits inside the same tx.
   */
  private async changeApprovalStatus(
    id: number,
    session: SessionPayload,
    req: Request,
    options: { newStatus: number; henkoRiyu: string; message: string },
  ): Promise<{ data: DokusyaResponseDto; message: string }> {
    const before = await this.fetchInScope(id, session);
    // 承認/否認 is a 電子版 (dokusya_shubetsu=2) workflow → requires
    // denshi_flg (account_concept.md §143). Permission gate runs before the
    // status check so a flag-less account gets 403, not 400.
    await this.accountFlags.assertShubetsuFlag(Number(before.dokusyaShubetsu), session);
    if (Number(before.denshiShoninStatus) !== DenshiShoninStatus.PENDING) {
      throw new InvalidDokusyaStatusException();
    }

    const auditCtx = buildAuditCtx(session, req, SCREEN_NAME, TABLE_NAME, id);

    let refreshed: Dokusya;
    try {
      refreshed = await this.dataSource.transaction(async (manager) => {
        // 承認/否認 は即時のワークフロー状態変更。顧客要件 2026-07 の「情報変更適用日は
        // 未来日のみ」は情報変更に対する制約であり、承認状態には適用しない。よって未来日の
        // 履歴行は追加せず、t_dokusya と現行 (saishin_data_flg=true) 履歴行の
        // denshi_shonin_status を直接更新して即時確定する（未来 購読開始日 の独者でも可）。
        await manager.update(
          Dokusya,
          { dokusyaId: id },
          {
            denshiShoninStatus: options.newStatus,
            updatedBy: String(session.account_id),
          },
        );
        await manager.update(
          DokusyaRireki,
          { dokusyaId: id, saishinDataFlg: true },
          { denshiShoninStatus: options.newStatus },
        );

        // 変更後スナップショット = before に新ステータスを重ねたもの（再取得不要）。
        const after = {
          ...before,
          denshiShoninStatus: options.newStatus,
          updatedBy: String(session.account_id),
        } as Dokusya;
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
   * Search 購読者 list with pagination + sort + filters + DataScope.
   *
   * Flow (api.md §API-014-001):
   *   §4.1 DTO validates field shapes + sort_by allow-list. This method
   *        additionally re-validates m_code values (dokusya_shubetsu /
   *        shiharai_hoho / tetsuzuki_shurui / denshi_shonin_status)
   *        against the runtime allow-list — the closed-set DTO `@IsIn`
   *        only covers documented values, not customer-added m_code
   *        extensions.
   *   §4.2 DataScope via applyBranchScope (CHUOKAI/JA_HONTEN → ja_id,
   *        JA_KANRI_SHITEN → kanri_shiten_id, NICHINO_* bypass).
   *   §4.3 Equality + ILIKE + range filters per parameter.
   *   §4.4 + §4.5 single SELECT with COUNT(*) via getCount() so the
   *        spec's `getCount.mockResolvedValue(N)` controls `meta.total`.
   *   §4.6 paginate() wraps the rows into the canonical envelope.
   *
   * Joho-henko-tekiyo-date branch:
   *   - Both empty → live row from t_dokusya (saishin_data_flg semantics
   *     are implicit in the master table); no JOIN to t_dokusya_rireki.
   *   - Either side present → INNER JOIN t_dokusya_rireki and filter
   *     the history's joho_henko_tekiyo_date column.
   */
  search(
    query: SearchDokusyaDto,
    session: SessionPayload,
  ): Promise<PaginatedResponse<DokusyaListItem>> {
    return this.searchService.search(query, session);
  }

  // ─── API-014-002 — DELETE /api/v1/dokusya/:dokusya_id ───────────────
  /**
   * Soft-delete a 購読者 + write an audit row atomically.
   *
   * Flow (api.md §API-014-002):
   *   §4.2 DataScope masks out-of-scope rows as 404 via assertBranchScope.
   *   §4.3 Read-only guard — 電子版+クレカ (shubetsu=2 AND hoho=6)
   *        OR 併読 (shubetsu=3) cannot be deleted.
   *   §4.3 FK conflict guard — assertNoRelatedRows checks t_koza_furikae.
   *   §4.4 + §4.5 single tx wrapping the soft-delete + audit log.
   *   §4.7 error log written OUTSIDE the rolled-back tx so the trace
   *        survives.
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

    // DataScope (404 mask, post-existence-check).
    assertBranchScope(target.jaId, target.kanriShitenId, session, '購読者');
    assertShitenScope(target.shitenId, session, '購読者');

    // Read-only guard (api.md §4.3 / err:DOKUSYA_READ_ONLY).
    if (
      isDokusyaReadOnly(
        Number(target.dokusyaShubetsu),
        Number(target.shiharaiHoho),
      )
    ) {
      throw new DokusyaReadOnlyException();
    }

    // 紙版→paper_flg / 電子版→denshi_flg required to delete (account_concept
    // §139-145). 併読 is already blocked by the read-only guard above.
    await this.accountFlags.assertShubetsuFlag(Number(target.dokusyaShubetsu), session);

    // FK conflict guard — emits 409 CONFLICT on first non-zero child
    // table count. NOTE: assertNoRelatedRows is shared; not used here
    // because the integration test environment runs without
    // t_koza_furikae. Inline the COUNT(*) so the unit spec's
    // dataSource.query mock fires (matches the project's `assertNoRelatedRows`
    // signature without importing the helper just for one table).
    for (const table of RELATED_TABLES) {
      // t_koza_furikae はソフトデリート列 (deleted_at) を持たない出力
      // スナップショット表。`AND deleted_at IS NULL` を付けると本番では
      // 「column "deleted_at" does not exist」で 500 になるため付けない。
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
   * Excel出力（検索条件で絞り込んだ購読者一覧の xlsx 生成）。本体は
   * DokusyaSearchService に分離。controller の呼び出し互換のため薄く委譲する。
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
  // 一括置換（候補検索 + 一括置換 + 候補事前検証）の本体は
  // DokusyaReplaceService に分離。本サービスは facade として薄く委譲するのみ
  // （controller の呼び出し互換を維持）。

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
  // 本サービスは facade として薄く委譲するのみ（controller の呼び出し互換を維持）。

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
