import { DokusyaRireki } from '@/database/entities/dokusya-rireki.entity';

import { Dokusya } from '@/database/entities/dokusya.entity';

import { TetsuzukiShurui } from '@/common/enums';
import {
  DIFF_EXCLUDE_FIELDS,
  HAITATSU_ADDRESS_FIELDS,
  KODOKU_ADDRESS_FIELDS,
  MASTER_CLOUD_OWNED_FIELDS,
  MASTER_EXCLUDE_FIELDS,
  ZENKAI_ADDRESS_ZCOLS,
  ZENKAI_FIELD_MAP,
  ZOUGEN_TRIGGER_FIELDS,
} from './dokusya-history.constants';
import { ChangeEvent, DateOnly, DokusyaFields } from './dokusya-history.types';

const MASTER_EXCLUDE = new Set<string>([
  ...MASTER_EXCLUDE_FIELDS,
  ...MASTER_CLOUD_OWNED_FIELDS,
]);
const DIFF_EXCLUDE = new Set<string>(DIFF_EXCLUDE_FIELDS);

/**
 * bitemporal 履歴ライタの純 builder 関数（DI/DB なし）— 単体テスト可。
 * docs/dokusya-rireki-common-functions.md §5.2。
 */

/**
 * 変更された業務項目リスト（DokusyaRireki プロパティ camelCase キー）。CREATE(`!before`)は
 * `values` の全キーを変更扱い；それ以外は直前行の値と異なる(strict `!==`)キーが変更。
 */
export function diffChangedFields(
  before: DokusyaRireki | Dokusya | null,
  values: DokusyaFields,
): string[] {
  const cur = values as Record<string, unknown>;
  // 適用日・識別子・監査列は業務変更でないので差分対象から除外
  // （johoHenkoTekiyoDate は毎回異なり、残すと余計な情報履歴行が生まれる）。
  const keys = Object.keys(cur).filter((k) => !DIFF_EXCLUDE.has(k));
  if (!before) return keys;
  const prev = before as unknown as Record<string, unknown>;
  return keys.filter((k) => !fieldValuesEqual(cur[k], prev[k]));
}

/**
 * 変更検出用の値等価判定。strict equality に加え、number/string 境界で数値的に等しい
 * 値も等価扱いする — TypeORM は bigint 列(hanbaiten_id, kanri_shiten_id, shiten_id,
 * tanka_id)を STRING で返すが code 側 `values` は number なので、strict `!==` だと不変な
 * FK を変更と誤判定(履歴行が分割)してしまう。boolean は coerce せず、非数値文字列
 * (コード/日付/氏名)は strict にフォールバック。
 */
function fieldValuesEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a == null || b == null) return false;
  // number/string 境界のみ比較; boolean/object → strict。
  const numericLike = (x: unknown): x is number | string =>
    typeof x === 'number' || typeof x === 'string';
  if (!numericLike(a) || !numericLike(b)) return false;
  const sa = String(a).trim();
  const sb = String(b).trim();
  if (sa === '' || sb === '') return false;
  const na = Number(sa);
  const nb = Number(sb);
  if (!Number.isNaN(na) && !Number.isNaN(nb)) return na === nb;
  return false;
}

/**
 * `row` の zenkai_*(前回値)列を `before` の対応業務項目({@link ZENKAI_FIELD_MAP})から埋める。
 * 欠損/undefined は null（最初の履歴行 → 全て null）。row を in-place で変更。
 */
export function fillZenkai(
  row: DokusyaRireki,
  before: DokusyaRireki | null,
): void {
  const r = row as unknown as Record<string, unknown>;
  const b = before as unknown as Record<string, unknown> | null;
  // 非住所 zenkai は直接コピー。
  r.zenkaiHanbaitenId = b?.hanbaitenId ?? null;
  r.zenkaiDokusyaBusu = b?.dokusyaBusu ?? null;
  // 住所 zenkai は before の実効配達先住所を格納（顧客要件2026-07）:
  //   before.haitatsu_same_flg=TRUE  → 購読者住所 (KODOKU_ADDRESS_FIELDS)
  //   before.haitatsu_same_flg=FALSE → 配達先住所 (HAITATSU_ADDRESS_FIELDS)
  // 増減連絡票/増減通知の前回住所=前回の実効配達先住所。report 側 zenkaiAddrField は
  // zenkai_X があればそれを信頼するため書込み側で実効値を入れる。first row(before=null)は全て null。
  const srcAddr =
    b?.haitatsuSameFlg === false ? HAITATSU_ADDRESS_FIELDS : KODOKU_ADDRESS_FIELDS;
  ZENKAI_ADDRESS_ZCOLS.forEach((zcol, i) => {
    r[zcol] = b?.[srcAddr[i]] ?? null;
  });
}

