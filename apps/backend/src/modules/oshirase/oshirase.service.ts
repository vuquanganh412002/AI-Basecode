import { Injectable, Optional } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import type { Request } from 'express';
import { DataSource, IsNull, Not, Repository } from 'typeorm';

import { Oshirase } from '@/database/entities/oshirase.entity';
import {
  AuditOperation, OshiraseStatus, OshiraseType, PublishLocation } from '@/common/enums';
import {
  BadRequestException,
  NotFoundException,
  ValidationException,
} from '@/common/exceptions/common.exceptions';
import { buildAuditCtx } from '@/common/utils/audit-context';
import { paginate, type PaginatedResponse } from '@/common/utils/paginate';
import { ScreenName } from '@/common/constants/screen-name.constant';
import { SuccessMessage } from '@/common/constants/success-message.constant';
import { AuditLogService } from '@/modules/audit-log/audit-log.service';
import { CodeService } from '@/modules/code/code.service';
import type { SessionPayload } from '@/modules/auth/session.service';

import {
  LoginOshiraseItemDto,
  LoginOshiraseQueryDto,
} from './dto/login-oshirase-query.dto';
import type { CreateOshiraseDto } from './dto/create-oshirase.dto';
import type { UpdateOshiraseDto } from './dto/update-oshirase.dto';
import {
  OSHIRASE_SEARCH_SORT_BY,
  type SearchOshiraseDto,
} from './dto/search-oshirase.dto';
import { DeadlineNoticeDuplicateException } from './exceptions/deadline-notice-duplicate.exception';
import { MAX_OSHIRASE_LIST_LIMIT } from './oshirase.constants';
import {
  toOshiraseDetail,
  toOshiraseListItem,
  type OshiraseDetail,
  type OshiraseListItem,
} from './oshirase.mapper';
import {
  dateOnlyIsoJst,
  formatDateTimeMinutesJst,
  parseDatetimeMinutesJst,
} from '@/common/utils/datetime';

const TABLE_NAME = 't_oshirase';
/** 「新着」バッジを表示する期間（公開起点から N 日以内なら is_new=true）。 */
const NEW_BADGE_DAYS = 7;

// OSHIRASE_TYPE は Group B → Group A に昇格: value 4
// (`OshiraseType.DEADLINE`) が3箇所（場所ペアリング・システム全体一意性・
// 削除不可）で業務分岐を駆動するため `@/common/enums` に置き、BE/FE ミラーを
// enum-sync 統合テストで強制する。

/**
 * 現在分の開始 epoch ms（本番は Dockerfile + TypeORM options で ECS/Postgres
 * とも Asia/Tokyo 固定）。フォーム入力が YYYY/MM/DD HH:mm（秒なし）のため
 * publish_start_date の過去日検査は分精度。
 */
function nowMinuteFloor(): number {
  const d = new Date();
  d.setSeconds(0, 0);
  return d.getTime();
}

/** 過去の開始日を拒否する VALIDATION_ERROR（FE の applyServerErrors が
 *  publish_start_date のフィールドエラーへマップ）。 */
function publishStartPastException(): ValidationException {
  return new ValidationException([
    { field: 'publish_start_date', message: '過去日は選択できません。' },
  ]);
}

/**
 * 公開期間の相関チェック用 VALIDATION_ERROR（ACSMS-MSG-031-008、
 * screen-design.md §画面項目定義 No.5「開始<=終了の相関チェック」）:
 * 表示終了日時 は 表示開始日時 より前不可。等時刻は許可、end < start のみ
 * 拒否。end=NULL（無期限）は対象外。create()/update() 双方で使用。
 */
function publishEndBeforeStartException(): ValidationException {
  return new ValidationException([
    { field: 'publish_end_date', message: '終了日は開始日より後にしてください。' },
  ]);
}

/**
 * 締め切り時間（oshirase_type=4）と MENU_DEADLINE（publish_location=3）の
 * 双方向ペアリングを強制:
 *   - type=4 は publish_location=3 必須
 *   - publish_location=3 は type=4 必須
 * VALIDATION_ERROR を返す（FE の applyServerErrors がマップ）。
 * create()/update() 双方で使用。
 */
