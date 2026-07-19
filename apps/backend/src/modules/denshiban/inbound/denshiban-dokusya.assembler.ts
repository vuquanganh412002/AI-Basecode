import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';

import { DokusyaShubetsu } from '@/common/enums';
import { Hanbaiten } from '@/database/entities/hanbaiten.entity';
import { KanriShiten } from '@/database/entities/kanri-shiten.entity';

import {
  buildDokusyaFromDenshiban,
  toDokusyaShubetsu,
  type DenshibanUserRow,
  type DokusyaDraft,
  type InboundBuildCtx,
} from '../mapper/denshiban-dokusya.builder';
import { DenshibanMappingError } from '../mapper/denshiban-payload.builder';

/**
 * INBOUND assembler (電子版 `users` 行 → `t_dokusya` draft) — the mirror of
 * {@link ../outbound/denshiban-payload.assembler} (which goes cloud → API).
 *
 * The pure {@link buildDokusyaFromDenshiban} maps the denshiban view fields plus
 * already-resolved FK ids into a draft. This assembler is the ONE place that
 * touches the cloud DB to resolve those ids from the raw denshiban codes:
 *
 *   1. `JACd` (10-digit) → `m_kanri_shiten` → `kanri_shiten_id` **and** its
 *      `ja_id` (one lookup yields both — No 2 / No 3).
 *   2. `ShopCd` → `hanbaiten_id` (No 38): **併読** looks it up in `m_hanbaiten`
 *      (ShopCd = hanbaiten_code, scoped to the JA); **電子版単独** is `null`
 *      (customer decision 2026-07-19 — the ダミー販売店 will be created later; until
 *      then digital-only rows carry a null hanbaiten_id).
 *   3. `payment_id` → `shiharai_hoho` (No 41): BLOCKED on QnA2 — see
 *      {@link resolveShiharaiHoho}.
 *
 * Un-resolvable codes throw {@link DenshibanMappingError} (never silently
 * defaulted) so the batch can record the row for operators — same policy as the
 * outbound assembler.
 */
@Injectable()
export class DenshibanDokusyaAssembler {
  constructor(
    @InjectRepository(KanriShiten)
    private readonly kanriShitenRepo: Repository<KanriShiten>,
    @InjectRepository(Hanbaiten)
    private readonly hanbaitenRepo: Repository<Hanbaiten>,
  ) {}

  /**
   * Resolves the FK context then builds the `t_dokusya` draft.
   *
   * @param manager Pass when running inside a transaction so the FK lookups read
   *   the same connection as the caller's uncommitted context.
   * @throws {DenshibanMappingError} when a denshiban code cannot be resolved.
   */
  async assemble(
    row: DenshibanInboundRow,
    opts: InboundAssembleOptions = {},
    manager?: EntityManager,
  ): Promise<DokusyaDraft> {
    const ctx = await this.resolveCtx(row, opts, manager);
    return buildDokusyaFromDenshiban(row, ctx);
  }

  /** Resolves every id/value {@link buildDokusyaFromDenshiban} needs from ctx. */
  async resolveCtx(
    row: DenshibanInboundRow,
    opts: InboundAssembleOptions = {},
    manager?: EntityManager,
  ): Promise<InboundBuildCtx> {
    const { kanriShitenId, jaId } = await this.resolveKanriShiten(row.JACd, manager);
    const hanbaitenId = await this.resolveHanbaiten(row, jaId, manager);

    return {
      jaId,
      kanriShitenId,
      hanbaitenId,
      shiharaiHoho: resolveShiharaiHoho(row.payment_id),
      rirekiNo: opts.rirekiNo ?? 1,
      syncDate: opts.syncDate ?? null,
    };
  }

  /**
   * `JACd` → `{ kanriShitenId, jaId }`. denshiban stores JACd as 10 half-width
   * digits; cloud stores `kanri_shiten_code` hyphenated (`NNN-NNNN-NNN`), so the
   * match strips non-digits from the stored code (`regexp_replace`) before
   * comparing. A JACd that isn't 10 digits, or has no matching branch, is bad
   * data a retry won't fix → mapping error.
   */
  private async resolveKanriShiten(
    jacdRaw: string | null,
    manager?: EntityManager,
  ): Promise<{ kanriShitenId: number; jaId: number }> {
    const jacd = str(jacdRaw).replace(/\D/g, '');
    if (!/^\d{10}$/.test(jacd)) {
      throw new DenshibanMappingError(
        'JACd',
        `JACd「${str(jacdRaw) || '(空)'}」は半角数字10桁ではありません。`,
      );
    }
    const repo = manager ? manager.getRepository(KanriShiten) : this.kanriShitenRepo;
    const row = await repo
      .createQueryBuilder('ks')
      .where("regexp_replace(ks.kanri_shiten_code, '[^0-9]', '', 'g') = :jacd", {
        jacd,
      })
      .getOne();
    if (!row) {
      throw new DenshibanMappingError(
        'JACd',
        `JACd「${jacd}」に該当する管理支店が見つかりません。`,
      );
    }
    return { kanriShitenId: Number(row.kanriShitenId), jaId: Number(row.jaId) };
  }

