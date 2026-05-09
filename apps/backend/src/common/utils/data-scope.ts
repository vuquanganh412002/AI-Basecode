import { NotFoundException } from '@nestjs/common';
import type { SelectQueryBuilder } from 'typeorm';

import type { SessionPayload } from '@/modules/auth/session.service';

/**
 * Layer 2 (DataScope) of the security model — see `.claude/rules/security.md`.
 *
 * Roles partition data along two axes:
 *   - JA-level scope: NICHINO_ADMIN / NICHINO_STAFF (unrestricted),
 *     CHUOKAI / JA_HONTEN / JA_KANRI_SHITEN (own JA).
 *   - Branch-level scope (additionally): JA_KANRI_SHITEN sees only
 *     records bound to their own kanri_shiten_id; CHUOKAI / JA_HONTEN
 *     see all branches inside their JA.
 *
 * Every service should run scope checks BEFORE returning records. Use
 * the same helper across modules so the rules stay uniform — divergent
 * inline checks are how Layer 2 silently drifts.
 *
 * NotFoundException (rather than ForbiddenException) is intentional:
 * surfacing 403 leaks the existence of the row to an out-of-scope
 * user, so we mask out-of-scope hits as "not found".
 */

/**
 * NotFoundException carrying the project's standard error body so the
 * GlobalExceptionFilter emits `{ error_code: 'NOT_FOUND', message: ... }`.
 * Uses Nest's NotFoundException (not the project's DomainException
 * subclass) so existing `expect(...).rejects.toThrow(NotFoundException)`
 * tests continue to work via instanceof.
 */
function scopeNotFound(message = '指定されたリソースが見つかりません。'): NotFoundException {
  return new NotFoundException({
    code: 'NOT_FOUND',
    error_code: 'NOT_FOUND',
    message,
  });
}

/**
 * Coerce a possibly-stringified BIGINT id into a `number` for safe
 * `===`/`!==` comparison. TypeORM types BIGINT columns as `number` in
 * the entity but pg actually returns them as `string`, so a raw
 * comparison with the session payload (real number after JSON.parse)
 * silently mis-fires the cross-scope guard. Returns null for null /
 * undefined so loose-equality intent is preserved.
 */
function numericId(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  return typeof value === 'number' ? value : Number(value);
}

/* ─────────────── Single-record assertions (after fetch) ─────────────── */

/**
 * Throw NotFoundException if the operator's JA scope doesn't match the
 * record's `jaId`. NICHINO_ADMIN / NICHINO_STAFF (session.ja_id == null)
 * bypass the check.
 *
 * Use for resources scoped at JA level: m_ja, m_dokusya, m_hanbaiten,
 * m_kanri_shiten, m_oshirase, m_account, etc.
 *
 * Pass a Japanese resource label (e.g. 'JA', '購読者') so the response
 * message reads naturally; falls back to the generic copy when omitted.
 */
export function assertJaScope(
  recordJaId: number | null | undefined,
  session: SessionPayload,
  resourceLabel?: string,
): void {
  if (session.ja_id == null) return; // unrestricted role
  // BIGINT columns surface as `string` from pg + TypeORM even though the
  // entity declares `number`; coerce both sides so e.g. `"5" !== 5` does
  // not falsely trip the cross-scope guard.
  if (numericId(recordJaId) !== numericId(session.ja_id)) {
    throw scopeNotFound(
      resourceLabel
        ? `指定された${resourceLabel}が見つかりません。`
        : undefined,
    );
  }
}

/**
 * Throw NotFoundException if the record is out of scope. JA_KANRI_SHITEN
 * is checked against `kanri_shiten_id`; CHUOKAI / JA_HONTEN against
 * `ja_id`; NICHINO_ADMIN / NICHINO_STAFF unrestricted.
 *
 * Use for resources whose access is partitioned at branch level for
 * branch users but JA level for HQ users: t_dokusya, t_log,
 * t_login_log, etc.
 */
export function assertBranchScope(
  recordJaId: number | null | undefined,
  recordKanriShitenId: number | null | undefined,
  session: SessionPayload,
  resourceLabel?: string,
): void {
  if (
    session.role_code === 'NICHINO_ADMIN' ||
    session.role_code === 'NICHINO_STAFF'
  ) {
    return;
  }
  // Coerce BIGINT-as-string from TypeORM to number (see numericId comment
  // in assertJaScope).
  const mismatch =
    session.role_code === 'JA_KANRI_SHITEN'
      ? numericId(recordKanriShitenId) !== numericId(session.kanri_shiten_id)
      : numericId(recordJaId) !== numericId(session.ja_id);
  if (mismatch) {
    throw scopeNotFound(
      resourceLabel
        ? `指定された${resourceLabel}が見つかりません。`
        : undefined,
    );
  }
}

/* ─────────────── Query-builder helpers (for list queries) ───────────── */

/**
 * Add a JA-scope `WHERE` clause to a TypeORM SelectQueryBuilder.
 * No-op for NICHINO_ADMIN / NICHINO_STAFF.
 *
 * ```ts
 * const qb = repo.createQueryBuilder('d');
 * applyJaScope(qb, 'd', 'jaId', session);
 * applyJaScope(qb, 'h', 'jaId', session); // join alias
 * ```
 */
export function applyJaScope<T extends object>(
  qb: SelectQueryBuilder<T>,
  alias: string,
  jaIdField: string,
  session: SessionPayload,
): void {
  if (session.ja_id == null) return;
  qb.andWhere(`${alias}.${jaIdField} = :scopeJaId`, {
    scopeJaId: session.ja_id,
  });
}

/**
 * Branch-aware variant. JA_KANRI_SHITEN filters by kanriShitenIdField;
 * other restricted roles fall back to jaIdField; NICHINO_* unrestricted.
 */
export function applyBranchScope<T extends object>(
  qb: SelectQueryBuilder<T>,
  alias: string,
  fields: { jaIdField: string; kanriShitenIdField: string },
  session: SessionPayload,
): void {
  if (
    session.role_code === 'NICHINO_ADMIN' ||
    session.role_code === 'NICHINO_STAFF'
  ) {
    return;
  }
  if (session.role_code === 'JA_KANRI_SHITEN') {
    qb.andWhere(`${alias}.${fields.kanriShitenIdField} = :scopeKsId`, {
      scopeKsId: session.kanri_shiten_id,
    });
    return;
  }
  qb.andWhere(`${alias}.${fields.jaIdField} = :scopeJaId`, {
    scopeJaId: session.ja_id,
  });
}
