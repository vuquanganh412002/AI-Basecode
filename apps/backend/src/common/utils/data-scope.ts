import { IsNull, type FindOptionsWhere, type Repository, type SelectQueryBuilder } from 'typeorm';

import {
  BadRequestException,
  DataScopeViolationException,
  NotFoundException,
} from '@/common/exceptions/common.exceptions';
import { RoleCode } from '@/common/enums';
import type { SessionPayload } from '@/modules/auth/session.service';

/**
 * Layer 2 DataScope（`.claude/rules/security.md`）。JA軸: NICHINO_* 無制限、
 * CHUOKAI/JA_HONTEN/JA_KANRI_SHITEN は自JA。支店軸: JA_KANRI_SHITEN は自
 * kanri_shiten_id のみ、CHUOKAI/JA_HONTEN は自JA全支店。
 * レコード返却前に必ずチェック。インライン実装の乱立を防ぐ共通ヘルパー。
 * Forbidden でなく NotFound なのは意図的 — 403 は行の存在を漏らすため範囲外を
 * 「見つからない」でマスクする。
 */

/**
 * `NotFoundException`（DomainException 派生）を返し、GlobalExceptionFilter が
 * `{ error_code: 'NOT_FOUND', message }` を出す＋spec が instanceof で一致。
 * メッセージ `指定された{resource}が見つかりません。` は factory が label から生成。
 */
function scopeNotFound(label?: string): NotFoundException {
  return new NotFoundException(label);
}

/**
 * BIGINT id（pg は string で返すが TypeORM 型は number）を number に正規化し
 * `===`/`!==` を安全に。生比較だと `"5" !== 5` でクロススコープガードが誤発火。
 * null/undefined → null。
 */
function numericId(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  return typeof value === 'number' ? value : Number(value);
}

/* ─────────────── Single-record assertions (after fetch) ─────────────── */

/**
 * 操作者の JA スコープ != record.jaId なら NotFound。NICHINO_*（session.ja_id
 * == null）は bypass。JA単位リソース（m_ja, m_dokusya, m_hanbaiten,
 * m_kanri_shiten, m_oshirase, m_account 等）用。label は '購読者' 等（省略時は汎用文）。
 */
export function assertJaScope(
  recordJaId: number | null | undefined,
  session: SessionPayload,
  resourceLabel?: string,
): void {
  if (session.ja_id == null) return; // 無制限ロール
  if (numericId(recordJaId) !== numericId(session.ja_id)) {
    throw scopeNotFound(resourceLabel);
  }
}

/**
 * 範囲外なら NotFound。JA_KANRI_SHITEN は kanri_shiten_id、CHUOKAI/JA_HONTEN は
 * ja_id で判定、NICHINO_* 無制限。支店ユーザーには支店単位・HQ には JA 単位で
 * 分割されるリソース（t_dokusya, t_log, t_login_log 等）用。
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
  const mismatch =
    session.role_code === RoleCode.JA_KANRI_SHITEN
      ? numericId(recordKanriShitenId) !== numericId(session.kanri_shiten_id)
      : numericId(recordJaId) !== numericId(session.ja_id);
  if (mismatch) {
    throw scopeNotFound(resourceLabel);
  }
}

/**
 * {@link assertBranchScope} と同じだが NotFound(404) でなく
 * `DataScopeViolationException`(403)。id が URL 由来でない場合用 — 呼び出し側が
 * 供給した候補行の一括処理（ACSMS-SCR-015 置換候補, ACSMS-SCR-016 取込既存行）。存在は既知で
 * 404マスク不要、顧客決定（2026-05-19, security.md Layer 4）で明示 403。
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
 * {@link assertBranchScopeViolation} の JA単位版 — 403 を投げる。全 restricted
 * ロール（JA_KANRI_SHITEN 含む）を ja_id で判定。自身の kanri_shiten_id を持たない
 * JA単位リソース用（ACSMS-SCR-015 の m_hanbaiten 置換対象、存在確認済み）。NICHINO_* bypass。
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

/* ─────────── 所属支店スコープ（3層目・顧客要件 2026-07） ────────────────── */
// session.shiten_id 設定時、購読者(t_dokusya)の参照・編集・追加をその支店に限定
// （管理支店スコープの下位に絞り込む）。null のときは no-op。assertBranchScope /
// applyBranchScope と併用する。

