import { Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, IsNull, Repository } from 'typeorm';
import type { Request } from 'express';

import { Dokusya } from '@/database/entities/dokusya.entity';
import { DokusyaRireki } from '@/database/entities/dokusya-rireki.entity';
import { NotFoundException } from '@/common/exceptions/common.exceptions';
import { buildAuditCtx } from '@/common/utils/audit-context';
import { todayIsoJst } from '@/common/utils/datetime';
import {
  applyBranchScope,
  assertBranchScopeViolation,
  assertJaScopeViolation,
} from '@/common/utils/data-scope';
import { paginate, type PaginatedResponse } from '@/common/utils/paginate';
import { AuditOperation, DokusyaShubetsu, ShiharaiHoho } from '@/common/enums';
import { AuditLogService } from '@/modules/audit-log/audit-log.service';
import type { SessionPayload } from '@/modules/auth/session.service';

import { SearchReplaceDokusyaDto } from './dto/search-replace-dokusya.dto';
import { ReplaceHanbaitenDto } from './dto/replace-hanbaiten.dto';
import { DokusyaAccountFlagService } from './dokusya-account-flag.service';
import { DokusyaRirekiService } from './dokusya-rireki-helper.service';
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
    applyBranchScope(
      qb,
      'd',
      { jaIdField: 'ja_id', kanriShitenIdField: 'kanri_shiten_id' },
      session,
    );

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

    // §4.1 — tekiyo_date must be today or later (JST). 共通 todayIsoJst を使用
    // （edit 単票の assertFutureTekiyoDate と同一基準・同じ「当日可」ルール）。
    if (dto.hanbaiten_tekiyo_date < todayIsoJst()) {
      throw new DateRangeInvalidException(
        '販売店適用日は当日以降の日付を入力してください。',
      );
    }

    const ids = dto.dokusya_ids;

    // §4.3 — fetch candidate rows as FULL entities (not a partial raw
    // SELECT) so the history snapshot can reuse the SAME
    // `buildHistoryFromEntity` mapper as create/update — single source of
    // truth for the t_dokusya_rireki row shape (no duplicated column list).
    const candidates = await this.dokusyaRepo.find({
      where: { dokusyaId: In(ids), deletedAt: IsNull() },
    });

    this.validateReplaceCandidates(candidates, ids, dto.new_hanbaiten_id, session);

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
        // §4.5 — bulk UPDATE the master rows + bump rireki_no。
        // 販売店のみ変更イベント（顧客要件 2026-06）: 販売店適用日を
        // joho_henko_tekiyo_date にも設定し、最新履歴（saishin）と整合させる
        // （hanbaiten_tekiyo_date は履歴専用カラムなのでマスタには無い）。
        const updated: Array<Record<string, unknown>> = await manager.query(
          `UPDATE t_dokusya
              SET hanbaiten_id = $1,
                  joho_henko_tekiyo_date = $4,
                  rireki_no = rireki_no + 1,
                  updated_by = $2
            WHERE dokusya_id = ANY($3) AND deleted_at IS NULL
          RETURNING dokusya_id, hanbaiten_id, rireki_no`,
          [
            dto.new_hanbaiten_id,
            String(session.account_id),
            ids,
            dto.hanbaiten_tekiyo_date,
          ],
        );

        // §4.5 — clear the previous 最新データ flag, then append a new
        // history row per replaced 購読者.
        await manager.query(
          `UPDATE t_dokusya_rireki
              SET saishin_data_flg = false
            WHERE dokusya_id = ANY($1) AND saishin_data_flg = true`,
          [ids],
        );

        // new rireki_no per dokusya from the bulk UPDATE RETURNING.
        const newRirekiNoById = new Map(
          updated.map((u) => [Number(u.dokusya_id), Number(u.rireki_no)]),
        );

        // Build each history row through the SAME `buildHistoryFromEntity`
        // mapper as create/update — `after` = the pre-update entity
        // (`before`) + the replace deltas (new 販売店 / 適用日 / rireki_no)。
        // zenkai_hanbaiten_id は置換前の hanbaiten_id、hanbaiten_tekiyo_date は
        // 適用日 (この置換固有のメタ) を上乗せする。複数行は 1 回の
        // `manager.save(配列)` で batched INSERT される。
        const rirekiRows = candidates.map((before) => {
          const newRirekiNo =
            newRirekiNoById.get(Number(before.dokusyaId)) ??
            Number(before.rirekiNo) + 1;
          const after: Dokusya = {
            ...before,
            hanbaitenId: Number(dto.new_hanbaiten_id),
            // 販売店のみ変更イベント（顧客要件 2026-06）: hanbaiten_tekiyo_date と
            // joho_henko_tekiyo_date を同じ販売店適用日に揃える（UI 編集 Rule2 /
            // SCR-011 §8.1・§14.3 と同一）。
            johoHenkoTekiyoDate: dto.hanbaiten_tekiyo_date,
            rirekiNo: newRirekiNo,
          };
          // create/update と同じ buildRirekiRow で行を生成（列の作り方を一元化）。
          // before=null（zenkai_* スナップショットは差分ではなく置換前 hanbaiten_id を
          // 明示上乗せ）、batched INSERT のため manager.create のみ。
          return manager.create(
            DokusyaRireki,
            this.rireki.buildRirekiRow(
              after,
              null,
              {
                rirekiNo: newRirekiNo,
                henkoRiyu: '販売店一括置換',
                saishinDataFlg: true,
                shinkiFlg: false,
                kaiyakuFlg: false,
                // 販売店(hanbaiten_id)変更なので増減報告対象。
                zougenHokokuFlg: true,
                createdBy: String(session.account_id),
              },
              {
                zenkaiHanbaitenId: Number(before.hanbaitenId),
                hanbaitenTekiyoDate: dto.hanbaiten_tekiyo_date,
              },
            ),
          );
        });
        await manager.save(DokusyaRireki, rirekiRows);

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
    }

    if (candidates.some((c) => Number(c.hanbaitenId) === Number(newHanbaitenId))) {
      throw new SameHanbaitenException();
    }

    const ineligible: IneligibleDokusyaDetail[] = [];
    for (const c of candidates) {
      const shubetsu = Number(c.dokusyaShubetsu);
      const hoho = Number(c.shiharaiHoho);
      if (shubetsu === DokusyaShubetsu.BOTH) {
        ineligible.push({
          dokusya_id: Number(c.dokusyaId),
          reason: '併読者のため置換できません。',
        });
      } else if (
        shubetsu === DokusyaShubetsu.DIGITAL &&
        hoho === ShiharaiHoho.CREDIT_CARD
      ) {
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
}
