import { Injectable, Logger } from '@nestjs/common';
import { AuditOperation } from '@/common/enums';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, IsNull, Repository } from 'typeorm';
import type { Request } from 'express';

import { Ja } from '@/database/entities/ja.entity';
import { KanriShiten } from '@/database/entities/kanri-shiten.entity';
import { Todofuken } from '@/database/entities/todofuken.entity';
import { AuditLogService } from '@/modules/audit-log/audit-log.service';
import {
  BadRequestException,
  DuplicateCodeException,
  NotFoundException,
} from '@/common/exceptions/common.exceptions';
import { buildAuditCtx } from '@/common/utils/audit-context';
import { applyBranchScope, assertBranchScope } from '@/common/utils/data-scope';
import { isUniqueViolation } from '@/common/utils/db-errors';
import {
  filterAllowedFields,
  type FieldRestrictionTable,
} from '@/common/utils/field-restrictions';
import { assertNoRelatedRows } from '@/common/utils/fk-conflict';
import { paginate, clampPerPage, type PaginatedResponse } from '@/common/utils/paginate';
import { pickString, pickBool } from '@/common/utils/pick';
import type { SessionPayload } from '@/modules/auth/session.service';

import { SearchKanriShitenDto, type KanriShitenSearchSortBy } from './dto/search-kanri-shiten.dto';
import { KanriShitenListItemDto } from './dto/kanri-shiten-list-item.dto';
import { KanriShitenDropdownItemDto } from './dto/kanri-shiten-dropdown-query.dto';
import { CreateKanriShitenDto } from './dto/create-kanri-shiten.dto';
import { UpdateKanriShitenDto } from './dto/update-kanri-shiten.dto';
import { KanriShitenDetailDto } from './dto/kanri-shiten-detail.dto';
import { toKanriShitenDetail, toKanriShitenListItem } from './kanri-shiten.mapper';

/** 画面別 audit-context ラベル。 */
const SCREEN_NAME = '管理支店マスタ明細検索画面 (ACSMS-SCR-008)';
/** フォーム系 (find/create/update) は SCR-009。 */
const SCREEN_NAME_SCR009 = '管理支店マスタ登録画面 (ACSMS-SCR-009)';
const TABLE_NAME = 'm_kanri_shiten';

/**
 * Field-level allow-list（ACSMS-SCR-009 api.md §4.5 / .claude/rules/security.md §Layer 3）。
 * NICHINO_ADMIN は全列更新可、CHUOKAI / JA_HONTEN / JA_KANRI_SHITEN は連絡先 5 列のみ。
 * 不許可フィールドは UPDATE から silent-drop — 200 を返すが当該列は BEFORE 値のまま。
 */
const FIELD_RESTRICTIONS: FieldRestrictionTable = {
  kanri_shiten: {
    NICHINO_ADMIN: ['*'],
    CHUOKAI: ['yubin_no', 'address', 'tel', 'fax', 'biko'],
    JA_HONTEN: ['yubin_no', 'address', 'tel', 'fax', 'biko'],
    JA_KANRI_SHITEN: ['yubin_no', 'address', 'tel', 'fax', 'biko'],
  },
};

/**
 * Sort-by allow-list。画面定義§8.1 の 3 列はクリック可能ヘッダ、updated_at は暗黙既定
 * （直近作成/更新行が次回一覧の先頭に来る）。DTO の @IsIn が不明キーを弾き、
 * この map が static-typing ガードを追加。
 */
const SORT_COLUMN_MAP: Record<KanriShitenSearchSortBy, string> = {
  kanri_shiten_code: 'mks.kanri_shiten_code',
  kanri_shiten_name: 'mks.kanri_shiten_name',
  todofuken_code: 'mks.todofuken_code',
  updated_at: 'mks.updated_at',
};

/**
 * kanri_shiten を参照する未削除行があると DELETE をブロックするテーブル
 * (ACSMS-SCR-008-api.md §4.4)。一部は未だ TypeORM エンティティでないため
 * assertNoRelatedRows が raw パラメータ化 dataSource.query で統一処理。
 */
const RELATED_TABLES: readonly string[] = ['m_shiten', 't_dokusya', 'm_account'];

