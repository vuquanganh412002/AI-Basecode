import { IsNull, type FindOptionsWhere, type Repository, type SelectQueryBuilder } from 'typeorm';

import {
  BadRequestException,
  DataScopeViolationException,
  NotFoundException,
} from '@/common/exceptions/common.exceptions';
import { RoleCode } from '@/common/enums';
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
 * Throw the project's `NotFoundException` (`DomainException` subclass)
 * so `GlobalExceptionFilter` emits `{ error_code: 'NOT_FOUND', message }`
 * AND every spec that imports `NotFoundException` from
 * `@/common/exceptions/common.exceptions` matches via `instanceof`. The
 * factory at `common.exceptions.ts:35` builds the resource-aware message
 * `指定された{resource}が見つかりません。` from the optional argument.
 */
function scopeNotFound(label?: string): NotFoundException {
  return new NotFoundException(label);
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
    throw scopeNotFound(resourceLabel);
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
    session.role_code === RoleCode.NICHINO_ADMIN ||
    session.role_code === RoleCode.NICHINO_STAFF
  ) {
    return;
  }
  // Coerce BIGINT-as-string from TypeORM to number (see numericId comment
  // in assertJaScope).
  const mismatch =
    session.role_code === RoleCode.JA_KANRI_SHITEN
      ? numericId(recordKanriShitenId) !== numericId(session.kanri_shiten_id)
      : numericId(recordJaId) !== numericId(session.ja_id);
  if (mismatch) {
    throw scopeNotFound(resourceLabel);
  }
}

/**
 * Same branch-scope check as {@link assertBranchScope}, but throws
 * `DataScopeViolationException` (HTTP 403) instead of NotFound (404).
 *
 * Use when the id was NOT taken from the request URL — e.g. a bulk
 * operation acting on candidate rows the caller supplied (SCR-015
 * replace candidates, SCR-016 import existing rows). There the 404
 * existence-masking rationale doesn't apply (the caller already knows
 * the row exists), and the customer decision (2026-05-19,
 * `.claude/rules/security.md` Layer 4) is to surface an explicit 403.
 */
export function assertBranchScopeViolation(
  recordJaId: number | null | undefined,
  recordKanriShitenId: number | null | undefined,
  session: SessionPayload,
): void {
  if (
    session.role_code === RoleCode.NICHINO_ADMIN ||
    session.role_code === RoleCode.NICHINO_STAFF
  ) {
    return;
  }
  const mismatch =
    session.role_code === RoleCode.JA_KANRI_SHITEN
      ? numericId(recordKanriShitenId) !== numericId(session.kanri_shiten_id)
      : numericId(recordJaId) !== numericId(session.ja_id);
  if (mismatch) {
    throw new DataScopeViolationException();
  }
}

/**
 * JA-level scope check that throws `DataScopeViolationException` (HTTP
 * 403) instead of NotFound (404). The JA-level counterpart of
 * {@link assertBranchScopeViolation}: every restricted role (including
 * JA_KANRI_SHITEN) is checked against `ja_id` — use for a JA-scoped
 * resource that has no kanri_shiten_id of its own (e.g. the m_hanbaiten
 * replace-target in SCR-015, whose existence the caller already
 * confirmed). NICHINO_* bypass.
 */
export function assertJaScopeViolation(
  recordJaId: number | null | undefined,
  session: SessionPayload,
): void {
  if (
    session.role_code === RoleCode.NICHINO_ADMIN ||
    session.role_code === RoleCode.NICHINO_STAFF
  ) {
    return;
  }
  if (numericId(recordJaId) !== numericId(session.ja_id)) {
    throw new DataScopeViolationException();
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
    session.role_code === RoleCode.NICHINO_ADMIN ||
    session.role_code === RoleCode.NICHINO_STAFF
  ) {
    return;
  }
  if (session.role_code === RoleCode.JA_KANRI_SHITEN) {
    qb.andWhere(`${alias}.${fields.kanriShitenIdField} = :scopeKsId`, {
      scopeKsId: session.kanri_shiten_id,
    });
    return;
  }
  qb.andWhere(`${alias}.${fields.jaIdField} = :scopeJaId`, {
    scopeJaId: session.ja_id,
  });
}

/**
 * Branch-aware variant for the (rare) case where `ja_id` and
 * `kanri_shiten_id` live on DIFFERENT aliases — typically because
 * `ja_id` is on the primary table but `kanri_shiten_id` is denormalised
 * through a JOIN'd m_account row.
 *
 * Concrete user: `LogService.findAll/exportLogCsv` — `t_log.ja_id`
 * (alias `l`) but `m_account.kanri_shiten_id` (alias `a`) on the JOIN.
 *
 * Each side carries its own `{ alias, field }` pair. Behavior is
 * identical to `applyBranchScope` otherwise (NICHINO_* unrestricted,
 * KANRI_SHITEN narrows by kanri_shiten_id, CHUOKAI/JA_HONTEN by ja_id).
 *
 * Use the simpler `applyBranchScope(qb, alias, { jaIdField, kanriShitenIdField })`
 * when both fields sit on the same alias — this variant exists only
 * for the cross-table case.
 */