/** assert 版（URL の :id 由来 → 存在マスクのため 404）。 */
export function assertShitenScope(
  recordShitenId: number | null | undefined,
  session: SessionPayload,
  resourceLabel?: string,
): void {
  if (session.shiten_id == null) return;
  if (numericId(recordShitenId) !== numericId(session.shiten_id)) {
    throw scopeNotFound(resourceLabel);
  }
}

/** assert 版（呼び出し側が供給した id → 明示 403。取込・置換の候補行用）。 */
export function assertShitenScopeViolation(
  recordShitenId: number | null | undefined,
  session: SessionPayload,
): void {
  if (session.shiten_id == null) return;
  if (numericId(recordShitenId) !== numericId(session.shiten_id)) {
    throw new DataScopeViolationException();
  }
}

/* ─────────────── Query-builder helpers (for list queries) ───────────── */

/**
 * SelectQueryBuilder に JA スコープの `WHERE` を付与。NICHINO_* は no-op。
 * alias に join エイリアスも指定可（例 `applyJaScope(qb, 'h', 'jaId', session)`）。
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
 * 支店対応版。JA_KANRI_SHITEN は kanriShitenIdField、他 restricted ロールは
 * jaIdField で絞込、NICHINO_* 無制限。
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
 * 所属支店スコープ（QB 版・顧客要件 2026-07）。session.shiten_id 設定時のみ
 * `WHERE alias.shitenIdField = session.shiten_id` を付与、null なら no-op。
 * applyBranchScope と併用し購読者一覧を支店単位へ絞り込む。
 */
export function applyShitenScope<T extends object>(
  qb: SelectQueryBuilder<T>,
  alias: string,
  shitenIdField: string,
  session: SessionPayload,
): void {
  if (session.shiten_id == null) return;
  qb.andWhere(`${alias}.${shitenIdField} = :scopeShitenId`, {
    scopeShitenId: session.shiten_id,
  });
}

/**
 * `ja_id` と `kanri_shiten_id` が別エイリアスにある稀なケース用（例: ja_id は主テーブル、
 * kanri_shiten_id は JOIN した m_account 側）。利用例 `LogService.findAll/
 * exportLogCsv` — `t_log.ja_id`(l) と `m_account.kanri_shiten_id`(a)。
 * 各辺が `{ alias, field }` を持つ以外は applyBranchScope と同一。同一エイリアスなら
 * 単純な applyBranchScope を使う。
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
 * FK 親行を id で取得し、存在＋（任意で）指定 JA 所属を要求。CREATE/UPDATE の body に
 * 他テナント行を指す FK id を偽装できる場合の Layer 4（FK 参照スコープ）ガード。
 *
 * expectedJaId: null → スコープ無検査（NICHINO_* が任意 JA を許容、または呼び出し側が
 * 実効 ja_id 解決済みで存在＋soft-delete のみ）。number → 親 ja_id が一致必須。
 *
 * 2つの miss を区別: 行不在/不正 id → BadRequest `'<resource>IDが存在しません。'`;
 * 存在するが別テナント → DATA_SCOPE_VIOLATION(403)。
 * 顧客決定（2026-05-19）: テナントid列挙を許すが監査＋UXのため 400マスクより明示 403。
 * Layer 2 は URL が id を名指すため 404 マスク維持だが、body の FK id は呼び出し側が
 * 既に供給しているため 403 でも追加の漏洩なし。
 *
 * @example
 *   // shiten.service.ts (CHUOKAI — 自JA限定)
 *   await fetchFkInJa(repo, 'kanriShitenId', dto.kanri_shiten_id, session.ja_id, '管理支店');
 *   // hanbaiten.service.ts (実効 ja_id は事前解決: session.ja_id か NICHINO_STAFF 代行の dto.ja_id)
 *   await fetchFkInJa(repo, 'tankaId', dto.haitatsuryo_tanka_id, effectiveJaId, '配達手数料単価');
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
  // jaId フィルタ無しで存在確認 →「不在(400)」と「別テナント(403)」を区別。
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
