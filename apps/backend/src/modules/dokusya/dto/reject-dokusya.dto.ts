import { DenshiShoninEditDto } from './denshi-shonin-edit.dto';

/**
 * ACSMS-API-011-005 — 電子版否認のリクエストボディ。
 *
 * 否認画面でも支払方法 + 引落口座4項目を編集できる（#56524）。担当者が口座情報を
 * 直してから否認するケースがあり、入力を破棄すると次の申込・再審査でまた同じ
 * 誤りを手で直すことになるため、承認と同じ項目を受け取って保存する。
 *
 * 新聞単価は承認時だけの項目なので、こちらには載せない。
 */
export class RejectDokusyaDto extends DenshiShoninEditDto {}
