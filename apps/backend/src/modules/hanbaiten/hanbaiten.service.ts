import { Injectable, Logger, Optional } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, IsNull, Repository } from 'typeorm';
import type { Request } from 'express';

import { AuditOperation } from '@/common/enums';
import { Hanbaiten } from '@/database/entities/hanbaiten.entity';
import { Tanka } from '@/database/entities/tanka.entity';
import { Todofuken } from '@/database/entities/todofuken.entity';
import { AuditLogService } from '@/modules/audit-log/audit-log.service';
import { CodeService } from '@/modules/code/code.service';
import {
  ConflictException,
  DuplicateCodeException,
  NotFoundException,
  ValidationException,
} from '@/common/exceptions/common.exceptions';
import { buildAuditCtx } from '@/common/utils/audit-context';
import {
  applyJaScope,
  assertJaScope,
  fetchFkInJa,
} from '@/common/utils/data-scope';
import { isUniqueViolation } from '@/common/utils/db-errors';
import { assertMCodeValues } from '@/common/utils/m-code-validation';
import { paginate, type PaginatedResponse } from '@/common/utils/paginate';
import type { SessionPayload } from '@/modules/auth/session.service';

import { HanbaitenImportService } from './hanbaiten-import.service';
import { CreateHanbaitenDto } from './dto/create-hanbaiten.dto';
import { ImportHanbaitenDto } from './dto/import-hanbaiten.dto';
import {
  SearchHanbaitenDto,
  type HanbaitenSearchSortBy,
} from './dto/search-hanbaiten.dto';
import { UpdateHanbaitenDto } from './dto/update-hanbaiten.dto';
import {
  toHanbaitenDetail,
  type HanbaitenDetailResponse,
  type HanbaitenDetailRow,
} from './hanbaiten-form.mapper';
import { toHanbaitenListItem, type HanbaitenListItem } from './hanbaiten.mapper';

/** Per-screen audit-context labels — see api.md §4.6 INSERT INTO t_log. */
const SCREEN_NAME = '販売店明細検索画面 (ACSMS-SCR-018)';
const SCR017_SCREEN_NAME = '販売店情報登録画面 (ACSMS-SCR-017)';
const TABLE_NAME = 'm_hanbaiten';

/**
 * Fields that become REQUIRED when `itaku_kubun === 1` (振込) per
 * 画面設計書 v1.2 §3.1. Cross-field rule — enforced in the service
 * layer (DTO-level `@ValidateIf` would couple validators across
 * fields and surface English class-validator messages on partial
 * inputs).
 */
const ITAKU_KUBUN_FURIKOMI = 1;
const CONDITIONAL_REQUIRED_FIELDS: ReadonlyArray<{
  key:
    | 'bank_code'
    | 'bank_name'
    | 'bank_branch_code'
    | 'bank_branch_name'
    | 'yokin_shubetsu'
    | 'koza_no'
    | 'koza_meigi';
  label: string;
}> = [
  { key: 'bank_code', label: '金融機関コード' },
  { key: 'bank_name', label: '金融機関名' },
  { key: 'bank_branch_code', label: '口座支店コード' },
  { key: 'bank_branch_name', label: '口座支店名' },
  { key: 'yokin_shubetsu', label: '口座種別' },
  { key: 'koza_no', label: '口座番号' },
  { key: 'koza_meigi', label: '口座名義' },
];

/**
 * Throw ONE VALIDATION_ERROR aggregating every field that's blank when
 * `itaku_kubun === 1`. Shape matches `ValidationPipe` output so the FE
 * `useApiForm` composable maps both paths uniformly to
 * `<a-form-item :help>` field-level errors.
 */
function assertConditionalRequired(
  dto: CreateHanbaitenDto | UpdateHanbaitenDto,
): void {
  if (dto.itaku_kubun !== ITAKU_KUBUN_FURIKOMI) return;
  const missing: { field: string; message: string }[] = [];
  for (const { key, label } of CONDITIONAL_REQUIRED_FIELDS) {
    const v = (dto as unknown as Record<string, unknown>)[key];
    const blank =
      v === undefined ||
      v === null ||
      (typeof v === 'string' && v.trim() === '');
    if (blank) {
      missing.push({
        field: key,
        message: `委託区分が振込の場合は${label}は必須です。`,
      });
    }
  }
  if (missing.length === 0) return;
  throw new ValidationException(missing);
}

/**
 * Whitelist mapping the public `sort_by` query value to the actual
 * SQL column path. `@IsIn` on the DTO already rejects unknown keys;
 * this map is the static-typing guard against `ORDER BY ${user_input}`
 * injection. Per 画面設計書 v1.2 §8.1 only the two local columns are
 * exposed.
 */
const SORT_COLUMN_MAP: Record<HanbaitenSearchSortBy, string> = {
  hanbaiten_code: 'm.hanbaiten_code',
  hanbaiten_name: 'm.hanbaiten_name',
  // Default landing order; see HANBAITEN_SEARCH_SORT_BY. updated_at is
  // bumped on every write (create / update / import via @UpdateDateColumn),
  // so the most-recently-touched row sorts first. Paired with the
  // m.hanbaiten_id DESC tie-breaker below so a batch import (rows sharing
  // one updated_at) still lists deterministically, newest insert first.
  updated_at: 'm.updated_at',
};

