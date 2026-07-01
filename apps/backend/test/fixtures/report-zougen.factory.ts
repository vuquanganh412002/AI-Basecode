// Screen: ACSMS-SCR-028 — 増減連絡票（販売店）出力画面
//
// Fixtures for the 増減連絡票（販売店）report endpoints.
//   - buildZougenQuery(...)   → ZougenHanbaitenQueryDto-shaped input
//   - buildZougenRawRow(...)  → one flat getRawMany() row (joined columns)
//
// The service runs a single QueryBuilder over t_dokusya_rireki and groups
// the raw rows by 販売店+管理支店, classifying each into 増部 / 減部 / 住所変更.
// These fixtures produce the flat row shape (snake_case, joined names) the
// service consumes BEFORE grouping/classification.

let seq = 0;
const nextId = () => ++seq;

/** Valid query (tekiyo_date + optional id arrays). */
export function buildZougenQuery(overrides: Record<string, unknown> = {}) {
  return {
    tekiyo_date: '2026-05-01',
    hanbaiten_id: [200],
    kanri_shiten_id: [20],
    ...overrides,
  } as any;
}

/**
 * One flat row as returned by `getRawMany()`. Defaults to an 増部 record
 * (dokusya_busu 2 > zenkai 1, same address). Override `dokusya_busu` /
 * `zenkai_dokusya_busu` for 減部, or the `zenkai_*` address parts for 住所変更.
 */
export function buildZougenRawRow(overrides: Record<string, unknown> = {}) {
  const id = nextId();
  return {
    dokusya_rireki_id: 5000 + id,
    // 既定は購読者ごとに一意（1行=1購読者）。同日累計テストでは同じ値を渡す。
    dokusya_id: 7000 + id,
    hanbaiten_id: 200,
    hanbaiten_code: 'H001',
    hanbaiten_name: '千代田販売店',
    // 既定は前回販売店＝現販売店（販売店変更なし）。
    zenkai_hanbaiten_id: 200,
    zenkai_hanbaiten_code: 'H001',
    zenkai_hanbaiten_name: '千代田販売店',
    kanri_shiten_id: 20,
    kanri_shiten_name: 'JA東京中央 本店管理支店',
    kanri_shiten_tel: '03-1234-5678',
    kanri_shiten_fax: '03-1234-5679',
    // 部数（増減判定）
    dokusya_busu: 2,
    zenkai_dokusya_busu: 1,
    // 購読種別（既定=紙版1。電子版2は住所変更セクション対象外）
    dokusya_shubetsu: 1,
    // 氏名 / 配達先氏名
    shimei_sei: '農業',
    shimei_mei: '太郎',
    haitatsu_shimei_sei: '農業',
    haitatsu_shimei_mei: '太郎',
    // 電話番号列: haitatsu_same_flg=true → renrakusaki_1、false → haitatsu_renrakusaki_1。
    // 既定は配達先＝購読者本人なので両者同値。
    renrakusaki_1: '03-1111-2222',
    haitatsu_renrakusaki_1: '03-1111-2222',
    // 既定は配達先＝購読者本人（haitatsu_same_flg=true）→ 現住所は購読者住所を採用。
    haitatsu_same_flg: true,
    // 購読者住所（生）— now_* と整合（同日マージ + フィールド単位比較で参照）
    yubin_no: '1000001',
    todofuken_code: '13',
    shikuchoson: '千代田区',
    chome_banchi: '神田1-1-1',
    tatemono_mei: '神田ビル101',
    // 配達先住所（生）— 既定は購読者本人と同一（haitatsu_same_flg=true のため）
    haitatsu_yubin_no: '1000001',
    haitatsu_todofuken_code: '13',
    haitatsu_shikuchoson: '千代田区',
    haitatsu_chome_banchi: '神田1-1-1',
    haitatsu_tatemono_mei: '神田ビル101',
    // 前回住所（生）— 既定は現住所と同一（住所変更なし）
    zenkai_yubin_no: '1000001',
    zenkai_todofuken_code: '13',
    // 現住所（haitatsu_same_flg で 購読者/配達先 を選択。SQL 側で解決済みの値）
    now_todofuken_name: '東京都',
    now_shikuchoson: '千代田区',
    now_chome_banchi: '神田1-1-1',
    now_tatemono_mei: '神田ビル101',
    // 前回配達先住所（td_zen + zenkai_*）— デフォルトは現住所と同一（住所変更なし）
    zen_todofuken_name: '東京都',
    zenkai_shikuchoson: '千代田区',
    zenkai_chome_banchi: '神田1-1-1',
    zenkai_tatemono_mei: '神田ビル101',
    biko: '',
    ...overrides,
  };
}
