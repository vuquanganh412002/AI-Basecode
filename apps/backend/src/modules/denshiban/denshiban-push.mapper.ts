import {
  DOKUSYASO_BUNRUI_CODES,
  DOKUSYASO_BUNRUI_NOGYOSYA,
  NOGYOSYA_BUNRUI_CODES,
  allowsDokusyasoBunruiSonota,
  allowsJaYakushokuinFlg,
  allowsNogyoKankeiFlg,
  allowsNogyosyaBunruiSonota,
} from '@/common/constants/dokusya-bunrui.constant';
import { GENDER_MALE, GENDER_FEMALE } from '@/common/constants/gender.constant';
import { MAIL_MAGAZINE_FLG_ON } from '@/common/constants/mail-magazine-flg.constant';
import type { Dokusya } from '@/database/entities/dokusya.entity';

/**
 * `t_dokusya`（after スナップショット）→ 電子版 updateUserInfo の各 action_kbn
 * パラメータへの変換（純ロジック・DI/DB なし）。pull 側 dokusya-sync.mapper の逆変換。
 * 未確定の値対応（pref_id/profession/products）は pull と同じ identity 表（plan §8）。
 *
 * 生成 payload は電子版デモの validators.js を通す形（jacd/id=数字、zip 1〜7桁、
 * pref_id 1〜47、tel 1〜13桁、kana=ひらがな、flg='0'|'1'、sex='0'女/'1'男/'9'、
 * profession=codeList、products は profession に '0' を含むときだけ）。
 */

// ─── 逆変換表（pull 側と対に保つ。§8 で顧客確定後に差し替え）─────────────
//
// `dokusyaso_bunrui` / `nogyosya_bunrui` は**電子版と同じコード値**で保存する
// （画面・pull バッチ・Excel 取込のいずれもコード。顧客要件 2026-07。日本語
// ラベルを保存していた旧データは一括変換済み — 変換用マイグレーションは適用
// 完了後に削除した）。
// よって変換は identity だが、未知値を落とすフィルタとして表を残す — 電子版が
// 受理しないコードをそのまま送ると create/update が V29 で弾かれるため。
//
// 対応表は顧客仕様書 create_パラメータ仕様シートの職業／農畜産物の定義に従う。

/** コード集合から identity 変換表を作る（未知値フィルタ用）。 */
function identityTable(codes: readonly string[]): Record<string, string> {
  return Object.fromEntries(codes.map((c) => [c, c]));
}

/** dokusyaso_bunrui(コード) → profession(電子版)。0農業者/1JA/2企業・団体/3学生/999その他。 */
const BUNRUI_TO_PROFESSION: Record<string, string> =
  identityTable(DOKUSYASO_BUNRUI_CODES);

/** nogyosya_bunrui(コード) → products(電子版)。0米/1野菜/2果実/3花/4畜産/5酪農/999その他。 */
const BUNRUI_TO_PRODUCTS: Record<string, string> =
  identityTable(NOGYOSYA_BUNRUI_CODES);

// ─── 値ヘルパ ────────────────────────────────────────────────────────

/** 電子版 API のテキスト項目の最大長（超過分は切り捨て）。 */
const MAX_TEXT_LEN = 255;

/** 数字のみ抽出（ハイフン・空白等を除去）。 */
function digitsOnly(v: string | null | undefined): string {
  return (v ?? '').replace(/\D/g, '');
}

/** maxLen で切り詰め（改行は半角空白へ畳む — 単一行を想定する項目用）。 */
function clamp(v: string | null | undefined, max: number): string {
  return (v ?? '').replace(/[\r\n]+/g, ' ').trim().slice(0, max);
}

/**
 * `t_dokusya.biko`（複数行）→ 電子版 remarks1〜5（顧客要件 2026-08）。
 *   1行目 → remarks1 ／ 2行目 → remarks2 ／ 3行目 → remarks3 ／ 4行目 → remarks4
 *   5行目以降 → remarks5（改行を保ったまとめ）
 *
 * pull 側 `dokusya-sync.mapper.ts#joinRemarks` が remarks1〜5 を `\n` で連結して
 * biko を作るので、その逆変換にあたる。5行目以降の改行を潰さないのはそのため —
 * 潰すと 電子版→cloud→電子版 と往復した時に行が失われる。
 *
 * `clamp` は使わない（あれは改行を空白へ畳むので、行の区切りが消えてこの分割の
 * 意味がなくなる）。各スロットは trim + 255文字で切り詰める。
 *
 * @returns 長さ5の配列（remarks1..remarks5 の順・値が無いスロットは空文字）
 */
