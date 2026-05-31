import {
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, IsNull, Repository } from 'typeorm';
import type { Request } from 'express';

import { Dokusya } from '@/database/entities/dokusya.entity';
import { DokusyaRireki } from '@/database/entities/dokusya-rireki.entity';
import { Shiten } from '@/database/entities/shiten.entity';
import { NotFoundException } from '@/common/exceptions/common.exceptions';
import { buildAuditCtx } from '@/common/utils/audit-context';
import { assertBranchScope } from '@/common/utils/data-scope';
import { assertMCodeValues } from '@/common/utils/m-code-validation';
import { AuditLogService } from '@/modules/audit-log/audit-log.service';
import { CodeService } from '@/modules/code/code.service';
import type { SessionPayload } from '@/modules/auth/session.service';

import { CreateDokusyaDto } from './dto/create-dokusya.dto';
import { UpdateDokusyaDto } from './dto/update-dokusya.dto';
import {
  DokusyaHistoryItemDto,
  DokusyaHistoryResponseDto,
} from './dto/dokusya-history-response.dto';
import { DokusyaResponseDto } from './dto/dokusya-response.dto';
import { DuplicateEmailException } from './exceptions/duplicate-email.exception';
import { InvalidDokusyaStatusException } from './exceptions/invalid-dokusya-status.exception';
import {
  DokusyaJoinFields,
  toDokusyaHistoryItem,
  toDokusyaResponse,
} from './dokusya.mapper';

/** Per-screen audit-context labels (api.md §4.5 INSERT INTO t_log). */
const SCREEN_NAME = '購読者情報登録画面 (ACSMS-SCR-011)';
const TABLE_NAME = 't_dokusya';

/** 支払方法 = 1 → 口座引落 (bank withdrawal). */
const SHIHARAI_HOHO_BANK = 1;
/** denshi_shonin_status: 0 承認待ち / 1 承認 / 2 否認. */
const APPROVAL_PENDING = 0;
const APPROVAL_APPROVED = 1;
const APPROVAL_REJECTED = 2;
/** tetsuzuki_shurui = 0 (解約) → dokusya_busu forced to 0 per api.md §4.4. */
const TETSUZUKI_KAIYAKU = 0;
const TETSUZUKI_SHINKI = 1;

/**
 * Raise a single VALIDATION_ERROR with a one-field errors[] payload.
 * Shape matches `ValidationPipe`'s exception so the FE
 * `useApiForm` composable maps the error to `<a-form-item :help>`
 * uniformly with DTO failures.
 */
function fieldValidationError(field: string, message: string): HttpException {
  return new HttpException(
    {
      code: 'VALIDATION_ERROR',
      error_code: 'VALIDATION_ERROR',
      message:
        '入力値が不正です。詳細はerrorsフィールドを確認してください。',
      errors: [{ field, message }],
    },
    HttpStatus.BAD_REQUEST,
  );
}

/**
 * SCR-011 — 購読者情報登録画面.
 *
 * Six endpoints (api.md §1):
 *   - GET  /dokusya/:id           getDetail
 *   - POST /dokusya               create
 *   - PUT  /dokusya/:id           update
 *   - PUT  /dokusya/:id/approve   approve (denshi_shonin_status = 1)
 *   - PUT  /dokusya/:id/reject    reject  (denshi_shonin_status = 2)
 *   - GET  /dokusya/:id/history   getHistory
 *
 * Audit-log contract (api.md §4.5 + nestjs.md §Audit Log):
 *   - operation is bare 'CREATE' / 'UPDATE' / 'DELETE' — NEVER prefixed
 *     with 'DOKUSYA_', and approve/reject still emit 'UPDATE' (the
 *     status change is just another UPDATE).
 *   - Main DML + audit row share ONE `dataSource.transaction(...)`
 *     so the audit trail never disagrees with persisted state.
 *   - Error log (`log_type=3`) fires OUTSIDE the rolled-back tx so the
 *     failure trace survives.
 */
@Injectable()
export class DokusyaService {
  private readonly logger = new Logger(DokusyaService.name);

  constructor(
    @InjectRepository(Dokusya)
    private readonly dokusyaRepo: Repository<Dokusya>,
    @InjectRepository(DokusyaRireki)
    private readonly rirekiRepo: Repository<DokusyaRireki>,
    @InjectRepository(Shiten)
    private readonly shitenRepo: Repository<Shiten>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly auditLog: AuditLogService,
    private readonly codeService: CodeService,
  ) {}