function assertDeadlineLocationPairing(
  oshiraseType: number,
  publishLocation: number,
): void {
  const isDeadlineType = oshiraseType === OshiraseType.DEADLINE;
  const isDeadlineLocation = publishLocation === PublishLocation.MENU_DEADLINE;
  if (isDeadlineType === isDeadlineLocation) return;
  const errors: { field: string; message: string }[] = [];
  if (isDeadlineType && !isDeadlineLocation) {
    errors.push({
      field: 'publish_location',
      message:
        '締め切り時間のお知らせは「メニュー画面（締め切り時間）」のみ選択できます。',
    });
  } else {
    errors.push({
      field: 'oshirase_type',
      message:
        '「メニュー画面（締め切り時間）」は締め切り時間のお知らせ専用です。',
    });
  }
  throw new ValidationException(errors);
}

/**
 * ACSMS-SCR-010 の GET /api/v1/oshirase/menu が返す項目。
 *
 * [no-labels-policy] 認証エンドポイント — `oshirase_type_label` なし。
 * FE が `useCodesStore().label('OSHIRASE_TYPE', value)` で解決。
 * （公開の ACSMS-SCR-001 findLogin は未認証で m_code キャッシュがないため
 * ラベルを serialize する。）
 */
export interface MenuOshiraseItem {
  oshirase_id: number;
  title: string;
  content: string;
  oshirase_type: number;
  publish_start_date: string;
  publish_end_date: string | null;
  is_new: boolean;
  ja_id: number | null;
}

@Injectable()
export class OshiraseService {
  constructor(
    @InjectRepository(Oshirase) private readonly repo: Repository<Oshirase>,
    // OSHIRASE_TYPE は Group B の m_code カテゴリ（実行時拡張可）。公開
    // エンドポイントは匿名呼び出し（ログイン画面）が FE m_code キャッシュを
    // 持たないためラベルを serialize 必須（`.claude/rules/nestjs.md
    // §Response serialization`）。
    private readonly codeService: CodeService,
    // ACSMS-SCR-031 管理エンドポイントは audit log + transaction が必要。ACSMS-SCR-001
    // spec が (repo, codeService) のみで生成できるよう @Optional()。本番 DI は
    // 常に両方供給（oshirase.module.ts 参照）。
    @Optional() private readonly auditLog?: AuditLogService,
    @Optional() @InjectDataSource() private readonly dataSource?: DataSource,
  ) {}

  // ═══════════════════════════════════════════════════════════════════
  // ACSMS-SCR-001 — Login screen list (no auth)
  // ═══════════════════════════════════════════════════════════════════
  async findLogin(query: LoginOshiraseQueryDto): Promise<LoginOshiraseItemDto[]> {
    const limit = Math.min(query.limit ?? MAX_OSHIRASE_LIST_LIMIT, MAX_OSHIRASE_LIST_LIMIT);
    // `now` は現在の絶対時刻。publish_start_date / publish_end_date も
    // TIMESTAMPTZ（絶対時刻）なので、下の期間比較は TZ 非依存（壁時計日付
    // でなく2つの瞬間の比較）。コンテナは TZ=Asia/Tokyo なのでこの瞬間は
    // 「JST の now」に等しい。
    const now = new Date();

    const rows = await this.repo
      .createQueryBuilder('o')
      .where('o.publish_location = :publishLocation', {
        publishLocation: PublishLocation.LOGIN,
      })
      .andWhere('o.status = :status', { status: OshiraseStatus.PUBLIC })
      // ログインバナーは汎用3種別（システム/重要/一般）のみ表示。
      // type 4（締め切り時間）はメニュー画面（publish_location=3）専用で除外。
      .andWhere('o.oshirase_type IN (:...types)', {
        types: [
          OshiraseType.SYSTEM,
          OshiraseType.IMPORTANT,
          OshiraseType.GENERAL,
        ],
      })
      .andWhere('o.publish_start_date <= :now', { now })
      .andWhere('(o.publish_end_date IS NULL OR o.publish_end_date >= :now)', { now })
      .andWhere('o.ja_id IS NULL')
      .andWhere({ deletedAt: IsNull() })
      // 更新日時の新しい順。updated_at 欠損時は created_at にフォールバック
      // （現状 NOT NULL — @UpdateDateColumn を迂回する将来経路への防御）。
      .orderBy('COALESCE(o.updated_at, o.created_at)', 'DESC')
      .take(limit)
      .getMany();

    return rows.map((r) => ({
      oshirase_id: Number(r.oshiraseId),
      oshirase_type: r.oshiraseType,
      oshirase_type_label: this.codeService.getLabel('OSHIRASE_TYPE', r.oshiraseType),
      title: r.title,
      // JST 暦日 — toISOString().slice(0,10) 不可（UTC で 09:00 JST 前は
      // 1日ズレる）。
      publish_start_date: dateOnlyIsoJst(r.publishStartDate),
    }));
  }

