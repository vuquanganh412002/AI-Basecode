import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';

import { todayIsoJst } from '@/common/utils/datetime';
import { Dokusya } from '@/database/entities/dokusya.entity';
import {
  AuditLogService,
  type AuditOperationContext,
} from '@/modules/audit-log/audit-log.service';
import { CodeService } from '@/modules/code/code.service';
import { applyChange } from '@/modules/dokusya/dokusya-history.writer';
import type { DokusyaFields } from '@/modules/dokusya/dokusya-history.types';

import { DenshibanMappingError } from '../mapper/denshiban-payload.builder';
import type { DokusyaDraft } from '../mapper/denshiban-dokusya.builder';

import {
  DenshibanDokusyaAssembler,
  type DenshibanInboundRow,
} from './denshiban-dokusya.assembler';
import { classifyInbound } from './denshiban-inbound-diff';
import { DenshibanInboundFetcher } from './denshiban-inbound.fetcher';

const SCREEN_NAME = '電子版連携（読者取込）バッチ';
const TABLE_NAME = 't_dokusya';
/** `created_by` / `updated_by` on the master + history rows for sync-origin data. */
const SYNC_ACTOR = 'DENSHIBAN_SYNC';
/** `henko_riyu` on the inserted history rows. */
const SYNC_REASON = '電子版連携';
const CATEGORY_SHIHARAI_HOHO = 'SHIHARAI_HOHO';

/** Counters returned + logged per run. */
export interface InboundSyncSummary {
  fetched: number;
  created: number;
  updated: number;
  skipped: number;
  failed: number;
}

type RowOutcome = 'created' | 'updated' | 'skipped';

/**
 * INBOUND sync domain service (電子版 `users` → クラウド `t_dokusya`).
 *
 * Single-shot `syncAll()` — the batch is scheduled EXTERNALLY (EventBridge → ECS
 * RunTask every 10 min, via the same runner that owns {@link
 * ../../batch/dokusya-sync/dokusya-sync.service}); the project deliberately does
 * NOT use in-process `@nestjs/schedule`.
 *
 * Per row (each in its OWN transaction so one bad row never blocks the rest):
 *   1. {@link DenshibanDokusyaAssembler.assemble} resolves FKs + builds the draft.
 *   2. Match the existing `t_dokusya` by `denshi_kaiin_id`.
 *   3. {@link classifyInbound} → CREATE / UPDATE (changed cols only) / SKIP.
 *   4. Write via {@link applyChange} (rireki + master recompute) + audit, in the
 *      same tx. CREATE additionally stamps `denshi_kaiin_id` onto the master
 *      (a master-only column, not carried by the history writer) exactly like the
 *      UI create does after `sendNow`.
 *
 * It NEVER calls `sendNow` — the data originates FROM denshiban, so echoing it
 * back would loop. (`applyChange` itself performs no external I/O.)
 */
