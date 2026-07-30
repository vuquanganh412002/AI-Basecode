import { Injectable, Logger } from '@nestjs/common';
import { AuditOperation } from '@/common/enums';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, IsNull, Repository } from 'typeorm';
import type { Request } from 'express';

import { Ja } from '@/database/entities/ja.entity';
import { Todofuken } from '@/database/entities/todofuken.entity';
import { Role } from '@/database/entities/role.entity';
import { RoleCode } from '@/common/enums/role-code.enum';
import {
  paginate,
  paginateCursor,
  type PaginatedResponse,
} from '@/common/utils/paginate';
import { CreateJaDto } from './dto/create-ja.dto';
import { UpdateJaDto } from './dto/update-ja.dto';
import { JaResponseDto } from './dto/ja-response.dto';
import { SearchJaDto, type JaSearchSortBy } from './dto/search-ja.dto';
import { JaDropdownQueryDto } from './dto/ja-dropdown-query.dto';
import { toJaResponse } from './ja.mapper';
import { assertMCodeValues } from '@/common/utils/m-code-validation';
import {
  AuditLogService,
  type AuditOperationContext,
} from '@/modules/audit-log/audit-log.service';
import { CodeService } from '@/modules/code/code.service';
import {
  BadRequestException,
  DuplicateCodeException,
  NotFoundException,
} from '@/common/exceptions/common.exceptions';
import {
  filterAllowedFields,
  type FieldRestrictionTable,
} from '@/common/utils/field-restrictions';
import { buildAuditCtx } from '@/common/utils/audit-context';
import { assertJaScope, applyJaScope } from '@/common/utils/data-scope';
import { isUniqueViolation } from '@/common/utils/db-errors';
import { assertNoRelatedRows } from '@/common/utils/fk-conflict';
import { pickBool, pickNumber, pickString } from '@/common/utils/pick';
import type { SessionPayload } from '@/modules/auth/session.service';

// SCR-004(一覧/削除)用の audit-context ラベル。
const SCREEN_NAME_SCR004 = 'JAマスタ明細検索画面 (ACSMS-SCR-004)';

// sort_by → QB 列名の対応。@IsIn(JA_SEARCH_SORT_BY) が範囲外を拒否済みだが、
// DTO ドリフト時の SQLインジェクション防止に動的ルックアップを維持。
// todofuken_name は m_todofuken JOIN を持たないため mj.todofuken_code に
// マップ(同一県をまとめてソート)。
const SORT_COLUMN_MAP: Record<JaSearchSortBy, string> = {
  ja_code: 'mj.ja_code',
  ja_name: 'mj.ja_name',
  yubin_no: 'mj.yubin_no',
  todofuken_name: 'mj.todofuken_code',
  tel: 'mj.tel',
  address: 'mj.address',
  fax: 'mj.fax',
  // 既定ソート — 最新更新(CREATE/UPDATE が updated_at を自動更新)を先頭へ。
  updated_at: 'mj.updated_at',
};

// JA を参照する行が残っていると削除を阻止するテーブル群。
// docs/design/ACSMS-SCR-004/ACSMS-SCR-004-api.md §4.4 準拠。
// 一部は未 TypeORM 化(後続画面が所有)。assertNoRelatedRows()
// (@/common/utils/fk-conflict)がこの readonly リスト + FK 列名で各テーブルに
// パラメタライズド `SELECT COUNT(*) ... WHERE ${fk}=$1 AND deleted_at IS NULL`
// を実行。ヘルパが SQL に埋め込むためリストは必ずハードコード(ユーザ入力不可)。
const RELATED_TABLES: readonly string[] = [
  'm_kanri_shiten',
  'm_shiten',
  'm_hanbaiten',
  'm_tanka',
  't_dokusya',
  'm_account',
];

