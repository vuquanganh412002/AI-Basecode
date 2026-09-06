/**
 * `dokusya.service.ts`（ACSMS-SCR-011 画面入力）と
 * `dokusya-import-validator.service.ts`（ACSMS-SCR-016 Excel取込）で共有する
 * バリデーションメッセージ。
 *
 * Excel取込は画面入力と同じ業務ルールを検証する必要があるため、文言が食い違うと
 * 「同じ項目なのに画面とExcelでエラー文言が違う」というユーザー向けの不整合に
 * なる。2ファイルが個別にハードコードしていたのを集約した（不具合修正2026-08）。
 */
export const DOKUSYA_BUSU_MIN_MESSAGE = '購読部数は1以上で入力してください。';
export const DOKUSYA_KAISHI_DATE_FUTURE_MESSAGE =
  '購読開始日は本日より後の日付を入力してください。';
export const DOKUSYA_CHUSHI_DATE_CURRENT_MONTH_MESSAGE =
  '購読中止日は当月以降の月を選択してください。';