@Injectable()
export class DenshibanInboundSyncService {
  private readonly logger = new Logger(DenshibanInboundSyncService.name);

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly fetcher: DenshibanInboundFetcher,
    private readonly assembler: DenshibanDokusyaAssembler,
    private readonly auditLog: AuditLogService,
    private readonly codeService: CodeService,
  ) {}

  /**
   * Runs one full sync pass. Fetches every `collecting=1` row and applies it.
   * Row-level failures are logged + counted, never rethrown, so a single
   * un-mappable record doesn't abort the batch. Fetch/connection failures DO
   * propagate (the whole run can't proceed) so the ECS task fails visibly.
   */
  async syncAll(): Promise<InboundSyncSummary> {
    const startedAt = Date.now();
    this.logger.log({ event: 'denshiban_inbound.start' });

    const rows = await this.fetcher.fetchCollectingRows();
    const syncDate = todayIsoJst();
    const summary: InboundSyncSummary = {
      fetched: rows.length,
      created: 0,
      updated: 0,
      skipped: 0,
      failed: 0,
    };

    for (const row of rows) {
      try {
        const outcome = await this.syncOne(row, syncDate);
        summary[outcome] += 1;
      } catch (err) {
        summary.failed += 1;
        // Row-level isolation: log + continue. (No per-row t_log audit — the
        // JA/target may be unknown when assembly itself failed; the structured
        // CloudWatch log carries denshi_kaiin_id for triage.)
        this.logger.error({
          event: 'denshiban_inbound.row_failed',
          denshiKaiinId: row.id,
          message: (err as Error).message,
        });
      }
    }

    this.logger.log({
      event: 'denshiban_inbound.done',
      ...summary,
      durationMs: Date.now() - startedAt,
    });
    return summary;
  }

  /** Applies one `users` row in its own transaction. */
  private async syncOne(
    row: DenshibanInboundRow,
    syncDate: string,
  ): Promise<RowOutcome> {
    return this.dataSource.transaction(async (manager) => {
      const draft = await this.assembler.assemble(row, { syncDate }, manager);

      const denshiKaiinId = draft.denshiKaiinId;
      if (denshiKaiinId == null) {
        // No 会員ID = nothing to match on now or later — surface it.
        throw new DenshibanMappingError(
          'denshi_kaiin_id',
          `会員ID (id) が未設定のため取り込めません（会員ID「${row.id ?? '(空)'}」）。`,
        );
      }

      const existing = await manager.findOne(Dokusya, {
        where: { denshiKaiinId },
      });
      const decision = classifyInbound(draft, existing);

      if (decision.kind === 'skip') return 'skipped';

      if (decision.kind === 'create') {
        await this.createDokusya(manager, draft, denshiKaiinId, syncDate);
        return 'created';
      }

      await this.updateDokusya(
        manager,
        existing!.dokusyaId,
        Number(existing!.jaId),
        decision.changes,
        syncDate,
      );
      return 'updated';
    });
  }

  /** CREATE: applyChange (master + rireki #1) → stamp denshi_kaiin_id → audit. */
  private async createDokusya(
    manager: EntityManager,
    draft: DokusyaDraft,
    denshiKaiinId: number,
    syncDate: string,
  ): Promise<void> {
    this.assertShiharaiHoho(draft.shiharaiHoho);

    // `denshi_kaiin_id` is master-only (not a history column) → exclude from the
    // applyChange values and stamp it separately below. `rireki_no` is the DB
    // default (1) on create, mirroring the UI create payload.
    const { denshiKaiinId: _dk, rirekiNo: _rn, ...values } = draft;

    // `created_by` / `updated_by` are NOT NULL system columns the pure builder
    // deliberately omits (see DokusyaDraft doc — "created_* / updated_* (system)")
    // and the DB column carries NO default. Stamp the sync actor here, exactly
    // like the UI create stamps `session.account_id` in buildInsertPayload — the
    // same values object then flows through applyChange → ensureMaster. Without
    // this the master INSERT violates the NOT NULL constraint on created_by.
    const result = await applyChange(manager, {
      mode: 'CREATE',
      values: {
        ...values,
        createdBy: SYNC_ACTOR,
        updatedBy: SYNC_ACTOR,
      } as DokusyaFields,
      johoDate: syncDate,
      source: 'BATCH',
      actor: SYNC_ACTOR,
      reason: SYNC_REASON,
    });

    await manager.update(
      Dokusya,
      { dokusyaId: result.dokusyaId },
      { denshiKaiinId },
    );

    await this.auditLog.logCreate(
      this.auditCtx(draft.jaId, result.dokusyaId),
      { ...result.after, denshiKaiinId },
      manager,
    );
  }

  /** UPDATE: applyChange with ONLY the changed denshiban-sourced columns → audit. */
  private async updateDokusya(
    manager: EntityManager,
    dokusyaId: number,
    jaId: number,
    changes: DokusyaFields,
    syncDate: string,
  ): Promise<void> {
    const result = await applyChange(manager, {
      mode: 'UPDATE',
      dokusyaId,
      values: changes,
      johoDate: syncDate,
      source: 'BATCH',
      actor: SYNC_ACTOR,
      reason: SYNC_REASON,
    });

    await this.auditLog.logUpdate(
      this.auditCtx(jaId, dokusyaId),
      result.before,
      result.after,
      manager,
    );
  }

  /**
   * `t_dokusya.shiharai_hoho` is NOT NULL and must be a valid m_code value.
   * The value comes straight from denshiban `payment_id` (same value set), so
   * validate it here before the insert — an empty/unknown value is a data
   * problem the operator must see, not something to silently default.
   */
  private assertShiharaiHoho(value: number | null): void {
    if (value == null || !this.codeService.has(CATEGORY_SHIHARAI_HOHO, value)) {
      throw new DenshibanMappingError(
        'shiharai_hoho',
        `支払方法 (payment_id → shiharai_hoho)「${value ?? '(未設定)'}」が不正です（m_code SHIHARAI_HOHO 未登録）。`,
      );
    }
  }

  /** Audit context for a session-less batch (accountId null = system). */
  private auditCtx(jaId: number, targetId: number | null): AuditOperationContext {
    return {
      accountId: null,
      jaId,
      screen: SCREEN_NAME,
      table: TABLE_NAME,
      targetId,
      ipAddress: '',
      userAgent: '',
    };
  }
}
