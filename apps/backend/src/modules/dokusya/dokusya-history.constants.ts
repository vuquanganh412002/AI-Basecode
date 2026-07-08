import { DokusyaRireki } from '@/database/entities/dokusya-rireki.entity';

/**
 * Constants for the bitemporal history writer (dokusya-history.*).
 * See docs/dokusya-rireki-common-functions.md §3.
 */

/**
 * ORDER BY for the bitemporal chain, as `[expression, direction]` tuples
 * applied via `.orderBy(...).addOrderBy(...)`. The "current / effective"
 * row is the greatest `(joho, rireki_no)`.
 *
 * NOTE: never fold both columns into a single `.orderBy('a DESC, b DESC')`
 * string — TypeORM treats the whole string as one expression and appends
 * its default direction, emitting the invalid `... DESC, b DESC ASC`.
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
 * `zougen_hokoku_flg = true` when a row changes any of these business
 * fields (entity property names) vs its predecessor. `satisfies` ties
 * the list to the entity so a renamed column fails the build.
 */
export const ZOUGEN_TRIGGER_FIELDS = [
  'dokusyaBusu',
  'hanbaitenId',
  'yubinNo',
  'todofukenCode',
  'shikuchoson',
  'chomeBanchi',
  'tatemonoMei',
] as const satisfies readonly (keyof DokusyaRireki)[];

/**
 * Business field -> its `zenkai_*` (previous-value) counterpart. Filled
 * on every row so 増減連絡票 / 増減通知 can diff current vs previous.
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
 * The field whose change opens a separate hanbaiten event and sets
 * `hanbaiten_tekiyo_date`.
 */
export const HANBAITEN_FIELD = 'hanbaitenId' as const;

/**
 * Rireki columns NOT copied into `t_dokusya` when recomputing the master
 * from the effective row (`mapRirekiToMaster`). Everything else common to
 * both entities is copied (full recompute). Groups:
 *  - rireki-only columns absent on master (PK, `zenkai_*`, history flags,
 *    `hanbaiten_tekiyo_date`, `henko_riyu`);
 *  - common columns the master keeps its own (`created_at/by`) or that are
 *    the update key (`dokusya_id`).
 * NOTE: keep in sync when adding a rireki-only column.
 */
export const MASTER_EXCLUDE_FIELDS = [
  'dokusyaRirekiId',
  'hanbaitenTekiyoDate',
  'henkoRiyu',
  'saishinDataFlg',
  'zougenHokokuFlg',
  'shinkiFlg',
  'kaiyakuFlg',
  'torikeshiFlg',
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

/**
 * `henko_riyu` label written on 取消 (赤伝) rows — the operation type, not the
 * reason. The cancellation REASON goes into `biko` (顧客要件). Kept as a
 * constant so the target row's flag update and the counter row agree.
 */
export const TORIKESHI_HENKO_RIYU = '取消';