@Injectable()
export class KanriShitenService {
  private readonly logger = new Logger(KanriShitenService.name);

  constructor(
    @InjectRepository(KanriShiten)
    private readonly repo: Repository<KanriShiten>,
    @InjectRepository(Todofuken)
    private readonly todofukenRepo: Repository<Todofuken>,
    @InjectRepository(Ja)
    private readonly jaRepo: Repository<Ja>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly auditLog: AuditLogService,
  ) {}

  // ─── API-008-001 — GET /api/v1/kanri-shiten ──────────────────────────
  /**
   * m_kanri_shiten のページ検索。§4.3 DataScope 適用
   * （NICHINO_ADMIN 無制限 / CHUOKAI・JA_HONTEN は ja_id / JA_KANRI_SHITEN は
   * ja_id + kanri_shiten_id で絞る）。
   * todofuken_name は m_todofuken (47 行) の 1 回バッチ lookup で hydrate（行毎 JOIN より安価）。
   */
  async findAll(
    query: SearchKanriShitenDto,
    session: SessionPayload,
  ): Promise<PaginatedResponse<KanriShitenListItemDto>> {
    const page = query.page ?? 1;
    const per_page = query.per_page ?? 20;
    // 既定ソートは更新降順（直近作成/編集行を先頭に）。§8.1 の 3 列はヘッダクリックで利用可。
    const sort_by: KanriShitenSearchSortBy =
      (query.sort_by as KanriShitenSearchSortBy) ?? 'updated_at';
    const sort_order = (query.sort_order ?? 'desc').toUpperCase() as 'ASC' | 'DESC';

    const qb = this.repo.createQueryBuilder('mks');

    // [soft-delete-filter]
    qb.where('mks.deleted_at IS NULL');

    // [data-scope] ロール別:
    //   NICHINO_*          → 絞らない (helper no-op)
    //   CHUOKAI / JA_HONTEN → ja_id = session.ja_id
    //   JA_KANRI_SHITEN    → kanri_shiten_id = session.kanri_shiten_id
    applyBranchScope(
      qb,
      'mks',
      { jaIdField: 'jaId', kanriShitenIdField: 'kanriShitenId' },
      session,
    );

    // [filter-conditions] — 部分一致フィルタ（5 項目とも ILIKE・spec 準拠）。
    if (query.kanri_shiten_code) {
      qb.andWhere('mks.kanri_shiten_code ILIKE :kanri_shiten_code', {
        kanri_shiten_code: `%${query.kanri_shiten_code}%`,
      });
    }
    if (query.kanri_shiten_name) {
      qb.andWhere('mks.kanri_shiten_name ILIKE :kanri_shiten_name', {
        kanri_shiten_name: `%${query.kanri_shiten_name}%`,
      });
    }
    if (query.todofuken_code) {
      // 完全一致 — UI は都道府県ドロップダウン（単一選択）なので部分一致は不要、
      // `=` 述語は m_todofuken FK インデックスを使う。screen-design v1.3 §2.1 + api.md §処理手順。
      qb.andWhere('mks.todofuken_code = :todofuken_code', {
        todofuken_code: query.todofuken_code,
      });
    }
    if (query.tel) {
      qb.andWhere('mks.tel ILIKE :tel', { tel: `%${query.tel}%` });
    }
    if (query.fax) {
      qb.andWhere('mks.fax ILIKE :fax', { fax: `%${query.fax}%` });
    }

    // [sort-paginate] — kanri_shiten_id を安定タイブレーカに追加。ソートキー同値
    // （例: 一括取込で同一 updated_at）の行を決定的な順序で返す。
    const orderColumn = SORT_COLUMN_MAP[sort_by] ?? SORT_COLUMN_MAP.updated_at;
    qb.orderBy(orderColumn, sort_order)
      .addOrderBy('mks.kanri_shiten_id', 'DESC')
      .take(per_page)
      .skip((page - 1) * per_page);

    const [rows, total] = await qb.getManyAndCount();

    // todofuken_name を 1 回のバッチ lookup で hydrate。m_todofuken は 47 行なので
    // 単一 find() が行毎 JOIN より安価。
    const tdRows = rows.length > 0 ? await this.todofukenRepo.find() : [];
    const tdMap = new Map(tdRows.map((t) => [t.todofukenCode, t.todofukenName]));

    // ja_name をページ内 ja_ids の IN-list lookup 1 回で hydrate。列「JA名」は
    // 顧客要望で SCR-008 一覧に親テナントを表示するため追加（per_page 20〜50 で IN は小）。
    const jaIds = Array.from(new Set(rows.map((r) => Number(r.jaId))));
    const jaRows =
      jaIds.length > 0
        ? await this.jaRepo
            .createQueryBuilder('mj')
            .select(['mj.jaId', 'mj.jaName'])
            .whereInIds(jaIds)
            .getMany()
        : [];
    const jaMap = new Map(jaRows.map((j) => [Number(j.jaId), j.jaName]));

    const data = rows.map((mks) =>
      toKanriShitenListItem(
        mks,
        tdMap.get(mks.todofukenCode) ?? '',
        jaMap.get(Number(mks.jaId)) ?? '',
      ),
    );

    return paginate(data, total, page, per_page);
  }

