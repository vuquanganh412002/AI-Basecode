import { Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, IsNull, Repository } from 'typeorm';
import type { Request } from 'express';

import { Dokusya } from '@/database/entities/dokusya.entity';
import {
  NotFoundException,
  ValidationException,
} from '@/common/exceptions/common.exceptions';
import { buildAuditCtx } from '@/common/utils/audit-context';
import { todayIsoJst, normalizeDbDate } from '@/common/utils/datetime';
import {
  applyBranchScope,
  applyShitenScope,
  assertBranchScopeViolation,
  assertShitenScopeViolation,
  assertJaScopeViolation,
} from '@/common/utils/data-scope';
import { paginate, clampPerPage, type PaginatedResponse } from '@/common/utils/paginate';
import { AuditOperation, DokusyaShubetsu, TetsuzukiShurui } from '@/common/enums';
import { AuditLogService } from '@/modules/audit-log/audit-log.service';
import type { SessionPayload } from '@/modules/auth/session.service';

import { SearchReplaceDokusyaDto } from './dto/search-replace-dokusya.dto';
import { ReplaceHanbaitenDto } from './dto/replace-hanbaiten.dto';
import { DokusyaAccountFlagService } from './dokusya-account-flag.service';
import { DokusyaRirekiService } from './dokusya-rireki-helper.service';
import { applyChange } from './dokusya-history.writer';
import { SameHanbaitenException } from './exceptions/same-hanbaiten.exception';
import { DateRangeInvalidException } from './exceptions/date-range-invalid.exception';
import {
  IneligibleDokusyaException,
  type IneligibleDokusyaDetail,
} from './exceptions/ineligible-dokusya.exception';
import {
  toReplaceSearchItem,
  type ReplaceSearchItem,
} from './dokusya.mapper';
import { isBoth, isDigitalCreditCard, SHUBETSU_MSG } from './dokusya-shubetsu.rules';

/** ACSMS-SCR-015 監査ラベル。core DokusyaService と同一値だが自己完結のため複製。 */
const SCREEN_NAME_SCR015 = '統廃合販売店読者移行画面 (ACSMS-SCR-015)';

/** ACSMS-SCR-015 監査テーブル名（t_log.target_table）。core と同一値だが複製保持。 */
const TABLE_NAME = 't_dokusya';

/**
 * 電子版は本画面対象外の文言（ACSMS-MSG-015-009・顧客要件 2026-07）。電子版は
 * 販売店を持たず一括置換不可。FE `MSG_DIGITAL_UNSUPPORTED` と一致させる。
 */
const REPLACE_DIGITAL_UNSUPPORTED_MSG = '電子版は本画面では対象外です。';

/**
 * ACSMS-SCR-015 置換検索の sort_by 許可リスト。`SearchReplaceDokusyaDto` の `@IsIn` と
 * 一致必須。FE 識別子 → JOIN 済み完全修飾カラム。
 */
const REPLACE_SORT_COLUMN_MAP: Record<string, string> = {
  kanri_shiten_name: 'ks.kanri_shiten_name',
  shiten_name: 's.shiten_name',
  kumiaiin_code: 'd.kumiaiin_code',
  hanbaiten_code: 'h.hanbaiten_code',
};

/**
 * ACSMS-SCR-015 — 統廃合販売店読者移行画面（旧: 購読者販売店一括置換画面）。
 * 顧客要件2026-08: 本画面は販売店の統廃合（合併・閉店による読者の付け替え）専用の
 * 位置づけに変更。本画面経由の変更は t_dokusya_rireki.hanbaiten_tohaigo_flg=true で
 * 記録し、増減連絡票（販売店・ACSMS-SCR-028）の集計対象から除外される。
 * 一括置換 concern（候補検索・置換・事前検証）を core DokusyaService から切り出した
 * leaf サービス。facade が薄く委譲。挙動は分離前と byte-identical。
 */
@Injectable()
export class DokusyaReplaceService {
  constructor(
    @InjectRepository(Dokusya)
    private readonly dokusyaRepo: Repository<Dokusya>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly auditLog: AuditLogService,
    private readonly rireki: DokusyaRirekiService,
    private readonly accountFlags: DokusyaAccountFlagService,
  ) {}

