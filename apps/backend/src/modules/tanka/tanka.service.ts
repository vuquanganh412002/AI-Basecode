import { Injectable, Logger } from '@nestjs/common';
import { AuditOperation } from '@/common/enums';
import { dateOnlyIsoJst, todayIsoJst } from '@/common/utils/datetime';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import type { Request } from 'express';
import { DataSource, IsNull, Repository } from 'typeorm';

import { Tanka } from '@/database/entities/tanka.entity';
import {
  paginate,
  paginateCursor,
  type PaginatedResponse,
} from '@/common/utils/paginate';
import {
  DuplicateCodeException,
  NotFoundException,
  ValidationException,
} from '@/common/exceptions/common.exceptions';
import { buildAuditCtx } from '@/common/utils/audit-context';
import { ZEI_KUBUN_SOTOZEI } from '@/common/constants/zei-kubun.constant';
import { ScreenName } from '@/common/constants/screen-name.constant';
import { SuccessMessage } from '@/common/constants/success-message.constant';
import { assertJaScope, applyJaScope } from '@/common/utils/data-scope';
import { isUniqueViolation } from '@/common/utils/db-errors';
import { assertNoRelatedRows } from '@/common/utils/fk-conflict';
import { assertMCodeValues } from '@/common/utils/m-code-validation';
import {
  AuditLogService,
  type AuditOperationContext,
} from '@/modules/audit-log/audit-log.service';
import { CodeService } from '@/modules/code/code.service';
import type { SessionPayload } from '@/modules/auth/session.service';

import { CreateTankaDto } from './dto/create-tanka.dto';
import { UpdateTankaDto } from './dto/update-tanka.dto';
import { SearchTankaDto, type TankaSearchSortBy } from './dto/search-tanka.dto';
import { TankaResponseDto } from './dto/tanka-response.dto';
import { toTankaResponse } from './tanka.mapper';

/** 画面別 audit-context ラベル。 */
const TABLE_NAME = 'm_tanka';


/**
 * CREATE の日付範囲チェック:
 *   - 適用開始日 >= 本日 (過去開始禁止。UPDATE は既存の過去開始日を許すため create 専用)。
 *   - 適用終了日 >= 適用開始日。
 * ValidationPipe 例外形に合わせた VALIDATION_ERROR を throw し、FE の useApiForm が
 * フィールドエラーを `<a-form-item :help>` へ一律マップできるようにする。
 */
function assertCreateDateRange(start: string, end: string): void {
  const errors: Array<{ field: string; message: string }> = [];
  const today = todayIsoJst();
  if (start < today) {
    errors.push({
      field: 'tekiyo_start_date',
      message: '適用開始日は本日以降の日付を指定してください。',
    });
  }
  if (!errors.length && end < start) {
    errors.push({
      field: 'tekiyo_end_date',
      message: '適用終了日は適用開始日以降を指定してください。',
    });
  }
  if (errors.length) {
    throw new ValidationException(errors);
  }
}

/**
 * UPDATE の日付範囲チェック: 適用終了日 >= 適用開始日。
 *
 * CREATE 用の {@link assertCreateDateRange} と異なり「開始日 >= 本日」は
 * 課さない — UPDATE は既存の過去開始日（過去に始まった単価の終了日変更）を
 * 許容する仕様のため、`start` には呼び出し側が確定させた実効開始日
 * （過去なら before の値でロック、未来ならそのまま dto の値）を渡す。
 * 順序チェック自体は CREATE/UPDATE で同一のはずが、UPDATE でだけ抜け落ちて
 * いた（PUT で終了日 < 開始日 を curl 直叩きすれば通ってしまっていた）。
 */
function assertUpdateDateRange(start: string, end: string): void {
  if (end < start) {
    throw new ValidationException([
      {
        field: 'tekiyo_end_date',
        message: '適用終了日は適用開始日以降を指定してください。',
      },
    ]);
  }
}

/**
 * `sort_by` → 完全修飾 QueryBuilder カラムの許可マップ (SORT_COLUMN_MAP)。
 * @IsIn(TANKA_SEARCH_SORT_BY) が範囲外を拒否済みだが、動的ルックアップ維持で
 * DTO ドリフト時の SQL インジェクションも防ぐ。
 *
 * TypeORM は date 列を本番では JS Date、pg-mem(テスト)では ISO 文字列で返す。
 * FE 期待の `YYYY-MM-DD` (nullable な tekiyo_end_date は null) へ正規化。
 * searchTanka の .map コールバックを簡潔に保つためモジュールスコープへ hoist (Sonar S7721)。
 */
