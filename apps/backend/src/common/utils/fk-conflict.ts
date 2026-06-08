import type { DataSource } from 'typeorm';
import { ConflictException } from '@/common/exceptions/common.exceptions';

/**
 * Block a parent-row delete when any of the listed child tables still
 * has a non-soft-deleted row referencing it.
 *
 * Throws `ConflictException` (→ HTTP 409, `error_code: 'CONFLICT'`,
 * message `関連データが存在するため削除できません。`) at the first
 * non-zero count so operators see a single, actionable message.
 *
 * Uses `dataSource.query` with parameter binding so callers don't have
 * to spread TypeORM's API across modules. `${table}` is interpolated
 * because TypeORM's parameter binding can't bind table names — caller
 * MUST pass a hardcoded list (not user input) to avoid SQL injection.
 *
 * Usage:
 * ```ts
 * const RELATED_TABLES = ['m_kanri_shiten', 'm_shiten', 'm_tanka'] as const;
 * await assertNoRelatedRows(this.dataSource, RELATED_TABLES, 'ja_id', jaId);
 * ```
 *
 * pg-mem returns counts as numeric strings (production Postgres returns
 * bigint as string too) — `Number(...)` coerces defensively.
 */
export async function assertNoRelatedRows(
  dataSource: DataSource,
  tables: readonly string[],
  fkField: string,
  fkValue: number,
): Promise<void> {
  for (const table of tables) {
    const rows = await dataSource.query(
      `SELECT COUNT(*) AS count FROM ${table} WHERE ${fkField} = $1 AND deleted_at IS NULL`,
      [fkValue],
    );
    const count = Number(rows?.[0]?.count ?? 0);
    if (count > 0) {
      throw new ConflictException();
    }
  }
}