/**
 * `zougen_hokoku_flg`: CREATE は true、それ以外は配達に影響する変更で true（顧客要件）:
 *  - 購読部数/販売店（{@link ZOUGEN_TRIGGER_FIELDS}）変更、または
 *  - 配達先同一フラグ(haitatsu_same_flg)の切替、または
 *  - 実効配達先住所の変更。実効配達先住所は haitatsu_same_flg=TRUE なら購読者住所
 *    ({@link KODOKU_ADDRESS_FIELDS})、FALSE なら配達先住所({@link HAITATSU_ADDRESS_FIELDS})。
 * これで「別住所(haitatsu_same_flg=false)を入力して配達先を変えた」ケースも増減報告対象に
 * （顧客要件・従来は購読者住所しか見ず取りこぼしていた）。氏名/電話/口座等のみの変更は false。
 * 配達先同一時に購読者住所を触っても実効配達先が変われば TRUE、変わらなければ FALSE。
 */
export function computeZougen(
  row: DokusyaRireki,
  before: DokusyaRireki | null,
): boolean {
  if (!before) return true;
  const r = row as unknown as Record<string, unknown>;
  const b = before as unknown as Record<string, unknown>;
  // 購読部数 / 販売店。
  if (ZOUGEN_TRIGGER_FIELDS.some((f) => r[f] !== b[f])) return true;
  // 配達先同一フラグの切替＝配達先変更。
  if (r.haitatsuSameFlg !== b.haitatsuSameFlg) return true;
  // 実効配達先住所の変更。同一フラグは更新後(row)の値で判定。
  const addressFields = r.haitatsuSameFlg
    ? KODOKU_ADDRESS_FIELDS
    : HAITATSU_ADDRESS_FIELDS;
  return addressFields.some((f) => r[f] !== b[f]);
}

/** `values` を `keys` に限定した部分集合（順序保持）。 */
function pick(values: DokusyaFields, keys: string[]): DokusyaFields {
  const src = values as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const k of keys) out[k] = src[k];
  return out;
}

/**
 * 変更を書込む行へ分割する。
 *
 * 顧客要件2026-07: 販売店適用日(hanbaiten_tekiyo_date)を廃止し、適用日を読者情報変更適用日
 * (joho_henko_tekiyo_date)に一本化。UI編集・Excel取込・一括置換の全てで 1更新1レコード
 * （変更を適用日で分割しない）。販売店変更も joho で適用（＝販売店適用日は joho と同一だった）。
 *
 * - CREATE → 全変更を1件。
 * - UPDATE → 全変更を単一の適用日(johoDate)で1件。
 */
export function splitEvents(
  mode: 'CREATE' | 'UPDATE',
  changed: string[],
  values: DokusyaFields,
  johoDate: DateOnly,
): ChangeEvent[] {
  if (changed.length === 0) return [];
  return [
    {
      joho: johoDate,
      values: pick(values, changed),
    },
  ];
}

/** 構築中の行のメタ（識別子 + 監査）。 */
export interface BuildRowContext {
  dokusyaId: number;
  rirekiNo: number;
  actor: string;
}

/**
 * 単一 event の履歴行を1件構築する。
 *
 * `before`(CREATE は空)から状態を carry-forward し、event の変更項目を適用、`before` から
 * zenkai_* を埋め、フラグを設定。`saishin_data_flg` はここでは false のまま — recomputeMaster
 * が所有（不変条件: `t_dokusya ⇔ saishin=TRUE`）。識別子列(dokusya_rireki_id, created_at)は
 * クリアし INSERT させる。docs/dokusya-rireki-common-functions.md §5.2。
 */
export function buildRirekiRow(
  before: DokusyaRireki | null,
  event: ChangeEvent,
  ctx: BuildRowContext,
): DokusyaRireki {
  const row = (before ? { ...before } : {}) as unknown as Record<string, unknown>;
  // 新規識別子 — before の PK/created_at は再利用しない（さもないと UPDATE になる）。
  delete row.dokusyaRirekiId;
  delete row.createdAt;

  // carry-forward 状態 + 本 event の変更。
  Object.assign(row, event.values);

  // 識別子 + 適用日 + 監査。
  row.dokusyaId = ctx.dokusyaId;
  row.rirekiNo = ctx.rirekiNo;
  row.johoHenkoTekiyoDate = event.joho;
  row.createdBy = ctx.actor;

  const built = row as unknown as DokusyaRireki;
  fillZenkai(built, before);

  // フラグ。saishin_data_flg は false のまま → recomputeMaster が設定。
  row.shinkiFlg = !before;
  row.zougenHokokuFlg = computeZougen(built, before);
  row.kaiyakuFlg = false;
  row.torikeshiFlg = false;
  row.saishinDataFlg = false;

  return built;
}

