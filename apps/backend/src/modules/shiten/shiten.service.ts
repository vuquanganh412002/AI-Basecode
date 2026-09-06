import { Injectable, Logger } from '@nestjs/common';
import { AuditOperation } from '@/common/enums';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, IsNull, Repository } from 'typeorm';
import type { Request } from 'express';

import { Shiten } from '@/database/entities/shiten.entity';
import { KanriShiten } from '@/database/entities/kanri-shiten.entity';
import { AuditLogService } from '@/modules/audit-log/audit-log.service';
import {
  DuplicateCodeException,
  NotFoundException,
  ValidationException,
} from '@/common/exceptions/common.exceptions';
import { buildAuditCtx } from '@/common/utils/audit-context';
import {
  applyBranchScope,
  applyShitenScope,
  assertBranchScope,
  assertBranchScopeViolation,
  assertJaScope,
  assertShitenScope,
  assertShitenScopeViolation,
  fetchFkInJa,
} from '@/common/utils/data-scope';
import { isUniqueViolation } from '@/common/utils/db-errors';
import {
  assertNoRelatedRows,
  type RelatedTableEntry,
} from '@/common/utils/fk-conflict';
import {
  filterAllowedFields,
  type FieldRestrictionTable,
} from '@/common/utils/field-restrictions';
import { paginate, type PaginatedResponse } from '@/common/utils/paginate';
import { pickString, pickNumber } from '@/common/utils/pick';
import { ScreenName } from '@/common/constants/screen-name.constant';
import { SuccessMessage } from '@/common/constants/success-message.constant';
import type { SessionPayload } from '@/modules/auth/session.service';

import { CreateShitenDto } from './dto/create-shiten.dto';
import { UpdateShitenDto } from './dto/update-shiten.dto';
import { SearchShitenDto, type ShitenSearchSortBy } from './dto/search-shiten.dto';
import { ShitenDetailDto } from './dto/shiten-detail.dto';
import { ShitenListItemDto } from './dto/shiten-list-item.dto';
import { toShitenDetail, toShitenListItem } from './shiten.mapper';

/** Per-screen audit-context labels. */
const TABLE_NAME = 'm_shiten';

/**
 * Field-level 制限テーブル (.claude/rules/security.md §Layer 3)。
 * 顧客要件 2026-05: JA_KANRI_SHITEN 以外は PUT で全列変更可 (`['*']`)。
 * JA_KANRI_SHITEN は同 shiten を編集できるが kanri_shiten_id は read-only
 * （親 kanri-shiten 割当は上位ロール所有）。FE は ShitenFormView.vue の 管理支店
 * select を :disabled でミラー (`[role5-locked-fields]`)。この BE テーブルが
 * 正の gate — curl で kanri_shiten_id を smuggle しても此処で silent drop。
 * NICHINO_ADMIN は顧客CR 2026-08-24 で shiten.update を正式付与済み（以前は
 * 未付与で guard に先に弾かれていた）。NICHINO_STAFF は依然 shiten.update
 * 権限なく guard で先に弾かれるため、ここに列挙するのは意図を grep 可能に
 * するため（実運用では到達しない）。
 */
const FIELD_RESTRICTIONS: FieldRestrictionTable = {
  shiten: {
    NICHINO_ADMIN: ['*'],
    NICHINO_STAFF: ['*'],
    CHUOKAI: ['*'],
    JA_HONTEN: ['*'],
    JA_KANRI_SHITEN: [
      'shiten_name',
      'shiten_name_kana',
      'kinyu_shiten_flg',
      'jastem_toriatsukai_tenpo_code',
      'jastem_tenpo_name',
      'jastem_tyokin_shubetsu',
      'jastem_koza_no',
      'biko',
      // kanri_shiten_id は意図的に除外 — role 5 は read-only。
    ],
  },
};

/**
 * Sort-by allow-list。shiten_code / shiten_name は local 列 (alias `m`)、
 * kanri_shiten_name は m_kanri_shiten (alias `ks`) にあり findAll で LEFT JOIN。
 * DTO の @IsIn が不明キーを弾き、この map が `ORDER BY ${user_input}` 注入への
 * static-typing ガードを追加。
 */