/**
 * Tables whose presence of a non-soft-deleted row referencing the
 * hanbaiten blocks DELETE (api.md §4.4). Adding a new dependent table
 * = appending here.
 *
 * NOTE: `t_dokusya_rireki` is intentionally OMITTED until the
 * 購読者 (dokusya) SCR ships that creates the table. Including it here
 * would 500 every DELETE in prod (table doesn't exist). Re-add the
 * `{ table: 't_dokusya_rireki', hasDeletedAt: false }` row + the
 * matching service-spec / integration-spec assertions once the dokusya
 * migration is merged. See api.md §4.4 ACSMS-SCR-018 — the original
 * spec lists BOTH tables; this is a deliberate temporary deviation.
 */
const RELATED_TABLES: ReadonlyArray<{
  table: string;
  hasDeletedAt: boolean;
}> = [
  { table: 't_dokusya', hasDeletedAt: true },
  // 購読者履歴テーブル — append-only（deleted_at 列なし）。api.md §4.4 の
  // 履歴チェック SQL に対応（`AND deleted_at IS NULL` を付けない）。
  { table: 't_dokusya_rireki', hasDeletedAt: false },
];

/**
 * CONFLICT message literal per ACSMS-MSG-018-004 (画面設計書 v1.2 §7.2).
 * Inlined here rather than via the default `ConflictException()` so the
 * customer-signed wording reaches the FE toast without going through a
 * second-layer translation step.
 */
const CONFLICT_MESSAGE =
  'この販売店は関連オブジェクトに紐づいているため削除できません。';

@Injectable()
export class HanbaitenService {
  private readonly logger = new Logger(HanbaitenService.name);

  constructor(
    @InjectRepository(Hanbaiten)
    private readonly repo: Repository<Hanbaiten>,
    @InjectRepository(Todofuken)
    private readonly todofukenRepo: Repository<Todofuken>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly auditLog: AuditLogService,
    // `@Optional()` keeps the SCR-018 service spec
    // (`new HanbaitenService(repo, todofukenRepo, dataSource, auditLog)` —
    // 4 args) compiling. SCR-017 endpoints (getDetail / create / update)
    // require it; the `requireCodeService()` guard inside those methods
    // throws when missing.
    @Optional() private readonly codeService?: CodeService,
    // `@Optional()` mirrors codeService rationale — SCR-018-only specs
    // construct with fewer args. SCR-017 create/update fire the FK guard
    // via `requireTankaRepo()` which throws when undefined.
    @Optional()
    @InjectRepository(Tanka)
    private readonly tankaRepo?: Repository<Tanka>,
    // `@Optional()` + 末尾追加 — SCR-018 4引数 spec / SCR-017 6引数 spec が
    // この引数を渡さなくても構築できるようにする。SCR-019 の取込 3 API
    // (getImportTemplateColumns / downloadImportTemplate / importExcel) は
    // `requireImportService()` ガード経由で利用し、未配線時は loudly throw。
    @Optional()
    private readonly importService?: HanbaitenImportService,
  ) {}

  /**
   * Runtime guard for SCR-017 create/update — they cannot validate
   * `haitatsuryo_tanka_id` without the Tanka repo. Throws loudly if a
   * spec under-wires the constructor.
   */
  private requireTankaRepo(): Repository<Tanka> {
    if (!this.tankaRepo) {
      throw new Error(
        'HanbaitenService.tankaRepo is undefined — SCR-017 endpoints require it.',
      );
    }
    return this.tankaRepo;
  }

  /**
   * Runtime guard for the SCR-017 endpoints — they cannot operate
   * without the cached m_code allow-list. The SCR-018 4-arg constructor
   * leaves `codeService` undefined; this method throws loudly if any
   * SCR-017 codepath fires under that wiring (would only happen via a
   * misconfigured test, not at runtime).
   */
  private requireCodeService(): CodeService {
    if (!this.codeService) {
      throw new Error(
        'HanbaitenService.codeService is undefined — SCR-017 endpoints require it.',
      );
    }
    return this.codeService;
  }

  /**
   * Runtime guard for the SCR-019 取込 endpoints — they delegate to
   * HanbaitenImportService. The SCR-018-only spec constructs without it;
   * this throws loudly if a 取込 codepath fires under that wiring.
   */
  private requireImportService(): HanbaitenImportService {
    if (!this.importService) {
      throw new Error(
        'HanbaitenService.importService is undefined — SCR-019 endpoints require it.',
      );
    }
    return this.importService;
  }

