import { Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, IsNull, Repository } from 'typeorm';
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
import { UpdateDokusyaDto } from './dto/update-dokusya.dto';
import { SearchDokusyaDto } from './dto/search-dokusya.dto';
import { SearchReplaceDokusyaDto } from './dto/search-replace-dokusya.dto';
import { ReplaceHanbaitenDto } from './dto/replace-hanbaiten.dto';
import { DokusyaRirekiQueryDto } from './dto/dokusya-rireki-query.dto';
import {
  DokusyaHistoryItemDto,
  DokusyaHistoryResponseDto,
} from './dto/dokusya-history-response.dto';
import { DokusyaResponseDto } from './dto/dokusya-response.dto';
import { DuplicateEmailException } from './exceptions/duplicate-email.exception';
import { InvalidDokusyaStatusException } from './exceptions/invalid-dokusya-status.exception';
import { DokusyaReadOnlyException } from './exceptions/dokusya-read-only.exception';
import { DokusyaAccountFlagService } from './dokusya-account-flag.service';
import { DokusyaImportService } from './dokusya-import.service';
import { DokusyaRirekiService } from './dokusya-rireki-helper.service';
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

/** Per-screen audit-context labels (api.md §4.5 INSERT INTO t_log). */
const SCREEN_NAME = '購読者情報登録画面 (ACSMS-SCR-011)';
const TABLE_NAME = 't_dokusya';

/**
 * SCR-014 — 購読者明細検索画面 audit-context label. Separate from
 * SCR-011 so the t_log.gamen_name accurately reflects which screen
 * triggered the operation (search, delete, Excel export).
 */
