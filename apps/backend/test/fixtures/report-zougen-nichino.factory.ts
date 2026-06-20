// Screen: ACSMS-SCR-029 — 増減通知（日本農業新聞）出力画面
//
// Fixtures for the 増減通知（日本農業新聞）report endpoints.
//   - buildZougenNichinoQuery(...)   → ZougenNichinoQueryDto-shaped input
//   - buildZougenNichinoRemark(...)  → one { kanri_shiten_id, biko } remark
//   - buildZougenNichinoRawRow(...)  → one flat getRawMany() row (joined columns)
//
// The service runs a single QueryBuilder over t_dokusya_rireki, groups the
// raw rows by 管理支店 (管理支店コード昇順), and computes per-row
// genzai/zou/gen/shin/itaku_label/diff_mark. These fixtures produce the flat
// row shape (snake_case, joined names) the service consumes BEFORE grouping.

let seq = 0;
const nextId = () => ++seq;

/** Valid query/body (tekiyo_date + optional kanri_shiten_id[] + remarks[]). */
export function buildZougenNichinoQuery(overrides: Record<string, unknown> = {}) {
  return {
    tekiyo_date: '2026-03-01',
    kanri_shiten_id: [20],
    ...overrides,
  } as any;
}

/** One 管理支店ごとの備考 entry for the export body's `remarks` array. */
export function buildZougenNichinoRemark(overrides: Record<string, unknown> = {}) {
  return {
    kanri_shiten_id: 20,
    biko: '3月度分の増減通知です。',
    ...overrides,
  } as any;
}

/**
 * One flat row as returned by `getRawMany()`. Defaults to a 減部 record
 * (dokusya_busu 9 < genzai 10 → gen 1), itaku_kubun=2 (日農委託 → 委託),
 * torihikisaki_no non-empty (＝適格請求書発行事業者番号あり → not 免税).
 *
 * Override `dokusya_busu` / `zenkai_dokusya_busu` for 増/減, `itaku_kubun`
 * for the 委託欄, `torihikisaki_no:''` for the （免）prefix, and
 * `kanri_shiten_id` / `kanri_shiten_code` to split rows across reports.
 */
export function buildZougenNichinoRawRow(overrides: Record<string, unknown> = {}) {
  const id = nextId();
  return {
    dokusya_rireki_id: 6000 + id,
    hanbaiten_id: 200,
    hanbaiten_code: '12345678',
    hanbaiten_name: 'A販売店',
    itaku_kubun: 2, // 2:日農委託 → itaku_label '委託'
    torihikisaki_no: 'T1234567890123', // 非空 → 免税ではない
    kanri_shiten_id: 20,
    kanri_shiten_code: '1AA3300001', // 10桁（帳票で 3-4-3 ハイフン区切り表示）
    kanri_shiten_name: '本店管理支店',
    kanri_shiten_tel: '03-1234-5678',
    kanri_shiten_fax: '03-1234-5679',
    todofuken_name: '東京都',
    ja_name: 'JA東京中央',
    tanto_busho: '業務部',
    tanto_name: '農協 太郎',
    // 部数（増減判定）— デフォルトは 減部（genzai 10 → shin 9）
    dokusya_busu: 9,
    zenkai_dokusya_busu: 10,
    // 氏名 / 住所（after_value に混入してはならないことの検証用）
    shimei_sei: '農業',
    shimei_mei: '太郎',
    haitatsu_shikuchoson: '千代田区',
    haitatsu_chome_banchi: '神田1-1-1',
    ...overrides,
  };
}