  // ─── ACSMS-API-COMMON-004 — GET /api/v1/kanri-shiten/dropdown ────────
  /**
   * SCR-007 / SCR-024 / SCR-025 フォーム共通の dropdown lookup。呼び出し元指定の
   * ja_id で絞った最小 3 列投影（id / code / name）を返す。権限ゲートなし
   * （呼び出し元画面の guard が認可済み）、認証済みセッションで足りる
   * — spec §4.2「認証済みユーザーであればアクセス可能」。
   * Spec: docs/design/ACSMS-SCR-024/ACSMS-SCR-024-api.md §ACSMS-API-COMMON-004.
   */
  async listDropdown(
    query: {
      ja_id: number;
      q?: string;
      match_field?: 'both' | 'name';
      page?: number;
      per_page?: number;
      include_id?: number;
    },
    session: SessionPayload,
  ): Promise<{ data: KanriShitenDropdownItemDto[]; has_more: boolean }> {
    const toItem = (r: KanriShiten): KanriShitenDropdownItemDto => ({
      kanri_shiten_id: Number(r.kanriShitenId),
      kanri_shiten_code: r.kanriShitenCode,
      kanri_shiten_name: r.kanriShitenName,
      // SCR-011 で購読種別による絞り込みに使う（顧客要件2026-07）。
      paper_flg: r.paperFlg,
      denshi_flg: r.denshiFlg,
    });

    const buildScoped = () => {
      const qb = this.repo
        .createQueryBuilder('mks')
        .where('mks.deleted_at IS NULL')
        .andWhere('mks.ja_id = :jaId', { jaId: query.ja_id });
      // [data-scope] ロール別: NICHINO_* → ja_id は param 束縛 /
      // CHUOKAI・JA_HONTEN → session.ja_id / JA_KANRI_SHITEN → 自分の管理支店のみ。
      applyBranchScope(
        qb,
        'mks',
        { jaIdField: 'jaId', kanriShitenIdField: 'kanriShitenId' },
        session,
      );
      return qb;
    };

    const qb = buildScoped();
    if (query.q) {
      const like = `%${query.q}%`;
      if (query.match_field === 'name') {
        qb.andWhere('mks.kanri_shiten_name ILIKE :q', { q: like });
      } else {
        qb.andWhere(
          '(mks.kanri_shiten_code ILIKE :q OR mks.kanri_shiten_name ILIKE :q)',
          { q: like },
        );
      }
    }
    qb.orderBy('mks.kanri_shiten_code', 'ASC');

    // ページングは opt-in（page 未指定なら全件・has_more=false。既存呼び出し元と互換）。
    const paginate = query.page !== undefined;
    let hasMore = false;
    let rows: KanriShiten[];
    if (paginate) {
      const page = Math.max(query.page ?? 1, 1);
      const perPage = clampPerPage(query.per_page, 50);
      rows = await qb.skip((page - 1) * perPage).take(perPage + 1).getMany();
      hasMore = rows.length > perPage;
      if (hasMore) rows = rows.slice(0, perPage);

      if (
        page === 1 &&
        query.include_id !== undefined &&
        !rows.some((r) => Number(r.kanriShitenId) === query.include_id)
      ) {
        const pinned = await buildScoped()
          .andWhere('mks.kanri_shiten_id = :pid', { pid: query.include_id })
          .getOne();
        if (pinned) return { data: [toItem(pinned), ...rows.map(toItem)], has_more: hasMore };
      }
    } else {
      rows = await qb.getMany();
    }
    return { data: rows.map(toItem), has_more: hasMore };
  }