// フィールド単位制限表(.claude/rules/security.md §Layer 3)。編集可能な
// ロールのみ許可列集合を列挙。'*'=全列許可。フィルタ実装は
// common/utils/field-restrictions.ts。
const FIELD_RESTRICTIONS: FieldRestrictionTable = {
  ja: {
    NICHINO_ADMIN: ['*'],
    CHUOKAI: [
      'yubin_no',
      'address',
      'tel',
      'fax',
      'email',
      'tanto_busho',
      'tanto_name',
      'zei_kubun',
      'jastem_itakusha_code',
      'jastem_itakusha_name',
      'jastem_ja_code',
      'jastem_ja_name',
      'biko',
    ],
    JA_HONTEN: [
      'yubin_no',
      'address',
      'tel',
      'fax',
      'email',
      'tanto_busho',
      'tanto_name',
      'zei_kubun',
      'jastem_itakusha_code',
      'jastem_itakusha_name',
      'jastem_ja_code',
      'jastem_ja_name',
      'biko',
    ],
  },
};

const SCREEN_NAME = 'JAマスタ登録画面 (ACSMS-SCR-005)';
const TABLE_NAME = 'm_ja';

@Injectable()
export class JaService {
  private readonly logger = new Logger(JaService.name);

  constructor(
    @InjectRepository(Ja)
    private readonly repo: Repository<Ja>,
    @InjectRepository(Todofuken)
    private readonly todofukenRepo: Repository<Todofuken>,
    @InjectRepository(Role)
    private readonly roleRepo: Repository<Role>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly auditLog: AuditLogService,
    private readonly codeService: CodeService,
  ) {}

  // ─── API-005-001 — GET /api/v1/ja/:ja_id ─────────────────────────────
  async findById(jaId: number, session: SessionPayload): Promise<JaResponseDto> {
    const ja = await this.repo.findOne({ where: { jaId, deletedAt: IsNull() } });
    if (!ja) throw new NotFoundException('JA');

    // [data-scope] — 範囲外の行は 404 でマスク。
    assertJaScope(ja.jaId, session, 'JA');

    const td = await this.todofukenRepo.findOne({
      where: { todofukenCode: ja.todofukenCode },
    });

    return toJaResponse(ja, td?.todofukenName ?? '');
  }

  // ─── API-005-002 — POST /api/v1/ja ────────────────────────────────────
  async create(
    dto: CreateJaDto,
    session: SessionPayload,
    req: Request,
  ): Promise<JaResponseDto & { message?: string }> {
    assertMCodeValues(this.codeService, [
      { field: 'zei_kubun', value: dto.zei_kubun, category: 'ZEI_KUBUN', label: '税区分' },
    ]);

    // [code-master-check] — 都道府県コード存在検証
    const td = await this.todofukenRepo.findOne({
      where: { todofukenCode: dto.todofuken_code },
    });
    if (!td) {
      throw new BadRequestException('都道府県コードが存在しません。');
    }

    // [uniqueness-check] — JAコード一意性チェック。`withDeleted: true`：
    // コードは論理削除後もその行に予約され再利用不可(deleted_at で絞らない
    // DB UNIQUE INDEX に一致)。
    const existing = await this.repo.findOne({
      where: { jaCode: dto.ja_code },
      withDeleted: true,
    });
    if (existing) {
      throw new DuplicateCodeException('JAコード', dto.ja_code);
    }

    try {
      const saved = await this.dataSource.transaction(async (manager) => {
        const entity = manager.create(Ja, {
          jaCode: dto.ja_code,
          jaName: dto.ja_name,
          jaNameKana: dto.ja_name_kana ?? '',
          todofukenCode: dto.todofuken_code,
          chuokaiFlg: dto.chuokai_flg,
          yubinNo: dto.yubin_no ?? '',
          address: dto.address ?? '',
          tel: dto.tel ?? '',
          fax: dto.fax ?? '',
          email: dto.email ?? '',
          tantoBusho: dto.tanto_busho ?? '',
          tantoName: dto.tanto_name ?? '',
          zeiKubun: dto.zei_kubun,
          jastemItakushaCode: dto.jastem_itakusha_code ?? '',
          jastemItakushaName: dto.jastem_itakusha_name ?? '',
          jastemJaCode: dto.jastem_ja_code ?? '',
          jastemJaName: dto.jastem_ja_name ?? '',
          biko: dto.biko ?? '',
          createdBy: String(session.account_id),
          updatedBy: String(session.account_id),
        });
        const created = (await manager.save(entity)) as Ja;

        await this.auditLog.logCreate(
          buildAuditCtx(session, req, SCREEN_NAME, TABLE_NAME, created.jaId),
          created,
          manager,
        );

        return created;
      });

      // 上の td は存在検証で取得済。entity がそのまま持つので
      // saved.todofukenCode === dto.todofuken_code → 再クエリせず再利用。
      return {
        ...toJaResponse(saved, td.todofukenName),
        message: '登録しました。',
      };
    } catch (err) {
      // 競合対策：並行 CREATE 2件が事前チェックを通過し2件目の INSERT が
      // UNIQUE INDEX に衝突する場合、23505 を 500 でなく 400 に変換。
      if (isUniqueViolation(err)) {
        await this.auditLog.logError(
          buildAuditCtx(session, req, SCREEN_NAME, TABLE_NAME, null),
          AuditOperation.CREATE,
          err as Error,
        );
        throw new DuplicateCodeException('JAコード', dto.ja_code);
      }
      // [audit-error-log] — ロールバックされた tx の外側で記録。
      await this.auditLog.logError(
        buildAuditCtx(session, req, SCREEN_NAME, TABLE_NAME, null),
        AuditOperation.CREATE,
        err as Error,
      );
      throw err;
    }
  }