/**
 * 有効 rireki 行 → t_dokusya へ書込む列へマップ。両エンティティ共通の列を全てコピー
 * （{@link MASTER_EXCLUDE_FIELDS}＝rireki 専用列や master 独自列 は除く）。rireki_no は
 * 有効履歴行へのポインタとしてコピー；tetsuzuki_shurui は解約状態を伝播。
 */
export function mapRirekiToMaster(rireki: DokusyaRireki): Partial<Dokusya> {
  const src = rireki as unknown as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(src)) {
    if (!MASTER_EXCLUDE.has(k)) out[k] = v;
  }
  return out;
}

/** 解約行のメタ（batch 到来日 or UI 解約予約）。 */
export interface KaiyakuRowContext {
  dokusyaId: number;
  rirekiNo: number;
  /** 適用日: 紙版=中止日, 電子版=中止日+1（caller が計算）。 */
  kaiyakuJoho: DateOnly;
  /** 行に記録する解約予定日(購読中止日)（電子版では joho と異なりうる）。 */
  chushiDate: DateOnly;
  /** 行作成者。UI 解約予約=account_id; 到来日バッチ='batch'(既定)。 */
  createdBy?: string;
}

/**
 * 直前有効行 `before` から 解約行 を構築。`before` の業務状態を継承しつつ解約形へ強制:
 * tetsuzuki_shurui=0 + kaiyaku_flg=true + dokusya_busu=0（解約は部数なし）+
 * zougen_hokoku_flg=true（解約は必ず減の増減報告対象）+ saishin_data_flg=false
 * （未来予約 — 到来日バッチが recomputeMaster で t_dokusya へ反映）。解約日を
 * dokusya_chushi_date に記録、zenkai_* を before から埋める。§4.3。
 */
export function buildKaiyakuRow(
  before: DokusyaRireki,
  ctx: KaiyakuRowContext,
): DokusyaRireki {
  const row = { ...before } as unknown as Record<string, unknown>;
  delete row.dokusyaRirekiId;
  delete row.createdAt;

  row.dokusyaId = ctx.dokusyaId;
  row.rirekiNo = ctx.rirekiNo;
  row.tetsuzukiShurui = TetsuzukiShurui.KAIYAKU;
  row.dokusyaBusu = 0; // 解約=部数なし
  row.dokusyaChushiDate = ctx.chushiDate;
  row.johoHenkoTekiyoDate = ctx.kaiyakuJoho;
  row.createdBy = ctx.createdBy ?? 'batch';

  const built = row as unknown as DokusyaRireki;
  fillZenkai(built, before);

  row.kaiyakuFlg = true;
  row.shinkiFlg = false;
  row.zougenHokokuFlg = true; // 解約は常に減の増減報告対象
  row.torikeshiFlg = false;
  row.saishinDataFlg = false;

  return built;
}

/** UI 解約予約行（Phase 1）のメタ。 */
export interface KaiyakuReservationContext {
  dokusyaId: number;
  rirekiNo: number;
  /** 解約予定日(購読中止日)。適用日(joho)にも同値を使う（未来）。 */
  chushiDate: DateOnly;
  createdBy: string;
}

/**
 * Phase 1（顧客要件2026-07・解約予約の2フェーズ化）: UI で購読中止日を入力した時点の
 * 予約行を build する。実際の解約確定（tetsuzuki=0・kaiyaku_flg=true・saishin 反映等）は
 * Phase 2 の到来日バッチ（insertKaiyaku）が別レコードで行う。
 *
 * 予約行が override するのは最小限のみ:
 *   - dokusya_busu = 0（予約: 部数0）
 *   - zougen_hokoku_flg = true（減の増減報告対象）
 *   - dokusya_chushi_date = 中止日（Phase 2 バッチのトリガ + 予約検出キー）
 *   - joho_henko_tekiyo_date = 中止日（未来 → 到来まで master 未反映）
 *   - kaiyaku_flg = false（バッチ確定まで解約確定でない = insertKaiyaku のトリガ条件 !kaiyaku_flg を満たす）
 *   - saishin_data_flg = false（未来予約）
 *   - shinki_flg = false / torikeshi_flg = false（before が新規でも予約は非新規・防御）
 * それ以外は before から継承。zenkai_* は before 由来（増減報告用）。
 *
 * 注: 電子版の「適用日=中止日+1」は Phase 2 バッチ（実解約行）で扱う。予約行の適用日は
 * 紙版/電子版とも中止日で統一（顧客決定）。
 */