function tekiyoStartDateIso(t: Tanka): string {
  // DATE 列: 文字列はそのまま、Date は JST 暦日へ。UTC ずれ回避のため
  // toISOString().slice ではなく dateOnlyIsoJst を使う。
  return dateOnlyIsoJst(t.tekiyoStartDate);
}

function tekiyoEndDateIso(t: Tanka): string | null {
  if (t.tekiyoEndDate === null || t.tekiyoEndDate === undefined) return null;
  return dateOnlyIsoJst(t.tekiyoEndDate);
}

const SORT_COLUMN_MAP: Record<TankaSearchSortBy, string> = {
  tanka_code: 'mt.tanka_code',
  tanka_name: 'mt.tanka_name',
  kingaku_zeikomi: 'mt.kingaku_zeikomi',
  kingaku_zeinuki: 'mt.kingaku_zeinuki',
  tax_rate: 'mt.tax_rate',
  tekiyo_start_date: 'mt.tekiyo_start_date',
  tekiyo_end_date: 'mt.tekiyo_end_date',
  // 既定 — 最新更新が先頭
  updated_at: 'mt.updated_at',
};

/**
 * tanka を参照する行が存在すると削除をブロックするテーブル群。
 * docs/design/ACSMS-SCR-002/ACSMS-SCR-002-api.md §4.4 準拠。
 * m_hanbaiten は haitatsuryo_tanka_id、t_dokusya/t_dokusya_rireki は
 * tanka_id で判定。各カラムは assertNoRelatedRows() が補間するため、
 * 呼び出し側はハードコードのタプルのみ渡す(ユーザ入力不可)。第3要素
 * （既定 true）は対象テーブルに `deleted_at` 列があるか — 無いテーブル
 * （t_dokusya_rireki は append-only）に true のまま渡すと SQL エラーになる。
 */
const RELATED_FK_CHECKS: ReadonlyArray<readonly [string, string, boolean?]> = [
  ['m_hanbaiten', 'haitatsuryo_tanka_id'],
  ['t_dokusya', 'tanka_id'],
  // 購読者履歴テーブル — append-only（deleted_at 列なし）。
  ['t_dokusya_rireki', 'tanka_id', false],
];

type TankaListItem = Pick<
  TankaResponseDto,
  | 'tanka_id'
  | 'tanka_type'
  | 'tanka_code'
  | 'tanka_name'
  | 'tekiyo_start_date'
  | 'tekiyo_end_date'
  | 'kingaku_zeikomi'
  | 'kingaku_zeinuki'
  | 'tax_rate'
  | 'active_flg'
  | 'campaign_flg'
>;

@Injectable()
export class TankaService {
  private readonly logger = new Logger(TankaService.name);

  constructor(
    @InjectRepository(Tanka) private readonly repo: Repository<Tanka>,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly auditLog: AuditLogService,
    private readonly codeService: CodeService,
  ) {}

