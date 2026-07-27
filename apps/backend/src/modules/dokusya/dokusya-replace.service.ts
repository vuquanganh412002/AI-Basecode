import { Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, IsNull, Repository } from 'typeorm';
import type { Request } from 'express';

import { Dokusya } from '@/database/entities/dokusya.entity';
import {
  NotFoundException,
  ValidationException,
} from '@/common/exceptions/common.exceptions';
import { TetsuzukiShurui } from '@/common/enums';
import { buildAuditCtx } from '@/common/utils/audit-context';
import { todayIsoJst, normalizeDbDate } from '@/common/utils/datetime';
import {
  applyBranchScope,
  applyShitenScope,
  assertBranchScopeViolation,
  assertShitenScopeViolation,
  assertJaScopeViolation,
} from '@/common/utils/data-scope';
import { paginate, type PaginatedResponse } from '@/common/utils/paginate';
import { AuditOperation, DokusyaShubetsu } from '@/common/enums';
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
import { isBoth, isDigitalCreditCard } from './dokusya-shubetsu.rules';

/**
 * SCR-015 — 購読者販売店一括置換画面 audit-context label. core 側
 * DokusyaService と同一値だが、本サービス内で完結させるため複製して保持する。
 */
const SCREEN_NAME_SCR015 = '購読者販売店一括置換画面 (ACSMS-SCR-015)';

/**
 * SCR-015 監査ログ用テーブル名（t_log.target_table）。core 側 DokusyaService と
 * 同一値だが、本サービス内で完結させるため複製して保持する。
 */
const TABLE_NAME = 't_dokusya';

/**
 * 電子版は本画面（販売店一括置換）の対象外である旨のメッセージ（ACSMS-MSG-015-009・
 * 顧客要件 2026-07 改訂）。電子版=電子配信で販売店を持たないため一括置換できない。
 * FE の同一文言（DokusyaReplaceHanbaitenView `MSG_DIGITAL_UNSUPPORTED`）と一致させる。
 */