  // ─── API-018-001 — GET /api/v1/hanbaiten ─────────────────────────────
  /**
   * Paginated search across `m_hanbaiten`. Applies §4.3 DataScope:
   * NICHINO_* unrestricted (session.ja_id == null), CHUOKAI / JA_HONTEN /
   * JA_KANRI_SHITEN scoped to own `ja_id`. JA_KANRI_SHITEN does NOT
   * narrow further by kanri_shiten_id — branch users see all 販売店 in
   * their JA.
   *
   * `todofuken_name` is batch-resolved from `m_todofuken` after the
   * main page query (one extra round-trip rather than a per-row JOIN).
   * `haiten_flg = false` is applied by default; `query.haiten_flg=true`
   * lifts the filter and surfaces 廃店 rows too.
   */
  async findAll(
    query: SearchHanbaitenDto,
    session: SessionPayload,
  ): Promise<PaginatedResponse<HanbaitenListItem>> {
    const page = query.page ?? 1;
    const per_page = query.per_page ?? 20;
    const sort_by: HanbaitenSearchSortBy =
      (query.sort_by as HanbaitenSearchSortBy) ?? 'updated_at';
    const sort_order = (query.sort_order ?? 'desc').toUpperCase() as
      | 'ASC'
      | 'DESC';

    const qb = this.repo.createQueryBuilder('m');

    // [soft-delete-filter]
    qb.where('m.deleted_at IS NULL');

    // [data-scope] — ja_id = session.ja_id for restricted roles;
    // NICHINO_* bypass the andWhere entirely.
    applyJaScope(qb, 'm', 'jaId', session);

    // [staff-ja-filter] NICHINO_STAFF (session.ja_id == null) supplies
    // ja_id explicitly via the 代行入力 search form's JA dropdown. The
    // BE applies it here so the list scopes to ONE JA — without this,
    // NICHINO_STAFF would see all JAs' hanbaiten. For session-scoped
    // roles applyJaScope above already pinned the JA; query.ja_id is
    // ignored to prevent a CHUOKAI passing another JA's id.
    if (session.ja_id == null && query.ja_id !== undefined) {
      qb.andWhere('m.ja_id = :qja', { qja: query.ja_id });
    }

    // [filter-conditions] — exact-match on `haiten_flg`. The 廃店フラグ
    // checkbox toggles which set the user sees:
    //   unchecked / omitted → 営業中のみ (haiten_flg = false, default)
    //   checked             → 廃店のみ (haiten_flg = true)
    // Customer 2026-05-26 — the previous "include closed" semantic
    // (checked = show all) was rejected as confusing once the
    // checkbox label dropped from "廃店を含む" to plain "廃店フラグ".
    qb.andWhere('m.haiten_flg = :haitenFlg', {
      haitenFlg: query.haiten_flg === true,
    });

    // [filter-conditions] — ILIKE partial-match, emitted only when the
    // corresponding query param is non-empty.
    if (query.hanbaiten_code) {
      qb.andWhere('m.hanbaiten_code ILIKE :hanbaiten_code', {
        hanbaiten_code: `%${query.hanbaiten_code}%`,
      });
    }
    if (query.hanbaiten_name) {
      qb.andWhere('m.hanbaiten_name ILIKE :hanbaiten_name', {
        hanbaiten_name: `%${query.hanbaiten_name}%`,
      });
    }
    if (query.tel) {
      qb.andWhere('m.tel ILIKE :tel', { tel: `%${query.tel}%` });
    }
    if (query.fax) {
      qb.andWhere('m.fax ILIKE :fax', { fax: `%${query.fax}%` });
    }
    if (query.address) {
      qb.andWhere('m.address ILIKE :address', {
        address: `%${query.address}%`,
      });
    }
    if (query.shocho_name) {
      qb.andWhere('m.shocho_name ILIKE :shocho_name', {
        shocho_name: `%${query.shocho_name}%`,
      });
    }

    // [sort-paginate]
    // m.hanbaiten_id DESC is a stable tie-breaker so equal sort keys (most
    // importantly a batch import sharing one created_at) list newest-insert
    // first instead of in arbitrary DB order. Skipped when the primary sort
    // IS hanbaiten_id-equivalent — here the primary is never the id, so it
    // always applies as the secondary key.
    const orderColumn = SORT_COLUMN_MAP[sort_by] ?? SORT_COLUMN_MAP.updated_at;
    qb.orderBy(orderColumn, sort_order)
      .addOrderBy('m.hanbaiten_id', 'DESC')
      .take(per_page)
      .skip((page - 1) * per_page);

    const [rows, total] = await qb.getManyAndCount();

    // Batch-fetch todofuken_name in one round-trip — same pattern as
    // ShitenService → kanri_shiten_name. Cheaper than a JOIN per row,
    // and the parent rows are bounded by the page size.
    const codes = [...new Set(rows.map((r) => r.todofukenCode).filter(Boolean))];
    const todofukenRows =
      codes.length > 0
        ? await this.todofukenRepo.find({ where: { todofukenCode: In(codes) } })
        : [];
    const nameMap = new Map(
      todofukenRows.map((t) => [t.todofukenCode, t.todofukenName]),
    );

    // Batch-fetch ja_code / ja_name for the page's rows in one round-trip
    // (same pattern as todofuken_name above — cheaper than a per-row JOIN
    // and bounded by page size). NICHINO_STAFF sees one JA; JA-scoped roles
    // all share the same ja_id, so the IN-list is tiny.
    const jaIds = [
      ...new Set(rows.map((r) => Number(r.jaId)).filter((n) => Number.isFinite(n))),
    ];
    const jaRows: Array<{ ja_id: number | string; ja_code: string; ja_name: string }> =
      jaIds.length > 0
        ? await this.dataSource.query(
            `SELECT ja_id, ja_code, ja_name FROM m_ja
              WHERE ja_id = ANY($1::bigint[]) AND deleted_at IS NULL`,
            [jaIds],
          )
        : [];
    const jaMap = new Map(
      jaRows.map((j) => [Number(j.ja_id), j]),
    );

    const data = rows.map((r) => {
      const ja = jaMap.get(Number(r.jaId));
      return toHanbaitenListItem(
        r,
        nameMap.get(r.todofukenCode) ?? '',
        ja?.ja_code ?? '',
        ja?.ja_name ?? '',
      );
    });

    return paginate(data, total, page, per_page);
  }