  // ─── ACSMS-API-015-001 — GET /api/v1/dokusya/replace-hanbaiten/search ─────────
  /**
   * 一括置換画面の候補購読者を検索。
   * Flow (api.md §ACSMS-API-015-001):
   *   §4.1 date_from > date_to → DATE_RANGE_INVALID。
   *   §4.2 DataScope: CHUOKAI/JA_HONTEN→ja_id、JA_KANRI_SHITEN→kanri_shiten_id、NICHINO_*=bypass。
   *   §4.3 固定条件 tetsuzuki_shurui=1 AND deleted_at IS NULL。
   *   §4.4/§4.5 JOIN SELECT + getCount()。
   *   §4.6 行マッピング（shimei/住所 concat）+ paginate()。
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

    // §4.1 適用日ルールは購読種別依存（顧客要件 2026-07）。実行時チェックと同一基準を
    // 検索段でも適用する（詳細は assertTekiyoDateForShubetsu）。
    this.assertTekiyoDateForShubetsu(
      query.dokusya_shubetsu,
      query.joho_henko_tekiyo_date,
    );

    const page = Math.max(1, Number(query.page ?? 1));
    const perPage = clampPerPage(query.per_page);
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

    // §4.3 固定条件 — soft-delete 除外（購読中/種別/適用日/販売店は as-of 履歴で判定）。
    qb.where('d.deleted_at IS NULL');

    // §4.3 候補集合（顧客要件 2026-07・as-of 適用日）: 各購読者の「適用日時点で有効な
    //   履歴」= joho_henko_tekiyo_date が適用日以下で最大（同 joho は rireki_no 最大）の
    //   t_dokusya_rireki 行。その有効レコードが 購読中(tetsuzuki_shurui=新規)・指定種別・
    //   適用日時点で購読中(kaishi ≦ 適用日 かつ chushi 無 or > 適用日) を満たす購読者を返す。
    //   未来適用日でも as-of の履歴（現行 master ではなく適用日時点の販売店）で判定。
    // 置換元(hanbaiten_id) は任意 — 指定時のみ「有効レコードの販売店 = 置換元」で追加絞込。
    // 置換先(new_hanbaiten_id) は必須で常に「≠ 置換先」を適用（既に置換先の購読者を除外）。
    const sourceClause =
      query.hanbaiten_id != null
        ? 'AND eff.hanbaiten_id = :rkSourceHanbaiten\n          '
        : '';
    qb.andWhere(
      `d.dokusya_id IN (
        SELECT eff.dokusya_id FROM (
          SELECT DISTINCT ON (r.dokusya_id)
                 r.dokusya_id,
                 r.hanbaiten_id,
                 r.tetsuzuki_shurui,
                 r.dokusya_shubetsu,
                 r.dokusya_kaishi_date,
                 r.dokusya_chushi_date
          FROM t_dokusya_rireki r
          WHERE r.joho_henko_tekiyo_date IS NOT NULL
            AND r.joho_henko_tekiyo_date <= :rkApplied
          ORDER BY r.dokusya_id, r.joho_henko_tekiyo_date DESC, r.rireki_no DESC
        ) eff
        WHERE eff.hanbaiten_id <> :rkDestHanbaiten
          ${sourceClause}AND eff.tetsuzuki_shurui = ${TetsuzukiShurui.SHINKI}
          AND eff.dokusya_shubetsu = :rkShubetsu
          AND eff.dokusya_kaishi_date <= :rkApplied
          AND (eff.dokusya_chushi_date IS NULL OR eff.dokusya_chushi_date > :rkApplied)
      )`,
      {
        rkApplied: query.joho_henko_tekiyo_date,
        rkDestHanbaiten: query.new_hanbaiten_id,
        rkShubetsu: query.dokusya_shubetsu,
        ...(query.hanbaiten_id != null
          ? { rkSourceHanbaiten: query.hanbaiten_id }
          : {}),
      },
    );

    // §4.2 DataScope.
    applyBranchScope(
      qb,
      'd',
      { jaIdField: 'ja_id', kanriShitenIdField: 'kanri_shiten_id' },
      session,
    );
    // 所属支店スコープ（顧客要件 2026-07）— session.shiten_id 設定時のみ支店へ絞る。
    applyShitenScope(qb, 'd', 'shiten_id', session);

    // §4.3 search filters.
    if (query.kanri_shiten_id !== undefined) {
      qb.andWhere('d.kanri_shiten_id = :rkKanriShitenId', {
        rkKanriShitenId: query.kanri_shiten_id,
      });
    }
    if (query.shiten_id !== undefined) {
      qb.andWhere('d.shiten_id = :rkShitenId', { rkShitenId: query.shiten_id });
    }
    // 置換元(hanbaiten_id) は上の as-of サブクエリで適用済み（現行 master では絞らない）。
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
    // 購読開始日検索は shoki_dokusya_kaishi_date 列（SCR-014 通常検索と同一。
    // dokusya_kaishi_date ではない）。
    if (query.dokusya_kaishi_date_from) {
      qb.andWhere('d.shoki_dokusya_kaishi_date >= :rkKaishiFrom', {
        rkKaishiFrom: query.dokusya_kaishi_date_from,
      });
    }
    if (query.dokusya_kaishi_date_to) {
      qb.andWhere('d.shoki_dokusya_kaishi_date <= :rkKaishiTo', {
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
   * 多数の購読者の配達販売店を単一トランザクションで一括置換。
   * Flow (api.md §API-015-002):
   *   §4.1 tekiyo_date >= 当日(JST) 以外は拒否。
   *   §4.3 候補取得 → 欠番 id=NOT_FOUND、範囲外=DATA_SCOPE_VIOLATION、
   *        置換先と同一=SAME_HANBAITEN、併読/電子版クレカ=INELIGIBLE_DOKUSYA。
   *   §4.4 new_hanbaiten 検証 → NOT_FOUND / DATA_SCOPE_VIOLATION。
   *   §4.5/§4.6 単一 tx: bulk UPDATE + rireki saishin 切替/INSERT + 監査(logUpdate)。
   *   §4.8 エラーログは rollback 後の tx 外で記録(logError)。
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
    // 取扱い権限（紙版/電子版）が無いアカウントは一括置換不可 (account_concept.md §139-145)。
    await this.accountFlags.assertAnyDokusyaFlag(session);

    // §4.1 適用日ルールは購読種別依存（顧客要件 2026-07）。詳細は assertTekiyoDateForShubetsu。
    this.assertTekiyoDateForShubetsu(
      dto.dokusya_shubetsu,
      dto.joho_henko_tekiyo_date,
    );

    const ids = dto.dokusya_ids;

    // §4.3 候補は FULL entity で取得（partial raw SELECT ではない）。履歴スナップショットが
    // create/update と同じ `buildHistoryFromEntity` を再利用でき、t_dokusya_rireki 行形状の
    // single source of truth を保つ（列リスト重複なし）。
    const candidates = await this.dokusyaRepo.find({
      where: { dokusyaId: In(ids), deletedAt: IsNull() },
    });

    // §4.3 全候補が要求種別と一致することを保証（改竄・不整合 id 混入への防御。顧客要件 2026-07）。
    const hasShubetsuMismatch = candidates.some(
      (c) => Number(c.dokusyaShubetsu) !== Number(dto.dokusya_shubetsu),
    );
    if (hasShubetsuMismatch) {
      throw new DateRangeInvalidException(
        '選択した購読者に指定の購読種別と異なる購読者が含まれています。',
      );
    }

    this.validateReplaceCandidates(candidates, ids, dto.new_hanbaiten_id, session);

    // §4.1 適用日(joho)整合性（顧客要件 2026-07）。単一適用日を全候補へ適用するため
    // 「最も遅い購読開始日以降 かつ 最も早い解約予定日より前」。参照は各候補の有効
    // レコード(before)。UI/取込の単票チェックと同ルールを候補境界に集約して判定。
    this.assertReplaceTekiyoDate(candidates, dto.joho_henko_tekiyo_date);

    // [reserved-same-date] 紙版の予約変更（未来日）は同一適用日への変更を1回まで
    // に制限する（顧客要件2026-08）。本画面は assertTekiyoDateForShubetsu により
    // 常に紙版・未来日必須なので、候補全件が対象になる。
    await this.assertNoSameDateConflicts(candidates, dto.joho_henko_tekiyo_date);

    // §4.4 置換先 hanbaiten の存在 + スコープ検証。
    const targetRows: Array<Record<string, unknown>> =
      await this.dataSource.query(
        `SELECT hanbaiten_id, ja_id FROM m_hanbaiten
          WHERE hanbaiten_id = $1 AND deleted_at IS NULL`,
        [dto.new_hanbaiten_id],
      );
    if (!targetRows[0]) {
      throw new NotFoundException('販売店');
    }
    // §4.4 置換先は JA レベル（m_hanbaiten は kanri_shiten_id 無）ゆえ ja_id でスコープ。
    // 存在は上で確認済 → 404 ではなく 403。
    assertJaScopeViolation(
      targetRows[0].ja_id == null ? null : Number(targetRows[0].ja_id),
      session,
    );

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
        // §4.5 各購読者を共通ライタ applyChange(UPDATE) で置換。hanbaiten_id のみ変更。
        // 適用日は joho に統一（顧客要件 2026-07: 販売店適用日を廃止）、置換画面の適用日を
        // johoDate として渡す＝1更新1レコード（UI/取込と同一）。applyChange が差分→履歴INSERT
        // →recomputeMaster、saishin 無効化・rireki_no 採番・zenkai_hanbaiten_id 退避・
        // 増減報告フラグを一元処理。
        let rirekiCount = 0;
        for (const before of candidates) {
          const dokusyaId = Number(before.dokusyaId);
          // [rireki-no-race] 採番前に master 行をロック（UI/取込 UPDATE と同じ直列化）。
          await this.rireki.lockDokusyaRow(manager, dokusyaId);
          const result = await applyChange(manager, {
            mode: 'UPDATE',
            dokusyaId,
            values: { hanbaitenId: Number(dto.new_hanbaiten_id) },
            johoDate: dto.joho_henko_tekiyo_date,
            source: 'REPLACE_HANBAITEN',
            actor: String(session.account_id),
          });
          rirekiCount += result.insertedRirekiIds.length;
        }

        // updated_by は rireki に無い列で recompute 対象外 → master へ一括スタンプ。
        if (ids.length > 0) {
          await manager.query(
            `UPDATE t_dokusya SET updated_by = $1
              WHERE dokusya_id = ANY($2) AND deleted_at IS NULL`,
            [String(session.account_id), ids],
          );
        }

        await this.auditLog.logUpdate(
          auditCtx,
          { dokusya_ids: ids },
          { dokusya_ids: ids, new_hanbaiten_id: dto.new_hanbaiten_id },
          manager,
        );

        return {
          total_count: ids.length,
          replaced_count: candidates.length,
          rireki_count: rirekiCount,
          new_hanbaiten_id: dto.new_hanbaiten_id,
          applied_at: appliedAt,
        };
      });

      return { data: summary, message: '置換処理が完了しました。' };
    } catch (err) {
      await this.auditLog.logError(auditCtx, AuditOperation.UPDATE, err as Error);
      throw err;
    }
  }

  /**
   * SCR-015 §4.3 一括置換候補の事前チェック:
   *   - 欠番 id → NOT_FOUND。
   *   - DataScope: 全候補がスコープ内必須。候補は caller 指定の id 配列ゆえ範囲外は
   *     404 マスクではなく明示 DATA_SCOPE_VIOLATION(403)（api.md §4.3）。
   *   - SAME_HANBAITEN ルール。
   *   - INELIGIBLE ルール（併読 / 電子版クレカ）。
   */
  private validateReplaceCandidates(
    candidates: Dokusya[],
    ids: number[],
    newHanbaitenId: number,
    session: SessionPayload,
  ): void {
    const foundIds = new Set(candidates.map((c) => Number(c.dokusyaId)));
    for (const id of ids) {
      if (!foundIds.has(Number(id))) {
        throw new NotFoundException('購読者');
      }
    }

    for (const c of candidates) {
      assertBranchScopeViolation(
        Number(c.jaId),
        c.kanriShitenId == null ? null : Number(c.kanriShitenId),
        session,
      );
      // 所属支店スコープ（顧客要件 2026-07）— 他支店の読者は置換対象にできない。
      assertShitenScopeViolation(
        c.shitenId == null ? null : Number(c.shitenId),
        session,
      );
    }

    if (candidates.some((c) => Number(c.hanbaitenId) === Number(newHanbaitenId))) {
      throw new SameHanbaitenException();
    }

    const ineligible: IneligibleDokusyaDetail[] = [];
    for (const c of candidates) {
      // 併読 / 電子版クレカ は読取専用（共通述語で判定・置換文言）。
      if (isBoth(c.dokusyaShubetsu)) {
        ineligible.push({
          dokusya_id: Number(c.dokusyaId),
          reason: '併読者のため置換できません。',
        });
      } else if (isDigitalCreditCard(c.dokusyaShubetsu, c.shiharaiHoho)) {
        ineligible.push({
          dokusya_id: Number(c.dokusyaId),
          reason: '電子版クレカ決済者のため置換できません。',
        });
      }
    }
    if (ineligible.length > 0) {
      throw new IneligibleDokusyaException(ineligible);
    }
  }