  // ─── API-008-002 — DELETE /api/v1/kanri-shiten/:id ───────────────────
  /**
   * 論理削除。§4.4 commit 前に 3 テーブル競合チェック (m_shiten / t_dokusya / m_account)、
   * §4.5 deleted_at=NOW()、§4.6 同一トランザクションで t_log (operation='DELETE') 書込み、
   * §4.8 失敗時は rollback 外で error log (log_type=3)。
   * 権限 kanri_shiten.delete は画面定義§1.3 で NICHINO_ADMIN 限定 — ロール判定は guard、
   * ここの DataScope は漏れた非 admin 向けの多層防御 NotFound マスク。
   */
  async remove(
    id: number,
    session: SessionPayload,
    req: Request,
  ): Promise<{ message: string }> {
    // [fetch-target] — audit log の before_value も兼ねる。
    const before = await this.repo.findOne({
      where: { kanriShitenId: id, deletedAt: IsNull() },
    });
    if (!before) throw new NotFoundException('管理支店');

    // [fk-conflict-check] — 関連テーブルに当該 kanri_shiten 参照行があれば削除ブロック。
    await assertNoRelatedRows(this.dataSource, RELATED_TABLES, 'kanri_shiten_id', id);

    try {
      await this.dataSource.transaction(async (manager) => {
        // [soft-delete]
        await manager.update(
          KanriShiten,
          { kanriShitenId: id, deletedAt: IsNull() },
          {
            deletedAt: new Date(),
            updatedBy: String(session.account_id),
          },
        );

        // [audit-log-in-tx] — 同一 tx で atomicity 担保。
        await this.auditLog.logDelete(
          buildAuditCtx(session, req, SCREEN_NAME, TABLE_NAME, id),
          before,
          manager,
        );
      });

      return { message: '削除しました。' };
    } catch (err) {
      // [audit-error-log] — rollback 外なので業務書込みが破棄されても trace が残る。
      await this.auditLog.logError(
        buildAuditCtx(session, req, SCREEN_NAME, TABLE_NAME, id),
        AuditOperation.DELETE,
        err as Error,
      );
      throw err;
    }
  }

  // ─── API-009-001 — GET /api/v1/kanri-shiten/:id ──────────────────────
  /**
   * 編集フォーム用詳細。§4.3 DataScope（存在 + scope SELECT — 範囲外は null →
   * NotFound で秘匿し存在漏洩を防ぐ）。todofuken_name は Todofuken lookup 1 回で hydrate。
   */
  async findById(
    id: number,
    session: SessionPayload,
  ): Promise<KanriShitenDetailDto> {
    const ks = await this.repo.findOne({
      where: { kanriShitenId: id, deletedAt: IsNull() },
    });
    if (!ks) throw new NotFoundException('管理支店');
    // [data-scope] — 範囲外は 404 でマスクし curl probe に存在を漏らさない。
    assertBranchScope(Number(ks.jaId), Number(ks.kanriShitenId), session, '管理支店');

    const td = await this.todofukenRepo.findOne({
      where: { todofukenCode: ks.todofukenCode },
    });
    // [ja-name-lookup] — JA_KANRI_SHITEN（ja.view 無 → dropdown 無）でも FE フォームが
    // 表示できるよう ja_name を取得。
    const ja = await this.jaRepo.findOne({ where: { jaId: ks.jaId } });
    return toKanriShitenDetail(ks, td?.todofukenName ?? '', ja?.jaName ?? '');
  }