const SORT_COLUMN_MAP: Record<ShitenSearchSortBy, string> = {
  shiten_code: 'm.shiten_code',
  shiten_name: 'm.shiten_name',
  // camelCase プロパティ名 — alias `ks` は KanriShiten エンティティなので
  // TypeORM のメタデータ解決には snake_case DB 列でなくプロパティ名が要る
  // （take()/skip() が生成する DISTINCT サブクエリで解決失敗するため）。
  kanri_shiten_name: 'ks.kanriShitenName',
  updated_at: 'm.updated_at',
};

/**
 * shiten を参照する未削除行があると DELETE をブロックするテーブル
 * (ACSMS-SCR-006-api.md §4.4)。依存追加時に列挙。
 *
 * 不具合修正2026-08: `m_account.shiten_id` は実DBで
 * `ON DELETE RESTRICT` を明示宣言している（AlterMAccountAddShitenId /
 * CreateMAccount 参照）にもかかわらず、このアプリ層ガードには含まれて
 * いなかった。ソフト削除なので DB 制約自体は発火しないが、DB 設計者の
 * 意図（所属支店を持つアカウントがある間は削除させない）とアプリ層の
 * 実際の挙動がズレていたため追加する。
 */
const RELATED_TABLES: readonly RelatedTableEntry[] = [
  't_dokusya',
  'm_account',
  // 購読者履歴テーブル — append-only（deleted_at 列なし）。
  { table: 't_dokusya_rireki', hasDeletedAt: false },
];

@Injectable()
export class ShitenService {
  private readonly logger = new Logger(ShitenService.name);

  constructor(
    @InjectRepository(Shiten)
    private readonly repo: Repository<Shiten>,
    @InjectRepository(KanriShiten)
    private readonly kanriShitenRepo: Repository<KanriShiten>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly auditLog: AuditLogService,
  ) {}