  // ═══════════════════════════════════════════════════════════════════
  // ACSMS-SCR-010 — Menu screen list (authenticated, any role)
  // ═══════════════════════════════════════════════════════════════════

  // ACSMS-API-010-001 — GET /api/v1/oshirase/menu?limit=20
  async getMenuList(
    session: SessionPayload,
    limitInput?: number,
  ): Promise<{
    data: {
      oshirase_list: MenuOshiraseItem[];
      deadline_notice: MenuOshiraseItem | null;
    };
  }> {
    const limit = Math.min(
      Math.max(limitInput ?? MAX_OSHIRASE_LIST_LIMIT, 1),
      MAX_OSHIRASE_LIST_LIMIT,
    );
    const now = new Date();
    const newBadgeMs = NEW_BADGE_DAYS * 24 * 60 * 60 * 1000;
    const userJaId = session.ja_id;
    // target_kanri_kubun はカンマ区切りの 管理者区分 code（= role_id 1〜5）。
    // 空文字 = 全選択（全 role 対象）。全員対象 OR 閲覧者の role_id が
    // リストに含まれる場合に表示。カンマ括り技（",3,4," LIKE "%,3,%"）で
    // トークン単位一致 — role 3 が "13"/"30" に誤マッチしない — かつ配列関数
    // なしで全 SQL 方言（pg-mem 含む）で動作。
    const kanriNeedle = `%,${session.role_id},%`;

    // 共通フィルタ: publish_location IN (MENU=2, MENU_DEADLINE=3),
    // status=公開, deleted_at IS NULL, 公開期間内, ja_id NULL OR
    // ja_id = user.ja_id, target_kanri_kubun が閲覧者の role に一致。2つの
    // 場所がヘッダ2枠に対応 — 通常メニュー通知（type≠4）は MENU、単一の
    // 締め切り時間（type=4）は MENU_DEADLINE。
    const baseQb = () => {
      const qb = this.repo
        .createQueryBuilder('o')
        .where('o.publish_location IN (:...publishLocations)', {
          publishLocations: [
            PublishLocation.MENU,
            PublishLocation.MENU_DEADLINE,
          ],
        })
        .andWhere('o.status = :status', { status: OshiraseStatus.PUBLIC })
        .andWhere('o.publish_start_date <= :now', { now })
        .andWhere(
          '(o.publish_end_date IS NULL OR o.publish_end_date >= :now)',
          { now },
        )
        .andWhere(
          "(o.target_kanri_kubun = '' OR (',' || o.target_kanri_kubun || ',') LIKE :kanriNeedle)",
          { kanriNeedle },
        )
        .andWhere({ deletedAt: IsNull() });
      if (userJaId == null) {
        qb.andWhere('o.ja_id IS NULL');
      } else {
        qb.andWhere('(o.ja_id IS NULL OR o.ja_id = :userJaId)', { userJaId });
      }
      return qb;
    };

    // 更新日時の新しい順。updated_at 欠損時は created_at にフォールバック
    // （防御 — 現状 NOT NULL）。
    const ORDER_EXPR = 'COALESCE(o.updated_at, o.created_at)';
    const [rows, deadlineRow] = await Promise.all([
      baseQb()
        .andWhere('o.oshirase_type != :deadlineType', {
          deadlineType: OshiraseType.DEADLINE,
        })
        .orderBy(ORDER_EXPR, 'DESC')
        .take(limit)
        .getMany(),
      baseQb()
        .andWhere('o.oshirase_type = :deadlineType', {
          deadlineType: OshiraseType.DEADLINE,
        })
        .orderBy(ORDER_EXPR, 'DESC')
        .take(1)
        .getOne(),
    ]);

    const toMenuItem = (r: Oshirase): MenuOshiraseItem => {
      // 新着バッジ: 最終更新から7日以内。updated_at 欠損時は created_at に
      // フォールバック（現状 NOT NULL — 防御）。
      const freshnessBasis = r.updatedAt ?? r.createdAt;
      return {
        oshirase_id: Number(r.oshiraseId),
        title: r.title,
        content: r.content,
        oshirase_type: r.oshiraseType,
        publish_start_date: formatDateTimeMinutesJst(r.publishStartDate),
        publish_end_date: r.publishEndDate
          ? formatDateTimeMinutesJst(r.publishEndDate)
          : null,
        is_new: now.getTime() - freshnessBasis.getTime() <= newBadgeMs,
        ja_id: r.jaId === null ? null : Number(r.jaId),
      };
    };

    return {
      data: {
        oshirase_list: rows.map(toMenuItem),
        deadline_notice: deadlineRow ? toMenuItem(deadlineRow) : null,
      },
    };
  }

