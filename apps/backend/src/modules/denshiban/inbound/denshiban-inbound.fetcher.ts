import { Injectable } from '@nestjs/common';

import { DenshibanDbService } from '../denshiban-db.service';

import type { DenshibanInboundRow } from './denshiban-dokusya.assembler';

/**
 * Reads the denshiban `users` view for the inbound sync (電子版 → クラウド).
 *
 * Thin gateway over {@link DenshibanDbService.withConnection} (short-lived MySQL
 * connection per batch run). Keeps the users-view SQL out of the generic
 * connection service and returns rows already shaped as
 * {@link DenshibanInboundRow} so the assembler/builder can consume them directly.
 *
 * Two normalizations happen here so the pure builder stays clock-free and
 * type-simple:
 *   - `activated_at` / `deleted_at` are MySQL `DATETIME`; `DATE_FORMAT(...)`
 *     collapses them to `YYYY-MM-DD` (the builder treats view dates as
 *     already-date-only strings).
 *   - INT columns (`payment_id`, `birthyear`, `pref_id`, …) come back from mysql2
 *     as JS numbers, but every {@link DenshibanInboundRow} field is `string |
 *     null`. {@link toStr} coerces each non-null value to a string so the builder
 *     never sees a number where it expects a string.
 */
@Injectable()
export class DenshibanInboundFetcher {
  constructor(private readonly denshibanDb: DenshibanDbService) {}

  /**
   * All `users` rows currently in scope for the sync — i.e. `collecting = '1'`
   * (the customer's "in-sync" flag). No `deleted_at` filter: a cancelled member
   * (`status = 9`) must still flow through so the sync records the cancellation.
   *
   * @throws when `denshiban.enabled = false` (via `withConnection`).
   */
  async fetchCollectingRows(): Promise<DenshibanInboundRow[]> {
    const rows = await this.denshibanDb.withConnection((ds) =>
      ds.query<RawUsersRow[]>(FETCH_COLLECTING_SQL),
    );
    return rows.map(normalizeRow);
  }
}

/** Raw shape mysql2 returns (mixed string/number/null per column type). */
type RawUsersRow = Record<string, unknown>;

/**
 * The `users` columns the mapping consumes. `activated_at` / `deleted_at` are
 * date-formatted; every other column is selected verbatim. `WHERE collecting =
 * '1'` — the column is `VARCHAR`, so compare against the string literal.
 */
const FETCH_COLLECTING_SQL = `
  SELECT
    id, first_name, last_name, first_kana, last_kana,
    zip1, zip2, pref_id, addr, city, building, tel1, tel2, email,
    melmaga, birthyear, sex,
    member_type, status, approval,
    payment_cycle, payment_start_ym,
    profession, others_profession, products, others_products,
    remarks1, remarks2, remarks3, remarks4, remarks5,
    paper_permission_dt, paper_zip, paper_pref_id, paper_addr, paper_city, paper_building,
    DATE_FORMAT(activated_at, '%Y-%m-%d') AS activated_at,
    DATE_FORMAT(deleted_at, '%Y-%m-%d')   AS deleted_at,
    JACd, ShopCd, payment_id
  FROM users
  WHERE collecting = '1'
`;

/** null/undefined → null; anything else → its string form. */
function toStr(v: unknown): string | null {
  return v === null || v === undefined ? null : String(v);
}

/** Maps one raw mysql row to the `string | null` inbound row the builder expects. */
function normalizeRow(r: RawUsersRow): DenshibanInboundRow {
  return {
    id: toStr(r.id),
    first_name: toStr(r.first_name),
    last_name: toStr(r.last_name),
    first_kana: toStr(r.first_kana),
    last_kana: toStr(r.last_kana),
    zip1: toStr(r.zip1),
    zip2: toStr(r.zip2),
    pref_id: toStr(r.pref_id),
    addr: toStr(r.addr),
    city: toStr(r.city),
    building: toStr(r.building),
    tel1: toStr(r.tel1),
    tel2: toStr(r.tel2),
    email: toStr(r.email),
    melmaga: toStr(r.melmaga),
    birthyear: toStr(r.birthyear),
    sex: toStr(r.sex),
    member_type: toStr(r.member_type),
    status: toStr(r.status),
    approval: toStr(r.approval),
    payment_cycle: toStr(r.payment_cycle),
    payment_start_ym: toStr(r.payment_start_ym),
    profession: toStr(r.profession),
    others_profession: toStr(r.others_profession),
    products: toStr(r.products),
    others_products: toStr(r.others_products),
    remarks1: toStr(r.remarks1),
    remarks2: toStr(r.remarks2),
    remarks3: toStr(r.remarks3),
    remarks4: toStr(r.remarks4),
    remarks5: toStr(r.remarks5),
    paper_permission_dt: toStr(r.paper_permission_dt),
    paper_zip: toStr(r.paper_zip),
    paper_pref_id: toStr(r.paper_pref_id),
    paper_addr: toStr(r.paper_addr),
    paper_city: toStr(r.paper_city),
    paper_building: toStr(r.paper_building),
    activated_at: toStr(r.activated_at),
    deleted_at: toStr(r.deleted_at),
    JACd: toStr(r.JACd),
    ShopCd: toStr(r.ShopCd),
    payment_id: toStr(r.payment_id),
  };
}

// Exported for the spec (assert the SQL shape without a live DB).
export const __TEST__ = { FETCH_COLLECTING_SQL, normalizeRow };