  // ─── ACSMS-API-006-001 — GET /api/v1/shiten ────────────────────────────────
  /**
   * m_shiten のページ検索。§4.3 DataScope を3層で適用（顧客要件 2026-08 —
   * 2026-06 決定「JA_KANRI_SHITEN は同一 JA 全支店を一覧可」を上書き）:
   *   1) CHUOKAI / JA_HONTEN → ja_id = session.ja_id。
   *   2) JA_KANRI_SHITEN → kanri_shiten_id = session.kanri_shiten_id。
   *   3) さらに session.shiten_id が設定済み（自支店固定アカウント）なら
   *      shiten_id = session.shiten_id まで絞る（未設定なら 2) のまま）。
   * NICHINO_* は無制限（実務では shiten.view 未付与で guard 層が弾く）。
   */
  async findAll(
    query: SearchShitenDto,
    session: SessionPayload,
  ): Promise<PaginatedResponse<ShitenListItemDto>> {
    const page = query.page ?? 1;
    const per_page = query.per_page ?? 20;
    // 既定ソートは更新降順（直近作成/編集行を先頭に）。画面定義§8.1 の列
    // (shiten_code / shiten_name / kanri_shiten_name) はヘッダクリックで利用可。
    const sort_by: ShitenSearchSortBy =
      (query.sort_by as ShitenSearchSortBy) ?? 'updated_at';
    const sort_order = (query.sort_order ?? 'desc').toUpperCase() as 'ASC' | 'DESC';

    const qb = this.repo.createQueryBuilder('m');

    // [soft-delete-filter]
    qb.where('m.deleted_at IS NULL');

    // [data-scope] 閲覧スコープ（顧客要件 2026-08）:
    //   NICHINO_* → 絞らない / CHUOKAI・JA_HONTEN → ja_id = session.ja_id /
    //   JA_KANRI_SHITEN → kanri_shiten_id = session.kanri_shiten_id。
    applyBranchScope(
      qb,
      'm',
      { jaIdField: 'jaId', kanriShitenIdField: 'kanriShitenId' },
      session,
    );
    // [data-scope] 所属支店スコープ（顧客要件 2026-07）— session.shiten_id
    // 設定時のみ自支店へ絞る（no-op when null）。
    applyShitenScope(qb, 'm', 'shitenId', session);

    // [filter-conditions] — テキストは部分一致 (ILIKE)、kanri_shiten_id /
    // kinyu_shiten_flg は完全一致。kinyu_shiten_flg=undefined は「全選択」で絞らない。
    if (query.shiten_name) {
      qb.andWhere('m.shiten_name ILIKE :shiten_name', {
        shiten_name: `%${query.shiten_name}%`,
      });
    }
    if (query.shiten_code) {
      qb.andWhere('m.shiten_code ILIKE :shiten_code', {
        shiten_code: `%${query.shiten_code}%`,
      });
    }
    if (query.kanri_shiten_id !== undefined) {
      qb.andWhere('m.kanri_shiten_id = :kanri_shiten_id', {
        kanri_shiten_id: query.kanri_shiten_id,
      });
    }
    if (query.jastem_toriatsukai_tenpo_code) {
      qb.andWhere(
        'm.jastem_toriatsukai_tenpo_code ILIKE :jastem_toriatsukai_tenpo_code',
        {
          jastem_toriatsukai_tenpo_code: `%${query.jastem_toriatsukai_tenpo_code}%`,
        },
      );
    }
    if (query.kinyu_shiten_flg !== undefined) {
      qb.andWhere('m.kinyu_shiten_flg = :kinyu_shiten_flg', {
        kinyu_shiten_flg: query.kinyu_shiten_flg,
      });
    }

    // JOIN 列でのソートは JOIN 列が SELECT に居る必要がある — take()/skip() が
    // クエリを DISTINCT サブクエリで包み、外側 ORDER BY はサブクエリが露出した列しか
    // 参照できない。leftJoinAndSelect（leftJoin でなく）で ks.* を SELECT に入れ
    // ORDER BY ks.kanri_shiten_name を解決させる。local 列ソート時は JOIN 省略で軽量化。
    if (sort_by === 'kanri_shiten_name') {
      qb.leftJoinAndSelect('m.kanriShiten', 'ks');
    }

    // [sort-paginate]
    const orderColumn = SORT_COLUMN_MAP[sort_by] ?? SORT_COLUMN_MAP.shiten_code;
    qb.orderBy(orderColumn, sort_order)
      .take(per_page)
      .skip((page - 1) * per_page);

    const [rows, total] = await qb.getManyAndCount();

    // kanri_shiten_name を 1 往復でバッチ取得（行毎 JOIN より安価、親行はページ数で有界）。
    const ksIds = [...new Set(rows.map((r) => Number(r.kanriShitenId)))];
    const ksRows =
      ksIds.length > 0
        ? await this.kanriShitenRepo.find({
            where: { kanriShitenId: In(ksIds) },
          })
        : [];
    const ksNameMap = new Map(
      ksRows.map((k) => [Number(k.kanriShitenId), k.kanriShitenName]),
    );

    const data = rows.map((r) =>
      toShitenListItem(r, ksNameMap.get(Number(r.kanriShitenId)) ?? ''),
    );

    return paginate(data, total, page, per_page);
  }