  // ─── ACSMS-API-COMMON — Hanbaiten dropdown (SCR-011) ────────────────
  /**
   * Minimal dropdown projection (hanbaiten_id, hanbaiten_code,
   * hanbaiten_name). Scoped to the caller's JA via `applyJaScope`;
   * NICHINO_* see all JAs unless `query.ja_id` is supplied as a
   * narrow. Soft-deleted rows excluded. `q` partial-matches on
   * hanbaiten_name (ILIKE).
   */
  /**
   * 販売店プルダウン。検索（q）/ ページング（page・per_page）/ 編集ピン（include_id）
   * 対応。後方互換のためページングは **opt-in**：`page` 未指定なら全件返す（has_more=false）。
   * 検索対象は match_field='name' で 販売店名のみ、既定（'both'）で **販売店コード OR 名称**。
   */
  async listDropdown(
    query: {
      ja_id?: number;
      q?: string;
      match_field?: 'both' | 'name';
      page?: number;
      per_page?: number;
      include_id?: number;
      /** true のとき営業中(haiten_flg=false)のみに絞る（購読者の販売店選択用）。 */
      active_only?: boolean;
    },
    session: SessionPayload,
  ): Promise<{
    data: Array<{
      hanbaiten_id: number;
      hanbaiten_code: string;
      hanbaiten_name: string;
    }>;
    has_more: boolean;
  }> {
    const toItem = (r: Hanbaiten) => ({
      hanbaiten_id: Number(r.hanbaitenId),
      hanbaiten_code: r.hanbaitenCode,
      hanbaiten_name: r.hanbaitenName,
    });

    const buildScoped = () => {
      const qb = this.repo.createQueryBuilder('m').where('m.deleted_at IS NULL');
      applyJaScope(qb, 'm', 'jaId', session);
      if (session.ja_id == null && query.ja_id !== undefined) {
        qb.andWhere('m.ja_id = :qja', { qja: query.ja_id });
      }
      return qb;
    };

    const qb = buildScoped();
    // active_only=true（購読者の販売店選択：登録/編集）のときだけ営業中に絞る。
    // 廃店(haiten_flg=true)は新規選択から除外する。既に廃店の販売店へ紐づく
    // 購読者を編集する場合は、下の include_id ピンで現在の選択を復元する
    // （ピンのクエリは buildScoped 由来で haiten_flg を掛けない）。
    // 既定（一覧検索・販売店入替の検索）は廃店も対象にする。
    if (query.active_only) {
      qb.andWhere('m.haiten_flg = false');
    }
    if (query.q) {
      const like = `%${query.q}%`;
      if (query.match_field === 'name') {
        qb.andWhere('m.hanbaiten_name ILIKE :q', { q: like });
      } else {
        qb.andWhere(
          '(m.hanbaiten_code ILIKE :q OR m.hanbaiten_name ILIKE :q)',
          { q: like },
        );
      }
    }
    qb.orderBy('m.hanbaiten_code', 'ASC');

    const paginate = query.page !== undefined;
    const page = Math.max(query.page ?? 1, 1);
    let hasMore = false;
    let rows: Hanbaiten[];
    if (paginate) {
      const perPage = Math.min(Math.max(query.per_page ?? 50, 1), 100);
      // take(per_page + 1) で次ページ有無を1クエリで判定。
      rows = await qb.skip((page - 1) * perPage).take(perPage + 1).getMany();
      hasMore = rows.length > perPage;
      if (hasMore) rows = rows.slice(0, perPage);
    } else {
      rows = await qb.getMany();
    }

    // 編集ピン：選択中IDが結果に無ければ先頭に差し込む（ラベル解決用）。
    // ページング時は1ページ目のみ。廃店フィルタで除外された既存の選択も
    // ここで復元する（ピンのクエリは haiten_flg を掛けない）。
    if (
      query.include_id !== undefined &&
      (!paginate || page === 1) &&
      !rows.some((r) => Number(r.hanbaitenId) === query.include_id)
    ) {
      const pinned = await buildScoped()
        .andWhere('m.hanbaiten_id = :pid', { pid: query.include_id })
        .getOne();
      if (pinned) {
        return { data: [toItem(pinned), ...rows.map(toItem)], has_more: hasMore };
      }
    }
    return { data: rows.map(toItem), has_more: hasMore };
  }