  // ─── API-005-003 — PUT /api/v1/ja/:ja_id ──────────────────────────────
  async update(
    jaId: number,
    dto: UpdateJaDto,
    session: SessionPayload,
    req: Request,
  ): Promise<JaResponseDto & { message?: string }> {
    assertMCodeValues(this.codeService, [
      { field: 'zei_kubun', value: dto.zei_kubun, category: 'ZEI_KUBUN', label: '税区分' },
    ]);

    // [fetch-target] — 存在 + [data-scope] チェック
    const before = await this.repo.findOne({
      where: { jaId, deletedAt: IsNull() },
    });
    if (!before) throw new NotFoundException('JA');
    assertJaScope(before.jaId, session, 'JA');

    // [role-allow-list] — ロール別 allow-list
    const filtered = filterAllowedFields(
      dto as unknown as Record<string, unknown>,
      'ja',
      session.role_code,
      FIELD_RESTRICTIONS,
    );

    // [code-master-check] — todofuken_code 存在検証(NICHINO_ADMIN のみ。
    // CHUOKAI/JA_HONTEN は上の allow-list が本項目を除外)。変更可のロール時は
    // 検証済み行をキャッシュし、下の response 生成で m_todofuken 再クエリを回避。
    let validatedTodofuken: Todofuken | null = null;
    if ('todofuken_code' in filtered) {
      validatedTodofuken = await this.todofukenRepo.findOne({
        where: { todofukenCode: filtered.todofuken_code as string },
      });
      if (!validatedTodofuken) {
        throw new BadRequestException('都道府県コードが存在しません。');
      }
    }

    try {
      const saved = await this.dataSource.transaction(async (manager) => {
        const next = manager.create(Ja, {
          ...before,
          jaName: pickString(filtered, 'ja_name', before.jaName),
          jaNameKana: pickString(filtered, 'ja_name_kana', before.jaNameKana),
          todofukenCode: pickString(filtered, 'todofuken_code', before.todofukenCode),
          chuokaiFlg: pickBool(filtered, 'chuokai_flg', before.chuokaiFlg),
          yubinNo: pickString(filtered, 'yubin_no', before.yubinNo),
          address: pickString(filtered, 'address', before.address),
          tel: pickString(filtered, 'tel', before.tel),
          fax: pickString(filtered, 'fax', before.fax),
          email: pickString(filtered, 'email', before.email),
          tantoBusho: pickString(filtered, 'tanto_busho', before.tantoBusho),
          tantoName: pickString(filtered, 'tanto_name', before.tantoName),
          zeiKubun: pickNumber(filtered, 'zei_kubun', before.zeiKubun),
          jastemItakushaCode: pickString(filtered, 'jastem_itakusha_code', before.jastemItakushaCode),
          jastemItakushaName: pickString(filtered, 'jastem_itakusha_name', before.jastemItakushaName),
          jastemJaCode: pickString(filtered, 'jastem_ja_code', before.jastemJaCode),
          jastemJaName: pickString(filtered, 'jastem_ja_name', before.jastemJaName),
          biko: pickString(filtered, 'biko', before.biko),
          updatedBy: String(session.account_id),
        });
        const updated = (await manager.save(next)) as Ja;

        await this.auditLog.logUpdate(
          buildAuditCtx(session, req, SCREEN_NAME, TABLE_NAME, updated.jaId),
          before,
          updated,
          manager,
        );

        return updated;
      });

      // todofuken_code を更新したロールは検証済み行を再利用。それ以外は
      // 未変更(allow-list が除外)なので既存値を引いて todofuken_name を補完。
      const tdForResponse =
        validatedTodofuken ??
        (await this.todofukenRepo.findOne({
          where: { todofukenCode: saved.todofukenCode },
        }));
      return {
        ...toJaResponse(saved, tdForResponse?.todofukenName ?? ''),
        message: '更新しました。',
      };
    } catch (err) {
      // [audit-error-log] — ロールバックされた tx の外側で記録。
      await this.auditLog.logError(
        buildAuditCtx(session, req, SCREEN_NAME, TABLE_NAME, jaId),
        AuditOperation.UPDATE,
        err as Error,
      );
      throw err;
    }
  }