  // ─── API-006-002 — DELETE /api/v1/shiten/:id ─────────────────────────
  /**
   * 論理削除。§4.3 存在 + DataScope SELECT（範囲外は null → NotFound で秘匿）。
   * §4.4 関連テーブル (t_dokusya) が参照中なら削除ブロック。§4.5 deleted_at=NOW()
   * + 同一トランザクションで audit log。§4.8 失敗時は rollback 外で error log (log_type=3)。
   */
  async remove(
    id: number,
    session: SessionPayload,
    req: Request,
  ): Promise<{ message: string }> {
    // [fetch-target] — audit log の before_value も兼ねる。
    const before = await this.repo.findOne({
      where: { shitenId: id, deletedAt: IsNull() },
    });
    if (!before) throw new NotFoundException('支店');
    // [data-scope] 顧客要件 2026-08 — 3段階:
    //   1) 別 JA は 404（存在を秘匿）。
    //   2) JA_KANRI_SHITEN が同一 JA でも自管理支店配下でない行は 403
    //      （一覧で閲覧可能な行なので 404 で隠さず明示拒否）。
    //      CHUOKAI / JA_HONTEN は ja_id 判定なので同一 JA 内は素通り。
    //   3) session.shiten_id 固定アカウントは自支店以外の行を 403（no-op when null）。
    assertJaScope(before.jaId, session, '支店');
    assertBranchScopeViolation(before.jaId, before.kanriShitenId, session);
    assertShitenScopeViolation(before.shitenId, session);

    // [fk-conflict-check] — t_dokusya の競合チェック。ConflictException は
    // 意図的に下の try/catch を素通り — ユーザ修正可能な 409 であり error log 不要。
    await assertNoRelatedRows(this.dataSource, RELATED_TABLES, 'shiten_id', id);

    try {
      await this.dataSource.transaction(async (manager) => {
        // [soft-delete]
        await manager.update(
          Shiten,
          { shitenId: id, deletedAt: IsNull() },
          {
            deletedAt: new Date(),
            updatedBy: String(session.account_id),
          },
        );

        // [audit-log-in-tx] — 同一 tx で atomicity 担保。
        await this.auditLog.logDelete(
          buildAuditCtx(session, req, ScreenName.ACSMS_SCR_006, TABLE_NAME, id),
          before,
          manager,
        );
      });

      return { message: SuccessMessage.DELETED };
    } catch (err) {
      // [audit-error-log] — rollback 外なので業務書込みが破棄されても trace が残る。
      await this.auditLog.logError(
        buildAuditCtx(session, req, ScreenName.ACSMS_SCR_006, TABLE_NAME, id),
        AuditOperation.DELETE,
        err as Error,
      );
      throw err;
    }
  }

  // ─── ACSMS-API-COMMON — Shiten dropdown (SCR-011) ───────────────────
  /**
   * 購読者情報登録 (SCR-011) の 引落口座支店 picker と アカウント登録 (SCR-025) の
   * 所属支店 picker が使う最小 dropdown 投影。任意フィルタ: kanri_shiten_id
   * （選択管理支店配下のみ・顧客要件 2026-07）、kinyu_shiten_flg（金融機関支店のみ・口座引落用）。
   * applyBranchScope でスコープ制御。NICHINO_* は ja_id 指定なければ全 JA、
   * JA_KANRI_SHITEN は自 kanri_shiten_id に限定。削除行除外。q は shiten_name 部分一致 (ILIKE)。
   */
  async listDropdown(
    query: {
      ja_id?: number;
      kanri_shiten_id?: number;
      /**
       * 複数の管理支店で絞る（SCR-026 名簿出力は管理支店が複数選択のため）。
       * `kanri_shiten_id` と併用された場合は両方 AND で効く（実際の呼び出し側は
       * どちらか一方のみ送る）。空配列は「絞らない」ではなく「該当なし」——
       * 呼び出し側で未選択時は undefined を渡すこと。
       */
      kanri_shiten_ids?: number[];
      kinyu_shiten_flg?: boolean;
      q?: string;
    },
    session: SessionPayload,
  ): Promise<
    Array<{
      shiten_id: number;
      shiten_code: string;
      shiten_name: string;
      kanri_shiten_id: number;
      kinyu_shiten_flg: boolean;
      jastem_toriatsukai_tenpo_code: string;
      jastem_tenpo_name: string;
    }>
  > {
    const qb = this.repo
      .createQueryBuilder('m')
      .where('m.deleted_at IS NULL');
    applyBranchScope(
      qb,
      'm',
      { jaIdField: 'jaId', kanriShitenIdField: 'kanriShitenId' },
      session,
    );
    if (session.ja_id == null) {
      // dropdown は共有エンドポイントで @Permissions を掛けない
      // （[shared-dropdown-rule]）ため、shiten.view を持たないロール
      // （NICHINO_STAFF は seeder.md では ×）が ja_id==null bypass を
      // 悪用して全JAの支店を閲覧できてしまっていた（バグ報告 2026-08）。
      //
      // 顧客CR 2026-08-24 — NICHINO_ADMIN に shiten.view/create/update/delete
      // を正式付与（支店マスタ一覧画面のメニューも表示対象になる）したため、
      // 以前あった role_code 直接判定の特例（shiten.view 権限は付与しない
      // 前提での NICHINO_ADMIN 限定バイパス）は不要になった。以後は
      // permissions の実権限のみで判定する。
      if (!session.permissions.includes('shiten.view')) {
        qb.andWhere('1 = 0');
      } else if (query.ja_id !== undefined) {
        qb.andWhere('m.ja_id = :qja', { qja: query.ja_id });
      }
    }
    // 管理支店で絞り込む（顧客要件2026-07）。権限境界は applyBranchScope 済み、
    // これは選択管理支店配下のみに絞る UI 用フィルタ。
    if (query.kanri_shiten_id !== undefined) {
      qb.andWhere('m.kanri_shiten_id = :qks', { qks: query.kanri_shiten_id });
    }
    // 複数指定版（SCR-026）。空配列だと TypeORM が `IN ()` を生成して構文エラーに
    // なるため、長さ 0 は「絞らない」に倒す。
    if (query.kanri_shiten_ids !== undefined && query.kanri_shiten_ids.length > 0) {
      qb.andWhere('m.kanri_shiten_id IN (:...qksList)', {
        qksList: query.kanri_shiten_ids,
      });
    }
    if (query.kinyu_shiten_flg !== undefined) {
      qb.andWhere('m.kinyu_shiten_flg = :ksf', {
        ksf: query.kinyu_shiten_flg,
      });
    }
    if (query.q) {
      qb.andWhere('m.shiten_name ILIKE :q', { q: `%${query.q}%` });
    }
    qb.orderBy('m.shiten_code', 'ASC');
    const rows = await qb.getMany();
    return rows.map((r) => ({
      shiten_id: Number(r.shitenId),
      shiten_code: r.shitenCode,
      shiten_name: r.shitenName,
      kanri_shiten_id: Number(r.kanriShitenId),
      kinyu_shiten_flg: Boolean(r.kinyuShitenFlg),
      jastem_toriatsukai_tenpo_code: r.jastemToriatsukaiTenpoCode ?? '',
      jastem_tenpo_name: r.jastemTenpoName ?? '',
    }));
  }