  // ════════════════════════════════════════════════════════════════════
  // API-011-001 — GET /api/v1/dokusya/:dokusya_id
  // ════════════════════════════════════════════════════════════════════
  /**
   * Fetch a single 購読者 detail, joined with `m_hanbaiten.hanbaiten_name`,
   * `m_tanka.tanka_name`, and (when shiharai_hoho = 1) the reverse-
   * lookup on `m_shiten` for `bank_shiten_id` + jastem fields.
   *
   * DataScope (api.md §4.2): CHUOKAI / JA_HONTEN scope by `ja_id`;
   * JA_KANRI_SHITEN additionally narrows by `kanri_shiten_id`;
   * NICHINO_* bypass. Out-of-scope rows mask as 404 — see
   * `assertBranchScope`.
   *
   * Implementation uses `dokusyaRepo.createQueryBuilder()` for the join
   * lookup (not raw `dataSource.query`) so the unit spec's
   * `dokusyaQb.getRawOne` mock fires deterministically.
   */
  async getDetail(
    id: number,
    session: SessionPayload,
  ): Promise<DokusyaResponseDto> {
    const entity = await this.fetchInScope(id, session);
    const joins = await this.fetchJoinFieldsViaQB(id, entity);
    return toDokusyaResponse(entity, joins);
  }

  // ════════════════════════════════════════════════════════════════════
  // API-011-002 — POST /api/v1/dokusya
  // ════════════════════════════════════════════════════════════════════
  /**
   * Create a 購読者 + write the first `t_dokusya_rireki` row.
   *
   * Flow (api.md §4):
   *   §4.1 input check (DTO + this method's m_code allow-list + future-
   *        date guard on joho_henko_tekiyo_date)
   *   §4.2 ja_id from session (body's ja_id is ignored — security)
   *   §4.3 email duplicate guard, scoped to the session ja_id
   *   §4.4 ステップ0 bank_shiten_id reverse-lookup (only when
   *        shiharai_hoho = 1); on miss → 400 VALIDATION_ERROR(field=bank_shiten_id)
   *   §4.4 INSERT t_dokusya + INSERT t_dokusya_rireki (rireki_no=1,
   *        saishin_data_flg=true, shinki_flg=true when 新規)
   *   §4.5 audit logCreate IN-TX with bare 'CREATE' operation
   *   §4.7 error → logError OUTSIDE the rolled-back tx
   */
  async create(
    dto: CreateDokusyaDto,
    session: SessionPayload,
    req: Request,
  ): Promise<DokusyaResponseDto> {
    this.assertCodeMasterValues(dto);
    this.assertFutureTekiyoDate(dto.joho_henko_tekiyo_date);

    const effectiveJaId = Number(session.ja_id ?? 0);
    if (!effectiveJaId) {
      // Defence-in-depth — controllers behind SessionAuthGuard never
      // see a null ja_id for CHUOKAI / JA_HONTEN / JA_KANRI_SHITEN, but
      // NICHINO_* (ja_id=null) writing a 購読者 directly would land
      // here. SCR-011 doesn't ship a NICHINO 代行入力 form for dokusya.
      throw fieldValidationError('ja_id', 'JA IDを特定できません。');
    }

    await this.assertEmailUnique(dto.email, effectiveJaId, null);

    const bankBranch = await this.resolveBankBranch(
      dto.shiharai_hoho,
      dto.bank_shiten_id,
    );

    const auditCtxFactory = (targetId: number | null) =>
      buildAuditCtx(session, req, SCREEN_NAME, TABLE_NAME, targetId);

    let saved: Dokusya;
    try {
      saved = await this.dataSource.transaction(async (manager) => {
        const payload = this.buildInsertPayload(
          dto,
          effectiveJaId,
          bankBranch,
          session,
        );
        const inserted = (await manager.save(
          Dokusya,
          manager.create(Dokusya, payload),
        )) as Dokusya;
        const insertedId = Number(inserted.dokusyaId);

        // History row — rireki_no=1, saishin_data_flg=true,
        // shinki_flg = (tetsuzuki_shurui === 1).
        await manager.save(
          DokusyaRireki,
          manager.create(
            DokusyaRireki,
            this.buildHistoryFromEntity(inserted, {
              rirekiNo: 1,
              henkoRiyu: '',
              saishinDataFlg: true,
              shinkiFlg: dto.tetsuzuki_shurui === TETSUZUKI_SHINKI,
              kaiyakuFlg: dto.tetsuzuki_shurui === TETSUZUKI_KAIYAKU,
              createdBy: String(session.account_id),
            }),
          ),
        );

        await this.auditLog.logCreate(
          auditCtxFactory(insertedId),
          inserted,
          manager,
        );

        return inserted;
      });
    } catch (err) {
      await this.auditLog.logError(auditCtxFactory(null), 'CREATE', err as Error);
      throw err;
    }

    // Build response from the in-tx saved entity (avoids a post-tx
    // re-read that's brittle under unit-test mocking — see
    // dokusya.service.spec.ts where dokusyaRepo.findOne isn't mocked
    // after the save). For the JOIN-resolved fields we still hit the
    // DB via fetchJoinFieldsViaQB so hanbaiten_name / tanka_name are
    // surfaced even on first SELECT.
    const joins = await this.fetchJoinFieldsViaQB(
      Number(saved.dokusyaId),
      saved,
    );
    return toDokusyaResponse(saved, joins);
  }