  // ═══════════════════════════════════════════════════════════════════
  // SCR-031 — Admin list / detail / CRUD
  // ═══════════════════════════════════════════════════════════════════

  // API-031-001 — GET /api/v1/oshirase
  async getList(
    query: SearchOshiraseDto,
  ): Promise<PaginatedResponse<OshiraseListItem>> {
    const page = query.page ?? 1;
    const perPage = query.per_page ?? 20;
    const sortOrder: 'ASC' | 'DESC' =
      (query.sort_order ?? 'desc').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    // 既定ソート（sort_by 未指定）: COALESCE(updated_at, created_at) DESC —
    // 最近更新順で、新規作成/更新された通知がピン留めの締め切り時間直下に出る。
    // 明示的な許可済み sort_by はカラムを上書き（締め切り時間はピン維持）。
    const explicitSort =
      query.sort_by !== undefined &&
      OSHIRASE_SEARCH_SORT_BY.includes(query.sort_by);
    const sortColumn = explicitSort
      ? `o.${query.sort_by}`
      : 'COALESCE(o.updated_at, o.created_at)';

    // 締め切り時間の行をソート指定に関わらず全ページ先頭にピン留め。
    // boolean 式が締め切り時間で TRUE → DESC で先頭。Postgres は ORDER BY の
    // 素の boolean を受理。ORDER BY は TypeORM の名前付きパラメータ不可のため
    // `OshiraseType.DEADLINE` をテンプレートリテラルで inline — number 定数
    // 型なので埋込値は安全（ユーザー入力なし）。
    const qb = this.repo
      .createQueryBuilder('o')
      .where({ deletedAt: IsNull() })
      .orderBy(`(o.oshirase_type = ${OshiraseType.DEADLINE})`, 'DESC')
      .addOrderBy(sortColumn, sortOrder)
      .take(perPage)
      .skip((page - 1) * perPage);

    const [rows, total] = await qb.getManyAndCount();

    // [ja-name-batch] ページ内の distinct ja_id をキーに追加1クエリで
    // ja_name を解決 — 行毎ルックアップの N+1 を回避しつつ、TypeORM 0.3.x の
    // 式 ORDER BY パーサが .getRawAndEntities()+leftJoin で上記 boolean 式の
    // "(o" 接頭辞を alias 化しようとして失敗する問題も回避。
    const jaIds = Array.from(
      new Set(rows.map((r) => r.jaId).filter((id): id is number => id !== null)),
    );
    const jaNameById = new Map<number, string>();
    if (jaIds.length > 0) {
      const jaRows = await this.repo.manager
        .createQueryBuilder()
        .select(['j.ja_id AS ja_id', 'j.ja_name AS ja_name'])
        .from('m_ja', 'j')
        .where('j.ja_id IN (:...ids)', { ids: jaIds })
        .andWhere('j.deleted_at IS NULL')
        .getRawMany<{ ja_id: number | string; ja_name: string }>();
      for (const j of jaRows) jaNameById.set(Number(j.ja_id), j.ja_name);
    }

    const items = rows.map((row) =>
      toOshiraseListItem(
        row,
        row.jaId === null ? null : (jaNameById.get(Number(row.jaId)) ?? null),
      ),
    );
    return paginate(items, total, page, perPage);
  }

