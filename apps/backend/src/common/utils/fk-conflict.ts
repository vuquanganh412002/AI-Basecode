import type { DataSource } from 'typeorm';
import { ConflictException } from '@/common/exceptions/common.exceptions';

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
 * ```
 *
 * pg-mem / Postgres は件数を bigint 文字列で返すため `Number(...)` で防御的に変換。
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
