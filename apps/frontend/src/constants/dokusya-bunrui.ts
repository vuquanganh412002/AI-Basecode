/**
 * 読者属性 (dokusyaso_bunrui) / 主な生産物 (nogyosya_bunrui) のコード定義。
 *
 * DB には**電子版システムと同じコード値**をカンマ区切りで保存する
 * （dokusyaso_bunrui ⇔ profession / nogyosya_bunrui ⇔ products が 1:1）。
 * 日本語ラベルは画面表示専用 — ラベルを保存しない（顧客要件 2026-07）。
 * BE ミラー: `apps/backend/src/common/constants/dokusya-bunrui.constant.ts`。
 *
 * m_code ではなく定数で持つ理由: 値の集合が電子版 API の仕様
 * (create_パラメータ仕様 職業／農畜産物) で固定されており、顧客が
 * DB から増やせる類の分類ではないため。
 */

/** 読者属性コード。 */
export const DokusyaSoBunrui = {
  NOGYOSYA: '0',
  JA_GROUP: '1',
  KIGYO_DANTAI: '2',
  GAKUSEI: '3',
  SONOTA: '999',
} as const;
export type DokusyaSoBunrui =
  (typeof DokusyaSoBunrui)[keyof typeof DokusyaSoBunrui];

/** 主な生産物コード（酪農=5 は画面に選択肢が無いが電子版連携で入りうる）。 */
export const NogyosyaBunrui = {
  KOME: '0',
  YASAI: '1',
  KAJITSU: '2',
  HANA: '3',
  CHIKUSAN: '4',
  RAKUNO: '5',
  SONOTA: '999',
} as const;
export type NogyosyaBunrui =
  (typeof NogyosyaBunrui)[keyof typeof NogyosyaBunrui];

/** 読者属性 コード→ラベル（表示専用）。 */
export const DOKUSYASO_BUNRUI_LABELS: Record<string, string> = {
  [DokusyaSoBunrui.NOGYOSYA]: '農業者',
  [DokusyaSoBunrui.JA_GROUP]: 'JAグループ役職員',
  [DokusyaSoBunrui.KIGYO_DANTAI]: '企業・団体',
  [DokusyaSoBunrui.GAKUSEI]: '学生',
  [DokusyaSoBunrui.SONOTA]: 'その他',
};

/** 主な生産物 コード→ラベル（表示専用）。 */
export const NOGYOSYA_BUNRUI_LABELS: Record<string, string> = {
  [NogyosyaBunrui.KOME]: '米',
  [NogyosyaBunrui.YASAI]: '野菜',
  [NogyosyaBunrui.KAJITSU]: '果実',
  [NogyosyaBunrui.HANA]: '花',
  [NogyosyaBunrui.CHIKUSAN]: '畜産',
  [NogyosyaBunrui.RAKUNO]: '酪農',
  [NogyosyaBunrui.SONOTA]: 'その他',
};

/** 読者属性 選択肢（画面 mockup index.html の並び順）。 */
export const DOKUSYASO_BUNRUI_OPTIONS = [
  { value: DokusyaSoBunrui.NOGYOSYA, label: '農業者' },
  { value: DokusyaSoBunrui.KIGYO_DANTAI, label: '企業・団体' },
  { value: DokusyaSoBunrui.SONOTA, label: 'その他' },
  { value: DokusyaSoBunrui.JA_GROUP, label: 'JAグループ役職員' },
  { value: DokusyaSoBunrui.GAKUSEI, label: '学生' },
];

/** 主な生産物 選択肢（画面 mockup index.html の並び順・酪農は選択不可）。 */
export const NOGYOSYA_BUNRUI_OPTIONS = [
  { value: NogyosyaBunrui.KOME, label: '米' },
  { value: NogyosyaBunrui.YASAI, label: '野菜' },
  { value: NogyosyaBunrui.KAJITSU, label: '果実' },
  { value: NogyosyaBunrui.HANA, label: '花' },
  { value: NogyosyaBunrui.CHIKUSAN, label: '畜産' },
  { value: NogyosyaBunrui.SONOTA, label: 'その他' },
];

/** CSV 文字列をトークン配列へ（空要素は除去）。 */
export function splitBunruiCsv(csv: string | null | undefined): string[] {
  return (csv ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * CSV コード列 → 「農業者, 学生」形式のラベル列（一覧・履歴の表示用）。
 * 未知コードはそのまま残す（電子版側の新コードを取りこぼさないため）。
 */
function labelCsv(csv: string | null | undefined, table: Record<string, string>): string {
  return splitBunruiCsv(csv)
    .map((c) => table[c] ?? c)
    .join('、');
}

/** 読者属性 CSV → 表示ラベル。 */
export function dokusyaSoBunruiLabel(csv: string | null | undefined): string {
  return labelCsv(csv, DOKUSYASO_BUNRUI_LABELS);
}

/** 主な生産物 CSV → 表示ラベル。 */
export function nogyosyaBunruiLabel(csv: string | null | undefined): string {
  return labelCsv(csv, NOGYOSYA_BUNRUI_LABELS);
}