  // ─── ACSMS-API-COMMON-008 — GET /api/v1/shiten/koza-dropdown ─────────
  /**
   * 口座支店（金融機関支店フラグ=TRUE）プルダウン (ACSMS-SCR-020)。
   * DataScope: ja_id = user.ja_id（JA_KANRI_SHITEN は kanri_shiten_id も絞込）。
   * 任意 kanri_shiten_ids でさらに絞込。
   */
  async getKozaDropdown(
    query: { kanri_shiten_ids?: number[] },
    session: SessionPayload,
  ): Promise<{
    data: Array<{
      shiten_id: number;
      shiten_code: string;
      shiten_name: string;
      kanri_shiten_id: number;
      // SCR-020: 選択した口座支店ごとに JASTEM 金融機関支店情報を表で表示する。
      jastem_toriatsukai_tenpo_code: string;
      jastem_tenpo_name: string;
      jastem_tyokin_shubetsu: string;
      jastem_koza_no: string;
    }>;
  }> {
    const qb = this.repo
      .createQueryBuilder('s')
      .where('s.deleted_at IS NULL')
      .andWhere('s.kinyu_shiten_flg = TRUE')
      .andWhere('s.ja_id = :jaId', { jaId: session.ja_id });
    // JA_KANRI_SHITEN は自管理支店のみ。
    if (session.kanri_shiten_id != null) {
      qb.andWhere('s.kanri_shiten_id = :userKsId', {
        userKsId: session.kanri_shiten_id,
      });
    }
    // 画面の絞込条件。
    if (query.kanri_shiten_ids && query.kanri_shiten_ids.length > 0) {
      qb.andWhere('s.kanri_shiten_id = ANY(:ksIds)', {
        ksIds: query.kanri_shiten_ids,
      });
    }
    qb.orderBy('s.shiten_code', 'ASC');
    const rows = await qb.getMany();
    return {
      data: rows.map((r) => ({
        shiten_id: Number(r.shitenId),
        shiten_code: r.shitenCode,
        shiten_name: r.shitenName,
        kanri_shiten_id: Number(r.kanriShitenId),
        jastem_toriatsukai_tenpo_code: r.jastemToriatsukaiTenpoCode ?? '',
        jastem_tenpo_name: r.jastemTenpoName ?? '',
        // NOT NULL DEFAULT '' 列 — shiten.mapper.ts と同じ '' フォールバックに
        // 揃える（以前は `|| '1'` で空文字を「普通貯金」に化けさせていた）。
        jastem_tyokin_shubetsu: r.jastemTyokinShubetsu ?? '',
        jastem_koza_no: r.jastemKozaNo ?? '',
      })),
    };
  }