  // ─── API-009-002 — POST /api/v1/kanri-shiten ─────────────────────────
  /**
   * kanri_shiten 新規作成。§4.3 todofuken 存在検証、§4.4 ja_id 存在検証
   * （raw SQL — Ja エンティティは別モジュールで存在チェックのため repo を引き込みたくない）、
   * §4.5 kanri_shiten_code の一意性強制。INSERT + audit log は 1 トランザクション、
   * 失敗時は rollback 外で error log。
   */
  async create(
    dto: CreateKanriShitenDto,
    session: SessionPayload,
    req: Request,
  ): Promise<KanriShitenDetailDto & { message: string }> {
    // [code-master-check] — todofuken_code の存在チェック。
    const td = await this.todofukenRepo.findOne({
      where: { todofukenCode: dto.todofuken_code },
    });
    if (!td) throw new BadRequestException('都道府県コードが存在しません。');

    // [code-master-check] — ja_id の存在チェック（m_ja は別モジュール、raw query で
    // cross-module repo 配線を回避）。併せて ja_name を取得し、別 dropdown 呼び出し無しで
    // FE フォームが描画できるようにする（JA_KANRI_SHITEN に ja.view 権限は無い）。
    const jaRows: Array<{ ja_name: string }> = await this.dataSource.query(
      `SELECT ja_name FROM m_ja WHERE ja_id = $1 AND deleted_at IS NULL LIMIT 1`,
      [dto.ja_id],
    );
    if (!jaRows?.length) {
      throw new BadRequestException('JA IDが存在しません。');
    }
    const jaName = jaRows[0].ja_name ?? '';

    // [uniqueness-check] — kanri_shiten_code。withDeleted: true — コード再利用は
    // 生存期間中禁止（論理削除後も行にコードを予約）。deleted_at で絞らない
    // DB UNIQUE INDEX と一致。
    const dup = await this.repo.findOne({
      where: { kanriShitenCode: dto.kanri_shiten_code },
      withDeleted: true,
    });
    if (dup) {
      throw new DuplicateCodeException('管理支店コード', dto.kanri_shiten_code);
    }

    try {
      const saved = await this.dataSource.transaction(async (manager) => {
        // [business-insert]
        const entity = manager.create(KanriShiten, {
          jaId: dto.ja_id,
          kanriShitenCode: dto.kanri_shiten_code,
          kanriShitenName: dto.kanri_shiten_name,
          kanriShitenNameKana: dto.kanri_shiten_name_kana ?? '',
          todofukenCode: dto.todofuken_code,
          yubinNo: dto.yubin_no ?? '',
          address: dto.address ?? '',
          tel: dto.tel ?? '',
          fax: dto.fax ?? '',
          paperFlg: dto.paper_flg ?? false,
          denshiFlg: dto.denshi_flg ?? false,
          biko: dto.biko ?? '',
          createdBy: String(session.account_id),
          updatedBy: String(session.account_id),
        });
        const created = await manager.save(entity);

        // [audit-log-in-tx] — 同一 tx で atomicity 担保。
        await this.auditLog.logCreate(
          buildAuditCtx(session, req, SCREEN_NAME_SCR009, TABLE_NAME, created.kanriShitenId),
          created,
          manager,
        );
        return created;
      });

      return {
        ...toKanriShitenDetail(saved, td.todofukenName ?? '', jaName),
        message: '登録しました。',
      };
    } catch (err) {
      // 競合対策: 同時 CREATE 2 件が両方 pre-check を通過し 2 件目の INSERT が
      // DB UNIQUE INDEX に当たる。その 23505 を 500 でなく clean な 400 に変換。
      if (isUniqueViolation(err)) {
        await this.auditLog.logError(
          buildAuditCtx(session, req, SCREEN_NAME_SCR009, TABLE_NAME, null),
          AuditOperation.CREATE,
          err as Error,
        );
        throw new DuplicateCodeException('管理支店コード', dto.kanri_shiten_code);
      }
      // [audit-error-log] — rollback 外。
      await this.auditLog.logError(
        buildAuditCtx(session, req, SCREEN_NAME_SCR009, TABLE_NAME, null),
        AuditOperation.CREATE,
        err as Error,
      );
      throw err;
    }
  }