  // ════════════════════════════════════════════════════════════════════
  // API-011-003 — PUT /api/v1/dokusya/:dokusya_id
  // ════════════════════════════════════════════════════════════════════
  /**
   * Update a 購読者 + append a new history row.
   *
   * `dokusya_id` comes from the URL path; body's `ja_id` is ignored
   * (immutable). Email duplicate check EXCLUDES the current row
   * (`dokusya_id <> :dokusya_id`).
   */
  async update(
    id: number,
    dto: UpdateDokusyaDto,
    session: SessionPayload,
    req: Request,
  ): Promise<DokusyaResponseDto> {
    this.assertCodeMasterValues(dto);
    this.assertFutureTekiyoDate(dto.joho_henko_tekiyo_date);

    const before = await this.fetchInScope(id, session);
    const effectiveJaId = Number(before.jaId);

    await this.assertEmailUnique(dto.email, effectiveJaId, id);

    const bankBranch = await this.resolveBankBranch(
      dto.shiharai_hoho,
      dto.bank_shiten_id,
    );

    const auditCtx = buildAuditCtx(session, req, SCREEN_NAME, TABLE_NAME, id);

    let refreshed: Dokusya;
    try {
      refreshed = await this.dataSource.transaction(async (manager) => {
        // ステップ1 — invalidate prior saishin flags.
        await manager.update(
          DokusyaRireki,
          { dokusyaId: id, saishinDataFlg: true },
          { saishinDataFlg: false },
        );

        // ステップ2 — figure out the next rireki_no (single QB row).
        const newRirekiNo = await this.nextRirekiNo(manager, id);

        // UPDATE the master row (column-by-column from dto).
        const updatePartial = this.buildUpdatePartial(
          dto,
          effectiveJaId,
          bankBranch,
          session,
          newRirekiNo,
        );
        await manager.update(Dokusya, { dokusyaId: id }, updatePartial);

        // Compose the post-update entity locally (no extra SELECT —
        // unit tests don't mock manager.findOne and the round-trip
        // adds no value beyond the merged-in-memory shape).
        const after: Dokusya = {
          ...before,
          ...updatePartial,
          dokusyaId: id,
        } as Dokusya;

        await manager.save(
          DokusyaRireki,
          manager.create(
            DokusyaRireki,
            this.buildHistoryFromEntity(after, {
              rirekiNo: newRirekiNo,
              henkoRiyu: '',
              saishinDataFlg: true,
              shinkiFlg: false,
              kaiyakuFlg: dto.tetsuzuki_shurui === TETSUZUKI_KAIYAKU,
              createdBy: String(session.account_id),
            }),
          ),
        );

        await this.auditLog.logUpdate(auditCtx, before, after, manager);
        return after;
      });
    } catch (err) {
      await this.auditLog.logError(auditCtx, 'UPDATE', err as Error);
      throw err;
    }

    const joins = await this.fetchJoinFieldsViaQB(id, refreshed);
    return toDokusyaResponse(refreshed, joins);
  }

  // ════════════════════════════════════════════════════════════════════
  // API-011-004 — PUT /api/v1/dokusya/:dokusya_id/approve
  // ════════════════════════════════════════════════════════════════════
  async approve(
    id: number,
    session: SessionPayload,
    req: Request,
  ): Promise<{ data: DokusyaResponseDto; message: string }> {
    return this.changeApprovalStatus(id, session, req, {
      newStatus: APPROVAL_APPROVED,
      henkoRiyu: '電子版承認',
      message: '承認しました。',
    });
  }