  // ─── ACSMS-API-002-001 — GET /api/v1/tanka ────────────────────────────────────
  /**
   * ページング付き tanka 一覧。§4.3 DataScope 適用 (CHUOKAI / JA_HONTEN /
   * JA_KANRI_SHITEN は自 ja_id のみ。NICHINO_* は seeder 上 tanka.view 権限が無く
   * ガードチェーンで到達しない)。読み取り専用 — t_log 非書き込み。
   */
  async findAll(
    query: SearchTankaDto,
    session: SessionPayload,
  ): Promise<PaginatedResponse<TankaListItem>> {
    const page = query.page ?? 1;
    const per_page = query.per_page ?? 20;
    const sort_by: TankaSearchSortBy =
      (query.sort_by as TankaSearchSortBy) ?? 'updated_at';
    const sort_order = (query.sort_order ?? 'desc').toUpperCase() as
      | 'ASC'
      | 'DESC';

    const qb = this.repo.createQueryBuilder('mt');

    // [soft-delete-filter]
    qb.where('mt.deleted_at IS NULL');

    // 顧客要件 (2026-06): 既定で期限切れ(適用終了日が過去)の単価も含め全件表示。
    // 旧既定フィルタ「(tekiyo_end_date IS NULL OR >= CURRENT_DATE)」は廃止 —
    // 期間絞り込みは tekiyo_start_date / tekiyo_end_date の明示パラメータのみ。

    // [data-scope] — 制限ロールは自 JA のみ。
    applyJaScope(qb, 'mt', 'jaId', session);

    // [filter-conditions] — 完全/部分一致。
    if (query.tanka_type !== undefined) {
      qb.andWhere('mt.tanka_type = :tanka_type', {
        tanka_type: query.tanka_type,
      });
    }
    if (query.tanka_name) {
      qb.andWhere('mt.tanka_name ILIKE :tanka_name', {
        tanka_name: `%${query.tanka_name}%`,
      });
    }
    if (query.tekiyo_start_date) {
      // 指定日以降に開始 (tekiyo_start_date の下限)
      qb.andWhere('mt.tekiyo_start_date >= :tekiyo_start_date_filter', {
        tekiyo_start_date_filter: query.tekiyo_start_date,
      });
    }
    if (query.tekiyo_end_date) {
      // 指定日以前に終了 (tekiyo_end_date の上限)。NULL(無期限)は対象外 — IS NOT NULL 明示。
      qb.andWhere(
        'mt.tekiyo_end_date IS NOT NULL AND mt.tekiyo_end_date <= :tekiyo_end_date_filter',
        { tekiyo_end_date_filter: query.tekiyo_end_date },
      );
    }
    if (query.active_flg !== undefined) {
      qb.andWhere('mt.active_flg = :active_flg', {
        active_flg: query.active_flg,
      });
    }
    if (query.campaign_flg !== undefined) {
      qb.andWhere('mt.campaign_flg = :campaign_flg', {
        campaign_flg: query.campaign_flg,
      });
    }

    // [sort-paginate]
    const orderColumn = SORT_COLUMN_MAP[sort_by] ?? SORT_COLUMN_MAP.updated_at;
    qb.orderBy(orderColumn, sort_order)
      .take(per_page)
      .skip((page - 1) * per_page);

    const [rows, total] = await qb.getManyAndCount();

    const data: TankaListItem[] = rows.map((t) => ({
      tanka_id: Number(t.tankaId),
      tanka_type: Number(t.tankaType),
      tanka_code: t.tankaCode,
      tanka_name: t.tankaName,
      tekiyo_start_date: tekiyoStartDateIso(t),
      tekiyo_end_date: tekiyoEndDateIso(t),
      kingaku_zeikomi: Number(t.kingakuZeikomi),
      kingaku_zeinuki: Number(t.kingakuZeinuki),
      tax_rate: Number(t.taxRate),
      active_flg: Boolean(t.activeFlg),
      campaign_flg: Boolean(t.campaignFlg),
    }));

    return paginate(data, total, page, per_page);
  }

  // ─── API-002-002 — DELETE /api/v1/tanka/:tanka_id ───────────────────────
  /**
   * 論理削除。§4.4 FK 競合チェック → §4.5 deleted_at=NOW() → §4.6 同一トランザクションで
   * t_log 書き込み。失敗時は §4.8 エラーログ(log_type=3)をロールバック済みトランザクションの外で出力。
   */
  async remove(
    tankaId: number,
    session: SessionPayload,
    req: Request,
  ): Promise<{ message: string }> {
    // [fetch-target] — before_value スナップショットも兼ねる
    const before = await this.repo.findOne({
      where: { tankaId, deletedAt: IsNull() },
    });
    if (!before) throw new NotFoundException('単価');

    // [data-scope] — スコープ外は 404 でマスク (存在秘匿のため Forbidden でなく NotFound)
    assertJaScope(Number(before.jaId), session, '単価');

    // [fk-conflict-check] — 関連テーブルに参照行が残っていれば削除ブロック
    for (const [table, fk, hasDeletedAt = true] of RELATED_FK_CHECKS) {
      await assertNoRelatedRows(
        this.dataSource,
        [hasDeletedAt ? table : { table, hasDeletedAt: false }],
        fk,
        tankaId,
      );
    }

    const ctxBuilder = (): AuditOperationContext =>
      buildAuditCtx(session, req, ScreenName.ACSMS_SCR_002, TABLE_NAME, tankaId);

    try {
      await this.dataSource.transaction(async (manager) => {
        // [soft-delete]
        await manager.update(
          Tanka,
          { tankaId, deletedAt: IsNull() },
          {
            deletedAt: new Date(),
            updatedBy: String(session.account_id),
          },
        );

        // [audit-log-in-tx] — 原子性のため
        await this.auditLog.logDelete(ctxBuilder(), before, manager);
      });

      return { message: SuccessMessage.DELETED };
    } catch (err) {
      // [audit-error-log] — トレース保持のためロールバック済みトランザクションの外で
      await this.auditLog.logError(ctxBuilder(), AuditOperation.DELETE, err as Error);
      throw err;
    }
  }