const SCREEN_NAME_SCR014 = '購読者明細検索画面 (ACSMS-SCR-014)';

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
    return toDokusyaResponse(entity, joins);
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
      .where('d.denshi_shonin_status = :status', { status: 0 })
      .andWhere('d.deleted_at IS NULL');
    applyBranchScope(
      qb,
      'd',
      { jaIdField: 'jaId', kanriShitenIdField: 'kanriShitenId' },
      session,
    );
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
    // 購読開始日は本日以降（過去日不可）。新規登録のみ対象 — 更新では before に
    // pin され不変（既存の過去開始日を保持）。電子版+口座引落 はラジオで当日/
    // 翌月1日に確定するため自然に通過。
    this.assertTekiyoDateNotPast(
      dto.dokusya_kaishi_date,
      'dokusya_kaishi_date',
      '購読開始日は本日以降の日付を入力してください。',
    );
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
        // 新規登録は読者情報変更適用日を購読開始日に揃える（NEW は変更イベント
        // ではなく登録時の基準日。Excel取込 NEW (SCR-016) と同方針 — 顧客要件）。
        // t_dokusya と t_dokusya_rireki(rireki #1 は master からコピー)の双方に
        // 反映される。
        payload.johoHenkoTekiyoDate = payload.dokusyaKaishiDate;
        // 紙版 (dokusya_shubetsu=1) is not part of the web-application
        // 承認/否認 workflow → denshi_shonin_status は null (非電子版)。
        // 電子版 / 併読 を画面から新規登録するのは職員操作のため、承認待ち(0)
        // ではなく承認済(1)で登録する（Excel一括取込と同方針 — 顧客要件）。
        payload.denshiShoninStatus =
          Number(dto.dokusya_shubetsu) === DokusyaShubetsu.PAPER
            ? null
            : DenshiShoninStatus.APPROVED;
        const inserted = await manager.save(
          Dokusya,
          manager.create(Dokusya, payload),
        );
        const insertedId = Number(inserted.dokusyaId);

        // History row — rireki_no=1, saishin_data_flg=true,
        // shinki_flg = (tetsuzuki_shurui === 1).
        await manager.save(
          DokusyaRireki,
          manager.create(
            DokusyaRireki,
            // create は常に1件（before 無し）。kaiyaku_flg は手続種類=解約で立てる
            // （取込/更新の writeRirekiSplit は立てない — 顧客要件 2026-06）。
            this.rireki.buildRirekiRow(inserted, null, {
              rirekiNo: 1,
              henkoRiyu: '',
              saishinDataFlg: true,
              shinkiFlg: dto.tetsuzuki_shurui === TetsuzukiShurui.SHINKI,
              kaiyakuFlg: dto.tetsuzuki_shurui === TetsuzukiShurui.KAIYAKU,
              // 新規登録は増（新規購読者）なので増減報告対象。
              zougenHokokuFlg: true,
              createdBy: String(session.account_id),
            }),
          ),
        );

        await this.auditLog.logCreate(
          auditCtxFactory(insertedId),
          inserted,
          manager,
        );

        return inserted;
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
    // 販売店適用日 (販売店変更時に入力) は当日以降。
    this.assertTekiyoDateNotPast(
      dto.hanbaiten_tekiyo_date,
      'hanbaiten_tekiyo_date',
      '販売店適用日に過去日は指定できません。',
    );
    // 情報変更適用日 (joho_henko_tekiyo_date) はユーザー入力（顧客要件 2026-06
    // 更新: 既定は当日だが利用者が変更可）。編集時は必須・当日以降（過去日
    // 不可・当日は即日適用）。値は buildUpdatePartial（→ buildInsertPayload）
    // 経由で master / 履歴へ反映される。
    if (!dto.joho_henko_tekiyo_date?.trim()) {
      throw fieldValidationError(
        'joho_henko_tekiyo_date',
        '情報変更適用日を入力してください。',
      );
    }
    this.assertTekiyoDateNotPast(
      dto.joho_henko_tekiyo_date,
      'joho_henko_tekiyo_date',
      '情報変更適用日に過去日は指定できません。',
    );

    const before = await this.fetchInScope(id, session);
    const effectiveJaId = Number(before.jaId);

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
    dto.dokusya_kaishi_date = before.dokusyaKaishiDate;

    // [name-immutable] 購読者氏名 (氏/名) と 購読者かな (氏/名) は作成時に
    // 確定し、編集では変更不可。FE は4項目を disabled にするが、画面は
    // フォーム全体を送信するので body には届く。保存値に pin して、
    // 改変リクエスト (または FE の disable 退行) が氏名を書き換えられない
    // ようにする (FE の disable は UX、ここが境界)。dokusya_shubetsu /
    // dokusya_kaishi_date と同じ扱い。
    dto.shimei_sei = before.shimeiSei;
    dto.shimei_mei = before.shimeiMei;
    dto.shimei_kana_sei = before.shimeiKanaSei;
    dto.shimei_kana_mei = before.shimeiKanaMei;

    // [layer4-fk-guard] Validate body FK ids against the EXISTING row's JA
    // (not session) so editing stays bound to the record's tenant.
    await this.assertFkScope(dto, effectiveJaId);

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
        // unique 制約違反(500)になるのを防ぐ（直列化する）。
        await this.rireki.lockDokusyaRow(manager, id);

        // ステップ1 — invalidate prior saishin flags.
        await manager.update(
          DokusyaRireki,
          { dokusyaId: id, saishinDataFlg: true },
          { saishinDataFlg: false },
        );

        // ステップ2 — figure out the next rireki_no (single QB row).
        const newRirekiNo = await this.rireki.nextRirekiNo(manager, id);

        // UPDATE the master row (column-by-column from dto).
        const updatePartial = this.buildUpdatePartial(
          dto,
          effectiveJaId,
          bankBranch,
          session,
          newRirekiNo,
        );

        // 情報変更適用日 — 顧客要件 2026-06 更新によりユーザー入力値を採用。
        // buildUpdatePartial（→ buildInsertPayload）が dto.joho_henko_tekiyo_date
        // を正規化して既にセット済みなので、ここでは上書きしない（必須・過去日
        // 不可は update() 冒頭で検証済み）。after 経由で履歴にも反映される。

        // [shoki-immutable] 初回購読開始日 は不変。buildUpdatePartial は
        // dto.dokusya_kaishi_date（= before に pin 済み）から shoki も上書き
        // してしまうため、明示的に既存の初回日へ戻す（将来 購読開始日 が
        // 可変になっても初回購読開始日を失わない）。
        updatePartial.shokiDokusyaKaishiDate = before.shokiDokusyaKaishiDate;

        // [denshi-subtype-preserve] 電子版読者種別 は編集対象外。
        // buildInsertPayload が常に null にするため、update では既存値を維持
        // する（電子版読者の denshi_dokusya_shubetsu が編集のたびに消えるのを
        // 防ぐ）。denshi_shonin_status と同じ「編集で触らない」扱い。
        updatePartial.denshiDokusyaShubetsu = before.denshiDokusyaShubetsu;

        // 紙版 (dokusya_shubetsu=1) は Web 承認/否認ワークフロー対象外なので
        // denshi_shonin_status は常に null に揃える (create と同じルール)。
        // 購読種別は edit で不変 (before に pin 済み) なので before を見る。
        // 電子版/併読は buildUpdatePartial が key を落として既存値を維持する
        // ため、ここでは触らない (承認済み→編集で 承認待ち に戻さない)。
        if (Number(before.dokusyaShubetsu) === DokusyaShubetsu.PAPER) {
          updatePartial.denshiShoninStatus = null;
        }
        await manager.update(Dokusya, { dokusyaId: id }, updatePartial);

        // Compose the post-update entity locally (no extra SELECT —
        // unit tests don't mock manager.findOne and the round-trip
        // adds no value beyond the merged-in-memory shape).
        const after: Dokusya = {
          ...before,
          ...updatePartial,
          dokusyaId: id,
        };

        // ── 履歴(t_dokusya_rireki)書き込み（顧客要件 2026-06）─────────────
        // 情報変更と販売店変更が同時のときは適用日順に2件へ分割する。共通ヘルパー
        // writeRirekiSplit に委譲し、UI 更新と Excel取込で履歴の作り方を同期する。
        await this.rireki.writeRirekiSplit(manager, before, after, newRirekiNo, {
          createdBy: String(session.account_id),
          henkoRiyu: '',
          shinkiFlg: false,
          hanbaitenDate: dto.hanbaiten_tekiyo_date ?? null,
          johoDate: after.johoHenkoTekiyoDate ?? null,
        });

        await this.auditLog.logUpdate(auditCtx, before, after, manager);
        return after;
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
        'r.saishin_data_flg AS saishin_data_flg',
        'r.zougen_hokoku_flg AS zougen_hokoku_flg',
        'r.shinki_flg AS shinki_flg',
        'r.kaiyaku_flg AS kaiyaku_flg',
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

    const [rows, total] = await Promise.all([
      qb.getRawMany<Record<string, unknown>>(),
      qb.getCount(),
    ]);

    const data = rows.map((row) => toDokusyaRirekiListItem(row));
    return paginate(data, Number(total), page, perPage);
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
        'bs.ja_id = d.ja_id AND bs.jastem_toriatsukai_tenpo_code = d.bank_branch_code AND bs.kinyu_shiten_flg = TRUE AND bs.deleted_at IS NULL',
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
    return {
      code: row.jastemToriatsukaiTenpoCode ?? '',
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
      shitenId: Number(dto.shiten_id ?? 0),
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
      mailMagazineFlg: Number(dto.mail_magazine_flg ?? 0),
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
        // [rireki-no-race] update() と同様、採番前に master 行をロックして
        // 同時 approve/reject と直列化する。
        await this.rireki.lockDokusyaRow(manager, id);
        // Invalidate prior saishin flags + assign next rireki_no in
        // a single tx for atomicity with the master update.
        await manager.update(
          DokusyaRireki,
          { dokusyaId: id, saishinDataFlg: true },
          { saishinDataFlg: false },
        );
        const newRirekiNo = await this.rireki.nextRirekiNo(manager, id);

        await manager.update(
          Dokusya,
          { dokusyaId: id },
          {
            denshiShoninStatus: options.newStatus,
            rirekiNo: newRirekiNo,
            updatedBy: String(session.account_id),
          },
        );

        // Compose the post-update entity locally — see update() for
        // the rationale.
        const after: Dokusya = {
          ...before,
          denshiShoninStatus: options.newStatus,
          rirekiNo: newRirekiNo,
        };

        await manager.save(
          DokusyaRireki,
          manager.create(
            DokusyaRireki,
            // 承認/否認も create/update/replace と同じ buildRirekiRow で1件生成。
            this.rireki.buildRirekiRow(after, null, {
              rirekiNo: newRirekiNo,
              henkoRiyu: options.henkoRiyu,
              saishinDataFlg: true,
              shinkiFlg: false,
              kaiyakuFlg: false,
              // 承認/否認は電子版読者の確定（増）なので増減報告対象。
              zougenHokokuFlg: true,
              createdBy: String(session.account_id),
            }),
          ),
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