  // API-031-002 — GET /api/v1/oshirase/:id
  async getDetail(oshiraseId: number): Promise<{ data: OshiraseDetail }> {
    const row = await this.repo.findOne({
      where: { oshiraseId, deletedAt: IsNull() },
    });
    if (!row) throw new NotFoundException('お知らせ');
    return { data: toOshiraseDetail(row) };
  }

  // API-031-003 — POST /api/v1/oshirase
  async create(
    dto: CreateOshiraseDto,
    session: SessionPayload,
    req: Request,
  ): Promise<{ data: OshiraseDetail; message: string }> {
    this.assertScrAdminDeps();

    // [deadline-pairing] type=4 ⇔ publish_location=3 (MENU_DEADLINE) は
    // 1:1 で対応する。FE は type=4 選択時に publish_location=3 へロック
    // するため通常到達しないが、API 直接呼び出し対策で BE 側でも検査。
    assertDeadlineLocationPairing(dto.oshirase_type, dto.publish_location);

    // [uniqueness-check] 締め切り時間 重複チェック。システム全体ルール
    // （顧客確認 2026-05）: publish_location に関わらず締め切り時間は同時に
    // 1件のみ。旧来の狭い形（publish_location = MENU AND type = 4）では別の
    // publish_location に2件目の type=4 を作れてしまった。oshirase_type は
    // Group B（TS enum なし）で、定数 `OshiraseType.DEADLINE` が m_code 値を示す。
    if (dto.oshirase_type === OshiraseType.DEADLINE) {
      const exists = await this.repo.count({
        where: {
          oshiraseType: OshiraseType.DEADLINE,
          deletedAt: IsNull(),
        },
      });
      if (exists > 0) throw new DeadlineNoticeDuplicateException();
    }

    const startDate = parseDatetimeMinutesJst(dto.publish_start_date);
    const endDate = dto.publish_end_date
      ? parseDatetimeMinutesJst(dto.publish_end_date)
      : null;
    if (!startDate) {
      throw new BadRequestException('表示開始日時の形式が不正です。');
    }
    if (dto.publish_end_date && !endDate) {
      throw new BadRequestException('表示終了日時の形式が不正です。');
    }

    // [period-correlation-check] 表示終了日時は表示開始日時以降であること
    // （ACSMS-MSG-031-008、screen-design「開始<=終了の相関チェック」）。
    // 終了日時 NULL = 無期限 → チェック対象外。FE でも検査するが、API
    // 直接呼び出し対策で BE 側でも防御線を張る。
    if (endDate && endDate.getTime() < startDate.getTime()) {
      throw publishEndBeforeStartException();
    }

    // [past-start-check] 新規作成時は publish_start_date が現在分以降で
    // あること（顧客確認 2026-05、分精度）。FE は disabled-date /
    // disabled-time + validateForm で防御するが、BE 側でも防御線を張る。
    if (startDate.getTime() < nowMinuteFloor()) {
      throw publishStartPastException();
    }

    let saved: Oshirase | null = null;
    try {
      saved = await this.dataSource!.transaction(async (manager) => {
        const payload = manager.create(Oshirase, {
          jaId: dto.ja_id ?? null,
          oshiraseType: dto.oshirase_type,
          publishLocation: dto.publish_location,
          status: dto.status,
          title: dto.title,
          content: dto.content,
          publishStartDate: startDate,
          publishEndDate: endDate,
          targetKanriKubun: dto.target_kanri_kubun ?? '',
          createdBy: String(session.account_id),
          updatedBy: String(session.account_id),
        });
        const created = await manager.save(Oshirase, payload);
        await this.auditLog!.logCreate(
          buildAuditCtx(session, req, ScreenName.ACSMS_SCR_031, TABLE_NAME, Number(created.oshiraseId)),
          created,
          manager,
        );
        return created;
      });
    } catch (err) {
      await this.auditLog!.logError(
        buildAuditCtx(session, req, ScreenName.ACSMS_SCR_031, TABLE_NAME, null),
        AuditOperation.CREATE,
        err as Error,
      );
      throw err;
    }

    return {
      data: toOshiraseDetail(saved),
      message: SuccessMessage.CREATED,
    };
  }