  // ─── API-007-001 — GET /api/v1/shiten/:id ────────────────────────────
  /**
   * 編集フォーム用詳細。§4.3 DataScope（存在 + scope SELECT — 範囲外は null →
   * NotFound で秘匿）。顧客要件 2026-08（2026-06 決定を上書き）:
   * JA_KANRI_SHITEN は自 kanri_shiten 配下のみ、さらに session.shiten_id
   * 設定済みなら自支店のみ閲覧可。範囲外はいずれも 404（存在秘匿）。
   */
  async findById(
    id: number,
    session: SessionPayload,
  ): Promise<ShitenDetailDto> {
    // [data-scope] — unscoped 取得後 assert（範囲外は 404）。NICHINO_* は helper 内で bypass。
    const row = await this.repo.findOne({
      where: { shitenId: id, deletedAt: IsNull() },
    });
    if (!row) throw new NotFoundException('支店');
    assertBranchScope(row.jaId, row.kanriShitenId, session, '支店');
    assertShitenScope(row.shitenId, session, '支店');

    return toShitenDetail(row);
  }

  // ─── API-007-002 — POST /api/v1/shiten ───────────────────────────────
  /**
   * shiten 新規作成。§4.3 (ja_id, shiten_code) の一意性を強制、kanri_shiten_id の
   * m_kanri_shiten 存在も検証 (FK guard)。INSERT + audit log は 1 トランザクション、
   * 失敗時は rollback 外で error log。
   *
   * ja_id は原則 session 由来。NICHINO_ADMIN（顧客CR 2026-08-24 で shiten.create
   * 付与・session.ja_id が null）のみ代行入力として dto.ja_id（フォームの
   * BaseJaDropdown）へ fallback する（hanbaiten.service.ts の
   * [staff-ja-id] と同じパターン）。JA スコープロールは常に非 null の
   * session.ja_id を持ち、dto.ja_id を送っても無視される。
   */
  async create(
    dto: CreateShitenDto,
    session: SessionPayload,
    req: Request,
  ): Promise<ShitenDetailDto & { message: string }> {
    const effectiveJaId =
      session.ja_id ?? (dto.ja_id === undefined ? null : Number(dto.ja_id));
    if (effectiveJaId === null || effectiveJaId === undefined) {
      throw new ValidationException([
        { field: 'ja_id', message: 'JA IDは必須です。' },
      ]);
    }

    // FK guard + Layer 4 DataScope — kanri_shiten は存在かつ呼び出し元 JA 所属必須。
    // scope チェックなしだと CHUOKAI が別 JA の kanri_shiten_id を body に偽装し
    // cross-tenant データ破壊を起こせる。
    await fetchFkInJa(
      this.kanriShitenRepo,
      'kanriShitenId',
      dto.kanri_shiten_id,
      effectiveJaId,
      '管理支店',
    );

    // [uniqueness-check] — (ja_id, shiten_code)。soft-delete 行も含む
    // （コードは論理削除後も行の生存期間中は予約）。deleted_at で絞らない DB
    // UNIQUE INDEX と一致（以前 deletedAt: IsNull で絞り「削除→再作成」INSERT が
    // Service を素通り DB UNIQUE 制約 → 500 となった）。顧客ポリシー: 全マスタで
    // コード再利用禁止。
    const dup = await this.repo.findOne({
      where: { jaId: effectiveJaId, shitenCode: dto.shiten_code },
      withDeleted: true,
    });
    if (dup) {
      throw new DuplicateCodeException('支店コード', dto.shiten_code);
    }

    try {
      const saved = await this.dataSource.transaction(async (manager) => {
        // [business-insert]
        const entity = manager.create(Shiten, {
          jaId: effectiveJaId,
          shitenCode: dto.shiten_code,
          shitenName: dto.shiten_name,
          shitenNameKana: dto.shiten_name_kana ?? '',
          kinyuShitenFlg: dto.kinyu_shiten_flg ?? false,
          // JASTEM 店舗単位 4 列 — DTO は @Transform(blankToUndef) で空文字を
          // undefined 化。ここは ?? '' で欠損キーを空文字にマップ (NOT NULL)。
          jastemToriatsukaiTenpoCode: dto.jastem_toriatsukai_tenpo_code ?? '',
          jastemTenpoName: dto.jastem_tenpo_name ?? '',
          jastemTyokinShubetsu: dto.jastem_tyokin_shubetsu ?? '',
          jastemKozaNo: dto.jastem_koza_no ?? '',
          kanriShitenId: dto.kanri_shiten_id,
          biko: dto.biko ?? '',
          createdBy: String(session.account_id),
          updatedBy: String(session.account_id),
        });
        const created = await manager.save(entity);

        // [audit-log-in-tx] — 同一 tx で atomicity 担保。
        await this.auditLog.logCreate(
          buildAuditCtx(session, req, ScreenName.ACSMS_SCR_007, TABLE_NAME, created.shitenId),
          created,
          manager,
        );
        return created;
      });

      return {
        ...toShitenDetail(saved),
        message: SuccessMessage.CREATED,
      };
    } catch (err) {
      // 競合対策: 同時 CREATE 2 件が両方 pre-check を通過し 2 件目の INSERT が
      // DB UNIQUE INDEX に当たる。その 23505 を 500 でなく clean な 400 に変換。
      if (isUniqueViolation(err)) {
        await this.auditLog.logError(
          buildAuditCtx(session, req, ScreenName.ACSMS_SCR_007, TABLE_NAME, null),
          AuditOperation.CREATE,
          err as Error,
        );
        throw new DuplicateCodeException('支店コード', dto.shiten_code);
      }
      // [audit-error-log] — rollback 外。
      await this.auditLog.logError(
        buildAuditCtx(session, req, ScreenName.ACSMS_SCR_007, TABLE_NAME, null),
        AuditOperation.CREATE,
        err as Error,
      );
      throw err;
    }
  }