  // ─── API-009-003 — PUT /api/v1/kanri-shiten/:id ──────────────────────
  /**
   * 既存行の更新。§4.3 存在 + DataScope SELECT（範囲外は NotFound で秘匿）、
   * §4.5 ロール別 field-level allow-list（CHUOKAI/JA_HONTEN/JA_KANRI_SHITEN は
   * yubin_no/address/tel/fax/biko のみ）。UPDATE + audit log は 1 トランザクション、
   * error log は rollback 外。
   */
  async update(
    id: number,
    dto: UpdateKanriShitenDto,
    session: SessionPayload,
    req: Request,
  ): Promise<KanriShitenDetailDto & { message: string }> {
    // [fetch-target] — 存在 + [data-scope]（範囲外は 404 でマスク）。
    const before = await this.repo.findOne({
      where: { kanriShitenId: id, deletedAt: IsNull() },
    });
    if (!before) throw new NotFoundException('管理支店');
    assertBranchScope(Number(before.jaId), Number(before.kanriShitenId), session, '管理支店');

    // [role-allow-list] — field-level allow-list。ロールが更新できない列を drop。
    // 非 admin ロールでは todofuken_code が下の [code-master-check] より前に silent-drop
    // されるため todofuken 検証を丸ごと回避（当該列を実質変更していない）。
    const filtered = filterAllowedFields(
      dto as unknown as Record<string, unknown>,
      'kanri_shiten',
      session.role_code,
      FIELD_RESTRICTIONS,
    );

    // [code-master-check] — todofuken_code の存在チェック（allow-list を通過した
    // 場合のみ = NICHINO_ADMIN パス）。
    if ('todofuken_code' in filtered) {
      const td = await this.todofukenRepo.findOne({
        where: { todofukenCode: filtered.todofuken_code as string },
      });
      if (!td) throw new BadRequestException('都道府県コードが存在しません。');
    }

    try {
      await this.dataSource.transaction(async (manager) => {
        // [partial-update] — allow-list を通過した列のみ適用。各列は
        // pickX(filtered, key, before.x) で allow-list 外なら BEFORE 値へフォールバックし維持。
        const updatePayload = {
          kanriShitenName: pickString(filtered, 'kanri_shiten_name', before.kanriShitenName),
          kanriShitenNameKana: pickString(filtered, 'kanri_shiten_name_kana', before.kanriShitenNameKana),
          todofukenCode: pickString(filtered, 'todofuken_code', before.todofukenCode),
          yubinNo: pickString(filtered, 'yubin_no', before.yubinNo),
          address: pickString(filtered, 'address', before.address),
          tel: pickString(filtered, 'tel', before.tel),
          fax: pickString(filtered, 'fax', before.fax),
          paperFlg: pickBool(filtered, 'paper_flg', before.paperFlg),
          denshiFlg: pickBool(filtered, 'denshi_flg', before.denshiFlg),
          biko: pickString(filtered, 'biko', before.biko),
          updatedBy: String(session.account_id),
          updatedAt: new Date(),
        };
        await manager.update(KanriShiten, { kanriShitenId: id }, updatePayload);

        const after: KanriShiten = { ...before, ...updatePayload, kanriShitenId: id };

        // [audit-log-in-tx] — before/after JSON 付き UPDATE。
        await this.auditLog.logUpdate(
          buildAuditCtx(session, req, SCREEN_NAME_SCR009, TABLE_NAME, id),
          before,
          after,
          manager,
        );
      });

      // 応答用に再読込 — 上の UPDATE は refresh 済み行を返さず、TypeORM は
      // エンティティをその場で refresh しない。
      const after = await this.repo.findOne({
        where: { kanriShitenId: id, deletedAt: IsNull() },
      });
      const td = await this.todofukenRepo.findOne({
        where: { todofukenCode: after?.todofukenCode ?? before.todofukenCode },
      });
      // ja_id は更新不可のため before.jaId == after.jaId。
      const ja = await this.jaRepo.findOne({ where: { jaId: before.jaId } });
      return {
        ...toKanriShitenDetail(after ?? before, td?.todofukenName ?? '', ja?.jaName ?? ''),
        message: '更新しました。',
      };
    } catch (err) {
      await this.auditLog.logError(
        buildAuditCtx(session, req, SCREEN_NAME_SCR009, TABLE_NAME, id),
        AuditOperation.UPDATE,
        err as Error,
      );
      throw err;
    }
  }
}
