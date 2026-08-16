import { Injectable, Logger, Optional } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, IsNull, Repository, type SelectQueryBuilder } from 'typeorm';
import type { Request } from 'express';

import { AuditOperation, ItakuKubun } from '@/common/enums';
import { HANBAITEN_DUMMY_CODE } from '@/common/constants/hanbaiten-dummy.constant';
import { TANKA_TYPE_HAITATSURYO } from '@/common/constants/tanka-type.constant';
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
import { paginate, clampPerPage, type PaginatedResponse } from '@/common/utils/paginate';
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

/** 監査コンテキスト用ラベル（api.md §4.6 INSERT INTO t_log）。 */
const SCREEN_NAME = '販売店明細検索画面 (ACSMS-SCR-018)';
const SCR017_SCREEN_NAME = '販売店情報登録画面 (ACSMS-SCR-017)';
const TABLE_NAME = 'm_hanbaiten';

/**
 * itaku_kubun===1（振込）のとき必須になる項目（画面設計書 v1.2 §3.1）。
 * クロスフィールド規則なのでサービス層で検証（DTOの`@ValidateIf`は
 * 検証器を横結合し、部分入力時に英語メッセージが漏れる）。
 */
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
 * itaku_kubun===1で空の全項目を1つのVALIDATION_ERRORに集約して投げる。
 * shapeは`ValidationPipe`出力と一致 → FEの`useApiForm`が両経路を統一的に
 * `<a-form-item :help>`へマップできる。
 */
