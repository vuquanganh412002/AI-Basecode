import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, IsNull, Repository } from 'typeorm';
import type { Request } from 'express';
import * as ExcelJS from 'exceljs';

import { Dokusya } from '@/database/entities/dokusya.entity';
import { DokusyaRireki } from '@/database/entities/dokusya-rireki.entity';
import { Shiten } from '@/database/entities/shiten.entity';
import { KanriShiten } from '@/database/entities/kanri-shiten.entity';
import { Hanbaiten } from '@/database/entities/hanbaiten.entity';
import { Tanka } from '@/database/entities/tanka.entity';
import {
  ConflictException,
  DataScopeViolationException,
  NotFoundException,
  ValidationException,
} from '@/common/exceptions/common.exceptions';
import { buildAuditCtx } from '@/common/utils/audit-context';
import {
  applyBranchScope,
  assertBranchScope,
  fetchFkInJa,
} from '@/common/utils/data-scope';
import { assertMCodeValues } from '@/common/utils/m-code-validation';
import { paginate, type PaginatedResponse } from '@/common/utils/paginate';
import {
  DokusyaShubetsu,
  LogType,
  ResultStatus,
  RoleCode,
  ShiharaiHoho,
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
import { ExportNoDataException } from './exceptions/export-no-data.exception';
import { ExportLimitExceededException } from './exceptions/export-limit-exceeded.exception';
import { SameHanbaitenException } from './exceptions/same-hanbaiten.exception';
import { DateRangeInvalidException } from './exceptions/date-range-invalid.exception';
import {
  IneligibleDokusyaException,
  type IneligibleDokusyaDetail,
} from './exceptions/ineligible-dokusya.exception';
import { ImportDokusyaDto, ImportDokusyaRowDto } from './dto/import-dokusya.dto';
import { DokusyaImportValidationException } from './exceptions/import-validation.exception';
import { DokusyaRowLimitExceededException } from './exceptions/row-limit-exceeded.exception';
import {
  DOKUSYA_EXPORT_HEADERS,
  DokusyaJoinFields,
  DokusyaListItem,
  DokusyaRirekiListItem,
  isDokusyaReadOnly,
  toDokusyaExcelRow,
  toDokusyaHistoryItem,
  toDokusyaListItem,
  toDokusyaRirekiListItem,
  toDokusyaResponse,
  toReplaceSearchItem,
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

/** SCR-015 — 購読者販売店一括置換画面 audit-context label. */
const SCREEN_NAME_SCR015 = '購読者販売店一括置換画面 (ACSMS-SCR-015)';

/** SCR-016 — 購読者Excelデータ取込画面 audit-context label. */
const SCREEN_NAME_SCR016 = '購読者Excelデータ取込画面 (ACSMS-SCR-016)';

/**
 * SCR-016 — 49-column import template header order (api.md §テンプレート
 * ファイル仕様). Each entry is the Japanese ヘッダー名 the FE / customer
 * sees in row 1 of the generated workbook.
 */
const IMPORT_TEMPLATE_HEADERS: readonly string[] = [
  'ID',
  '購読種別',
  '手続種類',
  '管理支店',
  '支店',
  '組合員コード',
  '購読者苗字（漢字）',
  '購読者名前（漢字）',
  '購読者苗字（かな）',
  '購読者名前（かな）',
  '購読部数',
  '新聞単価',
  'メールアドレス',
  'メールマガジン',
  '生年（西暦）',
  '性別',
  '郵便番号',
  '都道府県',
  '市町村郡',
  '丁目番地',
  'マンション・アパート名',
  '連絡先１',
  '連絡先２',
  '郵便番号(配達先)',
  '都道府県(配達先)',
  '市町村郡(配達先)',
  '丁目番地(配達先)',
  'ﾏﾝｼｮﾝ・ｱﾊﾟｰﾄ名(配達先)',
  '連絡先１(配達先)',
  '連絡先２(配達先)',
  '配達先苗字（漢字）',
  '配達先名前（漢字）',
  '配達先苗字（かな）',
  '配達先名前（かな）',
  '販売店コード',
  '郵送区分',
  '支払方法',
  '購読料支払サイクル（月数）',
  '引落口座貯金種目',
  '引落口座支店コード',
  '引落口座支店名',
  '引落口座番号',
  '引落口座名義',
  '購読者層分類',
  '農業者分類',
  '購読開始日',
  '購読中止日',
  '備考',
  '読者情報変更適用日',
] as const;

/**
 * One illustrative sample row shipped in the template (row 2), in the
 * exact IMPORT_TEMPLATE_HEADERS order. It demonstrates the expected format
 * per column — 紙版(1) / 新規(1) so no 電子版×クレカ or 併読 block, dokusya_busu
 * > 0, gender 1, hiragana kana, 7-digit yubin, digits-only 連絡先, date as
 * YYYY-MM-DD, 現金集金(2) so no 引落口座 required. FK columns (管理支店 / 支店 /
 * 新聞単価 / 販売店コード) are left BLANK because their valid codes are
 * tenant-specific — the customer fills them with their own master codes.
 * The 備考 cell flags it as a placeholder. Length is asserted to equal the
 * header count in the spec so the two never drift.
 */
const IMPORT_TEMPLATE_SAMPLE_ROW: readonly (string | number)[] = [
  '', // ID (UPDATE_* キー — 新規は空)
  1, // 購読種別 (1:紙版)
  1, // 手続種類 (1:新規)
  '', // 管理支店 (FK — 自組織の値に書き換え)
  '', // 支店 (FK — 自組織の値に書き換え)
  'K0001', // 組合員コード
  '農業', // 購読者苗字（漢字）
  '太郎', // 購読者名前（漢字）
  'のうぎょう', // 購読者苗字（かな）
  'たろう', // 購読者名前（かな）
  1, // 購読部数
  '', // 新聞単価 (FK code — 自組織の値に書き換え)
  '', // メールアドレス
  0, // メールマガジン (0:配信しない)
  1980, // 生年（西暦）
  1, // 性別 (1:男性)
  '1000001', // 郵便番号 (7桁)
  '13', // 都道府県 (コード)
  '千代田区', // 市町村郡
  '千代田1-1', // 丁目番地
  '', // マンション・アパート名
  '0312345678', // 連絡先１ (半角数字)
  '', // 連絡先２
  '', // 郵便番号(配達先)
  '', // 都道府県(配達先)
  '', // 市町村郡(配達先)
  '', // 丁目番地(配達先)
  '', // ﾏﾝｼｮﾝ・ｱﾊﾟｰﾄ名(配達先)
  '', // 連絡先１(配達先)
  '', // 連絡先２(配達先)
  '', // 配達先苗字（漢字）
  '', // 配達先名前（漢字）
  '', // 配達先苗字（かな）
  '', // 配達先名前（かな）
  '', // 販売店コード (FK code — 自組織の値に書き換え)
  '0', // 郵送区分
  2, // 支払方法 (2:現金集金 — 引落口座不要)
  1, // 購読料支払サイクル（月数）
  '', // 引落口座貯金種目
  '', // 引落口座支店コード
  '', // 引落口座支店名
  '', // 引落口座番号
  '', // 引落口座名義
  '', // 購読者層分類
  '', // 農業者分類
  '2026-04-01', // 購読開始日 (YYYY-MM-DD)
  '', // 購読中止日
  'サンプル行です。インポート前に書き換えてください。', // 備考
  '', // 読者情報変更適用日
] as const;

/** SCR-016 import — 取込ファイル名 (api.md §レスポンスヘッダ). */
const IMPORT_TEMPLATE_FILENAME = '購読者Excelデータ取込_テンプレート.xlsx';

/**
 * SCR-016 — the 13 physical columns NEW mode REQUIRES in
 * `selected_columns` (api.md §4.1).
 */
const IMPORT_NEW_REQUIRED_COLUMNS: readonly string[] = [
  'dokusya_shubetsu',
  'tetsuzuki_shurui',
  'kanri_shiten_id',
  'dokusya_busu',
  'tanka_code',
  'yubin_no',
  'todofuken_code',
  'shikuchoson',
  'chome_banchi',
  'renrakusaki_1',
  'hanbaiten_code',
  'shiharai_hoho',
  'dokusya_kaishi_date',
] as const;

/**
 * SCR-016 — Japanese labels for the NEW required columns, used to build a
 * per-row "{label}は必須です。" message when a selected required column
 * carries a BLANK value. The column-selection check above only verifies the
 * column is targeted; this value-presence check prevents a blank required
 * FK / field from slipping through to the INSERT (which would otherwise hit
 * a NOT NULL / FK constraint and surface as a 500 instead of a graceful
 * IMPORT_VALIDATION_ERROR).
 */
const NEW_REQUIRED_LABELS: Readonly<Record<string, string>> = {
  dokusya_shubetsu: '購読種別',
  tetsuzuki_shurui: '手続種類',
  kanri_shiten_id: '管理支店',
  dokusya_busu: '購読部数',
  tanka_code: '新聞単価',
  yubin_no: '郵便番号',
  todofuken_code: '都道府県',
  shikuchoson: '市町村郡',
  chome_banchi: '丁目番地',
  renrakusaki_1: '連絡先１',
  hanbaiten_code: '販売店コード',
  shiharai_hoho: '支払方法',
  dokusya_kaishi_date: '購読開始日',
};

/** SCR-016 — row-error cap returned to the client (api.md §4.1). */
const IMPORT_ERROR_CAP = 10;

/** SCR-016 — max import rows (api.md §4.1). */
const IMPORT_MAX_ROWS = 30000;

/**
 * SCR-016 — `gender` 文言→code map (api.md §4.1). Accepts the numeric
 * code OR the Japanese label so a customer can paste either form.
 */
const GENDER_LABEL_TO_CODE: Record<string, number> = {
  男性: 1,
  女性: 2,
  回答しない: 9,
};

/** SCR-016 — `hikiotoshi_yokin_shubetsu` 文言→code map (api.md §4.1). */
const YOKIN_LABEL_TO_CODE: Record<string, number> = {
  普通: 1,
  当座: 2,
};

/**
 * Normalise a date-only string to the hyphen form before it lands in the
 * varchar(10) date columns. The DTO accepts both YYYY/MM/DD (picker display
 * format) and YYYY-MM-DD; the columns MUST stay hyphen-consistent because
 * the search filters compare them lexicographically (`<=`), and a mixed
 * slash/hyphen column would mis-order ('/'=0x2F > '-'=0x2D). Blank / null
 * pass through unchanged.
 */
function normalizeDbDate<T extends string | null | undefined>(value: T): T {
  return (typeof value === 'string' ? value.replaceAll('/', '-') : value) as T;
}

/**
 * Sort-by allow-list for the SCR-015 replace search. Mirrors the
 * `SearchReplaceDokusyaDto` `@IsIn` allow-list — both sides MUST agree.
 * Maps the FE identifier → fully-qualified column on the joined query.
 */
const REPLACE_SORT_COLUMN_MAP: Record<string, string> = {
  kanri_shiten_name: 'ks.kanri_shiten_name',
  shiten_name: 's.shiten_name',
  kumiaiin_code: 'd.kumiaiin_code',
  hanbaiten_code: 'h.hanbaiten_code',
};

/**
 * Sort-by allow-list for the search endpoint. Maps the FE-supplied
 * snake_case identifier → fully-qualified QB column. Mirror the
 * DTO's `@IsIn` allow-list — both sides MUST agree.
 *
 * `updated_at` is the default; the others mirror screen-design v1.2
 * 検索結果テーブル sortable columns.
 */
const SORT_COLUMN_MAP: Record<string, string> = {
  kanri_shiten_id: 'd.kanri_shiten_id',
  shiten_id: 'd.shiten_id',
  kumiaiin_code: 'd.kumiaiin_code',
  hanbaiten_id: 'd.hanbaiten_id',
  shoki_dokusya_kaishi_date: 'd.shoki_dokusya_kaishi_date',
  dokusya_chushi_date: 'd.dokusya_chushi_date',
  updated_at: 'd.updated_at',
};

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

/** Excel export hard cap (api.md §API-014-003 §4.3 30,000件上限). */
const EXPORT_MAX_ROWS = 30000;

// 購読種別 / 支払方法 are Group A m_code enums — use DokusyaShubetsu /
// ShiharaiHoho from '@/common/enums' inline (mirrored to the FE; the
// enum-sync test guards drift).
/** denshi_shonin_status: 0 承認待ち / 1 承認 / 2 否認. */
const APPROVAL_PENDING = 0;
const APPROVAL_APPROVED = 1;
const APPROVAL_REJECTED = 2;
/** tetsuzuki_shurui = 0 (解約) → dokusya_busu forced to 0 per api.md §4.4. */
const TETSUZUKI_KAIYAKU = 0;
const TETSUZUKI_SHINKI = 1;

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
  private readonly logger = new Logger(DokusyaService.name);

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
    const joins = await this.fetchJoinFieldsViaQB(id, entity);
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
    this.assertDigitalPaymentMethod(dto);
    this.assertFutureTekiyoDate(dto.joho_henko_tekiyo_date);

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

    await this.assertEmailUnique(dto.email, effectiveJaId, null);

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
        // 紙版 (dokusya_shubetsu=1) is not part of the web-application
        // 承認/否認 workflow, so on create its denshi_shonin_status is set
        // to null (非電子版) — the 承認/否認 buttons only show for status=0
        // (screen-design §4.1). 電子版 / 併読 keep the default 承認待ち (0).
        payload.denshiShoninStatus =
          Number(dto.dokusya_shubetsu) === DokusyaShubetsu.PAPER
            ? null
            : APPROVAL_PENDING;
        const inserted = (await manager.save(
          Dokusya,
          manager.create(Dokusya, payload),
        )) as Dokusya;
        const insertedId = Number(inserted.dokusyaId);

        // History row — rireki_no=1, saishin_data_flg=true,
        // shinki_flg = (tetsuzuki_shurui === 1).
        await manager.save(
          DokusyaRireki,
          manager.create(
            DokusyaRireki,
            this.buildHistoryFromEntity(inserted, {
              rirekiNo: 1,
              henkoRiyu: '',
              saishinDataFlg: true,
              shinkiFlg: dto.tetsuzuki_shurui === TETSUZUKI_SHINKI,
              kaiyakuFlg: dto.tetsuzuki_shurui === TETSUZUKI_KAIYAKU,
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
      await this.auditLog.logError(auditCtxFactory(null), 'CREATE', err as Error);
      throw err;
    }

    // Build response from the in-tx saved entity (avoids a post-tx
    // re-read that's brittle under unit-test mocking — see
    // dokusya.service.spec.ts where dokusyaRepo.findOne isn't mocked
    // after the save). For the JOIN-resolved fields we still hit the
    // DB via fetchJoinFieldsViaQB so hanbaiten_name / tanka_name are
    // surfaced even on first SELECT.
    const joins = await this.fetchJoinFieldsViaQB(
      Number(saved.dokusyaId),
      saved,
    );
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
    this.assertFutureTekiyoDate(dto.joho_henko_tekiyo_date);

    const before = await this.fetchInScope(id, session);
    const effectiveJaId = Number(before.jaId);

    // [shubetsu-immutable] 購読種別 (dokusya_shubetsu) is read-only in edit
    // mode — the FE radio group is disabled, but the screen submits the full
    // form so the field still arrives in the body. Pin it to the stored
    // value so a client that smuggles a changed value (or the FE ever
    // regressing the disable) cannot alter the subscription type. Every
    // downstream step (FK guard, payload build, history snapshot) reads the
    // pinned value from here on. Changing 紙版↔電子版↔併読 is a business
    // conversion handled by dedicated flows, not a plain edit.
    dto.dokusya_shubetsu = Number(before.dokusyaShubetsu);

    // [kaishi-date-immutable] 購読開始日 is set once at creation and never
    // changed — the FE disables the picker in edit mode, but the screen
    // submits the full form so dokusya_kaishi_date still arrives. Pin it to
    // the stored value so a client cannot alter it (FE disable is UX, this
    // is the boundary). 購読中止日 stays editable.
    dto.dokusya_kaishi_date = before.dokusyaKaishiDate;

    // [layer4-fk-guard] Validate body FK ids against the EXISTING row's JA
    // (not session) so editing stays bound to the record's tenant.
    await this.assertFkScope(dto, effectiveJaId);

    await this.assertEmailUnique(dto.email, effectiveJaId, id);

    const bankBranch = await this.resolveBankBranch(
      dto.shiharai_hoho,
      dto.bank_shiten_id,
      effectiveJaId,
    );

    const auditCtx = buildAuditCtx(session, req, SCREEN_NAME, TABLE_NAME, id);

    let refreshed: Dokusya;
    try {
      refreshed = await this.dataSource.transaction(async (manager) => {
        // ステップ1 — invalidate prior saishin flags.
        await manager.update(
          DokusyaRireki,
          { dokusyaId: id, saishinDataFlg: true },
          { saishinDataFlg: false },
        );

        // ステップ2 — figure out the next rireki_no (single QB row).
        const newRirekiNo = await this.nextRirekiNo(manager, id);

        // UPDATE the master row (column-by-column from dto).
        const updatePartial = this.buildUpdatePartial(
          dto,
          effectiveJaId,
          bankBranch,
          session,
          newRirekiNo,
        );

        // 紙版 (dokusya_shubetsu=1) は Web 承認/否認ワークフロー対象外なので
        // denshi_shonin_status は常に null に揃える (create と同じルール)。
        // 購読種別は edit で不変 (before に pin 済み) なので before を見る。
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
        } as Dokusya;

        // 変更項目の前回値を zenkai_* に退避する (rireki_no-1 = before):
        // 住所5項目 / 購読部数 / 販売店。after = 実際に保存される値。
        const zenkaiSnapshot = this.buildZenkaiSnapshot(before, dto, after);
        await manager.save(
          DokusyaRireki,
          manager.create(DokusyaRireki, {
            ...this.buildHistoryFromEntity(after, {
              rirekiNo: newRirekiNo,
              henkoRiyu: '',
              saishinDataFlg: true,
              shinkiFlg: false,
              kaiyakuFlg: dto.tetsuzuki_shurui === TETSUZUKI_KAIYAKU,
              createdBy: String(session.account_id),
            }),
            ...zenkaiSnapshot,
          }),
        );

        await this.auditLog.logUpdate(auditCtx, before, after, manager);
        return after;
      });
    } catch (err) {
      await this.auditLog.logError(auditCtx, 'UPDATE', err as Error);
      throw err;
    }

    const joins = await this.fetchJoinFieldsViaQB(id, refreshed);
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
      newStatus: APPROVAL_APPROVED,
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
      newStatus: APPROVAL_REJECTED,
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
    entity: Dokusya,
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

    // Non-bank payment methods don't need the m_shiten lookup — the
    // reverse-lookup returns nulls and we expose them as such.
    const isBank = Number(entity.shiharaiHoho) === ShiharaiHoho.KOZA_HIKIOTOSHI;
    const rawBankShitenId = raw?.bank_shiten_id;
    const bankShitenId =
      isBank && rawBankShitenId != null ? Number(rawBankShitenId) : null;

    return {
      hanbaiten_name:
        raw?.hanbaiten_name == null ? '' : String(raw.hanbaiten_name),
      tanka_name: raw?.tanka_name == null ? '' : String(raw.tanka_name),
      bank_shiten_id: bankShitenId,
      jastem_toriatsukai_tenpo_code:
        raw?.jastem_toriatsukai_tenpo_code == null
          ? ''
          : String(raw.jastem_toriatsukai_tenpo_code),
      jastem_tenpo_name:
        raw?.jastem_tenpo_name == null ? '' : String(raw.jastem_tenpo_name),
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
    if (dto.kanri_shiten_id != null) {
      await fetchFkInJa(
        this.kanriShitenRepo,
        'kanriShitenId',
        dto.kanri_shiten_id,
        effectiveJaId,
        '管理支店',
      );
    }
    if (dto.shiten_id != null) {
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
   * 口座引落 path. Returns the (bank_branch_code, bank_branch_name)
   * pair the create/update will persist back into `t_dokusya`. Throws
   * VALIDATION_ERROR(field=bank_shiten_id) on miss.
   *
   * Non-bank payment methods (shiharai_hoho !== 1) skip the lookup
   * entirely — bank_branch_code / bank_branch_name persist as ''.
   */
  private async resolveBankBranch(
    shiharaiHoho: number,
    bankShitenId: number | null | undefined,
    effectiveJaId: number,
  ): Promise<{ code: string; name: string }> {
    if (shiharaiHoho !== ShiharaiHoho.KOZA_HIKIOTOSHI) return { code: '', name: '' };
    if (bankShitenId === null || bankShitenId === undefined) {
      throw fieldValidationError(
        'bank_shiten_id',
        '銀行支店IDは口座引落の場合は必須です。',
      );
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
   * api.md §4.1 — `joho_henko_tekiyo_date` (情報変更適用日) MUST be in
   * the future when present. Compares the YYYY-MM-DD literal against
   * today's local date (JST per project policy — see `nestjs.md
   * §Timestamp policy`).
   */
  private assertFutureTekiyoDate(value: string | null | undefined): void {
    if (!value) return;
    const today = new Date().toISOString().slice(0, 10);
    // Normalise separators so a YYYY/MM/DD input compares correctly against
    // the hyphenated `today` (lexicographic: '/' > '-' would otherwise read
    // an in-year past date like 2026/01/01 as "future").
    if (normalizeDbDate(value) <= today) {
      throw fieldValidationError(
        'joho_henko_tekiyo_date',
        '情報変更適用日は未来日で指定してください。',
      );
    }
  }

  /**
   * Email duplicate guard. NO-OP when `email` is blank/null (anonymous
   * dokusya are allowed by design). The exclusion clause keeps the
   * UPDATE path from flagging its own row.
   */
  private async assertEmailUnique(
    email: string | null | undefined,
    jaId: number,
    excludeDokusyaId: number | null,
  ): Promise<void> {
    if (!email) return;
    const qb = this.dokusyaRepo
      .createQueryBuilder('d')
      .where('d.ja_id = :ja_id AND d.email = :email AND d.deleted_at IS NULL', {
        ja_id: jaId,
        email,
      });
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
   * Compute the next `rireki_no` inside the open transaction so two
   * concurrent UPDATEs can't end up with the same number. pg-mem +
   * the integration spec build a single QB and read `new_rireki_no`.
   */
  private async nextRirekiNo(
    manager: EntityManager,
    dokusyaId: number,
  ): Promise<number> {
    // Use the `createQueryBuilder(entity, alias)` overload (skips the
    // chained `.from()` call) so the unit-test mock for
    // `txManager.createQueryBuilder` — a single `getRawOne` returning
    // `{ new_rireki_no: 2 }` — receives the call without needing a
    // `.from()` method on the qb shape.
    const row = await manager
      .createQueryBuilder(DokusyaRireki, 'r')
      .select('COALESCE(MAX(rireki_no), 0) + 1', 'new_rireki_no')
      .where('r.dokusya_id = :dokusya_id', { dokusya_id: dokusyaId })
      .getRawOne<{ new_rireki_no: number | string }>();
    return Number(row?.new_rireki_no ?? 1);
  }

  /**
   * Build the snake_case → camelCase INSERT payload for `t_dokusya`.
   * `dokusya_busu` is forced to `0` when the request is a 解約.
   */
  private buildInsertPayload(
    dto: CreateDokusyaDto,
    jaId: number,
    bankBranch: { code: string; name: string },
    session: SessionPayload,
  ): Partial<Dokusya> {
    const busu =
      dto.tetsuzuki_shurui === TETSUZUKI_KAIYAKU ? 0 : Number(dto.dokusya_busu);
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
      denshiShoninStatus: APPROVAL_PENDING,
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
    return {
      ...base,
      rirekiNo: newRirekiNo,
    };
  }

  /**
   * Copy every column from the just-saved master row into a new
   * `t_dokusya_rireki` row, then layer the history-only metadata
   * (rireki_no, flags, henko_riyu) on top. Keeps the history a faithful
   * snapshot without burning a roundtrip on a second SELECT.
   */
  private buildHistoryFromEntity(
    saved: Dokusya,
    metadata: {
      rirekiNo: number;
      henkoRiyu: string;
      saishinDataFlg: boolean;
      shinkiFlg: boolean;
      kaiyakuFlg: boolean;
      createdBy: string;
    },
  ): Partial<DokusyaRireki> {
    return {
      dokusyaId: Number(saved.dokusyaId),
      rirekiNo: metadata.rirekiNo,
      jaId: Number(saved.jaId),
      kanriShitenId: Number(saved.kanriShitenId),
      shitenId: Number(saved.shitenId),
      kumiaiinCode: saved.kumiaiinCode ?? '',
      dokusyaShubetsu: Number(saved.dokusyaShubetsu),
      tetsuzukiShurui: Number(saved.tetsuzukiShurui),
      denshiDokusyaShubetsu: saved.denshiDokusyaShubetsu ?? null,
      shimeiSei: saved.shimeiSei,
      shimeiMei: saved.shimeiMei,
      shimeiKanaSei: saved.shimeiKanaSei,
      shimeiKanaMei: saved.shimeiKanaMei,
      dokusyaBusu: Number(saved.dokusyaBusu),
      yubinNo: saved.yubinNo,
      todofukenCode: saved.todofukenCode,
      shikuchoson: saved.shikuchoson,
      chomeBanchi: saved.chomeBanchi,
      tatemonoMei: saved.tatemonoMei ?? '',
      renrakusaki1: saved.renrakusaki1,
      renrakusaki2: saved.renrakusaki2 ?? '',
      email: saved.email ?? '',
      mailMagazineFlg: Number(saved.mailMagazineFlg ?? 0),
      birthYear: saved.birthYear ?? null,
      gender: saved.gender ?? null,
      haitatsuSameFlg: Boolean(saved.haitatsuSameFlg),
      haitatsuYubinNo: saved.haitatsuYubinNo ?? '',
      haitatsuTodofukenCode: saved.haitatsuTodofukenCode ?? '',
      haitatsuShikuchoson: saved.haitatsuShikuchoson ?? '',
      haitatsuChomeBanchi: saved.haitatsuChomeBanchi ?? '',
      haitatsuTatemonoMei: saved.haitatsuTatemonoMei ?? '',
      haitatsuRenrakusaki1: saved.haitatsuRenrakusaki1 ?? '',
      haitatsuRenrakusaki2: saved.haitatsuRenrakusaki2 ?? '',
      haitatsuShimeiSei: saved.haitatsuShimeiSei ?? '',
      haitatsuShimeiMei: saved.haitatsuShimeiMei ?? '',
      haitatsuShimeiKanaSei: saved.haitatsuShimeiKanaSei ?? '',
      haitatsuShimeiKanaMei: saved.haitatsuShimeiKanaMei ?? '',
      hanbaitenId: Number(saved.hanbaitenId),
      tankaId: Number(saved.tankaId),
      yubinKubun: saved.yubinKubun ?? '0',
      shiharaiHoho: Number(saved.shiharaiHoho),
      dokusyaryoShiharaiCycle: saved.dokusyaryoShiharaiCycle ?? null,
      bankBranchCode: saved.bankBranchCode ?? '',
      bankBranchName: saved.bankBranchName ?? '',
      hikiotoshiYokinShubetsu: saved.hikiotoshiYokinShubetsu ?? null,
      hikiotoshiKozaNo: saved.hikiotoshiKozaNo ?? '',
      hikiotoshiKozaMeigi: saved.hikiotoshiKozaMeigi ?? '',
      dokusyasoBunrui: saved.dokusyasoBunrui ?? '',
      nogyosyaBunrui: saved.nogyosyaBunrui ?? '',
      shokiDokusyaKaishiDate: saved.shokiDokusyaKaishiDate ?? '',
      dokusyaKaishiDate: saved.dokusyaKaishiDate,
      dokusyaChushiDate: saved.dokusyaChushiDate ?? null,
      johoHenkoTekiyoDate: saved.johoHenkoTekiyoDate ?? null,
      seikyuKaishiMonth: saved.seikyuKaishiMonth ?? '',
      biko: saved.biko ?? '',
      henkoRiyu: metadata.henkoRiyu,
      saishinDataFlg: metadata.saishinDataFlg,
      shinkiFlg: metadata.shinkiFlg,
      kaiyakuFlg: metadata.kaiyakuFlg,
      zougenHokokuFlg: true,
      denshiShoninStatus: saved.denshiShoninStatus ?? null,
      createdBy: metadata.createdBy,
    };
  }

  /**
   * 前回値スナップショット (UPDATE 時) — 現バージョン (before =
   * rireki_no - 1) と 新バージョン (dto / after) を比較し、変わった項目の
   * 前回値を新しい rireki 行の zenkai_* に退避する。各グループは独立:
   *
   *   1. 住所5項目 — `haitatsu_same_flg` で 購読者住所 / 配達先住所 を切替。
   *      1項目でも変われば5項目すべての前回値を退避。
   *        true  → 購読者住所 (yubin_no / todofuken_code / shikuchoson /
   *                chome_banchi / tatemono_mei)
   *        false → 配達先住所 (haitatsu_yubin_no / … / haitatsu_tatemono_mei)
   *   2. 購読部数 (dokusya_busu) — 変われば zenkai_dokusya_busu に前回値。
   *   3. 販売店 (hanbaiten_id) — 変われば zenkai_hanbaiten_id に前回値。
   *
   * 変更が無ければ該当 zenkai_* は未設定 (null) のまま。新値自体は
   * buildHistoryFromEntity / buildUpdatePartial 経由でそのまま保存される。
   * 購読部数・販売店は 解約強制0 等の補正後の実保存値で比較するため
   * dto ではなく after を見る。
   */
  private buildZenkaiSnapshot(
    before: Dokusya,
    dto: UpdateDokusyaDto,
    after: Dokusya,
  ): Partial<DokusyaRireki> {
    const str = (v: unknown): string => (v == null ? '' : String(v));
    const sameFlg = Boolean(dto.haitatsu_same_flg);

    // ── 住所5項目 ── [zenkai 列, 前回値(old), 新値(new)] — same_flg で切替。
    const pairs: Array<[keyof DokusyaRireki, string, string]> = sameFlg
      ? [
          ['zenkaiYubinNo', str(before.yubinNo), str(dto.yubin_no)],
          ['zenkaiTodofukenCode', str(before.todofukenCode), str(dto.todofuken_code)],
          ['zenkaiShikuchoson', str(before.shikuchoson), str(dto.shikuchoson)],
          ['zenkaiChomeBanchi', str(before.chomeBanchi), str(dto.chome_banchi)],
          ['zenkaiTatemonoMei', str(before.tatemonoMei), str(dto.tatemono_mei)],
        ]
      : [
          ['zenkaiYubinNo', str(before.haitatsuYubinNo), str(dto.haitatsu_yubin_no)],
          ['zenkaiTodofukenCode', str(before.haitatsuTodofukenCode), str(dto.haitatsu_todofuken_code)],
          ['zenkaiShikuchoson', str(before.haitatsuShikuchoson), str(dto.haitatsu_shikuchoson)],
          ['zenkaiChomeBanchi', str(before.haitatsuChomeBanchi), str(dto.haitatsu_chome_banchi)],
          ['zenkaiTatemonoMei', str(before.haitatsuTatemonoMei), str(dto.haitatsu_tatemono_mei)],
        ];

    const snapshot: Partial<DokusyaRireki> = {};

    if (pairs.some(([, oldVal, newVal]) => oldVal !== newVal)) {
      for (const [key, oldVal] of pairs) {
        (snapshot as Record<string, unknown>)[key as string] = oldVal;
      }
    }

    // ── 購読部数 ──
    if (Number(after.dokusyaBusu) !== Number(before.dokusyaBusu)) {
      snapshot.zenkaiDokusyaBusu = Number(before.dokusyaBusu);
    }

    // ── 販売店 ──
    if (Number(after.hanbaitenId) !== Number(before.hanbaitenId)) {
      snapshot.zenkaiHanbaitenId = Number(before.hanbaitenId);
    }

    return snapshot;
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
    if (Number(before.denshiShoninStatus) !== APPROVAL_PENDING) {
      throw new InvalidDokusyaStatusException();
    }

    const auditCtx = buildAuditCtx(session, req, SCREEN_NAME, TABLE_NAME, id);

    let refreshed: Dokusya;
    try {
      refreshed = await this.dataSource.transaction(async (manager) => {
        // Invalidate prior saishin flags + assign next rireki_no in
        // a single tx for atomicity with the master update.
        await manager.update(
          DokusyaRireki,
          { dokusyaId: id, saishinDataFlg: true },
          { saishinDataFlg: false },
        );
        const newRirekiNo = await this.nextRirekiNo(manager, id);

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
        } as Dokusya;

        await manager.save(
          DokusyaRireki,
          manager.create(
            DokusyaRireki,
            this.buildHistoryFromEntity(after, {
              rirekiNo: newRirekiNo,
              henkoRiyu: options.henkoRiyu,
              saishinDataFlg: true,
              shinkiFlg: false,
              kaiyakuFlg: false,
              createdBy: String(session.account_id),
            }),
          ),
        );

        await this.auditLog.logUpdate(auditCtx, before, after, manager);
        return after;
      });
    } catch (err) {
      await this.auditLog.logError(auditCtx, 'UPDATE', err as Error);
      throw err;
    }

    const joins = await this.fetchJoinFieldsViaQB(id, refreshed);
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
  async search(
    query: SearchDokusyaDto,
    session: SessionPayload,
  ): Promise<PaginatedResponse<DokusyaListItem>> {
    this.assertSearchMCodeValues(query);
    const sortColumn = this.resolveSortColumn(query.sort_by);
    const sortOrder: 'ASC' | 'DESC' =
      (query.sort_order ?? 'desc').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    const page = Math.max(1, Number(query.page ?? 1));
    const perPage = Math.max(1, Math.min(100, Number(query.per_page ?? 20)));

    const qb = this.dokusyaRepo.createQueryBuilder('d');
    this.buildSearchQuery(qb, query, session);

    // ORDER BY + LIMIT + OFFSET only on the data query path.
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

    const data = rows.map((row) => toDokusyaListItem(row));
    return paginate(data, Number(total), page, perPage);
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

    // FK conflict guard — emits 409 CONFLICT on first non-zero child
    // table count. NOTE: assertNoRelatedRows is shared; not used here
    // because the integration test environment runs without
    // t_koza_furikae. Inline the COUNT(*) so the unit spec's
    // dataSource.query mock fires (matches the project's `assertNoRelatedRows`
    // signature without importing the helper just for one table).
    for (const table of RELATED_TABLES) {
      const rows = await this.dataSource.query(
        `SELECT COUNT(*) AS count FROM ${table} WHERE dokusya_id = $1 AND deleted_at IS NULL`,
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
      await this.auditLog.logError(auditCtx, 'DELETE', err as Error);
      throw err;
    }

    return { message: '削除しました。' };
  }

  // ─── API-014-003 — GET /api/v1/dokusya/export ───────────────────────
  /**
   * Export the filtered 購読者 list as an Excel workbook (xlsx).
   *
   * Flow (api.md §API-014-003):
   *   §4.3 COUNT(*) under the same filter / DataScope.
   *        - 0      → 404 EXPORT_NO_DATA
   *        - >30000 → 409 EXPORT_LIMIT_EXCEEDED
   *   §4.4 Fetch rows (no pagination — hard-capped at 30,000).
   *   §4.5 12-column header per screen-design v1.2 検索結果テーブル
   *        #24-#35. 購読種別 / 支払方法 / かな氏名 excluded.
   *   §4.6 Audit row (log_type=1, operation='EXPORT_EXCEL', after_value
   *        with record_count).
   *   §4.7 Filename `dokusya_export_YYYYMMDD_HHmmss.xlsx` (JST).
   *   §4.8 Error log outside any tx — same pattern as remove().
   */
  async exportExcel(
    query: SearchDokusyaDto,
    session: SessionPayload,
    req: Request,
  ): Promise<{ buffer: Buffer; filename: string; headers: readonly string[] }> {
    const auditCtx = buildAuditCtx(
      session,
      req,
      SCREEN_NAME_SCR014,
      TABLE_NAME,
      null,
    );

    try {
      this.assertSearchMCodeValues(query);

      // [count-guard] — single QB used twice (getCount + getRawMany).
      // The unit spec's dokusyaQb is a SINGLE shared mock so both
      // calls land on the same chain.
      const qb = this.dokusyaRepo.createQueryBuilder('d');
      this.buildSearchQuery(qb, query, session);

      const total = Number(await qb.getCount());
      if (total === 0) {
        throw new ExportNoDataException();
      }
      if (total > EXPORT_MAX_ROWS) {
        throw new ExportLimitExceededException();
      }

      // No pagination — explicit LIMIT cap as defence-in-depth.
      // limit (NOT take): take is ignored by getRawMany(), so the cap was
      // never applied; limit() emits the real SQL LIMIT.
      qb.orderBy('d.dokusya_id', 'ASC');
      qb.limit(EXPORT_MAX_ROWS);
      const rows = await qb.getRawMany<Record<string, unknown>>();
      const items = rows.map((row) => toDokusyaListItem(row));

      const filename = `dokusya_export_${this.timestampForFilename(new Date())}.xlsx`;
      const buffer = await this.buildExcelBuffer(items);

      await this.auditLog.logOperation({
        logType: LogType.USER_OPERATION,
        accountId: session.account_id,
        jaId: session.ja_id,
        gamenName: SCREEN_NAME_SCR014,
        operation: 'EXPORT_EXCEL',
        resultStatus: ResultStatus.SUCCESS,
        targetId: null,
        targetTable: TABLE_NAME,
        afterValue: JSON.stringify({
          kanri_shiten_id: query.kanri_shiten_id ?? null,
          shiten_id: query.shiten_id ?? null,
          hanbaiten_id: query.hanbaiten_id ?? null,
          dokusya_shubetsu: query.dokusya_shubetsu ?? null,
          shiharai_hoho: query.shiharai_hoho ?? null,
          tetsuzuki_shurui: query.tetsuzuki_shurui ?? null,
          denshi_shonin_status: query.denshi_shonin_status ?? null,
          record_count: total,
        }),
        ipAddress: auditCtx.ipAddress,
        userAgent: auditCtx.userAgent,
      });

      return { buffer, filename, headers: DOKUSYA_EXPORT_HEADERS };
    } catch (err) {
      if (
        err instanceof ExportNoDataException ||
        err instanceof ExportLimitExceededException
      ) {
        throw err;
      }
      await this.auditLog.logError(auditCtx, 'EXPORT_EXCEL', err as Error);
      throw err;
    }
  }

  // ─── private helpers (SCR-014) ───────────────────────────────────────

  /** Re-validate every m_code-bound search field against CodeService. */
  private assertSearchMCodeValues(query: SearchDokusyaDto): void {
    assertMCodeValues(this.codeService, [
      {
        field: 'dokusya_shubetsu',
        value: query.dokusya_shubetsu,
        category: 'DOKUSYA_SHUBETSU',
        label: '購読種別',
      },
      {
        field: 'shiharai_hoho',
        value: query.shiharai_hoho,
        category: 'SHIHARAI_HOHO',
        label: '支払方法',
      },
      {
        field: 'tetsuzuki_shurui',
        value: query.tetsuzuki_shurui,
        category: 'TETSUZUKI_SHURUI',
        label: '手続種類',
      },
    ]);
  }

  /**
   * Look up the QB column for a FE-supplied sort_by. Throws
   * VALIDATION_ERROR when the field is not in the allow-list — the
   * DTO already rejects unknown values, but this guard remains the
   * authoritative check so a future DTO change (or a programmatic
   * caller bypassing the pipe) cannot inject arbitrary SQL.
   */
  private resolveSortColumn(sortBy?: string): string {
    const key = sortBy ?? 'updated_at';
    const column = SORT_COLUMN_MAP[key];
    if (!column) {
      throw fieldValidationError('sort_by', 'ソートカラムの値が不正です。');
    }
    return column;
  }

  /**
   * Common SELECT-list + JOIN + WHERE shared by search() (which
   * adds ORDER BY + paging) and exportExcel() (no paging).
   *
   * SELECT shape matches api.md §4.5 — full_name / full_name_kana via
   * shimei concat, haitatsu via address concat, is_read_only via
   * boolean expression. The mapper relies on these aliases verbatim.
   */
  private buildSearchQuery(
    qb: ReturnType<Repository<Dokusya>['createQueryBuilder']>,
    query: SearchDokusyaDto,
    session: SessionPayload,
  ): void {
    qb
      .leftJoin(
        'm_kanri_shiten',
        'ks',
        'ks.kanri_shiten_id = d.kanri_shiten_id AND ks.deleted_at IS NULL',
      )
      .leftJoin(
        'm_shiten',
        's',
        's.shiten_id = d.shiten_id AND s.deleted_at IS NULL',
      )
      .leftJoin(
        'm_hanbaiten',
        'h',
        'h.hanbaiten_id = d.hanbaiten_id AND h.deleted_at IS NULL',
      )
      .leftJoin(
        'm_todofuken',
        't',
        't.todofuken_code = d.haitatsu_todofuken_code',
      )
      .select([
        'd.dokusya_id AS dokusya_id',
        'd.ja_id AS ja_id',
        'd.kanri_shiten_id AS kanri_shiten_id',
        'ks.kanri_shiten_name AS kanri_shiten_name',
        'd.shiten_id AS shiten_id',
        's.shiten_name AS shiten_name',
        'd.kumiaiin_code AS kumiaiin_code',
        "(d.shimei_sei || ' ' || d.shimei_mei) AS full_name",
        "(d.shimei_kana_sei || ' ' || d.shimei_kana_mei) AS full_name_kana",
        'd.renrakusaki_1 AS renrakusaki_1',
        'd.renrakusaki_2 AS renrakusaki_2',
        'd.haitatsu_yubin_no AS haitatsu_yubin_no',
        "(COALESCE(t.todofuken_name, '') || d.haitatsu_shikuchoson || d.haitatsu_chome_banchi || d.haitatsu_tatemono_mei) AS haitatsu",
        'd.hanbaiten_id AS hanbaiten_id',
        'h.hanbaiten_name AS hanbaiten_name',
        'd.dokusya_shubetsu AS dokusya_shubetsu',
        'd.shiharai_hoho AS shiharai_hoho',
        'd.denshi_shonin_status AS denshi_shonin_status',
        'd.shoki_dokusya_kaishi_date AS shoki_dokusya_kaishi_date',
        'd.dokusya_chushi_date AS dokusya_chushi_date',
        '((d.dokusya_shubetsu = 2 AND d.shiharai_hoho = 6) OR d.dokusya_shubetsu = 3) AS is_read_only',
      ])
      .where('d.deleted_at IS NULL');

    // Branch DataScope — NICHINO_* bypass; CHUOKAI/JA_HONTEN narrow by
    // ja_id; JA_KANRI_SHITEN narrows by kanri_shiten_id.
    this.applyDokusyaScope(qb, session);

    // Equality filters.
    if (query.kanri_shiten_id !== undefined) {
      qb.andWhere('d.kanri_shiten_id = :kanri_shiten_id', {
        kanri_shiten_id: query.kanri_shiten_id,
      });
    }
    if (query.shiten_id !== undefined) {
      qb.andWhere('d.shiten_id = :shiten_id', { shiten_id: query.shiten_id });
    }
    if (query.hanbaiten_id !== undefined) {
      qb.andWhere('d.hanbaiten_id = :hanbaiten_id', {
        hanbaiten_id: query.hanbaiten_id,
      });
    }
    if (query.dokusya_shubetsu !== undefined) {
      qb.andWhere('d.dokusya_shubetsu = :dokusya_shubetsu', {
        dokusya_shubetsu: query.dokusya_shubetsu,
      });
    }
    if (query.shiharai_hoho !== undefined) {
      qb.andWhere('d.shiharai_hoho = :shiharai_hoho', {
        shiharai_hoho: query.shiharai_hoho,
      });
    }
    if (query.tetsuzuki_shurui !== undefined) {
      qb.andWhere('d.tetsuzuki_shurui = :tetsuzuki_shurui', {
        tetsuzuki_shurui: query.tetsuzuki_shurui,
      });
    }
    if (query.denshi_shonin_status !== undefined) {
      qb.andWhere('d.denshi_shonin_status = :denshi_shonin_status', {
        denshi_shonin_status: query.denshi_shonin_status,
      });
    }

    // Partial-match filters.
    if (query.kumiaiin_code) {
      qb.andWhere(
        "d.kumiaiin_code ILIKE '%' || :kumiaiin_code || '%'",
        { kumiaiin_code: query.kumiaiin_code },
      );
    }
    if (query.jastem_toriatsukai_tenpo_code) {
      qb.andWhere(
        "d.bank_branch_code ILIKE '%' || :jastem_toriatsukai_tenpo_code || '%'",
        {
          jastem_toriatsukai_tenpo_code: query.jastem_toriatsukai_tenpo_code,
        },
      );
    }
    if (query.jastem_tenpo_name) {
      qb.andWhere(
        "d.bank_branch_name ILIKE '%' || :jastem_tenpo_name || '%'",
        { jastem_tenpo_name: query.jastem_tenpo_name },
      );
    }
    if (query.full_name) {
      qb.andWhere(
        "(d.shimei_sei || ' ' || d.shimei_mei) ILIKE '%' || :full_name || '%'",
        { full_name: query.full_name },
      );
    }
    if (query.full_name_kana) {
      qb.andWhere(
        "(d.shimei_kana_sei || ' ' || d.shimei_kana_mei) ILIKE '%' || :full_name_kana || '%'",
        { full_name_kana: query.full_name_kana },
      );
    }
    if (query.renrakusaki_1) {
      qb.andWhere(
        "d.renrakusaki_1 ILIKE '%' || :renrakusaki_1 || '%'",
        { renrakusaki_1: query.renrakusaki_1 },
      );
    }
    if (query.haitatsu) {
      qb.andWhere(
        "(COALESCE(t.todofuken_name, '') || d.haitatsu_shikuchoson || d.haitatsu_chome_banchi || d.haitatsu_tatemono_mei) ILIKE '%' || :haitatsu || '%'",
        { haitatsu: query.haitatsu },
      );
    }
    if (query.email) {
      qb.andWhere("d.email ILIKE '%' || :email || '%'", { email: query.email });
    }
    if (query.seikyu_kaishi_month) {
      qb.andWhere(
        "d.seikyu_kaishi_month ILIKE '%' || :seikyu_kaishi_month || '%'",
        { seikyu_kaishi_month: query.seikyu_kaishi_month },
      );
    }

    // Range filters — shoki_dokusya_kaishi_date.
    if (query.shoki_dokusya_kaishi_date_from) {
      qb.andWhere(
        'd.shoki_dokusya_kaishi_date >= :shoki_dokusya_kaishi_date_from',
        {
          shoki_dokusya_kaishi_date_from:
            this.toIsoDate(query.shoki_dokusya_kaishi_date_from),
        },
      );
    }
    if (query.shoki_dokusya_kaishi_date_to) {
      qb.andWhere(
        'd.shoki_dokusya_kaishi_date <= :shoki_dokusya_kaishi_date_to',
        {
          shoki_dokusya_kaishi_date_to:
            this.toIsoDate(query.shoki_dokusya_kaishi_date_to),
        },
      );
    }
    if (query.dokusya_chushi_date_from) {
      qb.andWhere('d.dokusya_chushi_date >= :dokusya_chushi_date_from', {
        dokusya_chushi_date_from: this.toIsoDate(query.dokusya_chushi_date_from),
      });
    }
    if (query.dokusya_chushi_date_to) {
      qb.andWhere('d.dokusya_chushi_date <= :dokusya_chushi_date_to', {
        dokusya_chushi_date_to: this.toIsoDate(query.dokusya_chushi_date_to),
      });
    }

    // 適用日 (joho_henko_tekiyo_date) branch.
    //
    //   - Both empty → use the live master row. The master table already
    //     reflects the current (saishin) state, so no extra predicate
    //     is needed. The unit spec accepts EITHER a saishin_data_flg
    //     predicate OR the absence of a t_dokusya_rireki JOIN — we
    //     pick the latter for performance.
    //
    //   - Either side present → INNER JOIN t_dokusya_rireki and filter
    //     the history rows.
    if (
      query.joho_henko_tekiyo_date_from ||
      query.joho_henko_tekiyo_date_to
    ) {
      qb.innerJoin(
        't_dokusya_rireki',
        'rireki',
        'rireki.dokusya_id = d.dokusya_id',
      );
      if (query.joho_henko_tekiyo_date_from) {
        qb.andWhere(
          'rireki.joho_henko_tekiyo_date >= :joho_henko_tekiyo_date_from',
          {
            joho_henko_tekiyo_date_from: this.toIsoDate(
              query.joho_henko_tekiyo_date_from,
            ),
          },
        );
      }
      if (query.joho_henko_tekiyo_date_to) {
        qb.andWhere(
          'rireki.joho_henko_tekiyo_date <= :joho_henko_tekiyo_date_to',
          {
            joho_henko_tekiyo_date_to: this.toIsoDate(
              query.joho_henko_tekiyo_date_to,
            ),
          },
        );
      }
    }
  }

  /**
   * Branch-aware DataScope for t_dokusya — mirrors `applyBranchScope`
   * but binds with `scopeJaId` / `scopeKsId` params the unit spec
   * inspects. NICHINO_* bypass.
   */
  private applyDokusyaScope(
    qb: ReturnType<Repository<Dokusya>['createQueryBuilder']>,
    session: SessionPayload,
  ): void {
    if (
      session.role_code === RoleCode.NICHINO_ADMIN ||
      session.role_code === RoleCode.NICHINO_STAFF
    ) {
      return;
    }
    if (session.role_code === RoleCode.JA_KANRI_SHITEN) {
      qb.andWhere('d.kanri_shiten_id = :scopeKsId', {
        scopeKsId: session.kanri_shiten_id,
      });
      return;
    }
    qb.andWhere('d.ja_id = :scopeJaId', { scopeJaId: session.ja_id });
  }

  /** Convert `'YYYY/MM/DD'` (DTO format) → `'YYYY-MM-DD'` (postgres date literal). */
  private toIsoDate(value: string): string {
    return value.replace(/\//g, '-');
  }

  /**
   * JST-pinned `YYYYMMDD_HHmmss` for the Excel filename. Mirrors
   * `LogService.timestampForFilename` (single-source patterns documented
   * in `nestjs.md §Timestamp policy`).
   */
  private timestampForFilename(now: Date): string {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Tokyo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).formatToParts(now);
    const get = (t: string): string =>
      parts.find((p) => p.type === t)?.value ?? '';
    return `${get('year')}${get('month')}${get('day')}_${get('hour')}${get('minute')}${get('second')}`;
  }

  // ════════════════════════════════════════════════════════════════════════
  // SCR-015 — 購読者販売店一括置換画面
  // ════════════════════════════════════════════════════════════════════════

  // ─── API-015-001 — GET /api/v1/dokusya/replace-hanbaiten/search ─────────
  /**
   * Search candidate 購読者 for the bulk-replace screen.
   *
   * Flow (api.md §API-015-001):
   *   §4.1 date_from > date_to → DATE_RANGE_INVALID.
   *   §4.2 DataScope: CHUOKAI/JA_HONTEN narrow by ja_id, JA_KANRI_SHITEN
   *        narrows by kanri_shiten_id, NICHINO_* bypass.
   *   §4.3 固定条件 — d.tetsuzuki_shurui = 1 AND d.deleted_at IS NULL.
   *   §4.4/§4.5 joined SELECT (m_kanri_shiten, m_shiten, m_hanbaiten,
   *        m_todofuken) with COUNT(*) via getCount().
   *   §4.6 row mapping (shimei + haitatsu_address concat) + paginate().
   */
  async searchForReplace(
    query: SearchReplaceDokusyaDto,
    session: SessionPayload,
  ): Promise<PaginatedResponse<ReplaceSearchItem>> {
    if (
      query.dokusya_kaishi_date_from &&
      query.dokusya_kaishi_date_to &&
      query.dokusya_kaishi_date_from > query.dokusya_kaishi_date_to
    ) {
      throw new DateRangeInvalidException();
    }

    const page = Math.max(1, Number(query.page ?? 1));
    const perPage = Math.max(1, Math.min(100, Number(query.per_page ?? 20)));
    const sortColumn =
      REPLACE_SORT_COLUMN_MAP[query.sort_by ?? 'kumiaiin_code'] ??
      'd.kumiaiin_code';
    const sortOrder: 'ASC' | 'DESC' =
      (query.sort_order ?? 'asc').toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

    const qb = this.dokusyaRepo.createQueryBuilder('d');
    qb.leftJoin('m_kanri_shiten', 'ks', 'ks.kanri_shiten_id = d.kanri_shiten_id');
    qb.leftJoin('m_shiten', 's', 's.shiten_id = d.shiten_id');
    qb.leftJoin('m_hanbaiten', 'h', 'h.hanbaiten_id = d.hanbaiten_id');
    qb.leftJoin('m_todofuken', 't', 't.todofuken_code = d.haitatsu_todofuken_code');

    // §4.3 固定条件 — 購読中 only, exclude soft-deleted.
    qb.where('d.tetsuzuki_shurui = 1');
    qb.andWhere('d.deleted_at IS NULL');

    // §4.2 DataScope.
    this.applyDokusyaScope(qb, session);

    // §4.3 search filters.
    if (query.kanri_shiten_id !== undefined) {
      qb.andWhere('d.kanri_shiten_id = :rkKanriShitenId', {
        rkKanriShitenId: query.kanri_shiten_id,
      });
    }
    if (query.shiten_id !== undefined) {
      qb.andWhere('d.shiten_id = :rkShitenId', { rkShitenId: query.shiten_id });
    }
    if (query.hanbaiten_id !== undefined) {
      qb.andWhere('d.hanbaiten_id = :rkHanbaitenId', {
        rkHanbaitenId: query.hanbaiten_id,
      });
    }
    if (query.kumiaiin_code) {
      qb.andWhere('d.kumiaiin_code ILIKE :rkKumiaiin', {
        rkKumiaiin: `%${query.kumiaiin_code}%`,
      });
    }
    if (query.shimei) {
      qb.andWhere(
        "CONCAT(d.shimei_sei, ' ', d.shimei_mei) ILIKE :rkShimei",
        { rkShimei: `%${query.shimei}%` },
      );
    }
    if (query.shimei_kana) {
      qb.andWhere(
        "CONCAT(d.shimei_kana_sei, ' ', d.shimei_kana_mei) ILIKE :rkShimeiKana",
        { rkShimeiKana: `%${query.shimei_kana}%` },
      );
    }
    if (query.haitatsu_address) {
      qb.andWhere(
        "CONCAT(t.todofuken_name, d.haitatsu_shikuchoson, d.haitatsu_chome_banchi, d.haitatsu_tatemono_mei) ILIKE :rkHaitatsu",
        { rkHaitatsu: `%${query.haitatsu_address}%` },
      );
    }
    if (query.dokusya_kaishi_date_from) {
      qb.andWhere('d.dokusya_kaishi_date >= :rkKaishiFrom', {
        rkKaishiFrom: query.dokusya_kaishi_date_from,
      });
    }
    if (query.dokusya_kaishi_date_to) {
      qb.andWhere('d.dokusya_kaishi_date <= :rkKaishiTo', {
        rkKaishiTo: query.dokusya_kaishi_date_to,
      });
    }

    qb.select([
      'd.dokusya_id AS dokusya_id',
      'd.kanri_shiten_id AS kanri_shiten_id',
      'ks.kanri_shiten_name AS kanri_shiten_name',
      'd.shiten_id AS shiten_id',
      's.shiten_name AS shiten_name',
      'd.kumiaiin_code AS kumiaiin_code',
      'd.shimei_sei AS shimei_sei',
      'd.shimei_mei AS shimei_mei',
      'd.haitatsu_yubin_no AS haitatsu_yubin_no',
      't.todofuken_name AS todofuken_name',
      'd.haitatsu_shikuchoson AS haitatsu_shikuchoson',
      'd.haitatsu_chome_banchi AS haitatsu_chome_banchi',
      'd.haitatsu_tatemono_mei AS haitatsu_tatemono_mei',
      'd.hanbaiten_id AS hanbaiten_id',
      'h.hanbaiten_code AS hanbaiten_code',
      'h.hanbaiten_name AS hanbaiten_name',
      'd.dokusya_shubetsu AS dokusya_shubetsu',
      'd.shiharai_hoho AS shiharai_hoho',
    ]);

    qb.orderBy(sortColumn, sortOrder);
    qb.limit(perPage);
    qb.offset((page - 1) * perPage);

    const [rows, total] = await Promise.all([
      qb.getRawMany<Record<string, unknown>>(),
      qb.getCount(),
    ]);

    const data = rows.map((row) => toReplaceSearchItem(row));
    return paginate(data, Number(total), page, perPage);
  }

  // ─── API-015-002 — POST /api/v1/dokusya/replace-hanbaiten ───────────────
  /**
   * Bulk-replace the 配達販売店 of many 購読者 in one transaction.
   *
   * Flow (api.md §API-015-002):
   *   §4.1 tekiyo_date >= 当日 (JST) else reject.
   *   §4.3 candidate fetch (raw SELECT) → NOT_FOUND for missing ids,
   *        DATA_SCOPE_VIOLATION for out-of-scope rows, SAME_HANBAITEN
   *        when already on the target, INELIGIBLE_DOKUSYA (errors[]) for
   *        併読 / 電子版クレカ rows.
   *   §4.4 new_hanbaiten validation → NOT_FOUND / DATA_SCOPE_VIOLATION.
   *   §4.5/§4.6 single tx: bulk UPDATE t_dokusya, toggle rireki
   *        saishin_data_flg + INSERT new rireki, audit row (logUpdate).
   *   §4.8 error log written OUTSIDE the rolled-back tx (logError).
   */
  async replaceHanbaiten(
    dto: ReplaceHanbaitenDto,
    session: SessionPayload,
    req: Request,
  ): Promise<{
    data: {
      total_count: number;
      replaced_count: number;
      rireki_count: number;
      new_hanbaiten_id: number;
      applied_at: string;
    };
    message: string;
  }> {
    // §4.1 — tekiyo_date must be today or later (JST).
    if (dto.hanbaiten_tekiyo_date < this.todayIsoTokyo()) {
      throw new DateRangeInvalidException(
        '販売店適用日は当日以降の日付を入力してください。',
      );
    }

    const ids = dto.dokusya_ids;

    // §4.3 — fetch candidate rows.
    const candidates: Array<Record<string, unknown>> =
      await this.dataSource.query(
        `SELECT dokusya_id, ja_id, kanri_shiten_id, hanbaiten_id,
                dokusya_shubetsu, shiharai_hoho, rireki_no
           FROM t_dokusya
          WHERE dokusya_id = ANY($1) AND deleted_at IS NULL`,
        [ids],
      );

    // NOT_FOUND when any requested id is missing.
    const foundIds = new Set(candidates.map((c) => Number(c.dokusya_id)));
    for (const id of ids) {
      if (!foundIds.has(Number(id))) {
        throw new NotFoundException('購読者');
      }
    }

    // §4.3 DataScope — every candidate must be in scope. Unlike the
    // single-record URL lookup (which masks out-of-scope as 404), the
    // bulk-replace candidates are addressed by an explicit id array the
    // caller already supplied, so an out-of-scope hit surfaces as an
    // explicit DATA_SCOPE_VIOLATION (403) per api.md §4.3.
    for (const c of candidates) {
      this.assertReplaceCandidateScope(
        Number(c.ja_id),
        c.kanri_shiten_id == null ? null : Number(c.kanri_shiten_id),
        session,
      );
    }

    // §4.3 業務ルール — SAME_HANBAITEN.
    if (
      candidates.some(
        (c) => Number(c.hanbaiten_id) === Number(dto.new_hanbaiten_id),
      )
    ) {
      throw new SameHanbaitenException();
    }

    // §4.3 業務ルール — INELIGIBLE (併読 / 電子版クレカ).
    const ineligible: IneligibleDokusyaDetail[] = [];
    for (const c of candidates) {
      const shubetsu = Number(c.dokusya_shubetsu);
      const hoho = Number(c.shiharai_hoho);
      if (shubetsu === 3) {
        ineligible.push({
          dokusya_id: Number(c.dokusya_id),
          reason: '併読者のため置換できません。',
        });
      } else if (shubetsu === 2 && hoho === 6) {
        ineligible.push({
          dokusya_id: Number(c.dokusya_id),
          reason: '電子版クレカ決済者のため置換できません。',
        });
      }
    }
    if (ineligible.length > 0) {
      throw new IneligibleDokusyaException(ineligible);
    }

    // §4.4 — validate the replace target hanbaiten exists + is in scope.
    const targetRows: Array<Record<string, unknown>> =
      await this.dataSource.query(
        `SELECT hanbaiten_id, ja_id FROM m_hanbaiten
          WHERE hanbaiten_id = $1 AND deleted_at IS NULL`,
        [dto.new_hanbaiten_id],
      );
    if (!targetRows[0]) {
      throw new NotFoundException('販売店');
    }
    if (
      session.role_code !== RoleCode.NICHINO_ADMIN &&
      session.role_code !== RoleCode.NICHINO_STAFF &&
      Number(targetRows[0].ja_id) !== Number(session.ja_id)
    ) {
      throw new DataScopeViolationException();
    }

    const auditCtx = buildAuditCtx(
      session,
      req,
      SCREEN_NAME_SCR015,
      TABLE_NAME,
      null,
    );
    const appliedAt = new Date().toISOString();

    try {
      const summary = await this.dataSource.transaction(async (manager) => {
        // §4.5 — bulk UPDATE the master rows + bump rireki_no.
        const updated: Array<Record<string, unknown>> = await manager.query(
          `UPDATE t_dokusya
              SET hanbaiten_id = $1,
                  joho_henko_tekiyo_date = $2,
                  rireki_no = rireki_no + 1,
                  updated_by = $3
            WHERE dokusya_id = ANY($4) AND deleted_at IS NULL
          RETURNING dokusya_id, hanbaiten_id, rireki_no`,
          [
            dto.new_hanbaiten_id,
            dto.hanbaiten_tekiyo_date,
            String(session.account_id),
            ids,
          ],
        );

        // §4.5 — clear the previous 最新データ flag, then append the new
        // history row for each replaced 購読者.
        await manager.query(
          `UPDATE t_dokusya_rireki
              SET saishin_data_flg = false
            WHERE dokusya_id = ANY($1) AND saishin_data_flg = true`,
          [ids],
        );
        // 履歴行は更新後の master 行の全業務カラムを忠実にスナップショット
        // する。部分列だけ INSERT すると NOT NULL カラム (dokusya_shubetsu /
        // shimei_sei / yubin_no / tanka_id / shiharai_hoho / 開始日 等) が
        // 落ちて not-null 違反 → 500 になるため全列をコピーする。
        // zenkai_hanbaiten_id は「置換前の販売店」。candidates は UPDATE 前
        // に取得済みなので dokusya_id ↔ 旧 hanbaiten_id を 2 配列で unnest
        // 結合し、1 行ずつ前回値を埋める。
        const zenkaiDokusyaIds = candidates.map((c) => Number(c.dokusya_id));
        const zenkaiOldHanbaitenIds = candidates.map((c) =>
          Number(c.hanbaiten_id),
        );
        await manager.query(
          `INSERT INTO t_dokusya_rireki (
             dokusya_id, rireki_no, ja_id, kanri_shiten_id, shiten_id,
             kumiaiin_code, dokusya_shubetsu, tetsuzuki_shurui,
             denshi_dokusya_shubetsu, shimei_sei, shimei_mei, shimei_kana_sei,
             shimei_kana_mei, dokusya_busu, yubin_no, todofuken_code,
             shikuchoson, chome_banchi, tatemono_mei, renrakusaki_1,
             renrakusaki_2, email, mail_magazine_flg, birth_year, gender,
             haitatsu_same_flg, haitatsu_yubin_no, haitatsu_todofuken_code,
             haitatsu_shikuchoson, haitatsu_chome_banchi, haitatsu_tatemono_mei,
             haitatsu_renrakusaki_1, haitatsu_renrakusaki_2, haitatsu_shimei_sei,
             haitatsu_shimei_mei, haitatsu_shimei_kana_sei,
             haitatsu_shimei_kana_mei, hanbaiten_id, tanka_id, yubin_kubun,
             shiharai_hoho, dokusyaryo_shiharai_cycle, bank_branch_code,
             bank_branch_name, hikiotoshi_yokin_shubetsu, hikiotoshi_koza_no,
             hikiotoshi_koza_meigi, dokusyaso_bunrui, nogyosya_bunrui,
             shoki_dokusya_kaishi_date, dokusya_kaishi_date, dokusya_chushi_date,
             joho_henko_tekiyo_date, seikyu_kaishi_month, biko, henko_riyu,
             saishin_data_flg, zougen_hokoku_flg, shinki_flg, kaiyaku_flg,
             zenkai_hanbaiten_id, denshi_shonin_status, hanbaiten_tekiyo_date,
             created_by)
           SELECT
             d.dokusya_id, d.rireki_no, d.ja_id, d.kanri_shiten_id, d.shiten_id,
             d.kumiaiin_code, d.dokusya_shubetsu, d.tetsuzuki_shurui,
             d.denshi_dokusya_shubetsu, d.shimei_sei, d.shimei_mei,
             d.shimei_kana_sei, d.shimei_kana_mei, d.dokusya_busu, d.yubin_no,
             d.todofuken_code, d.shikuchoson, d.chome_banchi, d.tatemono_mei,
             d.renrakusaki_1, d.renrakusaki_2, d.email, d.mail_magazine_flg,
             d.birth_year, d.gender, d.haitatsu_same_flg, d.haitatsu_yubin_no,
             d.haitatsu_todofuken_code, d.haitatsu_shikuchoson,
             d.haitatsu_chome_banchi, d.haitatsu_tatemono_mei,
             d.haitatsu_renrakusaki_1, d.haitatsu_renrakusaki_2,
             d.haitatsu_shimei_sei, d.haitatsu_shimei_mei,
             d.haitatsu_shimei_kana_sei, d.haitatsu_shimei_kana_mei,
             d.hanbaiten_id, d.tanka_id, d.yubin_kubun, d.shiharai_hoho,
             d.dokusyaryo_shiharai_cycle, d.bank_branch_code, d.bank_branch_name,
             d.hikiotoshi_yokin_shubetsu, d.hikiotoshi_koza_no,
             d.hikiotoshi_koza_meigi, d.dokusyaso_bunrui, d.nogyosya_bunrui,
             d.shoki_dokusya_kaishi_date, d.dokusya_kaishi_date,
             d.dokusya_chushi_date, d.joho_henko_tekiyo_date,
             d.seikyu_kaishi_month, d.biko, '販売店一括置換',
             true, true, false, false,
             z.zenkai_hanbaiten_id, d.denshi_shonin_status, $3, $4
             FROM t_dokusya d
             JOIN unnest($1::bigint[], $2::bigint[])
               AS z(dokusya_id, zenkai_hanbaiten_id)
               ON z.dokusya_id = d.dokusya_id
            WHERE d.deleted_at IS NULL`,
          [
            zenkaiDokusyaIds,
            zenkaiOldHanbaitenIds,
            dto.hanbaiten_tekiyo_date,
            String(session.account_id),
          ],
        );

        await this.auditLog.logUpdate(
          auditCtx,
          { dokusya_ids: ids },
          { dokusya_ids: ids, new_hanbaiten_id: dto.new_hanbaiten_id },
          manager,
        );

        const replacedCount = updated.length || candidates.length;
        return {
          total_count: ids.length,
          replaced_count: replacedCount,
          rireki_count: replacedCount,
          new_hanbaiten_id: dto.new_hanbaiten_id,
          applied_at: appliedAt,
        };
      });

      return { data: summary, message: '置換処理が完了しました。' };
    } catch (err) {
      await this.auditLog.logError(auditCtx, 'UPDATE', err as Error);
      throw err;
    }
  }

  /**
   * SCR-015 candidate DataScope. NICHINO_* bypass; JA_KANRI_SHITEN is
   * pinned to its own kanri_shiten_id; CHUOKAI / JA_HONTEN to their JA.
   * Throws DATA_SCOPE_VIOLATION (403) on an out-of-scope candidate.
   */
  private assertReplaceCandidateScope(
    recordJaId: number,
    recordKanriShitenId: number | null,
    session: SessionPayload,
  ): void {
    if (
      session.role_code === RoleCode.NICHINO_ADMIN ||
      session.role_code === RoleCode.NICHINO_STAFF
    ) {
      return;
    }
    if (session.role_code === RoleCode.JA_KANRI_SHITEN) {
      if (Number(recordKanriShitenId) !== Number(session.kanri_shiten_id)) {
        throw new DataScopeViolationException();
      }
      return;
    }
    if (Number(recordJaId) !== Number(session.ja_id)) {
      throw new DataScopeViolationException();
    }
  }

  /** Today as `YYYY-MM-DD` in Asia/Tokyo (JST). */
  private todayIsoTokyo(): string {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Tokyo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
  }

  /**
   * Build the Excel workbook buffer. One worksheet named '購読者一覧',
   * 12-column header row (bold), then data rows mapped via
   * `toDokusyaExcelRow`. Returns a Node Buffer (ExcelJS returns an
   * ArrayBuffer on Node).
   */
  private async buildExcelBuffer(rows: DokusyaListItem[]): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'agrinews';
    const sheet = workbook.addWorksheet('購読者一覧');
    sheet.addRow([...DOKUSYA_EXPORT_HEADERS]);
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true };
    // Reasonable defaults — 配達先住所 is the widest column at ~200
    // chars, but Excel auto-fit is unreliable; leave at 18 chars so
    // the user can widen interactively.
    sheet.columns = DOKUSYA_EXPORT_HEADERS.map(() => ({ width: 18 }));
    for (const row of rows) {
      sheet.addRow(toDokusyaExcelRow(row));
    }
    const buf = await workbook.xlsx.writeBuffer();
    return Buffer.isBuffer(buf) ? buf : Buffer.from(buf as ArrayBuffer);
  }

  // ════════════════════════════════════════════════════════════════════════
  // SCR-016 — 購読者Excelデータ取込画面
  // ════════════════════════════════════════════════════════════════════════

  // ─── API-016-001 — GET /api/v1/dokusya/import/template ──────────────────
  /**
   * Build the 49-column import template workbook (api.md §4.3). One
   * worksheet '購読者', a bold 49-column header row in the documented
   * order, plus one illustrative sample data row (row 2). Read-only
   * discovery action — NO audit log.
   *
   * Returns `{ buffer, filename }` so the controller can stream the
   * binary with a Content-Disposition filename (mirror exportExcel).
   */
  async downloadImportTemplate(
    _session: SessionPayload,
  ): Promise<{ buffer: Buffer; filename: string }> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'agrinews';
    const sheet = workbook.addWorksheet('購読者');
    sheet.addRow([...IMPORT_TEMPLATE_HEADERS]);
    // Row 2 — one illustrative sample row (customer edits before real use;
    // FK code columns are blank since their valid values are tenant-specific).
    sheet.addRow([...IMPORT_TEMPLATE_SAMPLE_ROW]);
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true };
    sheet.columns = IMPORT_TEMPLATE_HEADERS.map(() => ({ width: 18 }));
    const buf = await workbook.xlsx.writeBuffer();
    const buffer = Buffer.isBuffer(buf) ? buf : Buffer.from(buf as ArrayBuffer);
    return { buffer, filename: IMPORT_TEMPLATE_FILENAME };
  }

  // ─── API-016-002 — POST /api/v1/dokusya/import ──────────────────────────
  /**
   * Bulk-import 購読者 rows in one transaction (api.md §4.4).
   *
   * Modes: NEW (INSERT each row), UPDATE_ALL (full update — null/'' the
   * unselected columns), UPDATE_PARTIAL (only `selected_columns`), and
   * 一括中止 (per-row tetsuzuki_shurui=0 + kumiaiin_code → 解約).
   *
   * Validation order (all PRE-transaction):
   *   §4.1 top-level — import_mode / NEW required columns / row-limit.
   *   §4.1 per-row — dokusya_shubetsu 1|2, 電子版×クレカ, dokusya_busu,
   *        gender / yokin 文言→code.
   *   §4.3 pre-checks via dataSource.query — tanka_code, hanbaiten_code,
   *        kanri_shiten / shiten existence, existing dokusya for UPDATE_*
   *        / 一括中止 (errors capped at 10 → IMPORT_VALIDATION_ERROR).
   *   §4.2/§4.3 DataScope — out-of-scope existing record → 403.
   *
   * After pre-checks: one `dataSource.transaction(...)` wraps every
   * INSERT/UPDATE + the rireki rows + a single audit row (bare 'CREATE'
   * operation). Error log fires OUTSIDE the rolled-back tx.
   */
  async importExcel(
    dto: ImportDokusyaDto,
    session: SessionPayload,
    req: Request,
  ): Promise<{
    data: {
      import_mode: string;
      total_rows: number;
      created_count: number;
      updated_count: number;
      cancelled_count: number;
      skipped_count: number;
      rireki_count: number;
      imported_at: string;
    };
    message: string;
  }> {
    // §4.1 — row-limit (defence-in-depth; DTO @ArrayMaxSize also guards).
    if (dto.rows.length > IMPORT_MAX_ROWS) {
      throw new DokusyaRowLimitExceededException();
    }

    // §4.1 — NEW mode must carry the 13 required columns.
    if (dto.import_mode === 'NEW') {
      const missing = IMPORT_NEW_REQUIRED_COLUMNS.filter(
        (c) => !dto.selected_columns.includes(c),
      );
      if (missing.length > 0) {
        // Expose `.code` as a top-level own property — service unit tests
        // assert `err.code` directly, not `err.response.code`.
        const exc = fieldValidationError(
          'selected_columns',
          `新規登録モードでは必須列（${missing.join(', ')}）を含めてください。`,
        );
        Object.defineProperty(exc, 'code', {
          value: 'VALIDATION_ERROR',
          enumerable: true,
        });
        throw exc;
      }
    }

    const jaId = Number(session.ja_id ?? 0);
    const errors: Array<{ row: number; field: string; message: string }> = [];

    // §4.3 — resolve FK lookups in one batch each (scoped by ja_id).
    const tankaCodes = this.uniqueStrings(dto.rows.map((r) => r.tanka_code));
    const hanbaitenCodes = this.uniqueStrings(
      dto.rows.map((r) => r.hanbaiten_code),
    );
    const kanriShitenIds = this.uniqueNumbers(
      dto.rows.map((r) => r.kanri_shiten_id),
    );
    const shitenIds = this.uniqueNumbers(dto.rows.map((r) => r.shiten_id));
    const dokusyaIds = this.uniqueNumbers(dto.rows.map((r) => r.dokusya_id));
    const kumiaiinCodes = this.uniqueStrings(
      dto.rows.map((r) => r.kumiaiin_code),
    );

    const tankaRows: Array<Record<string, unknown>> =
      tankaCodes.length === 0
        ? []
        : await this.dataSource.query(
            `SELECT tanka_id, tanka_code FROM m_tanka
              WHERE ja_id = $1 AND tanka_code = ANY($2::text[])
                AND tanka_type = 1 AND deleted_at IS NULL`,
            [jaId, tankaCodes],
          );
    const tankaCodeSet = new Set(tankaRows.map((r) => String(r.tanka_code)));
    // code → id maps so the NEW INSERT can persist the resolved FK ids
    // (t_dokusya stores tanka_id / hanbaiten_id, not the codes).
    const tankaIdByCode = new Map(
      tankaRows.map((r) => [String(r.tanka_code), Number(r.tanka_id)]),
    );

    const hanbaitenRows: Array<Record<string, unknown>> =
      hanbaitenCodes.length === 0
        ? []
        : await this.dataSource.query(
            `SELECT hanbaiten_id, hanbaiten_code FROM m_hanbaiten
              WHERE ja_id = $1 AND hanbaiten_code = ANY($2::text[])
                AND deleted_at IS NULL`,
            [jaId, hanbaitenCodes],
          );
    const hanbaitenCodeSet = new Set(
      hanbaitenRows.map((r) => String(r.hanbaiten_code)),
    );
    const hanbaitenIdByCode = new Map(
      hanbaitenRows.map((r) => [
        String(r.hanbaiten_code),
        Number(r.hanbaiten_id),
      ]),
    );

    const kanriShitenRows: Array<Record<string, unknown>> =
      kanriShitenIds.length === 0
        ? []
        : await this.dataSource.query(
            `SELECT kanri_shiten_id FROM m_kanri_shiten
              WHERE ja_id = $1 AND kanri_shiten_id = ANY($2::bigint[])
                AND deleted_at IS NULL`,
            [jaId, kanriShitenIds],
          );
    const kanriShitenIdSet = new Set(
      kanriShitenRows.map((r) => Number(r.kanri_shiten_id)),
    );

    const shitenRows: Array<Record<string, unknown>> =
      shitenIds.length === 0
        ? []
        : await this.dataSource.query(
            `SELECT shiten_id, kanri_shiten_id FROM m_shiten
              WHERE ja_id = $1 AND shiten_id = ANY($2::bigint[])
                AND deleted_at IS NULL`,
            [jaId, shitenIds],
          );
    const shitenIdSet = new Set(shitenRows.map((r) => Number(r.shiten_id)));

    // §4.3.4 — existing dokusya (UPDATE_* / 一括中止). Keyed by
    // dokusya_id OR kumiaiin_code, scoped by ja_id.
    const existingRows: Array<Record<string, unknown>> =
      dokusyaIds.length === 0 && kumiaiinCodes.length === 0
        ? []
        : await this.dataSource.query(
            `SELECT dokusya_id, kumiaiin_code, ja_id, kanri_shiten_id
               FROM t_dokusya
              WHERE ja_id = $1
                AND (dokusya_id = ANY($2::bigint[])
                     OR kumiaiin_code = ANY($3::text[]))
                AND deleted_at IS NULL`,
            [jaId, dokusyaIds, kumiaiinCodes],
          );
    const existingById = new Map<number, Record<string, unknown>>();
    const existingByKumiaiin = new Map<string, Record<string, unknown>>();
    for (const row of existingRows) {
      existingById.set(Number(row.dokusya_id), row);
      if (row.kumiaiin_code != null) {
        existingByKumiaiin.set(String(row.kumiaiin_code), row);
      }
    }

    // Per-row validation + pre-check accumulation. DataScope violations
    // throw immediately (403); content errors accumulate (capped at 10).
    let createdCount = 0;
    let updatedCount = 0;
    let cancelledCount = 0;

    dto.rows.forEach((row, index) => {
      const rowNo = index + 1;
      const isCancel = Number(row.tetsuzuki_shurui) === TETSUZUKI_KAIYAKU;

      // §4.1 — NEW mode: every required column must carry a NON-BLANK value.
      // The column-selection guard above only checks the column is targeted;
      // a blank required FK / field would otherwise slip past the per-row
      // FK checks (which skip absent codes) and crash the INSERT (NOT NULL /
      // FK) as a 500. Surface it as a graceful IMPORT_VALIDATION_ERROR.
      if (dto.import_mode === 'NEW') {
        const rec = row as unknown as Record<string, unknown>;
        for (const field of IMPORT_NEW_REQUIRED_COLUMNS) {
          const v = rec[field];
          if (v === undefined || v === null || v === '') {
            this.pushImportError(errors, {
              row: rowNo,
              field,
              message: `新規登録の場合、${NEW_REQUIRED_LABELS[field] ?? field}は必須です。`,
            });
          }
        }
        // §4.3 — 組合員コード is unique per JA. Reject a NEW row whose
        // kumiaiin_code already exists (mirrors hanbaiten's NEW dup-code
        // check) so a re-import gives a graceful error instead of silently
        // creating a duplicate subscriber + crashing the rireki INSERT.
        if (
          row.kumiaiin_code &&
          existingByKumiaiin.has(String(row.kumiaiin_code))
        ) {
          this.pushImportError(errors, {
            row: rowNo,
            field: 'kumiaiin_code',
            message: '組合員コードは既に登録されています。',
          });
        }
      }

      // §4.1 — dokusya_shubetsu 3:併読 is not importable.
      if (
        row.dokusya_shubetsu !== undefined &&
        Number(row.dokusya_shubetsu) === DokusyaShubetsu.BOTH
      ) {
        this.pushImportError(errors, {
          row: rowNo,
          field: 'dokusya_shubetsu',
          message: '購読種別が3:併読のためExcel取込みできません。',
        });
      }

      // §4.1 業務ルール — 電子版（2）×クレカ（6）取込不可.
      if (
        Number(row.dokusya_shubetsu) === DokusyaShubetsu.DIGITAL &&
        Number(row.shiharai_hoho) === ShiharaiHoho.CREDIT_CARD
      ) {
        this.pushImportError(errors, {
          row: rowNo,
          field: 'shiharai_hoho',
          message: '電子版かつクレジットカード決済の組み合わせは取込みできません。',
        });
      }

      // §4.1 — dokusya_busu: NEW / 新規 > 0, 解約 = 0.
      if (row.dokusya_busu !== undefined) {
        const busu = Number(row.dokusya_busu);
        if (isCancel) {
          if (busu !== 0) {
            this.pushImportError(errors, {
              row: rowNo,
              field: 'dokusya_busu',
              message: '解約の場合、購読部数は0を指定してください。',
            });
          }
        } else if (
          (dto.import_mode === 'NEW' ||
            Number(row.tetsuzuki_shurui) === TETSUZUKI_SHINKI) &&
          busu <= 0
        ) {
          this.pushImportError(errors, {
            row: rowNo,
            field: 'dokusya_busu',
            message: '新規登録の場合、購読部数は0より大きい値を指定してください。',
          });
        }
      }

      // §4.3.1 — tanka_code resolution.
      if (row.tanka_code && !tankaCodeSet.has(String(row.tanka_code))) {
        this.pushImportError(errors, {
          row: rowNo,
          field: 'tanka_code',
          message: '指定された新聞単価コードが見つかりません。',
        });
      }

      // §4.3.2 — hanbaiten_code resolution.
      if (
        row.hanbaiten_code &&
        !hanbaitenCodeSet.has(String(row.hanbaiten_code))
      ) {
        this.pushImportError(errors, {
          row: rowNo,
          field: 'hanbaiten_code',
          message: '指定された販売店コードが見つかりません。',
        });
      }

      // §4.3.3 — kanri_shiten / shiten existence.
      if (
        row.kanri_shiten_id !== undefined &&
        !kanriShitenIdSet.has(Number(row.kanri_shiten_id))
      ) {
        this.pushImportError(errors, {
          row: rowNo,
          field: 'kanri_shiten_id',
          message: '指定された管理支店が見つかりません。',
        });
      }
      if (
        row.shiten_id !== undefined &&
        !shitenIdSet.has(Number(row.shiten_id))
      ) {
        this.pushImportError(errors, {
          row: rowNo,
          field: 'shiten_id',
          message: '指定された支店が見つかりません。',
        });
      }

      // §4.3.4 — existing-record resolution for UPDATE_* / 一括中止.
      const needsExisting =
        dto.import_mode === 'UPDATE_ALL' ||
        dto.import_mode === 'UPDATE_PARTIAL';
      if (needsExisting) {
        const existing = this.resolveExistingRow(
          row,
          isCancel,
          existingById,
          existingByKumiaiin,
        );
        if (!existing) {
          const field = isCancel ? 'kumiaiin_code' : 'dokusya_id';
          this.pushImportError(errors, {
            row: rowNo,
            field,
            message: '指定された購読者が見つかりません。',
          });
        } else {
          // §4.3.4 — JA_KANRI_SHITEN out-of-scope existing record → 403.
          this.assertImportRowScope(existing, session);
          if (isCancel) cancelledCount += 1;
          else updatedCount += 1;
        }
      } else {
        createdCount += 1;
      }
    });

    if (errors.length > 0) {
      throw new DokusyaImportValidationException(errors.slice(0, IMPORT_ERROR_CAP));
    }

    const auditCtx = buildAuditCtx(
      session,
      req,
      SCREEN_NAME_SCR016,
      TABLE_NAME,
      null,
    );
    const importedAt = new Date().toISOString();

    try {
      await this.dataSource.transaction(async (manager) => {
        for (let i = 0; i < dto.rows.length; i += 1) {
          await this.applyImportRow(
            manager,
            dto,
            dto.rows[i],
            session,
            { tankaIdByCode, hanbaitenIdByCode },
          );
        }

        // §4.5 — one summary audit row. operation is the BARE verb
        // 'CREATE' (per nestjs.md — never mode-tagged), log_type=1,
        // result_status=1, joined to the import transaction.
        await this.auditLog.logOperation(
          {
            logType: LogType.USER_OPERATION,
            accountId: auditCtx.accountId,
            jaId: auditCtx.jaId,
            gamenName: auditCtx.screen,
            operation: 'CREATE',
            resultStatus: ResultStatus.SUCCESS,
            targetId: null,
            targetTable: auditCtx.table,
            afterValue: JSON.stringify({
              import_mode: dto.import_mode,
              total_rows: dto.rows.length,
              created_count: createdCount,
              updated_count: updatedCount,
              cancelled_count: cancelledCount,
              imported_at: importedAt,
            }),
            ipAddress: auditCtx.ipAddress,
            userAgent: auditCtx.userAgent,
          },
          manager,
        );
      });
    } catch (err) {
      // §4.7 — error log on the standalone connection (NO manager) so it
      // survives the rollback.
      await this.auditLog.logError(auditCtx, 'CREATE', err as Error);
      throw err;
    }

    return {
      data: {
        import_mode: dto.import_mode,
        total_rows: dto.rows.length,
        created_count: createdCount,
        updated_count: updatedCount,
        cancelled_count: cancelledCount,
        skipped_count: 0,
        rireki_count: dto.rows.length,
        imported_at: importedAt,
      },
      message: '取り込みました。',
    };
  }

  // ─── private helpers (SCR-016) ───────────────────────────────────────

  /** Unique non-blank strings from a column projection. */
  private uniqueStrings(values: Array<string | undefined>): string[] {
    return Array.from(
      new Set(values.filter((v): v is string => typeof v === 'string' && v !== '')),
    );
  }

  /** Unique defined numbers from a column projection. */
  private uniqueNumbers(values: Array<number | undefined>): number[] {
    return Array.from(
      new Set(
        values
          .filter((v): v is number => v !== undefined && v !== null)
          .map((v) => Number(v)),
      ),
    );
  }

  /** Push a row error, never exceeding the 10-entry cap. */
  private pushImportError(
    errors: Array<{ row: number; field: string; message: string }>,
    error: { row: number; field: string; message: string },
  ): void {
    if (errors.length < IMPORT_ERROR_CAP) errors.push(error);
  }

  /**
   * Resolve the existing 購読者 for an UPDATE_* / 一括中止 row. 一括中止
   * keys on kumiaiin_code; otherwise prefer dokusya_id, falling back to
   * kumiaiin_code.
   */
  private resolveExistingRow(
    row: ImportDokusyaRowDto,
    isCancel: boolean,
    byId: Map<number, Record<string, unknown>>,
    byKumiaiin: Map<string, Record<string, unknown>>,
  ): Record<string, unknown> | undefined {
    if (isCancel) {
      return row.kumiaiin_code ? byKumiaiin.get(row.kumiaiin_code) : undefined;
    }
    if (row.dokusya_id !== undefined) {
      return byId.get(Number(row.dokusya_id));
    }
    return row.kumiaiin_code ? byKumiaiin.get(row.kumiaiin_code) : undefined;
  }

  /**
   * §4.3.4 — JA_KANRI_SHITEN can only touch existing rows whose
   * kanri_shiten_id matches its own. Out-of-scope → DATA_SCOPE_VIOLATION
   * (403). NICHINO_* bypass; CHUOKAI / JA_HONTEN are already scoped by
   * the ja_id WHERE filter on the existing-record SELECT.
   */
  private assertImportRowScope(
    existing: Record<string, unknown>,
    session: SessionPayload,
  ): void {
    if (session.role_code === RoleCode.JA_KANRI_SHITEN) {
      if (
        Number(existing.kanri_shiten_id) !== Number(session.kanri_shiten_id)
      ) {
        throw new DataScopeViolationException();
      }
    }
  }

  /**
   * Convert a row's gender / yokin field (numeric code OR Japanese
   * label) to the stored numeric code. Returns null when blank.
   */
  private toGenderCode(value: number | string | undefined): number | null {
    if (value === undefined || value === null || value === '') return null;
    if (typeof value === 'number') return value;
    return GENDER_LABEL_TO_CODE[value] ?? Number(value);
  }

  private toYokinCode(value: number | string | undefined): number | null {
    if (value === undefined || value === null || value === '') return null;
    if (typeof value === 'number') return value;
    return YOKIN_LABEL_TO_CODE[value] ?? Number(value);
  }

  /**
   * Apply one import row inside the open transaction. Dispatches by mode
   * + 一括中止 to a raw INSERT / UPDATE on `t_dokusya`, then toggles the
   * prior rireki saishin flag + INSERTs one `t_dokusya_rireki` row. SQL
   * shapes match the unit spec's `manager.query` regex router.
   */
  private async applyImportRow(
    manager: EntityManager,
    dto: ImportDokusyaDto,
    row: ImportDokusyaRowDto,
    session: SessionPayload,
    fkMaps: {
      tankaIdByCode: Map<string, number>;
      hanbaitenIdByCode: Map<string, number>;
    },
  ): Promise<void> {
    const updatedBy = String(session.account_id);
    const isCancel = Number(row.tetsuzuki_shurui) === TETSUZUKI_KAIYAKU;
    // For NEW, the rireki snapshot must key off the JUST-INSERTED row's id
    // (captured from RETURNING) — NOT the kumiaiin_code, which can match
    // several rows after repeated NEW imports and caused a duplicate-key
    // crash on uq_t_dokusya_rireki.
    let newDokusyaId: number | null = null;

    if (dto.import_mode === 'NEW') {
      // Persist EVERY column t_dokusya needs. The previous INSERT wrote only
      // 11 columns and crashed real Postgres on the NOT NULL columns it
      // omitted (shimei_kana_sei, address, 連絡先, tanka_id, hanbaiten_id,
      // dates, …). Mirror the create flow's column set. String NOT NULL
      // columns default to '' when blank; tanka_id / hanbaiten_id are
      // resolved from the FK code→id maps (both validated to exist above).
      const str = (v: unknown): string =>
        v === undefined || v === null ? '' : String(v);
      const intOrNull = (v: unknown): number | null =>
        v === undefined || v === null || v === '' ? null : Number(v);
      const kaishiDate = normalizeDbDate(str(row.dokusya_kaishi_date));
      const inserted = (await manager.query(
        `INSERT INTO t_dokusya
           (ja_id, kanri_shiten_id, shiten_id, kumiaiin_code, dokusya_shubetsu,
            tetsuzuki_shurui, shimei_sei, shimei_mei, shimei_kana_sei,
            shimei_kana_mei, dokusya_busu, yubin_no, todofuken_code,
            shikuchoson, chome_banchi, tatemono_mei, renrakusaki_1,
            renrakusaki_2, email, mail_magazine_flg, birth_year, gender,
            haitatsu_same_flg, haitatsu_yubin_no, haitatsu_todofuken_code,
            haitatsu_shikuchoson, haitatsu_chome_banchi, haitatsu_tatemono_mei,
            haitatsu_renrakusaki_1, haitatsu_renrakusaki_2, haitatsu_shimei_sei,
            haitatsu_shimei_mei, haitatsu_shimei_kana_sei,
            haitatsu_shimei_kana_mei, hanbaiten_id, tanka_id, yubin_kubun,
            shiharai_hoho, dokusyaryo_shiharai_cycle, bank_branch_code,
            bank_branch_name, hikiotoshi_yokin_shubetsu, hikiotoshi_koza_no,
            hikiotoshi_koza_meigi, dokusyaso_bunrui, nogyosya_bunrui,
            shoki_dokusya_kaishi_date, dokusya_kaishi_date, dokusya_chushi_date,
            joho_henko_tekiyo_date, biko, created_by, updated_by)
         VALUES
           ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
            $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28,
            $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39, $40, $41,
            $42, $43, $44, $45, $46, $47, $48, $49, $50, $51, $52, $52)
         RETURNING dokusya_id`,
        [
          Number(session.ja_id ?? 0), // $1 ja_id
          intOrNull(row.kanri_shiten_id), // $2
          intOrNull(row.shiten_id), // $3
          str(row.kumiaiin_code), // $4
          intOrNull(row.dokusya_shubetsu), // $5
          intOrNull(row.tetsuzuki_shurui), // $6
          str(row.shimei_sei), // $7
          str(row.shimei_mei), // $8
          str(row.shimei_kana_sei), // $9
          str(row.shimei_kana_mei), // $10
          isCancel ? 0 : Number(row.dokusya_busu ?? 0), // $11
          str(row.yubin_no), // $12
          str(row.todofuken_code), // $13
          str(row.shikuchoson), // $14
          str(row.chome_banchi), // $15
          str(row.tatemono_mei), // $16
          str(row.renrakusaki_1), // $17
          str(row.renrakusaki_2), // $18
          str(row.email), // $19
          Number(row.mail_magazine_flg ?? 0), // $20
          intOrNull(row.birth_year), // $21
          this.toGenderCode(row.gender), // $22
          true, // $23 haitatsu_same_flg — import has no per-row flag; default 同じ
          str(row.haitatsu_yubin_no), // $24
          str(row.haitatsu_todofuken_code), // $25
          str(row.haitatsu_shikuchoson), // $26
          str(row.haitatsu_chome_banchi), // $27
          str(row.haitatsu_tatemono_mei), // $28
          str(row.haitatsu_renrakusaki_1), // $29
          str(row.haitatsu_renrakusaki_2), // $30
          str(row.haitatsu_shimei_sei), // $31
          str(row.haitatsu_shimei_mei), // $32
          str(row.haitatsu_shimei_kana_sei), // $33
          str(row.haitatsu_shimei_kana_mei), // $34
          fkMaps.hanbaitenIdByCode.get(str(row.hanbaiten_code)) ?? null, // $35
          fkMaps.tankaIdByCode.get(str(row.tanka_code)) ?? null, // $36
          row.yubin_kubun ?? '0', // $37
          intOrNull(row.shiharai_hoho), // $38
          intOrNull(row.dokusyaryo_shiharai_cycle), // $39
          str(row.bank_branch_code), // $40
          str(row.bank_branch_name), // $41
          this.toYokinCode(row.hikiotoshi_yokin_shubetsu), // $42
          str(row.hikiotoshi_koza_no), // $43
          str(row.hikiotoshi_koza_meigi), // $44
          str(row.dokusyaso_bunrui), // $45
          str(row.nogyosya_bunrui), // $46
          kaishiDate, // $47 shoki_dokusya_kaishi_date = kaishi
          kaishiDate, // $48 dokusya_kaishi_date
          normalizeDbDate(row.dokusya_chushi_date ?? null), // $49
          normalizeDbDate(row.joho_henko_tekiyo_date ?? null), // $50
          str(row.biko), // $51
          updatedBy, // $52 created_by + updated_by
        ],
      )) as Array<{ dokusya_id?: number }>;
      newDokusyaId = Number(inserted[0]?.dokusya_id ?? 0) || null;
    } else if (isCancel) {
      // 一括中止 — 解約状態 + 購読中止日 by kumiaiin_code key.
      await manager.query(
        `UPDATE t_dokusya
            SET tetsuzuki_shurui = 0,
                dokusya_busu = 0,
                dokusya_chushi_date = $1,
                updated_by = $2
          WHERE kumiaiin_code = $3 AND ja_id = $4 AND deleted_at IS NULL
        RETURNING dokusya_id, rireki_no`,
        [
          row.dokusya_chushi_date ?? this.todayIsoTokyo(),
          updatedBy,
          row.kumiaiin_code ?? '',
          Number(session.ja_id ?? 0),
        ],
      );
    } else if (dto.import_mode === 'UPDATE_ALL') {
      // Full update — every column written even when unselected
      // (unselected → default / NULL / '' / 0).
      await manager.query(
        `UPDATE t_dokusya
            SET dokusya_shubetsu = $1,
                tetsuzuki_shurui = $2,
                shimei_sei = $3,
                shimei_mei = $4,
                dokusya_busu = $5,
                gender = $6,
                hikiotoshi_yokin_shubetsu = $7,
                updated_by = $8
          WHERE dokusya_id = $9 AND ja_id = $10 AND deleted_at IS NULL
        RETURNING dokusya_id, rireki_no`,
        [
          row.dokusya_shubetsu ?? null,
          row.tetsuzuki_shurui ?? null,
          row.shimei_sei ?? '',
          row.shimei_mei ?? '',
          Number(row.dokusya_busu ?? 0),
          this.toGenderCode(row.gender),
          this.toYokinCode(row.hikiotoshi_yokin_shubetsu),
          updatedBy,
          row.dokusya_id ?? null,
          Number(session.ja_id ?? 0),
        ],
      );
    } else {
      // UPDATE_PARTIAL — only the columns in selected_columns appear in
      // the SET clause. Build it dynamically so unselected columns
      // (e.g. shimei_sei) are NOT mutated.
      const { sql, params } = this.buildPartialUpdate(
        dto.selected_columns,
        row,
        updatedBy,
        Number(session.ja_id ?? 0),
      );
      await manager.query(sql, params);
    }

    // Toggle prior 最新データ flag + INSERT a fresh history row. For NEW we
    // key STRICTLY by the inserted dokusya_id (kumiaiin can match several
    // rows → duplicate-key on uq_t_dokusya_rireki). For UPDATE / 一括中止 the
    // existing row is keyed by its dokusya_id or kumiaiin_code from the row.
    const rirekiKeyId = newDokusyaId ?? row.dokusya_id ?? null;
    const rirekiKeyKumiaiin =
      newDokusyaId !== null ? '' : (row.kumiaiin_code ?? '');
    await manager.query(
      `UPDATE t_dokusya_rireki
          SET saishin_data_flg = false
        WHERE dokusya_id IN (
                SELECT dokusya_id FROM t_dokusya
                 WHERE ja_id = $1
                   AND (($2::bigint IS NOT NULL AND dokusya_id = $2)
                        OR ($3 <> '' AND kumiaiin_code = $3))
                   AND deleted_at IS NULL)
          AND saishin_data_flg = true`,
      [Number(session.ja_id ?? 0), rirekiKeyId, rirekiKeyKumiaiin],
    );
    // History is a FULL snapshot of the (just inserted / updated) t_dokusya
    // row — copy every shared column. The previous version copied only 9
    // columns and crashed on t_dokusya_rireki's own NOT NULL columns
    // (dokusya_shubetsu, shimei_sei, …).
    await manager.query(
      `INSERT INTO t_dokusya_rireki
         (dokusya_id, rireki_no, ja_id, kanri_shiten_id, shiten_id,
          kumiaiin_code, dokusya_shubetsu, tetsuzuki_shurui,
          denshi_dokusya_shubetsu, shimei_sei, shimei_mei, shimei_kana_sei,
          shimei_kana_mei, dokusya_busu, yubin_no, todofuken_code, shikuchoson,
          chome_banchi, tatemono_mei, renrakusaki_1, renrakusaki_2, email,
          mail_magazine_flg, birth_year, gender, haitatsu_same_flg,
          haitatsu_yubin_no, haitatsu_todofuken_code, haitatsu_shikuchoson,
          haitatsu_chome_banchi, haitatsu_tatemono_mei, haitatsu_renrakusaki_1,
          haitatsu_renrakusaki_2, haitatsu_shimei_sei, haitatsu_shimei_mei,
          haitatsu_shimei_kana_sei, haitatsu_shimei_kana_mei, hanbaiten_id,
          tanka_id, yubin_kubun, shiharai_hoho, dokusyaryo_shiharai_cycle,
          bank_branch_code, bank_branch_name, hikiotoshi_yokin_shubetsu,
          hikiotoshi_koza_no, hikiotoshi_koza_meigi, dokusyaso_bunrui,
          nogyosya_bunrui, shoki_dokusya_kaishi_date, dokusya_kaishi_date,
          dokusya_chushi_date, joho_henko_tekiyo_date, seikyu_kaishi_month,
          biko, denshi_shonin_status, saishin_data_flg, henko_riyu, created_by)
       SELECT d.dokusya_id, d.rireki_no, d.ja_id, d.kanri_shiten_id,
              d.shiten_id, d.kumiaiin_code, d.dokusya_shubetsu,
              d.tetsuzuki_shurui, d.denshi_dokusya_shubetsu, d.shimei_sei,
              d.shimei_mei, d.shimei_kana_sei, d.shimei_kana_mei, d.dokusya_busu,
              d.yubin_no, d.todofuken_code, d.shikuchoson, d.chome_banchi,
              d.tatemono_mei, d.renrakusaki_1, d.renrakusaki_2, d.email,
              d.mail_magazine_flg, d.birth_year, d.gender, d.haitatsu_same_flg,
              d.haitatsu_yubin_no, d.haitatsu_todofuken_code,
              d.haitatsu_shikuchoson, d.haitatsu_chome_banchi,
              d.haitatsu_tatemono_mei, d.haitatsu_renrakusaki_1,
              d.haitatsu_renrakusaki_2, d.haitatsu_shimei_sei,
              d.haitatsu_shimei_mei, d.haitatsu_shimei_kana_sei,
              d.haitatsu_shimei_kana_mei, d.hanbaiten_id, d.tanka_id,
              d.yubin_kubun, d.shiharai_hoho, d.dokusyaryo_shiharai_cycle,
              d.bank_branch_code, d.bank_branch_name, d.hikiotoshi_yokin_shubetsu,
              d.hikiotoshi_koza_no, d.hikiotoshi_koza_meigi, d.dokusyaso_bunrui,
              d.nogyosya_bunrui, d.shoki_dokusya_kaishi_date,
              d.dokusya_kaishi_date, d.dokusya_chushi_date,
              d.joho_henko_tekiyo_date, d.seikyu_kaishi_month, d.biko,
              d.denshi_shonin_status, true, 'Excel取込', $4
         FROM t_dokusya d
        WHERE d.ja_id = $1
          AND (($2::bigint IS NOT NULL AND d.dokusya_id = $2)
               OR ($3 <> '' AND d.kumiaiin_code = $3))
          AND d.deleted_at IS NULL`,
      [Number(session.ja_id ?? 0), rirekiKeyId, rirekiKeyKumiaiin, updatedBy],
    );
  }

  /**
   * Build a dynamic `UPDATE t_dokusya SET <selected> WHERE …` for
   * UPDATE_PARTIAL. Only columns present in `selectedColumns` (and that
   * map to a writable physical column) appear in the SET clause.
   * `dokusya_id` is the key — never written.
   */
  private buildPartialUpdate(
    selectedColumns: string[],
    row: ImportDokusyaRowDto,
    updatedBy: string,
    jaId: number,
  ): { sql: string; params: unknown[] } {
    const WRITABLE: Record<string, () => unknown> = {
      dokusya_shubetsu: () => row.dokusya_shubetsu ?? null,
      tetsuzuki_shurui: () => row.tetsuzuki_shurui ?? null,
      shimei_sei: () => row.shimei_sei ?? '',
      shimei_mei: () => row.shimei_mei ?? '',
      dokusya_busu: () => Number(row.dokusya_busu ?? 0),
      gender: () => this.toGenderCode(row.gender),
      hikiotoshi_yokin_shubetsu: () =>
        this.toYokinCode(row.hikiotoshi_yokin_shubetsu),
      kumiaiin_code: () => row.kumiaiin_code ?? '',
      yubin_no: () => row.yubin_no ?? '',
      todofuken_code: () => row.todofuken_code ?? '',
      shikuchoson: () => row.shikuchoson ?? '',
      chome_banchi: () => row.chome_banchi ?? '',
      renrakusaki_1: () => row.renrakusaki_1 ?? '',
    };

    const setParts: string[] = [];
    const params: unknown[] = [];
    let idx = 1;
    for (const col of selectedColumns) {
      if (col === 'dokusya_id') continue; // key, not written
      const getter = WRITABLE[col];
      if (!getter) continue;
      setParts.push(`${col} = $${idx}`);
      params.push(getter());
      idx += 1;
    }
    // Always bump updated_by.
    setParts.push(`updated_by = $${idx}`);
    params.push(updatedBy);
    idx += 1;

    const keyIdx = idx;
    params.push(row.dokusya_id ?? null);
    idx += 1;
    const jaIdx = idx;
    params.push(jaId);

    const sql = `UPDATE t_dokusya
        SET ${setParts.join(', ')}
      WHERE dokusya_id = $${keyIdx} AND ja_id = $${jaIdx} AND deleted_at IS NULL
    RETURNING dokusya_id, rireki_no`;
    return { sql, params };
  }
}
