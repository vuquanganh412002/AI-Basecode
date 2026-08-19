import { DokusyaRireki } from '@/database/entities/dokusya-rireki.entity';

/**
 * bitemporal 履歴ライター (dokusya-history.*) 用の定数。
 * docs/dokusya-rireki-common-functions.md §3 参照。
 */

/**
 * bitemporal チェーンの ORDER BY。`[式, 方向]` タプルを
 * `.orderBy(...).addOrderBy(...)` で適用する。「現在／実効」行は最大の
 * `(joho, rireki_no)`。
 *
 * 注意: 両列を単一の `.orderBy('a DESC, b DESC')` にまとめないこと。TypeORM は
 * 文字列全体を1式とみなしデフォルト方向を付与し、不正な `... DESC, b DESC ASC`
 * を吐く。
 */
export const SORT_CHAIN_DESC: ReadonlyArray<readonly [string, 'DESC']> = [
  ['r.joho_henko_tekiyo_date', 'DESC'],
  ['r.rireki_no', 'DESC'],
];
export const SORT_CHAIN_ASC: ReadonlyArray<readonly [string, 'ASC']> = [
  ['r.joho_henko_tekiyo_date', 'ASC'],
  ['r.rireki_no', 'ASC'],
];

/**
 * 住所に依存しない「常に増減報告対象」な項目。これらが更新前後で変われば
 * `zougen_hokoku_flg = true`。住所は配達先の実効値で別途判定する（下記）。
 */
export const ZOUGEN_TRIGGER_FIELDS = [
  'dokusyaBusu',
  'hanbaitenId',
] as const satisfies readonly (keyof DokusyaRireki)[];

/**
 * 配達先が「配達先同一(haitatsu_same_flg=true)」のときの実効配達先住所＝購読者住所。
 */
export const KODOKU_ADDRESS_FIELDS = [
  'yubinNo',
  'todofukenCode',
  'shikuchoson',
  'chomeBanchi',
  'tatemonoMei',
] as const satisfies readonly (keyof DokusyaRireki)[];

/**
 * 配達先が「別住所(haitatsu_same_flg=false)」のときの実効配達先住所＝配達先住所。
 */
export const HAITATSU_ADDRESS_FIELDS = [
  'haitatsuYubinNo',
  'haitatsuTodofukenCode',
  'haitatsuShikuchoson',
  'haitatsuChomeBanchi',
  'haitatsuTatemonoMei',
] as const satisfies readonly (keyof DokusyaRireki)[];

/**
 * 住所 zenkai 列。{@link KODOKU_ADDRESS_FIELDS} / {@link HAITATSU_ADDRESS_FIELDS}
 * と同じ並び（郵便番号・都道府県・市町村郡・丁目番地・建物名）。`fillZenkai` が
 * 「実効配達先住所」を書き込む際にインデックス整合で参照する（顧客要件 2026-07）。
 */
export const ZENKAI_ADDRESS_ZCOLS = [
  'zenkaiYubinNo',
  'zenkaiTodofukenCode',
  'zenkaiShikuchoson',
  'zenkaiChomeBanchi',
  'zenkaiTatemonoMei',
] as const satisfies readonly (keyof DokusyaRireki)[];

/**
 * 配達先が「配達先同一(haitatsu_same_flg=true)」のときの実効連絡先・氏名
 * ＝購読者本人の連絡先・氏名。`DokusyaFormView.vue` §9 は住所5列と合わせて
 * この6列も同時にクリアする対象としており、UI上は住所と不可分の
 * 「配達先ブロック」として扱われる。zenkai_* 列は存在しない（住所5列のみ
 * 前回値追跡の対象）ため、キャリーフォワード判定自体は
 * {@link ZENKAI_ADDRESS_ZCOLS} を代理指標として流用する（バグ報告 2026-08）。
 */
export const KODOKU_CONTACT_FIELDS = [
  'renrakusaki1',
  'renrakusaki2',
  'shimeiSei',
  'shimeiMei',
  'shimeiKanaSei',
  'shimeiKanaMei',
] as const satisfies readonly (keyof DokusyaRireki)[];

/**
 * 配達先が「別住所(haitatsu_same_flg=false)」のときの実効連絡先・氏名
 * ＝配達先の連絡先・氏名。{@link KODOKU_CONTACT_FIELDS} 参照。
 */
