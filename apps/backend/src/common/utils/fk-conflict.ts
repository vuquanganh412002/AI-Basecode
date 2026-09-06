import type { DataSource } from 'typeorm';
import { ConflictException } from '@/common/exceptions/common.exceptions';

/**
 * チェック対象の子テーブル1件。文字列を渡すと `hasDeletedAt: true`（＝ソフト削除
 * 列があり `AND deleted_at IS NULL` を付ける）として扱う。`t_dokusya_rireki` の
 * ような append-only 履歴テーブル（`deleted_at` 列そのものが無い）を対象にする
 * 場合は `{ table, hasDeletedAt: false }` を渡す — 列が無いテーブルに
 * `deleted_at IS NULL` を付けると SQL エラー（500）になるため必須。
 */
export type RelatedTableEntry = string | { table: string; hasDeletedAt: boolean };

/**
 * 指定した子テーブルのいずれかに未ソフト削除の参照行が残っている場合、親行の
 * 削除をブロックする。
 *
 * 最初の非ゼロ件数で `ConflictException`（→ HTTP 409, `error_code: 'CONFLICT'`,
 * message `関連データが存在するため削除できません。`）を投げ、単一の対処可能な
 * メッセージを返す。
 *
 * TypeORM のパラメータバインドはテーブル名をバインドできないため `${table}` を
 * 補間している。SQL インジェクション回避のため、呼び出し側は必ずハードコード済み
 * リスト（ユーザー入力不可）を渡すこと。
 *
 * ```ts
 * const RELATED_TABLES = ['m_kanri_shiten', 'm_shiten', 'm_tanka'] as const;
 * await assertNoRelatedRows(this.dataSource, RELATED_TABLES, 'ja_id', jaId);
 *
 * // deleted_at 列が無い append-only 履歴テーブルを混在させる場合:
 * await assertNoRelatedRows(
 *   this.dataSource,
 *   ['m_shiten', { table: 't_dokusya_rireki', hasDeletedAt: false }],
 *   'ja_id',
 *   jaId,
 * );
 * ```
 *
 * pg-mem / Postgres は件数を bigint 文字列で返すため `Number(...)` で防御的に変換。
 */
export async function assertNoRelatedRows(
  dataSource: DataSource,
  tables: readonly RelatedTableEntry[],
  fkField: string,
  fkValue: number,
  /** 既定の `関連データが存在するため削除できません。` を上書きしたい呼び出し側向け。 */
  message?: string,
): Promise<void> {
  for (const entry of tables) {
    const table = typeof entry === 'string' ? entry : entry.table;
    const hasDeletedAt = typeof entry === 'string' ? true : entry.hasDeletedAt;
    const sql = hasDeletedAt
      ? `SELECT COUNT(*) AS count FROM ${table} WHERE ${fkField} = $1 AND deleted_at IS NULL`
      : `SELECT COUNT(*) AS count FROM ${table} WHERE ${fkField} = $1`;
    const rows = await dataSource.query(sql, [fkValue]);
    const count = Number(rows?.[0]?.count ?? 0);
    if (count > 0) {
      throw new ConflictException(message);
    }
  }
}