  // ─── API-004-001 — GET /api/v1/ja ─────────────────────────────────────
  // m_ja のページング検索。§4.3 DataScope 適用(NICHINO_* は無制限、
  // CHUOKAI/JA_HONTEN は自 ja_id のみ)。todofuken_name は QB を単純に保つため
  // JOIN でなくクエリ後に m_todofuken から補完(SORT_COLUMN_MAP のコメント参照)。
  // 読取専用：t_log に書き込まない。
  async findAll(
    query: SearchJaDto,
    session: SessionPayload,
  ): Promise<
    PaginatedResponse<
      Pick<
        JaResponseDto,
        | 'ja_id' | 'ja_code' | 'ja_name' | 'yubin_no' | 'todofuken_code'
        | 'todofuken_name' | 'tel' | 'address' | 'fax' | 'chuokai_flg'
      >
    >
  > {
    const page = query.page ?? 1;
    const per_page = query.per_page ?? 20;
    const sort_by: JaSearchSortBy =
      (query.sort_by as JaSearchSortBy) ?? 'updated_at';
    const sort_order = (query.sort_order ?? 'desc').toUpperCase() as 'ASC' | 'DESC';

    const qb = this.repo.createQueryBuilder('mj');

    // [soft-delete-filter]
    qb.where('mj.deleted_at IS NULL');

    // [data-scope] — 制限ロールは自 JA のみ。
    applyJaScope(qb, 'mj', 'jaId', session);

    // [filter-conditions] — 部分一致フィルタ。
    if (query.ja_code) {
      qb.andWhere('mj.ja_code ILIKE :ja_code', { ja_code: `%${query.ja_code}%` });
    }
    if (query.ja_name) {
      qb.andWhere('mj.ja_name ILIKE :ja_name', { ja_name: `%${query.ja_name}%` });
    }
    // [filter-conditions] todofuken フィルタ — 完全一致。Source: dropdown
    // (ACSMS-API-COMMON-001)。値は2桁 m_todofuken コードで部分一致は無意味
    // ("13" と "1" が重なる)。
    if (query.todofuken_code) {
      qb.andWhere('mj.todofuken_code = :todofuken_code', {
        todofuken_code: query.todofuken_code,
      });
    }

    // [sort-paginate]
    const orderColumn = SORT_COLUMN_MAP[sort_by] ?? SORT_COLUMN_MAP.updated_at;
    qb.orderBy(orderColumn, sort_order)
      .take(per_page)
      .skip((page - 1) * per_page);

    const [rows, total] = await qb.getManyAndCount();

    // todofuken_name を一括取得で補完。m_todofuken は小さな参照表(47行)で
    // 単一 find() の方が JOIN より安い。
    const codes = Array.from(new Set(rows.map((r) => r.todofukenCode).filter(Boolean)));
    const tdRows = codes.length > 0 ? await this.todofukenRepo.find() : [];
    const tdMap = new Map(tdRows.map((t) => [t.todofukenCode, t.todofukenName]));

    const data = rows.map((mj) => ({
      ja_id: Number(mj.jaId),
      ja_code: mj.jaCode,
      ja_name: mj.jaName,
      yubin_no: mj.yubinNo,
      todofuken_code: mj.todofukenCode,
      todofuken_name: tdMap.get(mj.todofukenCode) ?? '',
      tel: mj.tel,
      address: mj.address,
      fax: mj.fax,
      chuokai_flg: mj.chuokaiFlg,
      jastem_itakusha_code: mj.jastemItakushaCode,
      jastem_itakusha_name: mj.jastemItakushaName,
      jastem_ja_code: mj.jastemJaCode,
      jastem_ja_name: mj.jastemJaName,
    }));

    return paginate(data, total, page, per_page);
  }