export const HAITATSU_CONTACT_FIELDS = [
  'haitatsuRenrakusaki1',
  'haitatsuRenrakusaki2',
  'haitatsuShimeiSei',
  'haitatsuShimeiMei',
  'haitatsuShimeiKanaSei',
  'haitatsuShimeiKanaMei',
] as const satisfies readonly (keyof DokusyaRireki)[];

/**
 * 業務項目 → その `zenkai_*`（前回値）列。全行に設定され、増減連絡票／
 * 増減通知が現在値と前回値を差分表示できるようにする。
 */
export const ZENKAI_FIELD_MAP = {
  hanbaitenId: 'zenkaiHanbaitenId',
  dokusyaBusu: 'zenkaiDokusyaBusu',
  yubinNo: 'zenkaiYubinNo',
  todofukenCode: 'zenkaiTodofukenCode',
  shikuchoson: 'zenkaiShikuchoson',
  chomeBanchi: 'zenkaiChomeBanchi',
  tatemonoMei: 'zenkaiTatemonoMei',
} as const satisfies Partial<Record<keyof DokusyaRireki, keyof DokusyaRireki>>;

/**
 * 実効行から master (`t_dokusya`) を再計算 (`mapRirekiToMaster`) する際に
 * コピーしない rireki 列。それ以外の共通列は全てコピー（フル再計算）。分類:
 *  - master に無い rireki 専用列（PK・`zenkai_*`・履歴フラグ）
 *  - master 側の値を維持する共通列 (`created_at/by`)・更新キー (`dokusya_id`)
 * 注意: rireki 専用列を追加したら同期すること。
 */
export const MASTER_EXCLUDE_FIELDS = [
  'dokusyaRirekiId',
  'saishinDataFlg',
  'zougenHokokuFlg',
  'shinkiFlg',
  'kaiyakuFlg',
  'torikeshiFlg',
  'hanbaitenTohaigoFlg',
  'zenkaiHanbaitenId',
  'zenkaiDokusyaBusu',
  'zenkaiYubinNo',
  'zenkaiTodofukenCode',
  'zenkaiShikuchoson',
  'zenkaiChomeBanchi',
  'zenkaiTatemonoMei',
  'createdAt',
  'createdBy',
  'dokusyaId',
] as const satisfies readonly (keyof DokusyaRireki)[];

/**
 * master (`t_dokusya`) 側が所有し、履歴からは**絶対にコピーしない**列。
 *
 * `MASTER_EXCLUDE_FIELDS` と分けているのは型が違うため。あちらは
 * `keyof DokusyaRireki` に制約されているので、「DB の t_dokusya_rireki には列が
 * あるが DokusyaRireki エンティティが宣言していない」列を書けない。まさに
 * `denshi_kaiin_id` がそれで、電子版同期バッチが master へ直接書く一方 rireki 側は
 * 常に NULL。
 *
 * これまでこの列を守っていたのは「エンティティが宣言していないので
 * `Object.entries()` に現れない」という偶然だけだった。将来 rireki エンティティに
 * この列を足した瞬間、毎晩 NULL で上書きされて電子版の会員紐付けが消える
 * （UI からは復旧できない）。偶然ではなく明示で守る。
 */
export const MASTER_CLOUD_OWNED_FIELDS = ['denshiKaiinId'] as const;

/**
 * 変更検出 (diffChangedFields) で「業務変更」として数えないフィールド。
 * これらが `values` に含まれていても差分に出さない：
 *  - johoHenkoTekiyoDate: 適用日（＝いつ適用するか）であって業務項目の変更では
 *    ない。applyChange には別引数 johoDate で渡り、行の joho は buildRirekiRow が
 *    event.joho から設定する。値に残すと「master の旧 joho ≠ 今回 joho」で毎回
 *    変更扱いになり、余計な情報履歴行が生まれる（顧客要件 2026-07 バグ修正）。
 *  - rireki_no / 監査列 / 識別子: 業務値ではない。
 */
export const DIFF_EXCLUDE_FIELDS = [
  'johoHenkoTekiyoDate',
  'rirekiNo',
  'updatedBy',
  'updatedAt',
  'createdBy',
  'createdAt',
  'dokusyaRirekiId',
  'dokusyaId',
] as const;