function splitBikoToRemarks(biko: string | null | undefined): string[] {
  const lines = (biko ?? '').replace(/\r\n?/g, '\n').split('\n');
  return [
    lines[0] ?? '',
    lines[1] ?? '',
    lines[2] ?? '',
    lines[3] ?? '',
    lines.slice(4).join('\n'), // 5行目以降はまとめて remarks5
  ].map((s) => s.trim().slice(0, MAX_TEXT_LEN));
}

/** カンマ区切りコード列を逆変換表でマッピングして再結合（未知値は捨てる）。 */
function mapCsvCodes(raw: string | null | undefined, table: Record<string, string>): string {
  const s = (raw ?? '').trim();
  if (s === '') return '';
  return s
    .split(',')
    .map((c) => c.trim())
    .filter((c) => c !== '' && table[c] !== undefined)
    .map((c) => table[c])
    .join(',');
}

/** BOOLEAN 列 → 電子版の 1 桁フラグ（'0'|'1'）。 */
function boolToFlag(v: boolean | null | undefined): string {
  return v ? '1' : '0';
}

/** gender(1男/2女/9回答しない) → sex(1男/0女/9回答しない)。 */
function genderToSex(gender: number | null | undefined): string {
  if (gender === GENDER_MALE) return '1';
  if (gender === GENDER_FEMALE) return '0';
  return '9'; // 回答しない / 未設定
}

/**
 * profession（購読者層分類の逆変換）。create は必須項目だが、クラウド側が未分類
 * （空）の会員を電子版へ 0(農業者) と誤分類しないよう、空のときは 999(その他) を
 * 既定にする（「不明」に最も近い安全側の値・§8 で顧客に最終確認）。
 */
function toProfession(bunrui: string | null | undefined): string {
  const mapped = mapCsvCodes(bunrui, BUNRUI_TO_PROFESSION);
  return mapped === '' ? '999' : mapped;
}

// ─── payload 構築 ────────────────────────────────────────────────────