  // ─── API-004-002 — DELETE /api/v1/ja/:ja_id ───────────────────────────
  // 論理削除。§4.4 で6テーブルの競合チェック→§4.5 deleted_at=NOW()→
  // §4.6 同一 tx で t_log 行(operation='DELETE')→失敗時 §4.8 エラーログ
  // (log_type=3)をロールバックされた tx の外側で記録。
  async remove(
    id: number,
    session: SessionPayload,
    req: Request,
  ): Promise<{ message: string }> {
    // [fetch-target] — 監査ログの before_value スナップショットも兼ねる。
    const before = await this.repo.findOne({
      where: { jaId: id, deletedAt: IsNull() },
    });
    if (!before) throw new NotFoundException('JA');

    // [fk-conflict-check] — 関連テーブルにこの JA の行が残る場合は阻止。
    await assertNoRelatedRows(this.dataSource, RELATED_TABLES, 'ja_id', id);

    const ctxBuilder = (): AuditOperationContext =>
      buildAuditCtx(session, req, SCREEN_NAME_SCR004, TABLE_NAME, id);

    try {
      await this.dataSource.transaction(async (manager) => {
        // [soft-delete] — m_ja の deleted_at=NOW(), updated_by=:account_id
        await manager.update(
          Ja,
          { jaId: id, deletedAt: IsNull() },
          {
            deletedAt: new Date(),
            updatedBy: String(session.account_id),
          },
        );

        // [audit-log-in-tx] — 同一 tx 内で原子性を保つ。
        await this.auditLog.logDelete(ctxBuilder(), before, manager);
      });

      return { message: '削除しました。' };
    } catch (err) {
      // [audit-error-log] — ロールバックされた tx の外側で記録し、業務書込が
      // 破棄されてもトレースを残す。
      await this.auditLog.logError(ctxBuilder(), AuditOperation.DELETE, err as Error);
      throw err;
    }
  }

