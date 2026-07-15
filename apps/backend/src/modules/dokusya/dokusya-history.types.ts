import { Dokusya } from '@/database/entities/dokusya.entity';
import { DokusyaRireki } from '@/database/entities/dokusya-rireki.entity';

/**
 * Shared types for the bitemporal history writer (dokusya-history.*).
 * See docs/dokusya-rireki-common-functions.md §2.
 */

/**
 * Date-only string `'YYYY-MM-DD'` interpreted as JST wall-clock. Matches
 * the DATE columns `joho_henko_tekiyo_date` / `dokusya_chushi_date`.
 */
export type DateOnly = string;

/** Snapshot of the current master row (`t_dokusya`). */
export type DokusyaSnapshot = Dokusya;

/**
 * Target business-column values for a create/update, keyed by the
 * `DokusyaRireki` entity property (camelCase). Only columns the caller
 * intends to set are present — for import UPDATE, only the selected
 * columns present in the Excel row.
 */
export type DokusyaFields = Partial<Record<keyof DokusyaRireki, unknown>>;

/** Where the change originates (drives audit label / reason). */
export type ApplyChangeSource = 'UI' | 'IMPORT' | 'REPLACE_HANBAITEN' | 'BATCH';

/** Single entry-point payload for create / update / import / replace. */
export interface ApplyChangeInput {
  /** `undefined` => CREATE (a new dokusya is inserted). */
  dokusyaId?: number;
  mode: 'CREATE' | 'UPDATE';
  values: DokusyaFields;
  /**
   * 唯一の適用日（読者情報変更適用日）。販売店・支払方法を含む全変更に適用され、
   * 1更新1レコードで記録される（顧客要件 2026-07: 販売店適用日を廃止）。`>= today`。
   */
  johoDate: DateOnly;
  source: ApplyChangeSource;
  /** `henko_riyu`. */
  reason: string;
  /** `created_by`. */
  actor: string;
  /**
   * Force `zougen_hokoku_flg = true` on every inserted row regardless of
   * whether a {@link ZOUGEN_TRIGGER_FIELDS} column changed. Used by Excel
   * import when the row carries 配達先 (delivery-destination) data — the
   * customer wants such rows reported even though the 配達先 columns are
   * not standard 増減 triggers. Default `false`.
   */
  forceZougen?: boolean;
}

/**
 * Result of `applyChange`. The caller uses `before`/`after` to write the
 * audit log (inside the same tx) and `denshiSync` to sync the 電子版
 * system AFTER commit (outside the tx).
 */
export interface ApplyChangeResult {
  dokusyaId: number;
  insertedRirekiIds: number[];
  /** Master state before the change (`null` on CREATE). */
  before: DokusyaSnapshot | null;
  /** Master state after the change. */
  after: DokusyaSnapshot;
  /** `true` => caller must sync the 電子版 system after commit. */
  denshiSync: boolean;
}

/**
 * One split event with its applied date. A single `applyChange` may
 * produce an information event and/or a hanbaiten event (sorted by
 * applied date ascending, information before hanbaiten on ties).
 */
export interface ChangeEvent {
  joho: DateOnly;
  values: DokusyaFields;
  /** `true` = this event changes `hanbaiten_id` (sets `hanbaiten_tekiyo_date`). */
  isHanbaiten: boolean;
}