  // ─── API-003-001 — GET /api/v1/tanka/:tanka_id ──────────────────────────
  /**
   * 単一 tanka 詳細(編集フォーム読込)。§4.3 DataScope 適用: 呼び出し側 ja_id 外の行は
   * 存在秘匿のため 404 でマスク (.claude/rules/security.md Layer 2)。読み取り専用 — t_log 非書き込み。
   */
  async findById(
    tankaId: number,
    session: SessionPayload,
  ): Promise<TankaResponseDto> {
    const row = await this.repo.findOne({
      where: { tankaId, deletedAt: IsNull() },
    });
    if (!row) throw new NotFoundException('単価');
    assertJaScope(Number(row.jaId), session, '単価');
    return toTankaResponse(row);
  }

  // ─── API-003-002 — POST /api/v1/tanka ───────────────────────────────────
  /**
   * 新規 tanka 挿入。§4.3 tanka_code で重複排除 → §4.4 INSERT + §4.5 一トランザクションで
   * t_log 書き込み。失敗時 §4.7 エラーログ(log_type=3)をロールバック済みトランザクションの外で出力。
   * `ja_id` はリクエストボディでなくセッションから束縛 — セキュリティ境界 (.claude/rules/security.md Layer 2)。
   */
  async create(
    dto: CreateTankaDto,
    session: SessionPayload,
    req: Request,
  ): Promise<TankaResponseDto> {
    // [code-master-check] — m_code 許可リストはサービスで判定
    // (CodeService は class-validator デコレータに注入できないため)。
    assertMCodeValues(this.codeService, [
      {
        field: 'tanka_type',
        value: dto.tanka_type,
        category: 'TANKA_TYPE',
        label: '単価種別',
      },
    ]);

    // [input-validation] — 日付範囲チェック (CREATE 専用)。FE も :disabled-date で
    // ミラーするため、ここは curl バイパスを塞ぐ。順序重要: 開始日過去チェックを先に行い、
    // 終了が開始より前でも誤った開始が報告されるようにする。
    assertCreateDateRange(dto.tekiyo_start_date, dto.tekiyo_end_date);

    const jaId = Number(session.ja_id ?? 0);
    const accountId = String(session.account_id);

    // [uniqueness-check] — 重複コードチェック。
    //
    // スコープは **JA 単位**。DB の UNIQUE INDEX が `(ja_id, tanka_code)` で、
    // 画面設計書 SCR-003 の項目定義も「単価はJAごとに持つ」と明記している。
    // 以前はここが `tanka_code` だけで数えており、他 JA が使っているコードまで
    // 重複扱いして登録できなかった（api.md §4.3 の SQL 例が ja_id を WHERE に
    // 入れ忘れており、それをそのまま実装していた。api.md 側も併せて訂正済み）。
    //
    // `withDeleted: true` — コード再利用は生涯禁止(論理削除後も行に予約される)。
    // deleted_at で絞らない DB UNIQUE INDEX に一致させるため。
    const dup = await this.repo.count({
      where: { jaId, tankaCode: dto.tanka_code },
      withDeleted: true,
    });
    if (dup > 0) {
      throw new DuplicateCodeException('単価コード', dto.tanka_code);
    }

    const ctxBuilder = (id?: number | null): AuditOperationContext =>
      buildAuditCtx(session, req, ScreenName.ACSMS_SCR_003, TABLE_NAME, id ?? null);

    try {
      const saved = await this.dataSource.transaction(async (manager) => {
        const entity = manager.create(Tanka, {
          jaId,
          tankaType: dto.tanka_type,
          tankaCode: dto.tanka_code,
          tankaName: dto.tanka_name,
          taxRate: dto.tax_rate ?? 0,
          kingakuZeikomi: dto.kingaku_zeikomi ?? 0,
          kingakuZeinuki: dto.kingaku_zeinuki ?? 0,
          tekiyoStartDate: dto.tekiyo_start_date,
          tekiyoEndDate: dto.tekiyo_end_date,
          // biko は database-design.md 上 NOT NULL DEFAULT ''。省略時は明示 '' で保存。
          biko: dto.biko ?? '',
          // active_flg 既定 TRUE (api.md §リクエストパラメータ #10)。
          activeFlg: dto.active_flg ?? true,
          // campaign_flg 既定 FALSE (キャンペーン非対象が通常)。
          campaignFlg: dto.campaign_flg ?? false,
          createdBy: accountId,
          updatedBy: accountId,
        });
        const written = await manager.save(Tanka, entity);
        // [audit-log-in-tx] — 原子性のため
        await this.auditLog.logCreate(
          ctxBuilder(Number(written.tankaId)),
          written,
          manager,
        );
        return written;
      });
      return toTankaResponse(saved);
    } catch (err) {
      // 競合セーフティネット: 同時 CREATE 2件が事前チェックを通過し、2件目の INSERT が
      // DB UNIQUE INDEX に当たるケース。23505 を 500 にせず 400 へ変換する。
      if (isUniqueViolation(err)) {
        await this.auditLog.logError(ctxBuilder(null), AuditOperation.CREATE, err as Error);
        throw new DuplicateCodeException('単価コード', dto.tanka_code);
      }
      // [audit-error-log] — ロールバック済みトランザクションの外で。
      await this.auditLog.logError(ctxBuilder(null), AuditOperation.CREATE, err as Error);
      throw err;
    }
  }