  // ─── ACSMS-API-COMMON-003 — GET /api/v1/ja/dropdown ─────────────────
  // フォーム dropdown 用のサーバページング + 検索可能 JA リスト。
  // 同一パスで2用途を統合：
  //   1. free-text + 無限スクロール(SCR-009 管理支店 create 等)
  //      — q/page/per_page、任意 include_id。
  //   2. カスケード絞込み(SCR-024 検索 / SCR-025 登録)
  //      — todofuken_code/role_id で兄弟dropdown連動の絞込み。
  // 両契約とも同じページング形を返す(カスケード呼び元は meta 無視で data のみ)。
  // role_id → chuokai_flg は先に role_id→role_code へ解決(PK ハードコード禁止)：
  //   CHUOKAI                     → chuokai_flg=TRUE (中央会)
  //   JA_HONTEN / JA_KANRI_SHITEN → chuokai_flg=FALSE (単協)
  // DataScope: applyJaScope 適用で非 NICHINO は自組織階層の JA のみ。
  // include_id は DataScope を迂回しない(範囲外 id は黙って除外)。
  async dropdown(
    query: JaDropdownQueryDto,
    session: SessionPayload,
  ): Promise<{
    data: Array<{
      ja_id: number;
      ja_code: string;
      ja_name: string;
      todofuken_code: string;
      chuokai_flg: boolean;
    }>;
    meta: { total: number; page: number; per_page: number; has_more: boolean };
  }> {
    const page = query.page ?? 1;
    const per_page = query.per_page ?? 50;

    const qb = this.repo
      .createQueryBuilder('mj')
      .select([
        'mj.jaId',
        'mj.jaCode',
        'mj.jaName',
        'mj.todofukenCode',
        'mj.chuokaiFlg',
      ])
      .where('mj.deleted_at IS NULL');

    // [scope=todofuken] SCR-022 ファイルダウンロード画面専用の拡大（顧客要件 2026-07）。
    // 中央会に限り 自JA → 自都道府県の全JA。拡大先の県はクライアント指定ではなく
    // セッションの todofuken_code なので、他県を覗くことはできない。中央会以外・
    // todofuken_code 未設定（旧セッション）は通常の applyJaScope へフォールバック。
    const chuokaiTodofuken =
      query.scope === 'todofuken' &&
      session.role_code === RoleCode.CHUOKAI &&
      (session.todofuken_code ?? '').trim() !== ''
        ? (session.todofuken_code as string).trim()
        : null;
    if (chuokaiTodofuken != null) {
      qb.andWhere('mj.todofuken_code = :scopeTodofuken', {
        scopeTodofuken: chuokaiTodofuken,
      });
    } else {
      applyJaScope(qb, 'mj', 'jaId', session);
    }

    if (query.q) {
      // [match-field] 'name' = ja_name のみ(SCR-024 は ja_code 非表示で
      // コード検索がユーザに見えないため)。既定 'both' は他呼び元の従来動作。
      if (query.match_field === 'name') {
        qb.andWhere('mj.ja_name ILIKE :q', { q: `%${query.q}%` });
      } else {
        qb.andWhere('(mj.ja_code ILIKE :q OR mj.ja_name ILIKE :q)', {
          q: `%${query.q}%`,
        });
      }
    }

    if (query.todofuken_code) {
      qb.andWhere('mj.todofuken_code = :tdcode', {
        tdcode: query.todofuken_code,
      });
    }

    // role_id → chuokai_flg カスケード。分岐前に(DB採番 BIGSERIAL の)role_id を
    // 安定した role_code へ解決し、m_roles PK 値をハードコードしない(挿入順依存
    // — SeedMRoles migration 参照)。中央会→TRUE、単協(JA本店/JA管理支店)→FALSE。
    // 不明な role_id / 日農ロールは 400 でなく素通り(SCR-024 spec に一致)。
    if (query.role_id !== undefined) {
      const role = await this.roleRepo.findOne({
        where: { roleId: query.role_id },
        select: ['roleCode'],
      });
      if (role?.roleCode === RoleCode.CHUOKAI) {
        qb.andWhere('mj.chuokai_flg = :chuokaiFlg', { chuokaiFlg: true });
      } else if (
        role?.roleCode === RoleCode.JA_HONTEN ||
        role?.roleCode === RoleCode.JA_KANRI_SHITEN
      ) {
        qb.andWhere('mj.chuokai_flg = :chuokaiFlg', { chuokaiFlg: false });
      }
    }

    qb.orderBy('mj.ja_code', 'ASC')
      .take(per_page)
      .skip((page - 1) * per_page);

    const [rows, total] = await qb.getManyAndCount();
    const pageIds = new Set(rows.map((r) => r.jaId));

    // include_id: 指定行が scope 内だが現ページ範囲外の場合、先頭に付加し、
    // FE が選択済みオプションを GET /api/v1/ja/:id の再取得なしで描画できるように。
    let pinned: Ja | null = null;
    if (query.include_id && !pageIds.has(query.include_id)) {
      const pinnedQb = this.repo
        .createQueryBuilder('mj')
        .select([
          'mj.jaId',
          'mj.jaCode',
          'mj.jaName',
          'mj.todofukenCode',
          'mj.chuokaiFlg',
        ])
        .where('mj.deleted_at IS NULL')
        .andWhere('mj.ja_id = :id', { id: query.include_id });
      applyJaScope(pinnedQb, 'mj', 'jaId', session);
      pinned = await pinnedQb.getOne();
    }

    // ja_id を BIGINT-as-string から number へ変換(TypeORM+pg は entity が
    // number 型でも BIGINT を string で返す)。放置すると FE <a-select> の
    // strict-equal 照合が失敗し(option.value="60" vs v-model 60)、antd が
    // `${ja_code} ${ja_name}` ラベルでなく生 id を描画する。
    const data = [...(pinned ? [pinned] : []), ...rows].map((r) => ({
      ja_id: Number(r.jaId),
      ja_code: r.jaCode,
      ja_name: r.jaName,
      todofuken_code: r.todofukenCode,
      chuokai_flg: r.chuokaiFlg,
    }));

    return paginateCursor(data, total, page, per_page);
  }
}