/** create / update で共通の会員プロフィール項目ブロックを組み立てる。 */
function buildProfile(f: Dokusya): Record<string, string> {
  const profession = toProfession(f.dokusyasoBunrui);
  const payload: Record<string, string> = {
    first_name: clamp(f.shimeiSei, MAX_TEXT_LEN),
    last_name: clamp(f.shimeiMei, MAX_TEXT_LEN),
    first_kana: clamp(f.shimeiKanaSei, MAX_TEXT_LEN),
    last_kana: clamp(f.shimeiKanaMei, MAX_TEXT_LEN),
    zip: digitsOnly(f.yubinNo),
    pref_id: digitsOnly(f.todofukenCode),
    addr: clamp(f.shikuchoson, MAX_TEXT_LEN),
    city: clamp(f.chomeBanchi, MAX_TEXT_LEN),
    tel: digitsOnly(f.renrakusaki1),
    email: (f.email ?? '').trim(),
    subscribe_flg: f.honshiKodokuFlg ? '1' : '0',
    melmaga: f.mailMagazineFlg === MAIL_MAGAZINE_FLG_ON ? '1' : '0',
    profession,
  };

  const building = clamp(f.tatemonoMei, MAX_TEXT_LEN);
  if (building) payload.building = building;

  // biko の各行を remarks1〜5 へ割り当てる。空スロットはキーごと落とす
  // （共通フロー「値が存在しないパラメータはキーを含めない」）。電子版の
  // isPresent は空文字をキー無しと同一視するので、送っても落としても同義。
  splitBikoToRemarks(f.biko).forEach((v, i) => {
    if (v) payload[`remarks${i + 1}`] = v;
  });

  if (f.birthYear != null && /^\d{4}$/.test(String(f.birthYear))) {
    payload.birthyear = String(f.birthYear);
  }
  payload.sex = genderToSex(f.gender);

  // products キーは常に載せる（顧客要件）。ただし値を持てるのは「profession が
  // '0'(農業者) を含む」ときだけの条件付き項目で、それ以外で値を送ると電子版が
  // V29 を返す — 該当しない／未選択なら '' を送る。電子版の isPresent は
  // 空文字を「キー無し」と同一視するため、'' なら形式チェックも条件チェックも
  // 発火しない。
  const products = profession.split(',').includes(DOKUSYASO_BUNRUI_NOGYOSYA)
    ? mapCsvCodes(f.nogyosyaBunrui, BUNRUI_TO_PRODUCTS)
    : '';
  payload.products = products;

  // 従属 4 項目（顧客DB設計 2026-08）。products と同じ条件付き項目で、親の分類が
  // 該当コードを含まないのに値を送ると V26〜V30 で create/update ごと弾かれる。
  //
  // 条件を満たすかは `profession` / `products`（＝**送信する値**）で判定する。
  // f.dokusyasoBunrui ではなく変換後を見るのは、toProfession が空を '999' へ
  // 既定化する・mapCsvCodes が未知コードを落とす、といった変換で送信値が入力値と
  // ズレうるため。電子版が実際に見るのは送信値なので、そちらに揃える。
  //
  // フラグは条件を満たすとき必ず 0/1 を送る（未チェック＝'0'）。'' で省略すると
  // 電子版側は「変更なし」と解釈して旧値が残り、チェックを外した操作が反映されない。
  payload.profession_and_ja = allowsJaYakushokuinFlg(profession)
    ? boolToFlag(f.jaYakushokuinFlg)
    : '';
  payload.profession_and_agri = allowsNogyoKankeiFlg(profession)
    ? boolToFlag(f.nogyoKankeiFlg)
    : '';
  // 自由記述は逆に、条件を満たしても未入力なら '' のまま（省略と同義）。
  payload.others_profession = allowsDokusyasoBunruiSonota(profession)
    ? clamp(f.dokusyasoBunruiSonota, MAX_TEXT_LEN)
    : '';
  payload.others_products = allowsNogyosyaBunruiSonota(products)
    ? clamp(f.nogyosyaBunruiSonota, MAX_TEXT_LEN)
    : '';

  return payload;
}

/**
 * create パラメータ。jacd_execute は新規会員の JA（＝管理支店コードのハイフン除去）。
 * payment_start は既定 '0'（本日開始）。
 */
export function toCreatePayload(
  f: Dokusya,
  jacdExecute: string,
): Record<string, string> {
  return {
    ...buildProfile(f),
    jacd_execute: jacdExecute,
    payment_start: '0',
  };
}

/** update パラメータ。id は電子版会員ID、notify_flg 既定 '0'（通知なし）。 */
export function toUpdatePayload(
  f: Dokusya,
  jacdExecute: string,
  denshiKaiinId: number,
): Record<string, string> {
  return {
    ...buildProfile(f),
    jacd_execute: jacdExecute,
    id: String(denshiKaiinId),
    notify_flg: '0',
  };
}

/** approve パラメータ（承認）。id + payment_start のみ。 */
export function toApprovePayload(
  jacdExecute: string,
  denshiKaiinId: number,
): Record<string, string> {
  return {
    jacd_execute: jacdExecute,
    id: String(denshiKaiinId),
    payment_start: '0',
  };
}

/**
 * unapprove パラメータ（非承認）。電子版仕様上、approve と同一シグネチャ
 * （id + payment_start）。payment_start は電子版側で検証のみされ永続化されない。
 */
export function toUnapprovePayload(
  jacdExecute: string,
  denshiKaiinId: number,
): Record<string, string> {
  return toApprovePayload(jacdExecute, denshiKaiinId);
}

/**
 * cancel パラメータ（解約）。cancel_ym は YYYYMM（解約対象月）。
 *
 * 発行元は SCR-014 購読者明細検索の「購読中止」（`DokusyaService.stop`）。
 * 到来日バッチからは push しない（顧客要件 2026-07 でバッチは自社クラウド内完結）。
 */
export function toCancelPayload(
  jacdExecute: string,
  denshiKaiinId: number,
  cancelYm: string,
): Record<string, string> {
  return {
    jacd_execute: jacdExecute,
    id: String(denshiKaiinId),
    notify_flg: '0',
    cancel_ym: cancelYm,
  };
}

