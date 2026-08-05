/**
 * システム処理が監査列（`created_by` / `updated_by`）へ書く実行者名。
 *
 * 画面操作は「誰が」を書く（現状は `String(session.account_id)`）。対して
 * スケジュール実行や外部連携には人が居ないので、「どの処理か」が分かる固定名を
 * 入れる。顧客要件 2026-08 で命名が確定した。
 *
 * 用途は監査だけではない。`t_dokusya_rireki` の最古行（`rireki_no = 1`）の
 * `created_by` を見て「クラウド版で作成された電子版読者」と「電子版から同期
 * された電子版読者」を判別する（両者とも `denshi_kaiin_id` を持つため、他に
 * 見分ける手掛かりが無い）。つまりこの値は表示用のラベルではなく判別キー。
 *
 * `SYSTEM_` 始まりに揃えるのは、一般ユーザのログインIDと衝突させないため。
 * アカウントマスタ側で同じ接頭辞のログインIDを登録できないようにする想定
 * （顧客要件 2026-08。DTO 側の制限は別途）。
 *
 * 値の長さに注意 — `m_account.login_id` が VARCHAR(20) なので、予約語として
 * 弾く前提なら 20 文字以内に収める必要がある。`SYSTEM_BATCH_NIGHTLY` は
 * ちょうど 20 文字で上限。
 */

/** システム実行者名の接頭辞。ログインIDの予約判定にも使う。 */
export const SYSTEM_ACTOR_PREFIX = 'SYSTEM_';

/**
 * 顧客確定済みのシステム実行者名。
 *
 * データ移行の初期取込（`SYSTEM_MIGRATION`）も顧客要件には挙がっているが、
 * 移行ツール自体がまだ無いので、実装が入るときに合わせて追加する。
 * 使われない定数を先に置くと「どこかで使われているはず」と誤読させるため。
 */
export const SystemActor = {
  /** 電子版 → クラウド版 差分同期（10分バッチ）。 */
  DENSHI_SYNC: 'SYSTEM_DENSHI_SYNC',
  /** 夜間バッチ（解約確定 + 情報変更反映）。 */
  BATCH_NIGHTLY: 'SYSTEM_BATCH_NIGHTLY',
} as const;
export type SystemActor = (typeof SystemActor)[keyof typeof SystemActor];

/**
 * システム用に予約済みのログインIDか（アカウント登録の禁止判定）。
 *
 * 禁止するのは 2 種類:
 *   - `SYSTEM` 単体 … シード migration が m_code / m_permissions 等の監査列に
 *     入れている値。実在のアカウントと衝突させない。
 *   - `SYSTEM_` 始まり … {@link SystemActor} の名前空間。将来 SYSTEM_MIGRATION 等が
 *     増えても、この関数を直さずに済むよう接頭辞で見る。
 *
 * **大文字小文字を区別しない**。`created_by` の突合自体は Postgres の既定で
 * case-sensitive なので `system_denshi_sync` は技術的には衝突しないが、監査列を
 * 目視で追う運用で紛らわしく、`m_account.login_id` の UNIQUE 制約も
 * case-sensitive（`Admin` と `admin` が共存できる）ため、紛れ込む余地を残さない。
 */
export function isReservedSystemLoginId(loginId: string): boolean {
  const upper = loginId.trim().toUpperCase();
  return upper === 'SYSTEM' || upper.startsWith(SYSTEM_ACTOR_PREFIX);
}