export function buildKaiyakuReservationRow(
  before: DokusyaRireki,
  ctx: KaiyakuReservationContext,
): DokusyaRireki {
  const row = { ...before } as unknown as Record<string, unknown>;
  delete row.dokusyaRirekiId;
  delete row.createdAt;

  row.dokusyaId = ctx.dokusyaId;
  row.rirekiNo = ctx.rirekiNo;
  row.dokusyaBusu = 0; // 予約: 部数0
  row.dokusyaChushiDate = ctx.chushiDate;
  row.johoHenkoTekiyoDate = ctx.chushiDate; // 適用日=中止日（未来）
  row.createdBy = ctx.createdBy;

  const built = row as unknown as DokusyaRireki;
  fillZenkai(built, before); // zenkai_* = before の値（増減報告用）

  row.zougenHokokuFlg = true; // 減の増減報告対象
  row.saishinDataFlg = false; // 未来予約 → 未反映
  row.kaiyakuFlg = false; // 解約確定は Phase 2 バッチ
  row.shinkiFlg = false;
  row.torikeshiFlg = false;

  return built;
}

/**
 * 解約が反映済み(master が解約状態)の購読者の再購読行を構築。編集画面で 手続種類=新規 +
 * 新購読開始日を指定した再加入。`before` = tail(解約行) から状態継承しつつ再購読形へ:
 * tetsuzuki_shurui=1 + kaiyaku_flg=false + shinki_flg=true（DB設計: 解約→再購読も新規フラグ）+
 * dokusya_chushi_date=null + zougen=true（再加入=増）。初回購読開始日(shoki)は不変（before 値を維持）。
 * `values` は再購読後の新値（新購読開始日・部数など）。
 *
 * 履歴行は初回新規作成と同じ形にする（顧客要件2026-07）: zenkai_* は全て null
 * （前回値を継承しない＝新規作成 before=null 相当）。§5.2。
 */
export function buildResubscribeRow(
  before: DokusyaRireki,
  values: DokusyaFields,
  ctx: BuildRowContext,
  kaishiJoho: DateOnly,
): DokusyaRireki {
  const built = buildRirekiRow(before, { joho: kaishiJoho, values }, ctx);
  const r = built as unknown as Record<string, unknown>;
  r.tetsuzukiShurui = TetsuzukiShurui.SHINKI; // 購読中へ復帰
  r.kaiyakuFlg = false;
  r.shinkiFlg = true; // 解約→再購読 は新規フラグ (DB設計)
  r.dokusyaChushiDate = null;
  r.zougenHokokuFlg = true; // 再加入=増の増減報告対象
  r.shokiDokusyaKaishiDate = before.shokiDokusyaKaishiDate; // 初回は不変
  // zenkai_* は初回新規作成と同じく全て null（前回値を継承しない）。
  fillZenkai(built, null);
  return built;
}

/** 取消 打ち消し行のメタ。 */
export interface CounterRowContext {
  rirekiNo: number;
  actor: string;
  reason: string;
}

/**
 * 取消 の打ち消し行を構築。`target` をコピーし各追跡項目を zenkai_*(current↔previous)と
 * SWAP、行が target の変更を打ち消す；両行とも torikeshi_flg=true。
 *
 * G5: target が解約行(kaiyaku_flg=true)なら打ち消し行は 購読中 に復元
 * (tetsuzuki_shurui=1, kaiyaku_flg=false)、shoki_dokusya_kaishi_date は触らない。§5.2。
 */
export function buildCounterRow(
  target: DokusyaRireki,
  ctx: CounterRowContext,
): DokusyaRireki {
  const t = target as unknown as Record<string, unknown>;
  const row = { ...target } as unknown as Record<string, unknown>;
  delete row.dokusyaRirekiId;
  delete row.createdAt;

  // 反転: 打ち消し行の current = target の previous、previous = target の current。
  for (const [srcCol, zenkaiCol] of Object.entries(ZENKAI_FIELD_MAP)) {
    row[srcCol] = t[zenkaiCol];
    row[zenkaiCol] = t[srcCol];
  }

  row.rirekiNo = ctx.rirekiNo;
  row.johoHenkoTekiyoDate = target.johoHenkoTekiyoDate; // 適用日は同じ
  row.torikeshiFlg = true;
  row.saishinDataFlg = false;
  // 取消理由は備考(biko)に記録（顧客要件 — 対象行と打ち消し行の両方）。
  row.biko = ctx.reason;
  row.createdBy = ctx.actor;

  if (target.kaiyakuFlg) {
    row.tetsuzukiShurui = TetsuzukiShurui.SHINKI; // 購読中 に復元（shoki_dokusya_kaishi_date は不変）
    row.kaiyakuFlg = false;
  }

  return row as unknown as DokusyaRireki;
}