  // ─── API-018-002 — DELETE /api/v1/hanbaiten/:hanbaiten_id ────────────
  /**
   * Logical delete. §4.3 combined existence + DataScope SELECT — an
   * out-of-scope row resolves to `null` and is masked as NotFound to
   * keep cross-JA existence private. §4.4 blocks the delete when any
   * dependent table (`t_dokusya`, `t_dokusya_rireki`) still references
   * the hanbaiten — the literal customer-facing message lives in
   * `CONFLICT_MESSAGE` above so the FE toast doesn't have to
   * substitute. §4.5 + §4.6 share one transaction (soft-delete +
   * audit log). §4.8 emits an error log (log_type=3) OUTSIDE the
   * rolled-back transaction so the failure trace survives.
   */
  async remove(
    id: number,
    session: SessionPayload,
    req: Request,
  ): Promise<{ message: string }> {
    // [fetch-target] — also serves as before_value in audit log.
    // [data-scope] fetch unscoped, then assert by ja_id (out-of-JA → 404).
    const before = await this.repo.findOne({
      where: { hanbaitenId: id, deletedAt: IsNull() },
    });
    if (!before) throw new NotFoundException('販売店');
    assertJaScope(before.jaId, session, '販売店');

    // [fk-conflict-check] — short-circuits BEFORE [soft-delete] below.
    // ConflictException is a user-fixable 409, not an internal failure
    // that warrants an error log, so this lives outside the try/catch.
    for (const { table, hasDeletedAt } of RELATED_TABLES) {
      const sql = hasDeletedAt
        ? `SELECT COUNT(*) AS count FROM ${table} WHERE hanbaiten_id = $1 AND deleted_at IS NULL`
        : `SELECT COUNT(*) AS count FROM ${table} WHERE hanbaiten_id = $1`;
      const rows = await this.dataSource.query(sql, [id]);
      const count = Number(rows?.[0]?.count ?? 0);
      if (count > 0) {
        throw new ConflictException(CONFLICT_MESSAGE);
      }
    }

    try {
      await this.dataSource.transaction(async (manager) => {
        // [soft-delete]
        await manager.update(
          Hanbaiten,
          { hanbaitenId: id, deletedAt: IsNull() },
          {
            deletedAt: new Date(),
            updatedBy: String(session.account_id),
          },
        );

        // [audit-log-in-tx] — atomicity holds because the audit INSERT
        // joins the transaction via `manager` (omitting it would route
        // through the standalone repo and survive a rollback → orphan
        // audit row).
        await this.auditLog.logDelete(
          buildAuditCtx(session, req, SCREEN_NAME, TABLE_NAME, id),
          before,
          manager,
        );
      });

      return { message: '削除しました。' };
    } catch (err) {
      // [audit-error-log] — OUTSIDE the rolled-back tx so the trace
      // survives even when the business write was discarded. No `manager`
      // here — a manager-bound INSERT would also be rolled back.
      await this.auditLog.logError(
        buildAuditCtx(session, req, SCREEN_NAME, TABLE_NAME, id),
        AuditOperation.DELETE,
        err as Error,
      );
      throw err;
    }
  }

  // ─── ACSMS-API-017-001 — GET /api/v1/hanbaiten/:hanbaiten_id ─────────
  /**
   * Fetch the joined detail row for the edit form. §4.3 DataScope: rows
   * outside the caller's JA resolve to `null` (mask cross-JA existence)
   * → 404. NICHINO_STAFF / NICHINO_ADMIN (session.ja_id == null) bypass
   * the narrow.
   */
  async getHanbaitenDetail(
    hanbaitenId: number,
    session: SessionPayload,
  ): Promise<{ data: HanbaitenDetailResponse }> {
    const row = await this.buildDetailQuery(hanbaitenId, session).getRawOne<
      HanbaitenDetailRow
    >();
    if (!row) {
      throw new NotFoundException('販売店');
    }
    return { data: toHanbaitenDetail(row) };
  }