  // API-031-004 — PATCH /api/v1/oshirase/:id
  async update(
    oshiraseId: number,
    dto: UpdateOshiraseDto,
    session: SessionPayload,
    req: Request,
  ): Promise<{ data: OshiraseDetail; message: string }> {
    this.assertScrAdminDeps();

    const existing = await this.repo.findOne({
      where: { oshiraseId, deletedAt: IsNull() },
    });
    if (!existing) throw new NotFoundException('お知らせ');

    // [deadline-pairing] type=4 ⇔ publish_location=3 (MENU_DEADLINE)。
    // create と同ルール — 入力 DTO に適用し、変更後も 1:1 対応を満たす
    // （API 直接呼び出しで不整合な body を通さない）。
    assertDeadlineLocationPairing(dto.oshirase_type, dto.publish_location);

    // 締め切り時間 重複チェック。create と同じシステム全体一意性ルール —
    // ただし編集中の行は除外し、既存の締め切り時間自身の保存で誤検知しない。
    if (dto.oshirase_type === OshiraseType.DEADLINE) {
      const exists = await this.repo.count({
        where: {
          oshiraseType: OshiraseType.DEADLINE,
          deletedAt: IsNull(),
          oshiraseId: Not(oshiraseId),
        },
      });
      if (exists > 0) throw new DeadlineNoticeDuplicateException();
    }

    const newStart = parseDatetimeMinutesJst(dto.publish_start_date);
    const newEnd = dto.publish_end_date
      ? parseDatetimeMinutesJst(dto.publish_end_date)
      : null;
    if (!newStart) {
      throw new BadRequestException('表示開始日時の形式が不正です。');
    }
    if (dto.publish_end_date && !newEnd) {
      throw new BadRequestException('表示終了日時の形式が不正です。');
    }

    // [period-correlation-check] 編集時も表示終了日時は表示開始日時以降で
    // あること（ACSMS-MSG-031-008）。終了日時 NULL = 無期限 → 対象外。
    if (newEnd && newEnd.getTime() < newStart.getTime()) {
      throw publishEndBeforeStartException();
    }

    // [past-start-check] 編集時の publish_start_date ルール（顧客確認 2026-05、分精度）:
    //   - 保存済み開始日=過去 + 値変更なし → 通す（read-only 維持）
    //   - 保存済み開始日=過去 + 値変更あり → 拒否（過去日の編集不可）
    //   - 保存済み開始日=未来 + 新値<現在 → 拒否（過去日への変更不可）
    //   - 保存済み開始日=未来 + 新値>=現在 → 通す
    //
    // [minute-precision] フォーム入力は YYYY/MM/DD HH:mm（秒なし）で
    // parseDatetimeMinutesJst は常に seconds=0 の Date を返す。一方 DB 行は
    // INSERT 時の完全 timestamp（例 15:44:55.303）を保持。厳密な getTime()
    // 比較では該当フィールド未変更の PATCH も変更扱いになる。分精度で比較し
    // 「未変更で送信」を通す。
    const truncateToMinute = (d: Date): number => {
      const x = new Date(d);
      x.setSeconds(0, 0);
      return x.getTime();
    };
    const startChanged =
      truncateToMinute(newStart) !== truncateToMinute(existing.publishStartDate);
    const existingWasPast =
      existing.publishStartDate.getTime() < nowMinuteFloor();
    if (startChanged) {
      // 1) 保存済み開始日が過去のレコードは開始日を変更できない
      //    （FE は read-only にする。攻撃者の改竄もここで遮断）。
      // 2) 保存済み開始日が未来でも、新値が過去ならば不可。
      if (existingWasPast || newStart.getTime() < nowMinuteFloor()) {
        throw publishStartPastException();
      }
    }

    let updated: Oshirase | null = null;
    try {
      updated = await this.dataSource!.transaction(async (manager) => {
        const before = await manager.findOne(Oshirase, {
          where: { oshiraseId, deletedAt: IsNull() },
        });
        if (!before) throw new NotFoundException('お知らせ');

        const merged = manager.create(Oshirase, {
          ...before,
          jaId: dto.ja_id ?? null,
          oshiraseType: dto.oshirase_type,
          publishLocation: dto.publish_location,
          status: dto.status,
          title: dto.title,
          content: dto.content,
          publishStartDate: newStart,
          publishEndDate: newEnd,
          targetKanriKubun: dto.target_kanri_kubun ?? '',
          updatedBy: String(session.account_id),
        });
        const saved = await manager.save(Oshirase, merged);

        await this.auditLog!.logUpdate(
          buildAuditCtx(session, req, ScreenName.ACSMS_SCR_031, TABLE_NAME, Number(saved.oshiraseId)),
          before,
          saved,
          manager,
        );
        return saved;
      });
    } catch (err) {
      await this.auditLog!.logError(
        buildAuditCtx(session, req, ScreenName.ACSMS_SCR_031, TABLE_NAME, oshiraseId),
        AuditOperation.UPDATE,
        err as Error,
      );
      throw err;
    }

    return {
      data: toOshiraseDetail(updated),
      message: SuccessMessage.UPDATED,
    };
  }