  // ─── API-003-003 — PUT /api/v1/tanka/:tanka_id ──────────────────────────
  /**
   * 既存 tanka の更新。§4.3 before スナップショット取得(NotFound / DataScope ゲート兼務) →
   * §4.4 UPDATE + §4.5 一トランザクションで before/after JSON 付き t_log 書き込み。
   * 失敗時 §4.7 エラーログ(log_type=3)をトランザクションの外で出力。
   * `tanka_code` は api.md §API-003-003 脚注により不変 — DTO 型
   * (UpdateTankaDto = OmitType(CreateTankaDto, ['tanka_code'])) が除外済みで、
   * かつ pipe の forbidNonWhitelisted が紛れ込んだ tanka_code を拒否。二重防御。
   */
  async update(
    tankaId: number,
    dto: UpdateTankaDto,
    session: SessionPayload,
    req: Request,
  ): Promise<TankaResponseDto> {
    // [fetch-target] + [data-scope] (スコープ外は存在秘匿のため 404 でマスク)。
    const before = await this.repo.findOne({
      where: { tankaId, deletedAt: IsNull() },
    });
    if (!before) throw new NotFoundException('単価');
    assertJaScope(Number(before.jaId), session, '単価');

    // [code-master-check] — m_code 許可リスト (create と同一呼び出し)。
    assertMCodeValues(this.codeService, [
      {
        field: 'tanka_type',
        value: dto.tanka_type,
        category: 'TANKA_TYPE',
        label: '単価種別',
      },
    ]);

    const accountId = String(session.account_id);
    const ctxBuilder = (): AuditOperationContext =>
      buildAuditCtx(session, req, ScreenName.ACSMS_SCR_003, TABLE_NAME, tankaId);

    // [input-validation] — 適用開始日が過去になると不変。FE の read-only を反映し、
    // 履歴の価格開始日を書き換える curl バイパスを防ぐ。silent-drop パターン
    // (.claude/rules/security.md Layer 3 の FIELD_RESTRICTIONS と同形): 保存値を維持し
    // 受信 dto フィールドは無視。
    const today = todayIsoJst();
    const startLocked = String(before.tekiyoStartDate) < today;
    const effectiveStartDate = startLocked
      ? String(before.tekiyoStartDate)
      : dto.tekiyo_start_date;

    // [input-validation] — 適用終了日 >= 実効開始日（CREATE と同じ順序チェック）。
    assertUpdateDateRange(effectiveStartDate, dto.tekiyo_end_date);

    // [reactivation-guard] 顧客要件: 有効(active_flg=true)な単価は、適用終了日が
    // 「無し」または「本日以降」でなければならない。tanka-expire バッチは
    // 失効→無効の一方向のみで、無効→有効の復帰は手動操作に委ねているため
    // （tanka-expire.service.ts 冒頭コメント参照）、ここでガードしないと
    // 「有効なのに既に終了済み」という矛盾した状態を保存でき、翌日のバッチで
    // 無意味に再度無効化されるだけになる。CREATEは
    // assertCreateDateRange（開始日≧本日 かつ 終了日≧開始日）で自動的に
    // 終了日≧本日が成立するため対象外。
    const effectiveActiveFlg = dto.active_flg ?? before.activeFlg;
    if (effectiveActiveFlg && dto.tekiyo_end_date && dto.tekiyo_end_date < today) {
      throw new ValidationException([
        {
          field: 'tekiyo_end_date',
          message: '有効な単価には本日以降の適用終了日を指定してください。',
        },
      ]);
    }

    try {
      const updated = await this.dataSource.transaction(async (manager) => {
        // [partial-update] — 更新可能フィールドを適用。tanka_code は before のまま
        // (api.md 脚注により不変)。
        const next = manager.create(Tanka, {
          ...before,
          tankaType: dto.tanka_type,
          tankaName: dto.tanka_name,
          taxRate: dto.tax_rate ?? before.taxRate,
          kingakuZeikomi: dto.kingaku_zeikomi ?? before.kingakuZeikomi,
          kingakuZeinuki: dto.kingaku_zeinuki ?? before.kingakuZeinuki,
          tekiyoStartDate: effectiveStartDate,
          tekiyoEndDate: dto.tekiyo_end_date,
          biko: dto.biko ?? before.biko,
          activeFlg: dto.active_flg ?? before.activeFlg,
          campaignFlg: dto.campaign_flg ?? before.campaignFlg,
          updatedBy: accountId,
        });
        const saved = await manager.save(Tanka, next);

        // [audit-log-in-tx] — before + after スナップショットを同一トランザクション内で。
        await this.auditLog.logUpdate(ctxBuilder(), before, saved, manager);
        return saved;
      });
      return toTankaResponse(updated);
    } catch (err) {
      await this.auditLog.logError(ctxBuilder(), AuditOperation.UPDATE, err as Error);
      throw err;
    }
  }