  // ─── ACSMS-API-017-002 — POST /api/v1/hanbaiten ──────────────────────
  /**
   * Create a new 販売店. §4.3 duplicate guard scoped to the caller's JA.
   * §4.4 INSERT + §4.5 audit log share one transaction so the trail
   * never disagrees with persisted state. §4.7 error log lives outside
   * the rolled-back tx so the failure trace survives.
   *
   * For NICHINO_STAFF (代行入力, session.ja_id null) the JA assignment
   * falls back to the body's `ja_id` field; for scoped roles the
   * session's ja_id wins (any body-supplied ja_id is ignored).
   */
  async createHanbaiten(
    dto: CreateHanbaitenDto,
    session: SessionPayload,
    req: Request,
  ): Promise<{ data: HanbaitenDetailResponse; message: string }> {
    const codeService = this.requireCodeService();

    // [input-validation] — DTO-shape passed ValidationPipe; service runs:
    //   (a) [code-master-check] m_code allow-list (runtime list, can't live in DTO).
    //   (b) cross-field conditional-required on No.17~23 when itaku_kubun=1.
    assertMCodeValues(codeService, [
      {
        field: 'itaku_kubun',
        value: dto.itaku_kubun,
        category: 'ITAKU_KUBUN',
        label: '委託区分',
      },
      {
        field: 'furikomi_tesuryo_futan_kubun',
        value: dto.furikomi_tesuryo_futan_kubun,
        category: 'TESURYO_KUBUN',
        label: '振込手数料負担区分',
      },
      {
        field: 'yokin_shubetsu',
        value: dto.yokin_shubetsu,
        category: 'YOKIN_SHUBETSU',
        label: '口座種別',
      },
    ]);
    assertConditionalRequired(dto);

    // [data-scope] ja_id resolution. NICHINO_* (session.ja_id null) acts
    // on behalf of an arbitrary JA via 代行入力 — fall back to dto.ja_id
    // (formalized as an optional field on CreateHanbaitenDto). Scoped
    // roles always use the session value; their body's ja_id is ignored
    // to block cross-tenant injection.
    const effectiveJaId =
      session.ja_id ?? (dto.ja_id === undefined ? null : Number(dto.ja_id));
    if (effectiveJaId === null || effectiveJaId === undefined) {
      throw new ValidationException([
        { field: 'ja_id', message: 'JA IDは必須です。' },
      ]);
    }

    // FK guard + Layer 4 DataScope — haitatsuryo_tanka_id (optional)
    // must exist AND belong to the same JA as the hanbaiten being
    // created. Without the scope check a CHUOKAI user could forge a
    // tanka_id from a different JA into the body, creating cross-tenant
    // data corruption.
    if (
      dto.haitatsuryo_tanka_id !== undefined &&
      dto.haitatsuryo_tanka_id !== null
    ) {
      await fetchFkInJa(
        this.requireTankaRepo(),
        'tankaId',
        dto.haitatsuryo_tanka_id,
        effectiveJaId,
        '配達手数料単価',
      );
    }

    // [uniqueness-check] — (ja_id, hanbaiten_code) is UNIQUE.
    // `withDeleted: true` — code reuse is forbidden across lifetime (a
    // code is reserved for the row even after logical delete), matching
    // the DB UNIQUE INDEX which does not filter on deleted_at.
    const dupes = await this.repo.count({
      where: {
        jaId: effectiveJaId,
        hanbaitenCode: dto.hanbaiten_code,
      },
      withDeleted: true,
    });
    if (dupes > 0) {
      throw new DuplicateCodeException('販売店コード', dto.hanbaiten_code);
    }

    const newRow: Partial<Hanbaiten> = {
      jaId: effectiveJaId,
      hanbaitenCode: dto.hanbaiten_code,
      hanbaitenName: dto.hanbaiten_name,
      hanbaitenNameKana: dto.hanbaiten_name_kana ?? '',
      torihikisakiNo: dto.torihikisaki_no ?? '',
      todofukenCode: dto.todofuken_code ?? '',
      yubinNo: dto.yubin_no ?? '',
      address: dto.address ?? '',
      tel: dto.tel ?? '',
      fax: dto.fax ?? '',
      shochoName: dto.shocho_name ?? '',
      itakuKubun: dto.itaku_kubun ?? null,
      haitatsuryoTankaId: dto.haitatsuryo_tanka_id ?? null,
      haitatsuryoShiharaiCycle: dto.haitatsuryo_shiharai_cycle ?? null,
      furikomiTesuryoFutanKubun: dto.furikomi_tesuryo_futan_kubun ?? null,
      furikomiTesuryo: dto.furikomi_tesuryo ?? null,
      bankCode: dto.bank_code ?? '',
      bankName: dto.bank_name ?? '',
      bankBranchCode: dto.bank_branch_code ?? '',
      bankBranchName: dto.bank_branch_name ?? '',
      yokinShubetsu: dto.yokin_shubetsu ?? null,
      kozaNo: dto.koza_no ?? '',
      kozaMeigi: dto.koza_meigi ?? '',
      haitenFlg: dto.haiten_flg ?? false,
      biko: dto.biko ?? '',
      createdBy: String(session.account_id),
      updatedBy: String(session.account_id),
    };

    const auditCtxFactory = (targetId: number | null) =>
      buildAuditCtx(session, req, SCR017_SCREEN_NAME, TABLE_NAME, targetId);

    let savedId: number;
    try {
      savedId = await this.dataSource.transaction(async (manager) => {
        // [business-insert] — `manager.save(Entity, value)` returns the
        // hydrated row with the IDENTITY-generated hanbaiten_id.
        const saved = await manager.save(Hanbaiten, newRow);
        const insertedId = Number(saved.hanbaitenId);

        // [audit-log-in-tx] — business write + audit row commit (or roll
        // back) together. `manager` MUST be passed.
        await this.auditLog.logCreate(
          auditCtxFactory(insertedId),
          saved,
          manager,
        );

        return insertedId;
      });
    } catch (err) {
      // Race-condition safety net: 2 concurrent CREATE requests can
      // both pass the pre-check, then the second INSERT hits the DB
      // UNIQUE INDEX. Convert that 23505 into a clean 400 instead of
      // letting it bubble as 500.
      if (isUniqueViolation(err)) {
        await this.auditLog.logError(
          auditCtxFactory(null),
          AuditOperation.CREATE,
          err as Error,
        );
        throw new DuplicateCodeException('販売店コード', dto.hanbaiten_code);
      }
      // [audit-error-log] — OUTSIDE the rolled-back tx so the failure
      // trace survives.
      await this.auditLog.logError(
        auditCtxFactory(null),
        AuditOperation.CREATE,
        err as Error,
      );
      throw err;
    }

    // [reread-after-write] — re-read the joined row so the response
    // carries everything (mirrors api.md §3 レスポンスデータ).
    const row = await this.buildDetailQuery(savedId, session).getRawOne<
      HanbaitenDetailRow
    >();
    if (!row) {
      // Defensive — would only fire if the inserted row vanished
      // between commit and SELECT (race).
      throw new NotFoundException('販売店');
    }
    return { data: toHanbaitenDetail(row), message: '登録しました。' };
  }

