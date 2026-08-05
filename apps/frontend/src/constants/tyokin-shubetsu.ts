/**
 * 貯金種目 (`jastem_tyokin_shubetsu`) — JASTEM / 全銀フォーマットで固定の3値。
 *
 * **m_code ではない。** `m_code` の `YOKIN_SHUBETSU` は 1=普通 / 2=当座 の2件で、
 * 全銀レコードが要求する 9=その他 を持たない。この項目が入るのは JASTEM 連携
 * ファイルの「預金種目」1桁欄で、値もラベルも先方フォーマット仕様で決まる
 * （顧客が DB から増減できる類ではない）ため、ここに定数として持つ。
 *
 * SCR-007（支店マスタ）と SCR-020（口座振替データ作成）が同じ項目を扱う。
 * 以前は両画面がそれぞれ配列を持ち、ラベルが「普通貯金」/「1（普通）」と
 * 食い違っていたので、ここへ集約した。表記は SCR-020 画面設計書
 * （項目定義 No.14 「1=普通貯金, 2=当座貯金, 9=その他」）に合わせる。
 */
export interface TyokinShubetsuOption {
  value: string;
  label: string;
}

/** 全銀「預金種目」欄で受理される値のみ。入力チェックにも使う。 */
export const TYOKIN_SHUBETSU_RE = /^[129]$/;

export const TYOKIN_SHUBETSU_OPTIONS: TyokinShubetsuOption[] = [
  { value: '1', label: '普通貯金' },
  { value: '2', label: '当座貯金' },
  { value: '9', label: 'その他' },
];

/** 保存値 → 表示ラベル。未知値は空文字（呼び出し側で '—' などに寄せる）。 */
export function tyokinShubetsuLabel(value: string | null | undefined): string {
  if (!value) return '';
  return TYOKIN_SHUBETSU_OPTIONS.find((o) => o.value === value)?.label ?? '';
}