  // API-031-005 — DELETE /api/v1/oshirase/:id
  async remove(
    oshiraseId: number,
    session: SessionPayload,
    req: Request,
  ): Promise<{ message: string }> {
    this.assertScrAdminDeps();

    const existing = await this.repo.findOne({
      where: { oshiraseId, deletedAt: IsNull() },
    });
    if (!existing) throw new NotFoundException('お知らせ');

    // [deadline-not-deletable] 締め切り時間（oshirase_type=4）は削除不可
    // （顧客確認 2026-05、1件のみ運用される締め切り時間データの取り違え／
    // 消失防止）。FE は削除リンクを無効化するが、BE 側でも遮断する。
    if (existing.oshiraseType === OshiraseType.DEADLINE) {
      throw new BadRequestException('締め切り時間のお知らせは削除できません。');
    }

    try {
      await this.dataSource!.transaction(async (manager) => {
        const before = await manager.findOne(Oshirase, {
          where: { oshiraseId, deletedAt: IsNull() },
        });
        if (!before) throw new NotFoundException('お知らせ');

        await manager.softDelete(Oshirase, oshiraseId);
        await this.auditLog!.logDelete(
          buildAuditCtx(session, req, ScreenName.ACSMS_SCR_031, TABLE_NAME, oshiraseId),
          before,
          manager,
        );
      });
    } catch (err) {
      await this.auditLog!.logError(
        buildAuditCtx(session, req, ScreenName.ACSMS_SCR_031, TABLE_NAME, oshiraseId),
        AuditOperation.DELETE,
        err as Error,
      );
      throw err;
    }

    return { message: SuccessMessage.DELETED };
  }

  /**
   * [scr031-deps-guard] create / update / remove（SCR-001 公開通知 service に
   * SCR-031 が追加した3管理エンドポイント）の集中ランタイム検査。dataSource /
   * auditLog は @Optional() で SCR-001 unit spec が (repo, codeService) のみで
   * 生成可能。本番 DI は常に両方供給。
   *
   * `asserts this is …` で絞り込まず void を返す — 後者は private auditLog を
   * public 型 override と交差させる際 never に潰れるため。各管理メソッド冒頭で
   * 呼び、下流は `!` non-null 断定で検査済み依存を読む。
   */
  private assertScrAdminDeps(): void {
    if (!this.dataSource || !this.auditLog) {
      throw new Error(
        'OshiraseService.dataSource/auditLog undefined — SCR-031 endpoints require both.',
      );
    }
  }
}