  // ─── ACSMS-API-017-003 — PUT /api/v1/hanbaiten/:hanbaiten_id ─────────
  /**
   * Update the target 販売店. §4.3 existence check is also the
   * DataScope guard — out-of-scope rows mask as 404. `hanbaiten_code`
   * is excluded by the UpdateDto + `forbidNonWhitelisted: true` so
   * the column never makes it into the update partial. §4.5 audit log
   * captures before + after snapshots.
   */
  async updateHanbaiten(
    hanbaitenId: number,
    dto: UpdateHanbaitenDto,
    session: SessionPayload,
    req: Request,
  ): Promise<{ data: HanbaitenDetailResponse; message: string }> {
    const codeService = this.requireCodeService();

    assertMCodeValues(codeService, [
      {
        field: 'itaku_kubun',
        value: dto.itaku_kubun,
        category: 'ITAKU_KUBUN',
        label: '委託区分',
      },
      {
        field: 'furikomi_tesuryo_futan_kubun',
        value: dto.furikomi_tesuryo_futan_kubun,
        category: 'TESURYO_KUBUN',
        label: '振込手数料負担区分',
      },
      {
        field: 'yokin_shubetsu',
        value: dto.yokin_shubetsu,
        category: 'YOKIN_SHUBETSU',
        label: '口座種別',
      },
    ]);
    assertConditionalRequired(dto);

    // [fetch-target] existence + [data-scope] guard — fetch unscoped, then
    // assert by ja_id (out-of-scope → 404; NICHINO_* bypass in the helper).
    const before = await this.repo.findOne({
      where: { hanbaitenId, deletedAt: IsNull() },
    });
    if (!before) {
      throw new NotFoundException('販売店');
    }
    assertJaScope(before.jaId, session, '販売店');

    // FK guard + Layer 4 DataScope — new haitatsuryo_tanka_id (when
    // provided) must exist AND belong to the SAME JA as the existing
    // hanbaiten (before.jaId). For restricted roles this equals
    // session.ja_id; for NICHINO_* operating on an arbitrary JA's row
    // it stays bound to that JA.
    if (
      dto.haitatsuryo_tanka_id !== undefined &&
      dto.haitatsuryo_tanka_id !== null
    ) {
      await fetchFkInJa(
        this.requireTankaRepo(),
        'tankaId',
        dto.haitatsuryo_tanka_id,
        Number(before.jaId),
        '配達手数料単価',
      );
    }

    // [partial-update] — NEVER include `jaId` (ownership is immutable
    // per api.md §4.4 — WHERE ja_id = :ja_id clause) and NEVER include
    // `hanbaitenCode` (更新不可).
    const updatePartial: Partial<Hanbaiten> = {
      hanbaitenName: dto.hanbaiten_name,
      hanbaitenNameKana: dto.hanbaiten_name_kana ?? '',
      torihikisakiNo: dto.torihikisaki_no ?? '',
      todofukenCode: dto.todofuken_code ?? '',
      yubinNo: dto.yubin_no ?? '',
      address: dto.address ?? '',
      tel: dto.tel ?? '',
      fax: dto.fax ?? '',
      shochoName: dto.shocho_name ?? '',
      itakuKubun: dto.itaku_kubun ?? null,
      haitatsuryoTankaId: dto.haitatsuryo_tanka_id ?? null,
      haitatsuryoShiharaiCycle: dto.haitatsuryo_shiharai_cycle ?? null,
      furikomiTesuryoFutanKubun: dto.furikomi_tesuryo_futan_kubun ?? null,
      furikomiTesuryo: dto.furikomi_tesuryo ?? null,
      bankCode: dto.bank_code ?? '',
      bankName: dto.bank_name ?? '',
      bankBranchCode: dto.bank_branch_code ?? '',
      bankBranchName: dto.bank_branch_name ?? '',
      yokinShubetsu: dto.yokin_shubetsu ?? null,
      kozaNo: dto.koza_no ?? '',
      kozaMeigi: dto.koza_meigi ?? '',
      haitenFlg: dto.haiten_flg ?? false,
      biko: dto.biko ?? '',
      updatedBy: String(session.account_id),
    };

    const auditCtx = buildAuditCtx(
      session,
      req,
      SCR017_SCREEN_NAME,
      TABLE_NAME,
      hanbaitenId,
    );

    try {
      await this.dataSource.transaction(async (manager) => {
        await manager.update(Hanbaiten, { hanbaitenId }, updatePartial);

        // Re-read INSIDE the tx so the audit after_value reflects the
        // post-update state with the same isolation level as the write.
        const refreshed = await manager.findOne(Hanbaiten, {
          where: { hanbaitenId, deletedAt: IsNull() },
        });
        const after = refreshed ?? { ...before, ...updatePartial };

        await this.auditLog.logUpdate(auditCtx, before, after, manager);
      });
    } catch (err) {
      await this.auditLog.logError(auditCtx, AuditOperation.UPDATE, err as Error);
      throw err;
    }

    // [reread-after-write] — re-read joined row for response.
    const row = await this.buildDetailQuery(hanbaitenId, session).getRawOne<
      HanbaitenDetailRow
    >();
    if (!row) {
      throw new NotFoundException('販売店');
    }
    return { data: toHanbaitenDetail(row), message: '更新しました。' };
  }