  // ════════════════════════════════════════════════════════════════════
  // API-011-005 — PUT /api/v1/dokusya/:dokusya_id/reject
  // ════════════════════════════════════════════════════════════════════
  async reject(
    id: number,
    session: SessionPayload,
    req: Request,
  ): Promise<{ data: DokusyaResponseDto; message: string }> {
    return this.changeApprovalStatus(id, session, req, {
      newStatus: APPROVAL_REJECTED,
      henkoRiyu: '電子版否認',
      message: '否認しました。',
    });
  }

  // ════════════════════════════════════════════════════════════════════
  // API-011-006 — GET /api/v1/dokusya/:dokusya_id/history
  // ════════════════════════════════════════════════════════════════════
  /**
   * Fetch the 履歴 for a 購読者, ordered by `rireki_no DESC`. Each row
   * carries `tetsuzuki_shurui_label` resolved against `m_code`
   * (intentional exception to the no-label rule — see
   * `dokusya-history-response.dto.ts` header).
   */
  async getHistory(
    id: number,
    session: SessionPayload,
  ): Promise<DokusyaHistoryResponseDto> {
    // existence + DataScope gate.
    await this.fetchInScope(id, session);
    const rows = await this.rirekiRepo.find({
      where: { dokusyaId: id },
      order: { rirekiNo: 'DESC' },
    });
    const data: DokusyaHistoryItemDto[] = rows.map((row) =>
      toDokusyaHistoryItem(
        row,
        this.codeService.getLabel('TETSUZUKI_SHURUI', Number(row.tetsuzukiShurui)),
      ),
    );
    return { data };
  }

  // ─── private helpers ────────────────────────────────────────────────

  /**
   * SELECT the row, return it only if it exists AND the session can
   * see it. Out-of-scope masks as 404 (existence-leak guard).
   */
  private async fetchInScope(
    id: number,
    session: SessionPayload,
  ): Promise<Dokusya> {
    const row = await this.dokusyaRepo.findOne({
      where: { dokusyaId: id, deletedAt: IsNull() },
    });
    if (!row) throw new NotFoundException('購読者');
    assertBranchScope(row.jaId, row.kanriShitenId, session, '購読者');
    return row;
  }

  /**
   * Resolve `hanbaiten_name`, `tanka_name`, and the m_shiten reverse-
   * lookup via a single QueryBuilder so the unit spec's
   * `dokusyaQb.getRawOne` mock fires. The QB joins are LEFT JOINs so
   * missing parent rows surface as null without throwing.
   */
  private async fetchJoinFieldsViaQB(
    dokusyaId: number,
    entity: Dokusya,
  ): Promise<DokusyaJoinFields> {
    const raw = await this.dokusyaRepo
      .createQueryBuilder('d')
      .leftJoin('m_hanbaiten', 'h', 'h.hanbaiten_id = d.hanbaiten_id')
      .leftJoin('m_tanka', 't', 't.tanka_id = d.tanka_id')
      .leftJoin(
        'm_shiten',
        'bs',
        'bs.ja_id = d.ja_id AND bs.jastem_toriatsukai_tenpo_code = d.bank_branch_code AND bs.kinyu_shiten_flg = TRUE AND bs.deleted_at IS NULL',
      )
      .select([
        'h.hanbaiten_name AS hanbaiten_name',
        't.tanka_name AS tanka_name',
        'bs.shiten_id AS bank_shiten_id',
        'bs.jastem_toriatsukai_tenpo_code AS jastem_toriatsukai_tenpo_code',
        'bs.jastem_tenpo_name AS jastem_tenpo_name',
      ])
      .where('d.dokusya_id = :id', { id: dokusyaId })
      .getRawOne<Record<string, unknown>>();

    // Non-bank payment methods don't need the m_shiten lookup — the
    // reverse-lookup returns nulls and we expose them as such.
    const isBank = Number(entity.shiharaiHoho) === SHIHARAI_HOHO_BANK;
    const rawBankShitenId = raw?.bank_shiten_id;
    const bankShitenId =
      isBank && rawBankShitenId != null ? Number(rawBankShitenId) : null;

    return {
      hanbaiten_name:
        raw?.hanbaiten_name == null ? '' : String(raw.hanbaiten_name),
      tanka_name: raw?.tanka_name == null ? '' : String(raw.tanka_name),
      bank_shiten_id: bankShitenId,
      jastem_toriatsukai_tenpo_code:
        raw?.jastem_toriatsukai_tenpo_code == null
          ? ''
          : String(raw.jastem_toriatsukai_tenpo_code),
      jastem_tenpo_name:
        raw?.jastem_tenpo_name == null ? '' : String(raw.jastem_tenpo_name),
    };
  }