  /**
   * §4.1 購読種別別の適用日ルール（顧客要件 2026-07）:
   *   - 紙版(1): 未来日のみ（当日・過去不可）。予約置換。
   *   - 電子版(2): 本画面対象外 → 検索・置換とも拒否（ACSMS-MSG-015-009。販売店を
   *     持たず一括置換不可、「電子版=当日置換」を撤回）。
   * 検索段・置換段の双方で同一基準を適用（FE の検索ボタン無効化への防御的サーバガード）。
   */
  private assertTekiyoDateForShubetsu(shubetsu: number, date: string): void {
    if (Number(shubetsu) === DokusyaShubetsu.DIGITAL) {
      throw new ValidationException([
        { field: 'dokusya_shubetsu', message: REPLACE_DIGITAL_UNSUPPORTED_MSG },
      ]);
    }
    // 紙版（既定）— 未来日のみ。
    if (date <= todayIsoJst()) {
      throw new DateRangeInvalidException(
        '紙版の適用日は本日より後の日付を入力してください。',
      );
    }
  }

  /**
   * [reserved-same-date] 予約変更（未来日）の適用日に、既にアクティブ（非取消・
   * 非新規）な履歴行を持つ候補が無いか調べる（顧客要件2026-08）。単一適用日を
   * 全候補へ適用するため、対象 dokusya_id 全件を1クエリでまとめて調べる。
   * 該当があれば `IneligibleDokusyaException` で該当 id 一覧を返し、購読者履歴
   * 情報画面から先に取消するよう案内する。
   */
  private async assertNoSameDateConflicts(
    candidates: Dokusya[],
    joho: string,
  ): Promise<void> {
    const ids = candidates.map((c) => Number(c.dokusyaId));
    if (ids.length === 0) return;
    const rows: Array<{ dokusya_id: number }> = await this.dataSource.query(
      `SELECT DISTINCT dokusya_id
         FROM t_dokusya_rireki
        WHERE dokusya_id = ANY($1::bigint[])
          AND joho_henko_tekiyo_date = $2
          AND torikeshi_flg = false
          AND shinki_flg = false`,
      [ids, joho],
    );
    if (rows.length === 0) return;
    const conflictIds = new Set(rows.map((r) => Number(r.dokusya_id)));
    const ineligible: IneligibleDokusyaDetail[] = candidates
      .filter((c) => conflictIds.has(Number(c.dokusyaId)))
      .map((c) => ({
        dokusya_id: Number(c.dokusyaId),
        reason: SHUBETSU_MSG.RESERVE_DATE_ALREADY_USED,
      }));
    throw new IneligibleDokusyaException(ineligible);
  }

