import { EntityManager, SelectQueryBuilder } from 'typeorm';

import { Dokusya } from '@/database/entities/dokusya.entity';
import { DokusyaRireki } from '@/database/entities/dokusya-rireki.entity';

import { SORT_CHAIN_ASC, SORT_CHAIN_DESC } from './dokusya-history.constants';
import { DateOnly, DokusyaSnapshot } from './dokusya-history.types';

/**
 * Apply a multi-column chain ordering as consecutive `orderBy`/`addOrderBy`
 * calls. Never pass a composite `'a DESC, b DESC'` string to a single
 * `.orderBy()` — TypeORM appends its default direction and emits invalid
 * `... DESC ASC` SQL.
 */
function applyChainOrder(
  qb: SelectQueryBuilder<DokusyaRireki>,
  order: ReadonlyArray<readonly [string, 'ASC' | 'DESC']>,
): SelectQueryBuilder<DokusyaRireki> {
  order.forEach(([expr, dir], i) =>
    i === 0 ? qb.orderBy(expr, dir) : qb.addOrderBy(expr, dir),
  );
  return qb;
}

/**
 * Query helpers for the bitemporal history writer (dokusya-history.*).
 * Plain functions over an `EntityManager` so the caller controls the
 * transaction. Raw WHERE/ORDER strings use snake_case DB column names
 * (repo convention). See docs/dokusya-rireki-common-functions.md §5.1.
 */

/**
 * Effective row as of `asOf`: the greatest `(joho, rireki_no)` among
 * rows with `joho <= asOf` and `torikeshi_flg = false`. Returns `null`
 * when only future rows exist (or none). Read-only.
 */
export function loadEffectiveRow(
  m: EntityManager,
  dokusyaId: number,
  asOf: DateOnly,
): Promise<DokusyaRireki | null> {
  return applyChainOrder(
    m
      .createQueryBuilder(DokusyaRireki, 'r')
      .where('r.dokusya_id = :dokusyaId', { dokusyaId })
      .andWhere('r.torikeshi_flg = false')
      .andWhere('r.joho_henko_tekiyo_date <= :asOf', { asOf }),
    SORT_CHAIN_DESC,
  )
    .limit(1)
    .getOne();
}

/**
 * Immediate predecessor (by date) of a row about to be inserted at
 * `joho`. Same query as {@link loadEffectiveRow} — the predecessor is
 * the effective row as of `joho` (the new row is not yet persisted).
 * Read-only; source of the new row's `zenkai_*`.
 */
export function findBefore(
  m: EntityManager,
  dokusyaId: number,
  joho: DateOnly,
): Promise<DokusyaRireki | null> {
  return loadEffectiveRow(m, dokusyaId, joho);
}

/**
 * Immediate successor in `(joho, rireki_no)` order strictly after the
 * given position, `torikeshi_flg = false`. Used to recompute the
 * following row when inserting in the middle of the chain.
 */
export function findNext(
  m: EntityManager,
  dokusyaId: number,
  joho: DateOnly,
  rirekiNo: number,
): Promise<DokusyaRireki | null> {
  return applyChainOrder(
    m
      .createQueryBuilder(DokusyaRireki, 'r')
      .where('r.dokusya_id = :dokusyaId', { dokusyaId })
      .andWhere('r.torikeshi_flg = false')
      .andWhere(
        '(r.joho_henko_tekiyo_date > :joho OR (r.joho_henko_tekiyo_date = :joho AND r.rireki_no > :rirekiNo))',
        { joho, rirekiNo },
      ),
    SORT_CHAIN_ASC,
  )
    .limit(1)
    .getOne();
}

/**
 * Next `rireki_no` for a dokusya: `COALESCE(MAX(rireki_no), 0) + 1`.
 * Counts ALL rows (including `torikeshi_flg = true`) so reversing rows
 * never collide on `(dokusya_id, rireki_no)`.
 */
export async function nextRirekiNo(
  m: EntityManager,
  dokusyaId: number,
): Promise<number> {
  const row = await m
    .createQueryBuilder(DokusyaRireki, 'r')
    .select('COALESCE(MAX(r.rireki_no), 0) + 1', 'next')
    .where('r.dokusya_id = :dokusyaId', { dokusyaId })
    .getRawOne<{ next: string }>();
  return Number(row?.next ?? 1);
}

/** Persist a built history row and return it with its generated id. */
export function insertRow(
  m: EntityManager,
  row: Partial<DokusyaRireki>,
): Promise<DokusyaRireki> {
  return m.save(DokusyaRireki, m.create(DokusyaRireki, row));
}

/**
 * Set `saishin_data_flg = TRUE` on the effective row and `FALSE` on every
 * other `torikeshi_flg = false` row of the dokusya. Pass `null` when
 * there is no effective row (only future rows) → all become `FALSE`.
 * Keeps the invariant `t_dokusya ⇔ saishin_data_flg = TRUE`.
 */
export async function setSaishinFlags(
  m: EntityManager,
  dokusyaId: number,
  effectiveRirekiId: number | null,
): Promise<void> {
  // Cast the bound params to int explicitly: the pg wire protocol sends
  // them as text and COALESCE(text, -1) can't unify with the int literal
  // (fails under pg-mem; brittle on strict PG). $1::int handles the NULL
  // (no effective row) case cleanly too.
  await m.query(
    `UPDATE t_dokusya_rireki
        SET saishin_data_flg = (dokusya_rireki_id = COALESCE($1::int, -1))
      WHERE dokusya_id = $2::int AND torikeshi_flg = false`,
    [effectiveRirekiId, dokusyaId],
  );
}

/**
 * Flag a history row as 取消 (red-slip). Does not delete. The cancellation
 * reason is written into the target row's `biko` (顧客要件 — 取消理由は対象行と
 * 打ち消し行の両方の備考に記録する).
 */
export async function markTorikeshi(
  m: EntityManager,
  dokusyaRirekiId: number,
  reason: string,
): Promise<void> {
  await m.update(
    DokusyaRireki,
    { dokusyaRirekiId },
    { torikeshiFlg: true, biko: reason },
  );
}

/**
 * Insert the master (`t_dokusya`) shell for a CREATE and return its
 * generated `dokusya_id`. The row is immediately overwritten by
 * `recomputeMaster` from the first rireki row, so only the columns
 * needed to obtain a PK are required here.
 */
export async function ensureMaster(
  m: EntityManager,
  values: Partial<Dokusya>,
): Promise<number> {
  const saved = await m.save(Dokusya, m.create(Dokusya, values));
  return saved.dokusyaId;
}

/** Read the current master snapshot (throws if missing — must exist post-write). */
export async function loadMaster(
  m: EntityManager,
  dokusyaId: number,
): Promise<DokusyaSnapshot> {
  const row = await m.findOne(Dokusya, { where: { dokusyaId } });
  if (!row) {
    throw new Error(`t_dokusya not found for dokusya_id=${dokusyaId}`);
  }
  return row;
}

/** Read one history row by its PK (throws if missing). Used by 取消. */
export async function loadRireki(
  m: EntityManager,
  dokusyaRirekiId: number,
): Promise<DokusyaRireki> {
  const row = await m.findOne(DokusyaRireki, { where: { dokusyaRirekiId } });
  if (!row) {
    throw new Error(`t_dokusya_rireki not found: ${dokusyaRirekiId}`);
  }
  return row;
}