  // ─── GET /api/v1/tanka/dropdown ───────────────────────────────────
  /**
   * SCR-017 hanbaiten 作成フォーム 配達手数料単価 ドロップダウン用の slim ページング/検索一覧。
   *   - DataScope: 制限ロールは自 JA のみ。NICHINO_STAFF (代行入力) は任意の `ja_id`
   *     パラメータで JA スコープ。他ロールは applyJaScope が session.ja_id を固定するため無視。
   *   - `tanka_type`: 任意のカテゴリフィルタ (本フォームでは通常 2=配達手数料。汎用で再利用可)。
   *   - `q`: tanka_name のみ ILIKE — ドロップダウンは tanka_code 非表示のため。
   *   - soft-delete / 非 active / 期間外 (tekiyo_end_date < CURRENT_DATE) を除外 — 有効な単価のみ。
   *   - `include_id`: 編集フォームの escape hatch — 選択済み tanka_id が 1 ページ目外なら
   *     BE が先頭に付与し、追加 GET なしでラベルを解決。
   */
  async getDropdown(
    query: import('./dto/tanka-dropdown-query.dto').TankaDropdownQueryDto,
    session: SessionPayload,
  ): Promise<{
    data: Array<{
      tanka_id: number;
      tanka_code: string;
      tanka_name: string;
      tanka_type: number;
      kingaku_zeikomi: number;
      kingaku_zeinuki: number;
      // ログイン中 JA の税区分 (m_ja.zei_kubun) で解決した表示用金額。
      // zei_kubun=1(内税)→税込、=2(外税)→税抜。JA 不明時は税込を既定。
      kingaku: number;
      /**
       * キャンペーンフラグ（m_tanka.campaign_flg）。SCR-011 購読者フォームが
       * キャンペーン単価の登録・切替時にポップアップ注意喚起を出すために使う
       * （顧客要件 2026-08）。
       */
      campaign_flg: boolean;
    }>;
    meta: { total: number; page: number; per_page: number; has_more: boolean };
  }> {
    const page = query.page ?? 1;
    const per_page = query.per_page ?? 50;

    const buildScopedQb = () => {
      const qb = this.repo
        .createQueryBuilder('mt')
        .where('mt.deleted_at IS NULL')
        .andWhere('mt.active_flg = TRUE')
        .andWhere('mt.tekiyo_start_date <= CURRENT_DATE')
        .andWhere(
          '(mt.tekiyo_end_date IS NULL OR mt.tekiyo_end_date >= CURRENT_DATE)',
        );

      // [data-scope] 制限ロール → 自 JA のみ。session.ja_id == null (NICHINO_*) は
      // このドロップダウンを正当に消費する権限を持つロールのみ ja_id パラメータで
      // 絞込可（代行入力はフォームで JA を先に選択）。tanka.view 自体は
      // NICHINO_ADMIN/STAFF とも seeder.md で × だが、NICHINO_STAFF は
      // hanbaiten.daiko_input（SCR-017 販売店代行入力・配達手数料単価 picker）
      // 経由でこのドロップダウンを正当に使うため、その権限も許可する。
      // いずれも持たないロール（NICHINO_ADMIN）は何も返さない（バグ報告 2026-08
      // まで、ここが ja_id 未指定なら全JAの単価が見えてしまっていた）。
      const canUseTankaDropdown =
        session.permissions.includes('tanka.view') ||
        session.permissions.includes('hanbaiten.daiko_input');
      if (session.ja_id != null) {
        applyJaScope(qb, 'mt', 'jaId', session);
      } else if (!canUseTankaDropdown) {
        qb.andWhere('1 = 0');
      } else if (query.ja_id !== undefined) {
        qb.andWhere('mt.ja_id = :qja', { qja: query.ja_id });
      }

      if (query.tanka_type !== undefined) {
        qb.andWhere('mt.tanka_type = :tt', { tt: query.tanka_type });
      }
      if (query.q) {
        qb.andWhere('mt.tanka_name ILIKE :q', { q: `%${query.q}%` });
      }
      return qb;
    };

    const qb = buildScopedQb()
      .select([
        'mt.tankaId',
        'mt.tankaCode',
        'mt.tankaName',
        'mt.tankaType',
        'mt.kingakuZeikomi',
        'mt.kingakuZeinuki',
        'mt.campaignFlg',
      ])
      .orderBy('mt.tanka_name', 'ASC')
      .take(per_page)
      .skip((page - 1) * per_page);

    const [rows, total] = await qb.getManyAndCount();
    const pageIds = new Set(rows.map((r) => Number(r.tankaId)));

    // [include-id] 選択済み行が scope/active フィルタを通過しつつ現ページ外なら先頭に付与。
    let pinned: Tanka | null = null;
    if (query.include_id && !pageIds.has(query.include_id)) {
      const pinnedQb = buildScopedQb()
        .select([
          'mt.tankaId',
          'mt.tankaCode',
          'mt.tankaName',
          'mt.tankaType',
          'mt.kingakuZeikomi',
          'mt.campaignFlg',
        ])
        .andWhere('mt.tanka_id = :id', { id: query.include_id });
      pinned = await pinnedQb.getOne();
    }

    // [tanka-amount-by-zeikubun] ログイン中 JA の税区分で表示金額を解決 (顧客要件)。
    // effective JA = session.ja_id (JA スコープ role) ?? query.ja_id (NICHINO_STAFF
    // 代行入力で選択した JA)。zei_kubun=1(内税)→税込、=2(外税)→税抜。JA 不明
    // (NICHINO_ADMIN フィルタ無し等) は税込を既定。全行同一 JA スコープのため 1 回だけ解決。
    const effectiveJaId = session.ja_id ?? query.ja_id ?? null;
    let effectiveZeiKubun: number | null = null;
    if (effectiveJaId != null) {
      const jaRows = (await this.dataSource.query(
        'SELECT zei_kubun FROM m_ja WHERE ja_id = $1 AND deleted_at IS NULL LIMIT 1',
        [effectiveJaId],
      )) as Array<{ zei_kubun: number }>;
      effectiveZeiKubun = jaRows[0] ? Number(jaRows[0].zei_kubun) : null;
    }

    const data = [...(pinned ? [pinned] : []), ...rows].map((r) => {
      const zeikomi = Number(r.kingakuZeikomi);
      const zeinuki = Number(r.kingakuZeinuki);
      return {
        tanka_id: Number(r.tankaId),
        tanka_code: r.tankaCode,
        tanka_name: r.tankaName,
        tanka_type: r.tankaType,
        kingaku_zeikomi: zeikomi,
        kingaku_zeinuki: zeinuki,
        kingaku: effectiveZeiKubun === ZEI_KUBUN_SOTOZEI ? zeinuki : zeikomi,
        campaign_flg: Boolean(r.campaignFlg),
      };
    });

    return paginateCursor(data, total, page, per_page);
  }
}
