/**
 * CRUD成功レスポンス（`{ message: ... }`）の文言。`.claude/rules/nestjs.md`
 * §BE message convention（動詞のみ・主語なし・末尾「。」必須）の正規リテラルを
 * 集約する。
 *
 * それまでは12ファイル26箇所で `'登録しました。'` 等を直接ハードコードして
 * おり、コンパイル時チェックも無いのでコピペミス（句点抜け・主語混入）が
 * 起きても誰も気づけなかった。FE側は既に `useNotify().created()/.updated()/
 * .deleted()`（`.claude/rules/vue.md`）で集約済みなので、BE側もこれで揃える。
 *
 * `IMPORTED`（Excel取込成功）は ACSMS-SCR-016 / ACSMS-SCR-019 の2モジュールが
 * 個別にハードコードしていたのを追加集約（不具合修正2026-08）。
 *
 * 動詞だけでは意味が通らない画面固有の文言（ログアウト・承認・否認・取消等）
 * はこの対象外 — 個別にリテラルを書いてよい（nestjs.md の許容ケース）。
 */
export const SuccessMessage = {
  CREATED: '登録しました。',
  UPDATED: '更新しました。',
  DELETED: '削除しました。',
  IMPORTED: '取り込みました。',
} as const;
export type SuccessMessage = (typeof SuccessMessage)[keyof typeof SuccessMessage];
