import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';

import type { Dokusya } from '@/database/entities/dokusya.entity';
import { KanriShiten } from '@/database/entities/kanri-shiten.entity';

import { toPaymentStart } from '../mapper/denshiban-payment-start';
import {
  buildCommandPayload,
  buildCreatePayload,
  buildUpdatePayload,
  DenshibanMappingError,
  type BuildCtx,
  type DenshibanCommandMode,
  type DenshibanMode,
  type DenshibanPayload,
} from '../mapper/denshiban-payload.builder';
import { assertPayload } from '../mapper/denshiban-payload.validator';

/**
 * Assembles a subscriber entity into a sendable `updateUserInfo` payload.
 *
 * Used by `DenshibanApiService.sendNow()` — the synchronous, in-transaction send
 * path (sends BEFORE commit and, on failure, rolls back the caller's whole
 * transaction).
 *
 * Extracted from the send path so payload assembly (context resolution + build +
 * validation) is one testable unit, independent of the HTTP/transaction concerns
 * of the caller.
 *
 * It does exactly three things:
 *   1. Resolves `jacd_execute` from the subscriber's `m_kanri_shiten` (the only
 *      DB read in this class)
 *   2. Resolves `payment_start` against **the clock at call time**
 *      ({@link toPaymentStart})
 *   3. Picks a build* by mode and returns it after `assertPayload`
 *
 * What it does NOT do: re-read the subscriber, gate on sync eligibility, send
 * HTTP, or decide retryability. Each of those belongs to the caller (worker /
 * sendNow).
 */
@Injectable()
export class DenshibanPayloadAssembler {
  constructor(
    @InjectRepository(KanriShiten)
    private readonly kanriShitenRepo: Repository<KanriShiten>,
  ) {}

  /**
   * Builds the payload and validates it.
   *
   * @param manager Pass this when calling from inside a transaction. The sync
   *   path must read `m_kanri_shiten` on the same connection as the caller's
   *   uncommitted context (a separate connection cannot see a kanri-shiten
   *   created in that same transaction). Omit for the default connection.
   * @throws {DenshibanMappingError} when cloud data cannot be expressed in denshiban.
   */
  async assemble(
    input: AssembleInput,
    manager?: EntityManager,
  ): Promise<DenshibanPayload> {
    const ctx = await this.resolveCtx(input, manager);
    const payload = this.build(input, ctx);
    assertPayload(payload);
    return payload;
  }

  /**
   * Resolves `jacd_execute` from the subscriber's own `m_kanri_shiten`.
   *
   * `jacd_execute` = the kanri-shiten code of the subscriber record itself. In
   * this system only JA_KANRI_SHITEN accounts carry a `kanri_shiten_id`, and
   * such an operator can only act on subscribers of their own branch — so an
   * "operator's branch" would always equal the record's anyway. Every other
   * role (Nichino / CHUOKAI / JA_HONTEN) has a null `kanri_shiten_id` and acts
   * on behalf of a JA. In both cases the executing JA is the subscriber's own
   * kanri-shiten, so it is resolved straight from the record.
   *
   * `jacd` (owning JA — an optional §A field for inter-JA transfers) is never
   * populated here: under the current account model + DataScope it can never
   * differ from `jacd_execute`. The builder still accepts `ctx.jacd` should a
   * future phase need it.
   */
  async resolveCtx(input: AssembleInput, manager?: EntityManager): Promise<BuildCtx> {
    const { dokusya, mode } = input;

    const jacdExecute = await this.kanriShitenCode(dokusya.kanriShitenId, manager);
    if (!jacdExecute) {
      throw new DenshibanMappingError(
        'kanri_shiten_id',
        `管理支店コード (jacd_execute) を解決できません（読者 ${dokusya.dokusyaId}）。`,
      );
    }

    const ctx: BuildCtx = {
      jacdExecute,
      notifyFlg: input.notifyFlg ?? '0',
      cancelYm: input.cancelYm,
    };

    // [payment_start] The only clock-dependent conversion. Resolve it **as of
    // now, right before sending** — denshiban interprets 0/1 against the date it
    // receives the request, so deciding at enqueue time shifts the subscription
    // start date on any retry that crosses a month boundary.
    if (mode === 'create' || mode === 'approve' || mode === 'unapprove') {
      ctx.paymentStart = toPaymentStart(dokusya.dokusyaKaishiDate);
    }

    return ctx;
  }

  /** Picks a build* by mode. Validation is done by {@link assemble}. */
  private build(input: AssembleInput, ctx: BuildCtx): DenshibanPayload {
    const { dokusya, mode } = input;

    if (mode === 'create') {
      return buildCreatePayload(dokusya, ctx);
    }

    if (mode === 'update' || mode === 'reread') {
      if (!input.before) {
        // No diff available = no way to decide what to send. Sending every field
        // could roll back a concurrent change made from another terminal. Fail
        // loudly instead.
        throw new DenshibanMappingError(
          'before',
          `mode=${mode} には変更前スナップショット (before) が必要です。`,
        );
      }
      return buildUpdatePayload(input.before, dokusya, ctx, mode);
    }

    return buildCommandPayload(dokusya, ctx, mode as DenshibanCommandMode);
  }

  private async kanriShitenCode(
    id: number | null,
    manager?: EntityManager,
  ): Promise<string | null> {
    if (id == null) return null;
    const repo = manager ? manager.getRepository(KanriShiten) : this.kanriShitenRepo;
    const row = await repo.findOne({
      where: { kanriShitenId: id },
      withDeleted: true,
    });
    const raw = row?.kanriShitenCode ?? null;
    if (raw == null) return null;

    // denshiban's `jacd` / `jacd_execute` are "10 half-width digits, no hyphens".
    // Cloud stores the code for display as `NNN-NNNN-NNN` (12 chars, hyphenated),
    // so strip hyphens and any other non-digit before sending. A code that isn't
    // 10 digits after stripping is bad data that a retry will never fix (= straight
    // to DLQ), so fail as a mapping error and surface the raw value plus the
    // kanri-shiten id to operators.
    const normalized = raw.replace(/[^0-9]/g, '');
    if (!/^\d{10}$/.test(normalized)) {
      throw new DenshibanMappingError(
        'kanri_shiten_code',
        `管理支店コード「${raw}」を電子版の JACd（半角数字10桁）に変換できません（管理支店 ${id}）。`,
      );
    }
    return normalized;
  }
}

/** Input for {@link DenshibanPayloadAssembler.assemble}. */
export interface AssembleInput {
  /** The subscriber to send (the state you want denshiban to have). */
  dokusya: Dokusya;
  mode: DenshibanMode;
  /** Cancellation month `YYYYMM` — required for `cancel`. */
  cancelYm?: string;
  /** Notify-the-member flag. Defaults to `'0'` (do not notify). */
  notifyFlg?: '0' | '1';
  /** The prior state — required for `update` / `reread` (diff-based sending). */
  before?: Dokusya;
}