const REPLACE_DIGITAL_UNSUPPORTED_MSG = '電子版は本画面では対象外です。';

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
 * SCR-015 — 購読者販売店一括置換画面.
 *
 * 一括置換 concern（候補検索 + 一括置換 + 候補事前検証）を core
 * DokusyaService から切り出した leaf サービス。facade（DokusyaService）が
 * controller 互換のため薄く委譲する。挙動は分離前と byte-identical。
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

    // §4.1 適用日ルールは購読種別依存（顧客要件 2026-07 改訂）:
    //   紙版=未来日のみ（予約置換）／電子版=当日のみ（即時反映・未来予約不可）。
    // 置換の実行時チェックと同一基準を検索段でも適用する。
    this.assertTekiyoDateForShubetsu(
      query.dokusya_shubetsu,
      query.joho_henko_tekiyo_date,
    );

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

    // §4.3 固定条件 — soft-delete を除外（購読中/種別/適用日/販売店は as-of 履歴で判定）。
    qb.where('d.deleted_at IS NULL');

    // §4.3 置換対象の候補集合（顧客要件 2026-07 改訂・as-of 適用日）:
    //   各購読者の「適用日時点で有効な履歴レコード」= joho_henko_tekiyo_date が
    //   適用日以下で最大（同 joho は rireki_no 最大）の t_dokusya_rireki 行。
    //   その有効レコードが
    //     - 配達販売店 = 置換元(hanbaiten_id)
    //     - 購読中 (tetsuzuki_shurui = 新規)
    //     - 指定購読種別 (紙版/電子版)
    //     - 適用日時点で購読中: dokusya_kaishi_date ≦ 適用日 かつ
    //       (dokusya_chushi_date が無い OR > 適用日)
    //   を満たす購読者のみ返す。未来の適用日でも、その時点で有効な履歴で判定する
    //   （現行 master の販売店ではなく、適用日時点の販売店で置換元を突き合わせる）。
    // 置換元(hanbaiten_id) は任意（顧客要件 2026-07 改訂）。指定時のみ「有効レコードの
    // 配達販売店 = 置換元」で追加絞り込みする。置換先(new_hanbaiten_id) は必須で、
    // 「≠ 置換先」を常に適用し、既に置換先を配達している購読者を除外する。
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
    // 置換元(hanbaiten_id) は上の as-of 候補サブクエリで適用済み（master の
    // 現行 hanbaiten では絞らない）。
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
    // 購読開始日 の検索は初期購読開始日列（shoki_dokusya_kaishi_date）を対象とする
    // （SCR-014 通常検索と同一列。dokusya_kaishi_date ではない）。
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
    // 紙版・電子版いずれの取扱い権限も無いアカウントは一括置換不可
    // (account_concept.md §139-145).
    await this.accountFlags.assertAnyDokusyaFlag(session);

    // §4.1 — 適用日ルールは購読種別依存（顧客要件 2026-07 改訂）:
    //   紙版=未来日のみ（予約置換）／電子版=当日のみ（即時反映・未来予約不可）。
    this.assertTekiyoDateForShubetsu(
      dto.dokusya_shubetsu,
      dto.joho_henko_tekiyo_date,
    );

    const ids = dto.dokusya_ids;

    // §4.3 — fetch candidate rows as FULL entities (not a partial raw
    // SELECT) so the history snapshot can reuse the SAME
    // `buildHistoryFromEntity` mapper as create/update — single source of
    // truth for the t_dokusya_rireki row shape (no duplicated column list).
    const candidates = await this.dokusyaRepo.find({
      where: { dokusyaId: In(ids), deletedAt: IsNull() },
    });

    // §4.3 — 全候補が要求された購読種別と一致することを保証（検索で種別絞り込み
    // 済みだが、改竄・不整合な id 混入を防ぐ防御。顧客要件 2026-07）。
    const hasShubetsuMismatch = candidates.some(
      (c) => Number(c.dokusyaShubetsu) !== Number(dto.dokusya_shubetsu),
    );
    if (hasShubetsuMismatch) {
      throw new DateRangeInvalidException(
        '選択した購読者に指定の購読種別と異なる購読者が含まれています。',
      );
    }

    this.validateReplaceCandidates(candidates, ids, dto.new_hanbaiten_id, session);

    // §4.1 — 適用日(joho)の整合性（顧客要件 2026-07）。単一の適用日を全候補へ
    // 適用するため「候補全体で最も遅い購読開始日以降 かつ 最も早い解約予定日
    // より前」であること。参照は各候補の現行有効レコード(before)。UI/取込の
    // 単票チェックと同じルールだが、置換は複数候補の境界を集約して判定する。
    this.assertReplaceTekiyoDate(candidates, dto.joho_henko_tekiyo_date);

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
    // §4.4 — the replace target is JA-level (m_hanbaiten has no
    // kanri_shiten_id), so every restricted role is scoped by ja_id.
    // Existence already confirmed above → 403, not 404.
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
        // §4.5 — 各購読者を共通ライタ applyChange(UPDATE) で置換 (Pha3)。販売店
        // (hanbaiten_id) のみ変更する UPDATE。適用日は読者情報変更適用日(joho)に
        // 統一され（顧客要件 2026-07: 販売店適用日を廃止）、置換画面の適用日を
        // johoDate として渡す＝1更新1レコード（UI/取込と同一ロジック）。applyChange
        // が差分→履歴INSERT→recomputeMaster まで担い、saishin 無効化・rireki_no
        // 採番・zenkai_hanbaiten_id 退避・増減報告フラグを一元処理する。
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
            reason: '販売店一括置換',
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
   * SCR-015 §4.3 pre-checks for the bulk-replace candidates:
   *   - NOT_FOUND when any requested id is missing.
   *   - DataScope: every candidate must be in scope. Unlike the
   *     single-record URL lookup (404 mask), the candidates are an
   *     explicit caller-supplied id array, so an out-of-scope hit is an
   *     explicit DATA_SCOPE_VIOLATION (403) per api.md §4.3.
   *   - SAME_HANBAITEN business rule.
   *   - INELIGIBLE business rule (併読 / 電子版クレカ).
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
   * §4.1 購読種別に応じた適用日ルール（顧客要件 2026-07 改訂）:
   *   - 紙版(1): 未来日のみ（当日・過去日不可）。予約置換。
   *   - 電子版(2): 本画面（販売店一括置換）の対象外 → 検索・置換とも拒否。
   *     電子版=電子配信で販売店を持たないため一括置換できない
   *     （ACSMS-MSG-015-009・顧客要件 2026-07 改訂で「電子版=当日置換」を撤回）。
   * 検索段・置換実行段の双方で同一基準を適用する（FE の検索ボタン無効化に対する
   * 防御的サーバ側ガード）。
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
   * §4.1 適用日(joho)の整合性（一括置換）。単一の適用日を全候補へ適用するので、
   * 候補全体で「最も遅い購読開始日(maxKaishi)以降」かつ「最も早い解約予定日
   * (minChushi)より前」であること（解約予定日が設定済みの候補がある場合のみ）。
   * 参照は各候補の現行有効レコード(before)。過去日(today基準)は呼び出し側で確認済み。
   * メッセージは違反の境界日を提示し、顧客が有効な日付を選べるようにする。
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