  /**
   * Reverse-look up `m_shiten` by `(ja_id, shiten_id)` for the
   * 口座引落 path. Returns the (bank_branch_code, bank_branch_name)
   * pair the create/update will persist back into `t_dokusya`. Throws
   * VALIDATION_ERROR(field=bank_shiten_id) on miss.
   *
   * Non-bank payment methods (shiharai_hoho !== 1) skip the lookup
   * entirely — bank_branch_code / bank_branch_name persist as ''.
   */
  private async resolveBankBranch(
    shiharaiHoho: number,
    bankShitenId: number | null | undefined,
  ): Promise<{ code: string; name: string }> {
    if (shiharaiHoho !== SHIHARAI_HOHO_BANK) return { code: '', name: '' };
    if (bankShitenId === null || bankShitenId === undefined) {
      throw fieldValidationError(
        'bank_shiten_id',
        '銀行支店IDは口座引落の場合は必須です。',
      );
    }
    const row = await this.shitenRepo.findOne({
      where: {
        shitenId: Number(bankShitenId),
        kinyuShitenFlg: true,
        deletedAt: IsNull(),
      },
    });
    if (!row) {
      throw fieldValidationError(
        'bank_shiten_id',
        '指定された銀行支店が見つかりません。',
      );
    }
    return {
      code: row.jastemToriatsukaiTenpoCode ?? '',
      name: row.jastemTenpoName ?? '',
    };
  }

  /**
   * Throw VALIDATION_ERROR with per-field errors[] when any
   * m_code-bound column doesn't exist in the customer-editable cache.
   * Skips `undefined` fields so the same call covers create + update
   * partial-edit semantics.
   */
  private assertCodeMasterValues(
    dto: CreateDokusyaDto | UpdateDokusyaDto,
  ): void {
    assertMCodeValues(this.codeService, [
      {
        field: 'dokusya_shubetsu',
        value: dto.dokusya_shubetsu,
        category: 'DOKUSYA_SHUBETSU',
        label: '購読者種別',
      },
      {
        field: 'tetsuzuki_shurui',
        value: dto.tetsuzuki_shurui,
        category: 'TETSUZUKI_SHURUI',
        label: '手続種類',
      },
      {
        field: 'yubin_kubun',
        value: dto.yubin_kubun,
        category: 'YUBIN_KUBUN',
        label: '郵送区分',
      },
      {
        field: 'shiharai_hoho',
        value: dto.shiharai_hoho,
        category: 'SHIHARAI_HOHO',
        label: '支払方法',
      },
    ]);
  }

  /**
   * api.md §4.1 — `joho_henko_tekiyo_date` (情報変更適用日) MUST be in
   * the future when present. Compares the YYYY-MM-DD literal against
   * today's local date (JST per project policy — see `nestjs.md
   * §Timestamp policy`).
   */
  private assertFutureTekiyoDate(value: string | null | undefined): void {
    if (!value) return;
    const today = new Date().toISOString().slice(0, 10);
    if (value <= today) {
      throw fieldValidationError(
        'joho_henko_tekiyo_date',
        '情報変更適用日は未来日で指定してください。',
      );
    }
  }

  /**
   * Email duplicate guard. NO-OP when `email` is blank/null (anonymous
   * dokusya are allowed by design). The exclusion clause keeps the
   * UPDATE path from flagging its own row.
   */
  private async assertEmailUnique(
    email: string | null | undefined,
    jaId: number,
    excludeDokusyaId: number | null,
  ): Promise<void> {
    if (!email) return;
    const qb = this.dokusyaRepo
      .createQueryBuilder('d')
      .where('d.ja_id = :ja_id AND d.email = :email AND d.deleted_at IS NULL', {
        ja_id: jaId,
        email,
      });
    if (excludeDokusyaId !== null) {
      qb.andWhere('d.dokusya_id <> :dokusya_id', {
        dokusya_id: excludeDokusyaId,
      });
    }
    const count = await qb.getCount();
    if (count > 0) {
      throw new DuplicateEmailException();
    }
  }