  /**
   * §4.1 適用日(joho)整合性（一括置換）。単一適用日を全候補へ適用するため
   * 「最も遅い購読開始日(maxKaishi)以降」かつ「最も早い解約予定日(minChushi)より前」
   * （解約予定日設定済み候補がある場合のみ）。過去日(today基準)は呼び出し側で確認済。
   * メッセージに違反の境界日を提示し有効な日付を選べるようにする。
   */
  private assertReplaceTekiyoDate(candidates: Dokusya[], date: string): void {
    const applied = normalizeDbDate(date);
    let maxKaishi: string | null = null;
    let minChushi: string | null = null;
    for (const c of candidates) {
      if (c.dokusyaKaishiDate) {
        const k = normalizeDbDate(c.dokusyaKaishiDate);
        if (maxKaishi === null || k > maxKaishi) maxKaishi = k;
      }
      if (c.dokusyaChushiDate) {
        const ch = normalizeDbDate(c.dokusyaChushiDate);
        if (minChushi === null || ch < minChushi) minChushi = ch;
      }
    }
    if (maxKaishi && applied < maxKaishi) {
      throw new DateRangeInvalidException(
        `適用日は購読開始日（${maxKaishi.replaceAll('-', '/')}）以降の日付を指定してください。`,
      );
    }
    if (minChushi && applied >= minChushi) {
      throw new DateRangeInvalidException(
        `適用日は解約予定日（${minChushi.replaceAll('-', '/')}）より前の日付を指定してください。`,
      );
    }
  }
}
