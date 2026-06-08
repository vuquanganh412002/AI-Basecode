// DB-error inspection helpers.
//
// The driver-specific error shape (`err.driverError`) is the canonical
// path for distinguishing kinds of `QueryFailedError`. Keep type checks
// here so individual services don't have to hand-roll the cast.

import { QueryFailedError } from 'typeorm';

/**
 * Returns `true` when the error is a PostgreSQL UNIQUE constraint
 * violation (SQLSTATE 23505). Use this in service create/update flows
 * as the race-condition safety net: a pre-check (`findOne({...})`) can
 * miss a concurrent INSERT, so the DML still needs a catch path that
 * converts the resulting 500 into a clean `DuplicateCodeException`
 * (400 with the canonical Japanese duplicate-code message).
 *
 * The check covers both routes the error shape can take:
 *   - `err.driverError.code === '23505'` — when TypeORM nests the
 *     driver error (typical when using a connection pool).
 *   - `(err as any).code === '23505'` — when the error is raised
 *     directly from the `pg` driver (older versions / certain edge
 *     paths).
 */
export function isUniqueViolation(err: unknown): boolean {
  if (!(err instanceof QueryFailedError)) return false;
  const driver = (err as { driverError?: { code?: string }; code?: string });
  return driver.driverError?.code === '23505' || driver.code === '23505';
}
