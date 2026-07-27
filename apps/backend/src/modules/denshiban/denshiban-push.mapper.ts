import { DokusyaShubetsu } from '@/common/enums';
import type { Dokusya } from '@/database/entities/dokusya.entity';

/**
 * クラウド版 `t_dokusya`（履歴確定後の `after` スナップショット）→ 電子版 共通API
 * `updateUserInfo` の各 action_kbn パラメータへの変換（純ロジック・DI/DB なし）。
 *
 * これは pull 側 `dokusya-sync.mapper.ts` の逆変換。正典は
 * docs/demo/20260723_読者管理連携用API使用方法.xlsx。未確定の値対応（pref_id /
 * profession / products の具体コード）は pull 側と同じ identity 表を使い、
 * 顧客確定後は両ファイルを揃えて直す（docs/denshiban-push-implementation-plan.md §8）。
 *
 * 生成する payload は電子版デモ (denshiban-demo) の validators.js を必ず通す形にする:
 *   - jacd_execute / jacd  : 数字ちょうど10桁（管理支店コードのハイフン除去）
 *   - id                   : 数字（denshi_kaiin_id）
 *   - zip                  : 数字1〜7桁 / pref_id: 1〜47 / tel: 数字1〜13桁
 *   - first_kana/last_kana : ひらがな（クラウドのカナ項目はひらがなに統一済み）
 *   - subscribe_flg/melmaga: '0'|'1' / sex: '0'(女)|'1'(男)|'9'(回答しない)
 *   - profession           : codeList('0','1','2','3','999')（カンマ可）
 *   - products             : profession が '0' を含むときだけ送る（条件付き項目）
 */

// ─── 逆変換表（pull 側と対に保つ。§8 で顧客確定後に差し替え）─────────────

/** dokusyaso_bunrui(クラウド) → profession(電子版)。暫定 identity。 */
const BUNRUI_TO_PROFESSION: Record<string, string> = {
  '0': '0',
  '1': '1',
  '2': '2',
  '3': '3',
  '999': '999',
};

/** nogyosya_bunrui(クラウド) → products(電子版)。暫定 identity。 */
const BUNRUI_TO_PRODUCTS: Record<string, string> = {
  '0': '0',
  '1': '1',
  '2': '2',
  '3': '3',
  '4': '4',
  '5': '5',
  '999': '999',
};

// ─── 値ヘルパ ────────────────────────────────────────────────────────

/** 数字のみ抽出（ハイフン・空白等を除去）。 */
function digitsOnly(v: string | null | undefined): string {
  return (v ?? '').replace(/\D/g, '');
}

/** maxLen で切り詰め（改行は半角空白へ畳む — remarks は1行想定）。 */
function clamp(v: string | null | undefined, max: number): string {
  return (v ?? '').replace(/[\r\n]+/g, ' ').trim().slice(0, max);
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

/** gender(1男/2女/9回答しない) → sex(1男/0女/9回答しない)。 */
function genderToSex(gender: number | null | undefined): string {
  if (gender === 1) return '1'; // 男性
  if (gender === 2) return '0'; // 女性
  return '9'; // 回答しない / 未設定
}

/**
 * profession（購読者層分類の逆変換）。create は必須項目のため空なら '0'(農業者) を
 * 既定にする（電子版側の必須制約を満たすためのフォールバック・§8 で要確認）。
 */
function toProfession(bunrui: string | null | undefined): string {
  const mapped = mapCsvCodes(bunrui, BUNRUI_TO_PROFESSION);
  return mapped === '' ? '0' : mapped;
}

// ─── payload 構築 ────────────────────────────────────────────────────

/** create / update で共通の会員プロフィール項目ブロックを組み立てる。 */
function buildProfile(f: Dokusya): Record<string, string> {
  const profession = toProfession(f.dokusyasoBunrui);
  const payload: Record<string, string> = {
    first_name: clamp(f.shimeiSei, 255),
    last_name: clamp(f.shimeiMei, 255),
    first_kana: clamp(f.shimeiKanaSei, 255),
    last_kana: clamp(f.shimeiKanaMei, 255),
    zip: digitsOnly(f.yubinNo),
    pref_id: digitsOnly(f.todofukenCode),
    addr: clamp(f.shikuchoson, 255),
    city: clamp(f.chomeBanchi, 255),
    tel: digitsOnly(f.renrakusaki1),
    email: (f.email ?? '').trim(),
    subscribe_flg: f.honshiKodokuFlg ? '1' : '0',
    melmaga: String(f.mailMagazineFlg ?? 0) === '1' ? '1' : '0',
    profession,
  };

  const building = clamp(f.tatemonoMei, 255);
  if (building) payload.building = building;

  const remarks1 = clamp(f.biko, 255);
  if (remarks1) payload.remarks1 = remarks1;

  if (f.birthYear != null && /^\d{4}$/.test(String(f.birthYear))) {
    payload.birthyear = String(f.birthYear);
  }
  payload.sex = genderToSex(f.gender);

  // products は「profession が '0'(農業者) を含む」ときだけ許可される条件付き項目。
  // それ以外で送ると電子版が V29 を返すため、条件を満たすときのみ載せる。
  if (profession.split(',').includes('0')) {
    const products = mapCsvCodes(f.nogyosyaBunrui, BUNRUI_TO_PRODUCTS);
    if (products) payload.products = products;
  }

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

/** cancel パラメータ（解約）。cancel_ym は YYYYMM（解約対象月）。 */
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

/**
 * 併読/電子版の対象判定（種別だけの純チェック）。campaign 除外・source 除外は
 * push service 側（DB アクセスを伴う）で行う。
 */
export function isDenshiShubetsu(dokusyaShubetsu: number | null | undefined): boolean {
  return (
    dokusyaShubetsu === DokusyaShubetsu.DIGITAL ||
    dokusyaShubetsu === DokusyaShubetsu.BOTH
  );
}