  // ─── helpers ─────────────────────────────────────────────────────────
  /**
   * Build the joined detail SELECT used by GET, create-then-read, and
   * update-then-read. Filters `deleted_at IS NULL` so soft-deleted rows
   * surface as "not found"; DataScope-narrows by `ja_id` for scoped
   * roles (NICHINO_* bypass).
   */
  private buildDetailQuery(hanbaitenId: number, session: SessionPayload) {
    const qb = this.repo
      .createQueryBuilder('h')
      .select([
        'h.hanbaiten_id AS hanbaiten_id',
        'h.ja_id AS ja_id',
        'h.hanbaiten_code AS hanbaiten_code',
        'h.hanbaiten_name AS hanbaiten_name',
        'h.hanbaiten_name_kana AS hanbaiten_name_kana',
        'h.torihikisaki_no AS torihikisaki_no',
        'h.todofuken_code AS todofuken_code',
        'h.yubin_no AS yubin_no',
        'h.address AS address',
        'h.tel AS tel',
        'h.fax AS fax',
        'h.shocho_name AS shocho_name',
        'h.itaku_kubun AS itaku_kubun',
        'h.haitatsuryo_tanka_id AS haitatsuryo_tanka_id',
        'h.haitatsuryo_shiharai_cycle AS haitatsuryo_shiharai_cycle',
        'h.furikomi_tesuryo_futan_kubun AS furikomi_tesuryo_futan_kubun',
        'h.furikomi_tesuryo AS furikomi_tesuryo',
        'h.bank_code AS bank_code',
        'h.bank_name AS bank_name',
        'h.bank_branch_code AS bank_branch_code',
        'h.bank_branch_name AS bank_branch_name',
        'h.yokin_shubetsu AS yokin_shubetsu',
        'h.koza_no AS koza_no',
        'h.koza_meigi AS koza_meigi',
        'h.haiten_flg AS haiten_flg',
        'h.biko AS biko',
        'h.created_at AS created_at',
        'h.updated_at AS updated_at',
      ])
      .where('h.hanbaiten_id = :hanbaitenId', { hanbaitenId })
      .andWhere('h.deleted_at IS NULL');

    // [data-scope] — narrow by ja_id for scoped roles (NICHINO_* bypass —
    // their session.ja_id is null so applyJaScope is a no-op).
    applyJaScope(qb, 'h', 'jaId', session);

    return qb;
  }

  // ─── SCR-019 取込 concern — HanbaitenImportService への委譲 ───────────
  /**
   * Canonical 23-column header list — also referenced by integration
   * specs to assert the template payload. Delegates to
   * HanbaitenImportService（取込 concern を切り出し済み）。
   */
  getImportTemplateColumns(): string[] {
    return this.requireImportService().getImportTemplateColumns();
  }

  /**
   * ACSMS-API-019-001 — GET /api/v1/hanbaiten/import/template。
   * 取込テンプレート Excel を生成。HanbaitenImportService へ委譲。
   */
  async downloadImportTemplate(session: SessionPayload): Promise<Buffer> {
    return this.requireImportService().downloadImportTemplate(session);
  }

  /**
   * ACSMS-API-019-002 — POST /api/v1/hanbaiten/import。
   * 販売店一括Excel取込。HanbaitenImportService へ委譲。
   */
  async importExcel(
    body: ImportHanbaitenDto,
    session: SessionPayload,
    req: Request,
  ): Promise<{
    data: {
      import_mode: string;
      total_rows: number;
      created_count: number;
      updated_count: number;
      skipped_count: number;
      imported_at: string;
    };
    message: string;
  }> {
    return this.requireImportService().importExcel(body, session, req);
  }
}