function assertConditionalRequired(
  dto: CreateHanbaitenDto | UpdateHanbaitenDto,
): void {
  if (dto.itaku_kubun !== ItakuKubun.FURIKOMI) return;
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
 * 公開`sort_by`値→実SQL列パスのホワイトリスト。DTOの`@IsIn`が未知キーを
 * 拒否済みで、これは`ORDER BY ${user_input}`注入への静的型ガード。
 * 画面設計書 v1.2 §8.1 でローカル2列のみ公開。
 */
const SORT_COLUMN_MAP: Record<HanbaitenSearchSortBy, string> = {
  hanbaiten_code: 'm.hanbaiten_code',
  hanbaiten_name: 'm.hanbaiten_name',
  // 既定順（HANBAITEN_SEARCH_SORT_BY）。updated_atは全書込(@UpdateDateColumn)で
  // 更新されるので最終更新が先頭。下のm.hanbaiten_id DESCタイブレーカーと組み、
  // 同一updated_atのバッチ取込でも新しい挿入が先頭で決定的に並ぶ。
  updated_at: 'm.updated_at',
};

/**
 * 非ソフト削除行が販売店を参照していると DELETE をブロックするテーブル
 * （api.md §4.4）。依存テーブル追加=ここに追記。
 *
 * NOTE: `t_dokusya_rireki`は 購読者(dokusya) SCRがテーブルを作るまで意図的に
 * 省略。含めると prod で全 DELETE が 500（テーブル未存在）。dokusya migration
 * マージ後に `{ table: 't_dokusya_rireki', hasDeletedAt: false }` 行 +
 * 対応 spec を復活。api.md §4.4 ACSMS-SCR-018 は両テーブルを列挙 — 意図的な一時逸脱。
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
 * CONFLICT メッセージリテラル（ACSMS-MSG-018-004 / 画面設計書 v1.2 §7.2）。
 * 顧客承認の文言を再翻訳せず FE トーストへ届けるため、既定
 * `ConflictException()` でなくここでインライン化。
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
    // `@Optional()` で SCR-018 の4引数 spec を構築可能に。SCR-017
    // (getDetail / create / update) は必須で、各メソッド内の
    // `requireCodeService()` ガードが未注入時に throw。
    @Optional() private readonly codeService?: CodeService,
    // `@Optional()` — codeService と同理由。SCR-017 create/update は
    // `requireTankaRepo()` 経由の FK ガードで未注入時に throw。
    @Optional()
    @InjectRepository(Tanka)
    private readonly tankaRepo?: Repository<Tanka>,
    // `@Optional()` + 末尾追加 — SCR-018 4引数 / SCR-017 6引数 spec が未指定で
    // 構築可能に。SCR-019 取込 3 API は `requireImportService()` 経由で利用し、
    // 未配線時は loudly throw。
    @Optional()
    private readonly importService?: HanbaitenImportService,
  ) {}

  /**
   * SCR-017 create/update 用ランタイムガード — Tanka repo 無しでは
   * `haitatsuryo_tanka_id` を検証できない。spec が未配線なら throw。
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
   * SCR-017 用ランタイムガード — キャッシュ済み m_code allow-list 無しでは
   * 動作不可。SCR-018 4引数構築では `codeService` が undefined。誤設定テストで
   * SCR-017 経路が走ると throw（実運用では起きない）。
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
   * SCR-019 取込 用ランタイムガード — HanbaitenImportService へ委譲。
   * SCR-018-only spec は未注入で構築するため、取込経路が走ると throw。
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
   * `m_hanbaiten` のページング検索。§4.3 DataScope 適用：NICHINO_* は無制限
   * (session.ja_id == null)、CHUOKAI / JA_HONTEN / JA_KANRI_SHITEN は自 `ja_id`
   * に限定。JA_KANRI_SHITEN は kanri_shiten_id で更に絞らず、自 JA の全販売店を見る。
   *
   * `todofuken_name` は本体クエリ後に `m_todofuken` からバッチ解決（行毎 JOIN
   * でなく1往復）。既定で `haiten_flg = false`、`query.haiten_flg=true` で 廃店 も表示。
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

    qb.where('m.deleted_at IS NULL');

    // [data-scope] restricted role は ja_id=session.ja_id、NICHINO_* は bypass。
    applyJaScope(qb, 'm', 'jaId', session);

    // [staff-ja-filter] NICHINO_STAFF(session.ja_id==null) は 代行入力フォームの
    // JA ドロップダウンで指定した ja_id で1JAに絞る。CHUOKAI の他JA id 混入も防ぐ。
    if (session.ja_id == null && query.ja_id !== undefined) {
      qb.andWhere('m.ja_id = :qja', { qja: query.ja_id });
    }

    // [filter] haiten_flg 完全一致。未チェック/省略→営業中(false 既定)、チェック→廃店(true)
    // （顧客 2026-05-26: ラベル「廃店を含む」→「廃店フラグ」）。
    qb.andWhere('m.haiten_flg = :haitenFlg', {
      haitenFlg: query.haiten_flg === true,
    });

    // [filter] ILIKE 部分一致（各 query が非空のときのみ発行）。
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

    // 有効単価フラグ（SCR-021 error gate・顧客要件2026-07）。配達手数料単価
    // (tanka_type=2) の active_flg で絞込（true=有効/false=失効/省略=両方）。
    // 非相関サブクエリ IN を使う理由: 相関 EXISTS は pg-mem が外側 m を解決できず、
    // INNER JOIN は getManyAndCount+take/skip で orderBy 合成が壊れる。NULL 行は除外。
    if (query.active_tanka_flg !== undefined) {
      qb.andWhere(
        `m.haitatsuryo_tanka_id IN (
          SELECT mti.tanka_id FROM m_tanka mti
           WHERE mti.tanka_type = ${TANKA_TYPE_HAITATSURYO}
             AND mti.deleted_at IS NULL
             AND mti.active_flg = :activeTankaFlg
        )`,
        { activeTankaFlg: query.active_tanka_flg },
      );
    }

    // [sort-paginate] m.hanbaiten_id DESC は安定タイブレーカー（同一ソートキーの
    // バッチ取込を挿入順に並べる。primary は id でないので常に副キーとして効く）。
    const orderColumn = SORT_COLUMN_MAP[sort_by] ?? SORT_COLUMN_MAP.updated_at;
    qb.orderBy(orderColumn, sort_order)
      .addOrderBy('m.hanbaiten_id', 'DESC')
      .take(per_page)
      .skip((page - 1) * per_page);

    const [rows, total] = await qb.getManyAndCount();

    // todofuken_name を1往復でバッチ取得（ShitenService → kanri_shiten_name と
    // 同パターン）。行毎 JOIN より安く、親行はページサイズで上限。
    const codes = [...new Set(rows.map((r) => r.todofukenCode).filter(Boolean))];
    const todofukenRows =
      codes.length > 0
        ? await this.todofukenRepo.find({ where: { todofukenCode: In(codes) } })
        : [];
    const nameMap = new Map(
      todofukenRows.map((t) => [t.todofukenCode, t.todofukenName]),
    );

    // ja_code / ja_name を1往復でバッチ取得（上の todofuken_name と同パターン）。
    // NICHINO_STAFF は1 JA、JA スコープ役は同一 ja_id なので IN リストは極小。
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
   * 販売店プルダウン（hanbaiten_id / code / name の最小射影）。`applyJaScope`
   * で自 JA に限定、NICHINO_* は `query.ja_id` 指定時のみ絞込。ソフト削除除外。
   * 検索（q）/ ページング（page・per_page）/ 編集ピン（include_id）対応。
   * ページングは後方互換のため opt-in：`page` 未指定なら全件（has_more=false）。
   * match_field='name' で 販売店名のみ、既定（'both'）で 販売店コード OR 名称。
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
      /**
       * 電子版ダミー販売店(hanbaiten_code=9999999999)の扱い。SCR-011 の
       * 購読種別と連動：'only'=電子版、'exclude'=紙を含む種別。未指定は絞らない。
       */
      dummy?: 'only' | 'exclude';
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
      if (session.ja_id == null) {
        // dropdown は共有エンドポイントで @Permissions を掛けない
        // （[shared-dropdown-rule]）ため、hanbaiten.* を持たないロール
        // （NICHINO_ADMIN — seeder.md 参照）が ja_id==null bypass を悪用して
        // 全JAの販売店を閲覧できてしまっていた。ここで明示的に権限を確認する
        // （バグ報告 2026-08）。
        if (!session.permissions.includes('hanbaiten.view')) {
          qb.andWhere('1 = 0');
        } else if (query.ja_id !== undefined) {
          qb.andWhere('m.ja_id = :qja', { qja: query.ja_id });
        }
      }
      return qb;
    };

    const qb = buildScoped();
    HanbaitenService.applyDropdownFilters(qb, query);
    qb.orderBy('m.hanbaiten_code', 'ASC');

    const paginate = query.page !== undefined;
    const page = Math.max(query.page ?? 1, 1);
    const { rows: fetched, hasMore } = await HanbaitenService.fetchDropdownPage(
      qb,
      paginate ? { page, perPage: clampPerPage(query.per_page, 50) } : null,
    );
    const rows = fetched;

    // 編集ピン：選択中IDが結果に無ければ先頭に差込（ラベル解決用）。ページング時は
    // 1ページ目のみ。廃店フィルタで除外された既存選択もここで復元（haiten_flg を掛けない）。
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
   * 論理削除。§4.3 存在 + DataScope SELECT — スコープ外は `null` → NotFound で
   * マスクし他 JA の存在を隠す。§4.4 依存テーブル（`t_dokusya`,
   * `t_dokusya_rireki`）が参照中なら削除ブロック（顧客向け文言は上の
   * `CONFLICT_MESSAGE`）。§4.5 + §4.6 は1トランザクション（soft-delete + 監査）。
   * §4.8 エラーログ(log_type=3)はロールバック外で発行しトレースを残す。
   */
  async remove(
    id: number,
    session: SessionPayload,
    req: Request,
  ): Promise<{ message: string }> {
    // [fetch-target] — 監査 before_value も兼ねる。
    // [data-scope] 無スコープ取得後 ja_id で assert（他 JA → 404）。
    const before = await this.repo.findOne({
      where: { hanbaitenId: id, deletedAt: IsNull() },
    });
    if (!before) throw new NotFoundException('販売店');
    assertJaScope(before.jaId, session, '販売店');

    // [fk-conflict-check] — 下の [soft-delete] より前に短絡。ConflictException は
    // ユーザー修正可能な 409（内部失敗ではない）ので try/catch の外。
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

        // [audit-log-in-tx] — 監査 INSERT が `manager` 経由でトランザクションに
        // 参加するので原子性を保つ（省くと standalone repo 経由でロールバックを
        // 生き残り孤立監査行になる）。
        await this.auditLog.logDelete(
          buildAuditCtx(session, req, SCREEN_NAME, TABLE_NAME, id),
          before,
          manager,
        );
      });

      return { message: '削除しました。' };
    } catch (err) {
      // [audit-error-log] — ロールバック外でトレースを残す（業務書込破棄時も
      // 生存）。`manager` を渡さない — 渡すと INSERT もロールバックされる。
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
   * 編集フォーム用の結合詳細行を取得。§4.3 DataScope：自 JA 外は `null`（存在を
   * マスク）→ 404。NICHINO_STAFF / NICHINO_ADMIN (session.ja_id == null) は絞込回避。
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
   * 販売店を新規作成。§4.3 重複ガードは自 JA 範囲。§4.4 INSERT + §4.5 監査は
   * 1トランザクションで trail と永続状態が食い違わない。§4.7 エラーログは
   * ロールバック外でトレースを残す。
   *
   * NICHINO_STAFF（代行入力, session.ja_id null）は body の `ja_id` に fallback。
   * スコープ役は session の ja_id を採用（body の ja_id は無視）。
   */
  async createHanbaiten(
    dto: CreateHanbaitenDto,
    session: SessionPayload,
    req: Request,
  ): Promise<{ data: HanbaitenDetailResponse; message: string }> {
    const codeService = this.requireCodeService();

    // [input-validation] — DTO shape は ValidationPipe 通過済み。サービスで:
    //   (a) [code-master-check] m_code allow-list（実行時リストで DTO 不可）。
    //   (b) itaku_kubun=1 のとき No.17~23 のクロスフィールド必須。
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

    // [data-scope] ja_id 解決。NICHINO_*（session.ja_id null）は 代行入力 で任意 JA
    // を代行 — dto.ja_id（CreateHanbaitenDto の任意フィールド）に fallback。スコープ役は
    // 常に session 値を使い、body の ja_id は無視してクロステナント注入を防ぐ。
    const effectiveJaId =
      session.ja_id ?? (dto.ja_id === undefined ? null : Number(dto.ja_id));
    if (effectiveJaId === null || effectiveJaId === undefined) {
      throw new ValidationException([
        { field: 'ja_id', message: 'JA IDは必須です。' },
      ]);
    }

    // FK ガード + Layer 4 DataScope — haitatsuryo_tanka_id（任意）は存在し、かつ
    // 作成する販売店と同一 JA に属する必要がある。無いと CHUOKAI が他 JA の
    // tanka_id を body に偽装し、クロステナント破壊を起こせる。
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

    // [uniqueness-check] — (ja_id, hanbaiten_code) は UNIQUE。`withDeleted: true` —
    // コードは論理削除後も行に予約されコード再利用禁止。deleted_at で絞らない
    // DB UNIQUE INDEX に一致。
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
        // [business-insert] — `manager.save` は IDENTITY 生成の hanbaiten_id を
        // 持つ hydrate 済み行を返す。
        const saved = await manager.save(Hanbaiten, newRow);
        const insertedId = Number(saved.hanbaitenId);

        // [audit-log-in-tx] — 業務書込 + 監査行を一緒に commit/rollback。
        // `manager` を必ず渡す。
        await this.auditLog.logCreate(
          auditCtxFactory(insertedId),
          saved,
          manager,
        );

        return insertedId;
      });
    } catch (err) {
      // 競合安全網：並行する2つの CREATE が両方 pre-check を通過し、2つ目の
      // INSERT が DB UNIQUE INDEX に当たる。その 23505 を 500 でなく綺麗な 400 に変換。
      if (isUniqueViolation(err)) {
        await this.auditLog.logError(
          auditCtxFactory(null),
          AuditOperation.CREATE,
          err as Error,
        );
        throw new DuplicateCodeException('販売店コード', dto.hanbaiten_code);
      }
      // [audit-error-log] — ロールバック外でトレースを残す。
      await this.auditLog.logError(
        auditCtxFactory(null),
        AuditOperation.CREATE,
        err as Error,
      );
      throw err;
    }

    // [reread-after-write] — 結合行を再取得してレスポンスに全項目を載せる
    // （api.md §3 レスポンスデータ）。
    const row = await this.buildDetailQuery(savedId, session).getRawOne<
      HanbaitenDetailRow
    >();
    if (!row) {
      // 防御的 — commit と SELECT の間で挿入行が消えた場合(競合)のみ発火。
      throw new NotFoundException('販売店');
    }
    return { data: toHanbaitenDetail(row), message: '登録しました。' };
  }

  // ─── ACSMS-API-017-003 — PUT /api/v1/hanbaiten/:hanbaiten_id ─────────
  /**
   * 対象 販売店 を更新。§4.3 存在チェックが DataScope ガードも兼ねる — スコープ外は
   * 404 でマスク。`hanbaiten_code` は UpdateDto + `forbidNonWhitelisted: true` で
   * 更新 partial に入らない。§4.5 監査は before + after を記録。
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

    // [fetch-target] 存在 + [data-scope] ガード — 無スコープ取得後 ja_id で assert
    // （スコープ外 → 404、NICHINO_* は helper で回避）。
    const before = await this.repo.findOne({
      where: { hanbaitenId, deletedAt: IsNull() },
    });
    if (!before) {
      throw new NotFoundException('販売店');
    }
    assertJaScope(before.jaId, session, '販売店');

    // FK ガード + Layer 4 DataScope — 新 haitatsuryo_tanka_id（指定時）は存在し、
    // 既存販売店(before.jaId)と同一 JA に属する必要がある。制限役では session.ja_id
    // と一致、NICHINO_* が任意 JA の行を操作する場合もその JA に束縛される。
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

    // [partial-update] — `jaId` は決して含めない（所有は不変・api.md §4.4
    // WHERE ja_id = :ja_id）。`hanbaitenCode` も含めない（更新不可）。
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

        // tx 内で再読込 — 監査 after_value が書込と同一分離レベルで更新後状態を反映。
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

    // [reread-after-write] — レスポンス用に結合行を再取得。
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
   * GET / create-then-read / update-then-read で使う結合詳細 SELECT を構築。
   * `deleted_at IS NULL` で絞りソフト削除行は "not found" 扱い。スコープ役は
   * `ja_id` で DataScope 絞込（NICHINO_* は回避）。
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

    // [data-scope] — スコープ役は ja_id で絞込（NICHINO_* は session.ja_id が null
    // なので applyJaScope は no-op）。
    applyJaScope(qb, 'h', 'jaId', session);

    return qb;
  }

  // ─── SCR-019 取込 concern — HanbaitenImportService への委譲 ───────────
  /**
   * 正準 23 列ヘッダ一覧（integration spec もテンプレート検証に参照）。
   * HanbaitenImportService へ委譲。
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

  /**
   * dropdown の絞り込み条件（営業中・ダミー販売店・検索語）。
   *
   * - active_only=true（購読者の販売店選択：登録/編集）のみ営業中に絞り、
   *   廃店(haiten_flg=true)を新規選択から除外。既に廃店へ紐づく購読者の編集は
   *   include_id ピン（haiten_flg を掛けない）で現在の選択を復元する。
   *   既定（一覧検索・販売店入替）は廃店も対象。
   * - 電子版(購読種別=2)はダミー販売店だけ、それ以外はダミーを除外。include_id
   *   ピンより前に掛ける（ピンは別クエリなので種別に合わない現在値は混ざらない）。
   */
  private static applyDropdownFilters(
    qb: SelectQueryBuilder<Hanbaiten>,
    query: {
      q?: string;
      match_field?: 'both' | 'name';
      active_only?: boolean;
      dummy?: 'only' | 'exclude';
    },
  ): void {
    if (query.active_only) {
      qb.andWhere('m.haiten_flg = false');
    }
    if (query.dummy === 'only') {
      qb.andWhere('m.hanbaiten_code = :dummyCode', {
        dummyCode: HANBAITEN_DUMMY_CODE,
      });
    } else if (query.dummy === 'exclude') {
      qb.andWhere('m.hanbaiten_code <> :dummyCode', {
        dummyCode: HANBAITEN_DUMMY_CODE,
      });
    }
    if (!query.q) return;
    const like = `%${query.q}%`;
    if (query.match_field === 'name') {
      qb.andWhere('m.hanbaiten_name ILIKE :q', { q: like });
    } else {
      qb.andWhere('(m.hanbaiten_code ILIKE :q OR m.hanbaiten_name ILIKE :q)', {
        q: like,
      });
    }
  }

  /**
   * ページング取得。`paging` が null なら全件（従来の非ページング呼び出し）。
   * take(perPage + 1) で次ページ有無を1クエリ判定する。
   */
  private static async fetchDropdownPage(
    qb: SelectQueryBuilder<Hanbaiten>,
    paging: { page: number; perPage: number } | null,
  ): Promise<{ rows: Hanbaiten[]; hasMore: boolean }> {
    if (!paging) {
      return { rows: await qb.getMany(), hasMore: false };
    }
    const { page, perPage } = paging;
    const rows = await qb
      .skip((page - 1) * perPage)
      .take(perPage + 1)
      .getMany();
    const hasMore = rows.length > perPage;
    return { rows: hasMore ? rows.slice(0, perPage) : rows, hasMore };
  }

}