export function applyBranchScopeWithJoinAlias<T extends object>(
  qb: SelectQueryBuilder<T>,
  scope: {
    ja: { alias: string; field: string };
    kanriShiten: { alias: string; field: string };
  },
  session: SessionPayload,
): void {
  if (
    session.role_code === RoleCode.NICHINO_ADMIN ||
    session.role_code === RoleCode.NICHINO_STAFF
  ) {
    return;
  }
  if (session.role_code === RoleCode.JA_KANRI_SHITEN) {
    qb.andWhere(
      `${scope.kanriShiten.alias}.${scope.kanriShiten.field} = :scopeKsId`,
      { scopeKsId: session.kanri_shiten_id },
    );
    return;
  }
  qb.andWhere(`${scope.ja.alias}.${scope.ja.field} = :scopeJaId`, {
    scopeJaId: session.ja_id,
  });
}

/* ─────────────── FK reference scope (for CREATE / UPDATE bodies) ──── */

/**
 * Fetch a parent row by id from `repo`, requiring it to BOTH exist AND
 * (optionally) belong to a given JA. Use whenever a CREATE / UPDATE
 * request body carries a foreign-key id that the caller could otherwise
 * forge to point at a row in a different tenant — the canonical guard
 * for Layer 4 (FK reference in scope) of the DataScope model.
 *
 * Pass `expectedJaId`:
 *   - `null` when no scope check applies (NICHINO_ADMIN / NICHINO_STAFF
 *     accepting any JA's parent, or when the caller has already
 *     resolved an effective ja_id and wants only existence + soft-
 *     delete filtering).
 *   - A `number` when the parent's `ja_id` must equal this value
 *     (typical for restricted roles using `session.ja_id`).
 *
 * Splits the two miss cases into distinct HTTP responses:
 *   - Row ABSENT (or invalid id) → `BadRequestException` with the
 *     canonical inline-FK-guard message `'<resource>IDが存在しません。'`.
 *   - Row EXISTS but belongs to a different tenant →
 *     `ForbiddenException` → `DATA_SCOPE_VIOLATION` (403) with the
 *     canonical message `'このデータへのアクセス権限がありません。'`.
 *
 * Customer decision (2026-05-19): the explicit 403 is preferred over
 * masking-as-400 even though it allows tenant-id existence enumeration
 * — audit logs and end-user UX benefit from the clear distinction.
 * Layer 2 (single-record access) still masks as 404 because the caller
 * there is on a URL that *names* the id, so leaking is much more
 * obvious. FK references in a body are different — caller already
 * supplied the id, so 403 doesn't reveal more than they already know
 * they're probing.
 *
 * @example
 *   // shiten.service.ts (CHUOKAI session — restricted to own JA)
 *   const ks = await fetchFkInJa(
 *     this.kanriShitenRepo,
 *     'kanriShitenId',
 *     dto.kanri_shiten_id,
 *     session.ja_id,         // ← restricted
 *     '管理支店',
 *   );
 *
 *   // hanbaiten.service.ts (effective ja_id resolved earlier, may be
 *   // session.ja_id OR dto.ja_id for NICHINO_STAFF 代行入力)
 *   const tanka = await fetchFkInJa(
 *     this.tankaRepo,
 *     'tankaId',
 *     dto.haitatsuryo_tanka_id,
 *     effectiveJaId,
 *     '配達手数料単価',
 *   );
 */
export async function fetchFkInJa<T extends { jaId: number }>(
  repo: Repository<T>,
  idField: keyof T,
  id: number | string | null | undefined,
  expectedJaId: number | null,
  resourceLabelJp: string,
): Promise<T> {
  if (id === null || id === undefined) {
    throw new BadRequestException(`${resourceLabelJp}IDが存在しません。`);
  }
  // Two-step: first check existence WITHOUT the jaId filter so we can
  // distinguish "missing" (→ 400) from "exists but cross-tenant" (→ 403).
  const where = {
    [idField as string]: id,
    deletedAt: IsNull(),
  } as unknown as FindOptionsWhere<T>;
  const row = await repo.findOne({ where });
  if (!row) {
    throw new BadRequestException(`${resourceLabelJp}IDが存在しません。`);
  }
  if (expectedJaId !== null && numericId(row.jaId) !== numericId(expectedJaId)) {
    throw new DataScopeViolationException();
  }
  return row;
}