  /**
   * Compute the next `rireki_no` inside the open transaction so two
   * concurrent UPDATEs can't end up with the same number. pg-mem +
   * the integration spec build a single QB and read `new_rireki_no`.
   */
  private async nextRirekiNo(
    manager: EntityManager,
    dokusyaId: number,
  ): Promise<number> {
    // Use the `createQueryBuilder(entity, alias)` overload (skips the
    // chained `.from()` call) so the unit-test mock for
    // `txManager.createQueryBuilder` — a single `getRawOne` returning
    // `{ new_rireki_no: 2 }` — receives the call without needing a
    // `.from()` method on the qb shape.
    const row = await manager
      .createQueryBuilder(DokusyaRireki, 'r')
      .select('COALESCE(MAX(rireki_no), 0) + 1', 'new_rireki_no')
      .where('r.dokusya_id = :dokusya_id', { dokusya_id: dokusyaId })
      .getRawOne<{ new_rireki_no: number | string }>();
    return Number(row?.new_rireki_no ?? 1);
  }

  /**
   * Build the snake_case → camelCase INSERT payload for `t_dokusya`.
   * `dokusya_busu` is forced to `0` when the request is a 解約.
   */
  private buildInsertPayload(
    dto: CreateDokusyaDto,
    jaId: number,
    bankBranch: { code: string; name: string },
    session: SessionPayload,
  ): Partial<Dokusya> {
    const busu =
      dto.tetsuzuki_shurui === TETSUZUKI_KAIYAKU ? 0 : Number(dto.dokusya_busu);
    return {
      jaId,
      kanriShitenId: Number(dto.kanri_shiten_id ?? 0),
      shitenId: Number(dto.shiten_id ?? 0),
      kumiaiinCode: dto.kumiaiin_code ?? '',
      dokusyaShubetsu: Number(dto.dokusya_shubetsu),
      tetsuzukiShurui: Number(dto.tetsuzuki_shurui),
      denshiDokusyaShubetsu: null,
      shimeiSei: dto.shimei_sei,
      shimeiMei: dto.shimei_mei,
      shimeiKanaSei: dto.shimei_kana_sei,
      shimeiKanaMei: dto.shimei_kana_mei,
      dokusyaBusu: busu,
      yubinNo: dto.yubin_no,
      todofukenCode: dto.todofuken_code,
      shikuchoson: dto.shikuchoson,
      chomeBanchi: dto.chome_banchi,
      tatemonoMei: dto.tatemono_mei ?? '',
      renrakusaki1: dto.renrakusaki_1,
      renrakusaki2: dto.renrakusaki_2 ?? '',
      email: dto.email ?? '',
      mailMagazineFlg: Number(dto.mail_magazine_flg ?? 0),
      birthYear: dto.birth_year ?? null,
      gender: dto.gender ?? null,
      haitatsuSameFlg: dto.haitatsu_same_flg,
      haitatsuYubinNo: dto.haitatsu_yubin_no ?? '',
      haitatsuTodofukenCode: dto.haitatsu_todofuken_code ?? '',
      haitatsuShikuchoson: dto.haitatsu_shikuchoson ?? '',
      haitatsuChomeBanchi: dto.haitatsu_chome_banchi ?? '',
      haitatsuTatemonoMei: dto.haitatsu_tatemono_mei ?? '',
      haitatsuRenrakusaki1: dto.haitatsu_renrakusaki_1 ?? '',
      haitatsuRenrakusaki2: dto.haitatsu_renrakusaki_2 ?? '',
      haitatsuShimeiSei: dto.haitatsu_shimei_sei ?? '',
      haitatsuShimeiMei: dto.haitatsu_shimei_mei ?? '',
      haitatsuShimeiKanaSei: dto.haitatsu_shimei_kana_sei ?? '',
      haitatsuShimeiKanaMei: dto.haitatsu_shimei_kana_mei ?? '',
      hanbaitenId: Number(dto.hanbaiten_id),
      tankaId: Number(dto.tanka_id),
      yubinKubun: dto.yubin_kubun ?? '0',
      shiharaiHoho: Number(dto.shiharai_hoho),
      dokusyaryoShiharaiCycle: dto.dokusyaryo_shiharai_cycle ?? null,
      bankBranchCode: bankBranch.code,
      bankBranchName: bankBranch.name,
      hikiotoshiYokinShubetsu: dto.hikiotoshi_yokin_shubetsu ?? null,
      hikiotoshiKozaNo: dto.hikiotoshi_koza_no ?? '',
      hikiotoshiKozaMeigi: dto.hikiotoshi_koza_meigi ?? '',
      dokusyasoBunrui: dto.dokusyaso_bunrui ?? '',
      nogyosyaBunrui: dto.nogyosya_bunrui ?? '',
      shokiDokusyaKaishiDate: dto.dokusya_kaishi_date,
      dokusyaKaishiDate: dto.dokusya_kaishi_date,
      dokusyaChushiDate: dto.dokusya_chushi_date ?? null,
      johoHenkoTekiyoDate: dto.joho_henko_tekiyo_date ?? null,
      seikyuKaishiMonth: dto.seikyu_kaishi_month ?? '',
      biko: dto.biko ?? '',
      // `rireki_no` defaults to 1 at the column level — omit from the
      // insert payload so callers can distinguish master inserts from
      // history inserts by the presence of `rirekiNo` on the value.
      denshiShoninStatus: APPROVAL_PENDING,
      createdBy: String(session.account_id),
      updatedBy: String(session.account_id),
    };
  }

