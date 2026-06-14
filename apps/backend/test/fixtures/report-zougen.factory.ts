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
    hanbaiten_id: 200,
    hanbaiten_code: 'H001',
    hanbaiten_name: '千代田販売店',
    kanri_shiten_id: 20,
    kanri_shiten_name: 'JA東京中央 本店管理支店',
    kanri_shiten_tel: '03-1234-5678',
    kanri_shiten_fax: '03-1234-5679',
    // 部数（増減判定）
    dokusya_busu: 2,
    zenkai_dokusya_busu: 1,
    // 氏名 / 配達先氏名
    shimei_sei: '農業',
    shimei_mei: '太郎',
    haitatsu_shimei_sei: '農業',
    haitatsu_shimei_mei: '太郎',
    haitatsu_renrakusaki_1: '03-1111-2222',
    // 現配達先住所（td_now + haitatsu_*）
    now_todofuken_name: '東京都',
    haitatsu_shikuchoson: '千代田区',
    haitatsu_chome_banchi: '神田1-1-1',
    haitatsu_tatemono_mei: '神田ビル101',
    // 前回配達先住所（td_zen + zenkai_*）— デフォルトは現住所と同一（住所変更なし）
    zen_todofuken_name: '東京都',
    zenkai_shikuchoson: '千代田区',
    zenkai_chome_banchi: '神田1-1-1',
    zenkai_tatemono_mei: '神田ビル101',
    biko: '',
    ...overrides,
  };
}