  /**
   * `ShopCd` → `hanbaiten_id` (No 38). 電子版単独 → `null`. 併読 → look up
   * `m_hanbaiten` by `hanbaiten_code = ShopCd` within the resolved JA (the
   * `(ja_id, hanbaiten_code)` pair is unique). A 併読 row with a blank or
   * unknown ShopCd is a mapping error.
   */
  private async resolveHanbaiten(
    row: DenshibanInboundRow,
    jaId: number,
    manager?: EntityManager,
  ): Promise<number | null> {
    if (toDokusyaShubetsu(row.paper_permission_dt) !== DokusyaShubetsu.BOTH) {
      return null; // 電子版単独 — no shop; ダミー販売店 pending (customer 2026-07-19).
    }
    const shopCd = str(row.ShopCd).trim();
    if (shopCd === '') {
      throw new DenshibanMappingError(
        'ShopCd',
        `併読ですが ShopCd(販売店コード) が空です（会員ID ${str(row.id) || '(不明)'}）。`,
      );
    }
    const repo = manager ? manager.getRepository(Hanbaiten) : this.hanbaitenRepo;
    const hanbaiten = await repo.findOne({
      where: { jaId, hanbaitenCode: shopCd },
    });
    if (!hanbaiten) {
      throw new DenshibanMappingError(
        'ShopCd',
        `ShopCd「${shopCd}」に該当する販売店が見つかりません（JA ${jaId}）。`,
      );
    }
    return Number(hanbaiten.hanbaitenId);
  }
}

/**
 * denshiban `payment_id` → cloud `shiharai_hoho` (No 41).
 *
 * Customer-confirmed (2026-07-19): denshiban's `payment_id` uses the SAME
 * representative values as cloud's `shiharai_hoho` (m_code `SHIHARAI_HOHO` —
 * 1:口座引落 / 2:集金 / 3:振込 / 4:JA拠点 / 5:給料天引 / 6:クレジットカード /
 * 9:その他), so the value maps straight through.
 *
 * Empty → `null` (未設定: the row has no payment method yet — the CREATE write,
 * where `shiharai_hoho` is NOT NULL, decides how to handle it). A non-numeric
 * value is denshiban drift → {@link DenshibanMappingError}. m_code membership
 * itself is validated by the write service (like every other m_code field, via
 * `CodeService.has('SHIHARAI_HOHO', …)`) — not here, keeping the assembler free
 * of that dependency and symmetric with the outbound assembler.
 */
export function resolveShiharaiHoho(
  paymentId: string | null | undefined,
): number | null {
  const s = str(paymentId).trim();
  if (s === '') return null;
  if (!/^\d+$/.test(s)) {
    throw new DenshibanMappingError(
      'payment_id',
      `支払方法 (payment_id)「${s}」が数値ではありません。`,
    );
  }
  return Number(s);
}

/** null/undefined → ''. */
function str(v: string | null | undefined): string {
  return v ?? '';
}

/**
 * One denshiban `users` row as the assembler needs it: the pure-builder subset
 * ({@link DenshibanUserRow}) plus the three raw codes only the assembler resolves.
 * The fetch layer selects these column names verbatim from the `users` view.
 */
export interface DenshibanInboundRow extends DenshibanUserRow {
  /** JA code (10 half-width digits) → ja_id + kanri_shiten_id (No 2, 3). */
  JACd: string | null;
  /** 販売店コード — hanbaiten_code for 併読; ignored for 電子版単独 (No 38). */
  ShopCd: string | null;
  /** 支払 identifier → shiharai_hoho (No 41). Blocked — see {@link resolveShiharaiHoho}. */
  payment_id: string | null;
}

/** Per-run values the caller supplies (not derivable from the row alone). */
export interface InboundAssembleOptions {
  /** 履歴No (No 56) — existing `rireki_no + 1` on update; defaults to 1. */
  rirekiNo?: number;
  /** 読者情報変更適用日 (No 53) — the sync date `YYYY-MM-DD`; defaults to null. */
  syncDate?: string | null;
}