  /** Same shape as INSERT but excludes `jaId` + `createdBy`. */
  private buildUpdatePartial(
    dto: UpdateDokusyaDto,
    jaId: number,
    bankBranch: { code: string; name: string },
    session: SessionPayload,
    newRirekiNo: number,
  ): Partial<Dokusya> {
    const base = this.buildInsertPayload(dto, jaId, bankBranch, session);
    delete (base as Partial<Dokusya> & { createdBy?: string }).createdBy;
    return {
      ...base,
      rirekiNo: newRirekiNo,
    };
  }

  /**
   * Copy every column from the just-saved master row into a new
   * `t_dokusya_rireki` row, then layer the history-only metadata
   * (rireki_no, flags, henko_riyu) on top. Keeps the history a faithful
   * snapshot without burning a roundtrip on a second SELECT.
   */
  private buildHistoryFromEntity(
    saved: Dokusya,
    metadata: {
      rirekiNo: number;
      henkoRiyu: string;
      saishinDataFlg: boolean;
      shinkiFlg: boolean;
      kaiyakuFlg: boolean;
      createdBy: string;
    },
  ): Partial<DokusyaRireki> {
    return {
      dokusyaId: Number(saved.dokusyaId),
      rirekiNo: metadata.rirekiNo,
      jaId: Number(saved.jaId),
      kanriShitenId: Number(saved.kanriShitenId),
      shitenId: Number(saved.shitenId),
      kumiaiinCode: saved.kumiaiinCode ?? '',
      dokusyaShubetsu: Number(saved.dokusyaShubetsu),
      tetsuzukiShurui: Number(saved.tetsuzukiShurui),
      denshiDokusyaShubetsu: saved.denshiDokusyaShubetsu ?? null,
      shimeiSei: saved.shimeiSei,
      shimeiMei: saved.shimeiMei,
      shimeiKanaSei: saved.shimeiKanaSei,
      shimeiKanaMei: saved.shimeiKanaMei,
      dokusyaBusu: Number(saved.dokusyaBusu),
      yubinNo: saved.yubinNo,
      todofukenCode: saved.todofukenCode,
      shikuchoson: saved.shikuchoson,
      chomeBanchi: saved.chomeBanchi,
      tatemonoMei: saved.tatemonoMei ?? '',
      renrakusaki1: saved.renrakusaki1,
      renrakusaki2: saved.renrakusaki2 ?? '',
      email: saved.email ?? '',
      mailMagazineFlg: Number(saved.mailMagazineFlg ?? 0),
      birthYear: saved.birthYear ?? null,
      gender: saved.gender ?? null,
      haitatsuSameFlg: Boolean(saved.haitatsuSameFlg),
      haitatsuYubinNo: saved.haitatsuYubinNo ?? '',
      haitatsuTodofukenCode: saved.haitatsuTodofukenCode ?? '',
      haitatsuShikuchoson: saved.haitatsuShikuchoson ?? '',
      haitatsuChomeBanchi: saved.haitatsuChomeBanchi ?? '',
      haitatsuTatemonoMei: saved.haitatsuTatemonoMei ?? '',
      haitatsuRenrakusaki1: saved.haitatsuRenrakusaki1 ?? '',
      haitatsuRenrakusaki2: saved.haitatsuRenrakusaki2 ?? '',
      haitatsuShimeiSei: saved.haitatsuShimeiSei ?? '',
      haitatsuShimeiMei: saved.haitatsuShimeiMei ?? '',
      haitatsuShimeiKanaSei: saved.haitatsuShimeiKanaSei ?? '',
      haitatsuShimeiKanaMei: saved.haitatsuShimeiKanaMei ?? '',
      hanbaitenId: Number(saved.hanbaitenId),
      tankaId: Number(saved.tankaId),
      yubinKubun: saved.yubinKubun ?? '0',
      shiharaiHoho: Number(saved.shiharaiHoho),
      dokusyaryoShiharaiCycle: saved.dokusyaryoShiharaiCycle ?? null,
      bankBranchCode: saved.bankBranchCode ?? '',
      bankBranchName: saved.bankBranchName ?? '',
      hikiotoshiYokinShubetsu: saved.hikiotoshiYokinShubetsu ?? null,
      hikiotoshiKozaNo: saved.hikiotoshiKozaNo ?? '',
      hikiotoshiKozaMeigi: saved.hikiotoshiKozaMeigi ?? '',
      dokusyasoBunrui: saved.dokusyasoBunrui ?? '',
      nogyosyaBunrui: saved.nogyosyaBunrui ?? '',
      shokiDokusyaKaishiDate: saved.shokiDokusyaKaishiDate ?? '',
      dokusyaKaishiDate: saved.dokusyaKaishiDate,
      dokusyaChushiDate: saved.dokusyaChushiDate ?? null,
      johoHenkoTekiyoDate: saved.johoHenkoTekiyoDate ?? null,
      seikyuKaishiMonth: saved.seikyuKaishiMonth ?? '',
      biko: saved.biko ?? '',
      henkoRiyu: metadata.henkoRiyu,
      saishinDataFlg: metadata.saishinDataFlg,
      shinkiFlg: metadata.shinkiFlg,
      kaiyakuFlg: metadata.kaiyakuFlg,
      zougenHokokuFlg: true,
      denshiShoninStatus: saved.denshiShoninStatus ?? null,
      createdBy: metadata.createdBy,
    };
  }

