/**
 * `m_todofuken` に存在しない都道府県コードを弾く際のエラーメッセージ。
 *
 * ja.service.ts（ACSMS-SCR-005）と kanri-shiten.service.ts（ACSMS-SCR-009）が
 * 無関係なモジュールでありながら `throw new BadRequestException('...')` に
 * 同一の日本語リテラルを個別にハードコードしていた（不具合修正2026-08）。
 */
export const TODOFUKEN_CODE_NOT_FOUND_MESSAGE = '都道府県コードが存在しません。';