  // ─── API-007-003 — PUT /api/v1/shiten/:id ────────────────────────────
  /**
   * 既存行の更新。§4.3 存在 + DataScope SELECT（範囲外は NotFound で秘匿）。
   * shiten_code は変更不可 — UpdateShitenDto は省略し smuggle 値は ValidationPipe
   * (forbidNonWhitelisted: true) で拒否。UPDATE + audit log は 1 トランザクション、
   * error log は rollback 外。
   */
  async update(
    id: number,
    dto: UpdateShitenDto,
    session: SessionPayload,
    req: Request,
  ): Promise<ShitenDetailDto & { message: string }> {
    // [fetch-target] 存在 + [data-scope] — unscoped 取得後 assert。顧客要件 2026-08 — 3段階:
    //   1) 別 JA は 404（存在を秘匿）。
    //   2) JA_KANRI_SHITEN が同一 JA でも自管理支店配下でない行は 403（明示拒否）。
    //      CHUOKAI / JA_HONTEN は ja_id 判定なので同一 JA 内は素通り。
    //   3) session.shiten_id 固定アカウントは自支店以外の行を 403（no-op when null）。
    const before = await this.repo.findOne({
      where: { shitenId: id, deletedAt: IsNull() },
    });
    if (!before) throw new NotFoundException('支店');
    assertJaScope(before.jaId, session, '支店');
    assertBranchScopeViolation(before.jaId, before.kanriShitenId, session);
    assertShitenScopeViolation(before.shitenId, session);

    // [kinyu-immutable] 金融機関支店フラグは作成後変更不可（顧客要件 2026-07）。
    // 引落口座支店として t_dokusya.bank_branch_code から参照される shiten の種別を
    // 後から変えると既存購読者の引落口座紐付けが壊れるため固定。FE も編集画面で
    // 当該チェックボックスを disabled（二重防御）。DTO は JASTEM 必須判定に使うため
    // 受け取りは残し値の変更のみ拒否。
    if (
      dto.kinyu_shiten_flg !== undefined &&
      dto.kinyu_shiten_flg !== before.kinyuShitenFlg
    ) {
      throw new ValidationException([
        {
          field: 'kinyu_shiten_flg',
          message: '金融機関支店フラグは変更できません。',
        },
      ]);
    }

    // FK guard + Layer 4 DataScope — 新 kanri_shiten は存在かつ既存 shiten と
    // 同一 JA (before.jaId) 所属必須。制限ロールでは session.ja_id と一致、
    // NICHINO_* が任意 JA の行を操作しても其の JA に束縛される。
    if (dto.kanri_shiten_id !== undefined) {
      await fetchFkInJa(
        this.kanriShitenRepo,
        'kanriShitenId',
        dto.kanri_shiten_id,
        Number(before.jaId),
        '管理支店',
      );
    }

    // [role-allow-list] — FIELD_RESTRICTIONS に従い不許可列を silent-drop。
    // 現状 narrower allow-list は JA_KANRI_SHITEN のみで kanri_shiten_id 不可、
    // 他ロールは `['*']`（全通過）。下の pickXxx(...) は filtered に無いキーで
    // before.* にフォールバックするため、drop された列は null でなく従前値を維持。
    const filtered = filterAllowedFields(
      dto as unknown as Record<string, unknown>,
      'shiten',
      session.role_code,
      FIELD_RESTRICTIONS,
    ) as Record<string, unknown>;

    let after: Shiten = before;
    try {
      await this.dataSource.transaction(async (manager) => {
        const updatePayload = {
          shitenName: pickString(filtered, 'shiten_name', before.shitenName),
          shitenNameKana: pickString(filtered, 'shiten_name_kana', before.shitenNameKana),
          // [kinyu-immutable] 作成後変更不可のため常に既存値を維持（変更要求は上の guard で 400）。
          kinyuShitenFlg: before.kinyuShitenFlg,
          // JASTEM 店舗単位 4 列 — pickString は DTO キー欠損時に既存値へフォールバックし
          // partial PATCH 形式の PUT でも従前 JASTEM データを維持。
          jastemToriatsukaiTenpoCode: pickString(
            filtered,
            'jastem_toriatsukai_tenpo_code',
            before.jastemToriatsukaiTenpoCode,
          ),
          jastemTenpoName: pickString(filtered, 'jastem_tenpo_name', before.jastemTenpoName),
          jastemTyokinShubetsu: pickString(
            filtered,
            'jastem_tyokin_shubetsu',
            before.jastemTyokinShubetsu,
          ),
          jastemKozaNo: pickString(filtered, 'jastem_koza_no', before.jastemKozaNo),
          kanriShitenId: pickNumber(filtered, 'kanri_shiten_id', before.kanriShitenId),
          biko: pickString(filtered, 'biko', before.biko),
          updatedBy: String(session.account_id),
          updatedAt: new Date(),
        };
        await manager.update(Shiten, { shitenId: id }, updatePayload);

        // マージ行をメモリ上で構築。manager.update はエンティティを refresh せず、
        // 適用済み payload は既知なので再読込は無駄な往復。
        after = { ...before, ...updatePayload, shitenId: id };

        // [audit-log-in-tx] — before/after JSON 付き UPDATE。
        await this.auditLog.logUpdate(
          buildAuditCtx(session, req, ScreenName.ACSMS_SCR_007, TABLE_NAME, id),
          before,
          after,
          manager,
        );
      });

      return {
        ...toShitenDetail(after),
        message: SuccessMessage.UPDATED,
      };
    } catch (err) {
      await this.auditLog.logError(
        buildAuditCtx(session, req, ScreenName.ACSMS_SCR_007, TABLE_NAME, id),
        AuditOperation.UPDATE,
        err as Error,
      );
      throw err;
    }
  }
}