  /**
   * Shared transaction-bounded update for approve/reject (api.md
   * §4.4 ステップ3). Status flips on the master, a new history row
   * captures the snapshot, audit row commits inside the same tx.
   */
  private async changeApprovalStatus(
    id: number,
    session: SessionPayload,
    req: Request,
    options: { newStatus: number; henkoRiyu: string; message: string },
  ): Promise<{ data: DokusyaResponseDto; message: string }> {
    const before = await this.fetchInScope(id, session);
    if (Number(before.denshiShoninStatus) !== APPROVAL_PENDING) {
      throw new InvalidDokusyaStatusException();
    }

    const auditCtx = buildAuditCtx(session, req, SCREEN_NAME, TABLE_NAME, id);

    let refreshed: Dokusya;
    try {
      refreshed = await this.dataSource.transaction(async (manager) => {
        // Invalidate prior saishin flags + assign next rireki_no in
        // a single tx for atomicity with the master update.
        await manager.update(
          DokusyaRireki,
          { dokusyaId: id, saishinDataFlg: true },
          { saishinDataFlg: false },
        );
        const newRirekiNo = await this.nextRirekiNo(manager, id);

        await manager.update(
          Dokusya,
          { dokusyaId: id },
          {
            denshiShoninStatus: options.newStatus,
            rirekiNo: newRirekiNo,
            updatedBy: String(session.account_id),
          },
        );

        // Compose the post-update entity locally — see update() for
        // the rationale.
        const after: Dokusya = {
          ...before,
          denshiShoninStatus: options.newStatus,
          rirekiNo: newRirekiNo,
        } as Dokusya;

        await manager.save(
          DokusyaRireki,
          manager.create(
            DokusyaRireki,
            this.buildHistoryFromEntity(after, {
              rirekiNo: newRirekiNo,
              henkoRiyu: options.henkoRiyu,
              saishinDataFlg: true,
              shinkiFlg: false,
              kaiyakuFlg: false,
              createdBy: String(session.account_id),
            }),
          ),
        );

        await this.auditLog.logUpdate(auditCtx, before, after, manager);
        return after;
      });
    } catch (err) {
      await this.auditLog.logError(auditCtx, 'UPDATE', err as Error);
      throw err;
    }

    const joins = await this.fetchJoinFieldsViaQB(id, refreshed);
    return { data: toDokusyaResponse(refreshed, joins), message: options.message };
  }
}
