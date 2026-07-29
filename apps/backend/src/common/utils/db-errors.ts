// DB エラー判定ヘルパー。`QueryFailedError` の型チェック（`err.driverError`
// 経由）を集約し、各サービスでのキャスト手書きを不要にする。

import { QueryFailedError } from 'typeorm';

/**
 * PostgreSQL の UNIQUE 違反（SQLSTATE 23505）なら `true`。create/update での
 * 競合対策の安全網: `findOne` 事前チェックは並行 INSERT を取りこぼすため、DML の
 * catch で 500 を `DuplicateCodeException`（400, 正準の重複コードメッセージ）に変換する。
 *
 * 両方のエラー形状に対応:
 *   - `err.driverError.code === '23505'` — TypeORM ネスト（コネクションプール）
 *   - `(err as any).code === '23505'` — `pg` から直接送出
 */
export function isUniqueViolation(err: unknown): boolean {
  if (!(err instanceof QueryFailedError)) return false;
  const driver = (err as { driverError?: { code?: string }; code?: string });
  return driver.driverError?.code === '23505' || driver.code === '23505';
}
