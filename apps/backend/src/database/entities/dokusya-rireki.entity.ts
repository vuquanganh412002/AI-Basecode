import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

/**
 * TypeORM entity for `t_dokusya_rireki` (購読者履歴).
 *
 * Mirrors `docs/database/database-design.md §t_dokusya_rireki`. This is
 * the append-only source of truth (正本) for subscriber changes — a
 * bitemporal ledger keyed by valid-time (`joho_henko_tekiyo_date`) and
 * transaction-time (`rireki_no`). `t_dokusya` is a derived snapshot
 * recomputed from this table.
 *
 * The "current / effective" row (which `t_dokusya` mirrors and which
 * carries `saishin_data_flg = TRUE`) is NOT simply the max `rireki_no`.
 * It is the row with the greatest `joho_henko_tekiyo_date` that is
 * `<= today` (ties broken by greatest `rireki_no`), among rows with
 * `torikeshi_flg = false`. Future-dated rows (`joho > today`) are held
 * until the nightly batch activates them; back-inserted rows (a new
 * `joho` between existing rows, always `>= today`) require recomputing
 * the immediately-following row's `zenkai_*`.
 * See `docs/dokusya-rireki-implementation-plan.md` §2, §2.1.
 *
 * No `deleted_at` — history rows are insert-only by design; soft-delete
 * on the parent does NOT cascade to history (the audit trail must
 * survive a logical delete). Corrections use `torikeshi_flg` (赤伝),
 * never physical delete.
 */
@Entity('t_dokusya_rireki')
@Index('IX_t_dokusya_rireki_dokusya_id', ['dokusyaId'])
@Index('IX_t_dokusya_rireki_ja_id', ['jaId'])
@Index('IX_t_dokusya_rireki_saishin', ['dokusyaId', 'saishinDataFlg'])
// Bitemporal chain lookup: findBefore / findNext / loadHienHanh order by
// (joho_henko_tekiyo_date, rireki_no) per dokusya.
@Index('IX_t_dokusya_rireki_chain', [
  'dokusyaId',
  'johoHenkoTekiyoDate',
  'rirekiNo',
])
export class DokusyaRireki {
  @PrimaryGeneratedColumn({ name: 'dokusya_rireki_id', type: 'bigint' })
  dokusyaRirekiId: number;

  @Column({ name: 'dokusya_id', type: 'bigint' })
  dokusyaId: number;

  @Column({ name: 'rireki_no', type: 'int' })
  rirekiNo: number;

  @Column({ name: 'ja_id', type: 'bigint' })
  jaId: number;

  @Column({ name: 'kanri_shiten_id', type: 'bigint' })
  kanriShitenId: number;

  @Column({ name: 'shiten_id', type: 'bigint', nullable: true })
  shitenId: number | null;

  @Column({ name: 'kumiaiin_code', type: 'varchar', length: 20, default: '' })
  kumiaiinCode: string;

  @Column({ name: 'dokusya_shubetsu', type: 'int' })
  dokusyaShubetsu: number;

  @Column({ name: 'tetsuzuki_shurui', type: 'int' })
  tetsuzukiShurui: number;

  @Column({ name: 'denshi_dokusya_shubetsu', type: 'int', nullable: true })
  denshiDokusyaShubetsu: number | null;

  @Column({ name: 'shimei_sei', type: 'varchar', length: 50 })
  shimeiSei: string;

  @Column({ name: 'shimei_mei', type: 'varchar', length: 50 })
  shimeiMei: string;

  @Column({ name: 'shimei_kana_sei', type: 'varchar', length: 100 })
  shimeiKanaSei: string;

  @Column({ name: 'shimei_kana_mei', type: 'varchar', length: 100 })
  shimeiKanaMei: string;

  @Column({ name: 'dokusya_busu', type: 'int', default: 0 })
  dokusyaBusu: number;

  @Column({ name: 'yubin_no', type: 'varchar', length: 7 })
  yubinNo: string;

  @Column({ name: 'todofuken_code', type: 'varchar', length: 2 })
  todofukenCode: string;

  @Column({ name: 'shikuchoson', type: 'varchar', length: 100 })
  shikuchoson: string;

  @Column({ name: 'chome_banchi', type: 'varchar', length: 100 })
  chomeBanchi: string;

  @Column({ name: 'tatemono_mei', type: 'varchar', length: 100, default: '' })
  tatemonoMei: string;

  @Column({ name: 'renrakusaki_1', type: 'varchar', length: 15 })
  renrakusaki1: string;

  @Column({ name: 'renrakusaki_2', type: 'varchar', length: 15, default: '' })
  renrakusaki2: string;

  @Column({ name: 'email', type: 'varchar', length: 100, default: '' })
  email: string;

  @Column({ name: 'mail_magazine_flg', type: 'int', default: 0, nullable: true })
  mailMagazineFlg: number | null;

  @Column({ name: 'birth_year', type: 'int', nullable: true })
  birthYear: number | null;

  @Column({ name: 'gender', type: 'int', nullable: true })
  gender: number | null;

  @Column({ name: 'haitatsu_same_flg', type: 'boolean', default: true })
  haitatsuSameFlg: boolean;

  @Column({ name: 'haitatsu_yubin_no', type: 'varchar', length: 7, default: '' })
  haitatsuYubinNo: string;

  @Column({
    name: 'haitatsu_todofuken_code',
    type: 'varchar',
    length: 2,
    default: '',
  })
  haitatsuTodofukenCode: string;

  @Column({
    name: 'haitatsu_shikuchoson',
    type: 'varchar',
    length: 100,
    default: '',
  })
  haitatsuShikuchoson: string;

  @Column({
    name: 'haitatsu_chome_banchi',
    type: 'varchar',
    length: 100,
    default: '',
  })
  haitatsuChomeBanchi: string;

  @Column({
    name: 'haitatsu_tatemono_mei',
    type: 'varchar',
    length: 100,
    default: '',
  })
  haitatsuTatemonoMei: string;

  @Column({
    name: 'haitatsu_renrakusaki_1',
    type: 'varchar',
    length: 15,
    default: '',
  })
  haitatsuRenrakusaki1: string;

  @Column({
    name: 'haitatsu_renrakusaki_2',
    type: 'varchar',
    length: 15,
    default: '',
  })
  haitatsuRenrakusaki2: string;

  @Column({ name: 'haitatsu_shimei_sei', type: 'varchar', length: 50, default: '' })
  haitatsuShimeiSei: string;

  @Column({ name: 'haitatsu_shimei_mei', type: 'varchar', length: 50, default: '' })
  haitatsuShimeiMei: string;

  @Column({
    name: 'haitatsu_shimei_kana_sei',
    type: 'varchar',
    length: 100,
    default: '',
  })
  haitatsuShimeiKanaSei: string;

  @Column({
    name: 'haitatsu_shimei_kana_mei',
    type: 'varchar',
    length: 100,
    default: '',
  })
  haitatsuShimeiKanaMei: string;

  @Column({ name: 'hanbaiten_id', type: 'bigint', nullable: true })
  hanbaitenId: number | null;

  @Column({ name: 'tanka_id', type: 'bigint', nullable: true })
  tankaId: number | null;

  @Column({ name: 'yubin_kubun', type: 'varchar', length: 1, default: '0' })
  yubinKubun: string;

  @Column({ name: 'shiharai_hoho', type: 'int' })
  shiharaiHoho: number;

  @Column({ name: 'dokusyaryo_shiharai_cycle', type: 'int', nullable: true })
  dokusyaryoShiharaiCycle: number | null;

  @Column({ name: 'bank_branch_code', type: 'varchar', length: 3, default: '' })
  bankBranchCode: string;

  @Column({ name: 'bank_branch_name', type: 'varchar', length: 100, default: '' })
  bankBranchName: string;

  @Column({ name: 'hikiotoshi_yokin_shubetsu', type: 'int', nullable: true })
  hikiotoshiYokinShubetsu: number | null;

  @Column({
    name: 'hikiotoshi_koza_no',
    type: 'varchar',
    length: 10,
    default: '',
  })
  hikiotoshiKozaNo: string;

  @Column({
    name: 'hikiotoshi_koza_meigi',
    type: 'varchar',
    length: 50,
    default: '',
  })
  hikiotoshiKozaMeigi: string;

  @Column({ name: 'dokusyaso_bunrui', type: 'varchar', length: 50, default: '' })
  dokusyasoBunrui: string;

  @Column({ name: 'nogyosya_bunrui', type: 'varchar', length: 50, default: '' })
  nogyosyaBunrui: string;

  @Column({
    name: 'shoki_dokusya_kaishi_date',
    type: 'varchar',
    length: 10,
    default: '',
  })
  shokiDokusyaKaishiDate: string;

  @Column({ name: 'dokusya_kaishi_date', type: 'varchar', length: 10 })
  dokusyaKaishiDate: string;

  @Column({
    name: 'dokusya_chushi_date',
    type: 'varchar',
    length: 10,
    nullable: true,
  })
  dokusyaChushiDate: string | null;

  @Column({
    name: 'joho_henko_tekiyo_date',
    type: 'varchar',
    length: 10,
    nullable: true,
  })
  johoHenkoTekiyoDate: string | null;

  @Column({ name: 'seikyu_kaishi_month', type: 'varchar', length: 6, default: '' })
  seikyuKaishiMonth: string;

  @Column({ name: 'biko', type: 'text', default: '' })
  biko: string;

  // ─── History-only metadata columns ──────────────────────────────────
  /** Reason / label for the change (api.md §4.4 ステップ2). */
  @Column({ name: 'henko_riyu', type: 'text', default: '' })
  henkoRiyu: string;

  /** TRUE on the row that is the current snapshot for this dokusya. */
  @Column({ name: 'saishin_data_flg', type: 'boolean', default: false })
  saishinDataFlg: boolean;

  /** Whether 増減連絡票 has been generated for this snapshot. */
  @Column({ name: 'zougen_hokoku_flg', type: 'boolean', default: true })
  zougenHokokuFlg: boolean;

  /** TRUE for CREATE flow when tetsuzuki_shurui=1 (新規). */
  @Column({ name: 'shinki_flg', type: 'boolean', default: false })
  shinkiFlg: boolean;

  /** TRUE when tetsuzuki_shurui=0 (解約). */
  @Column({ name: 'kaiyaku_flg', type: 'boolean', default: false })
  kaiyakuFlg: boolean;

  /**
   * TRUE (取消レコード / red-slip) when this row has been voided by the
   * 取消処理 on the 履歴情報 screen (both the wrong row and its reversing
   * row carry this flag). Rows with torikeshi_flg=true are FROZEN at
   * their cancel-time values and EXCLUDED from every extraction:
   * saishin/zenkai recompute, cascade, report queries (増減連絡票・
   * 増減通知・購読者名簿), search and current-state display. Kept only
   * as an audit trail — never physically deleted.
   */
  @Column({ name: 'torikeshi_flg', type: 'boolean', default: false })
  torikeshiFlg: boolean;

  // ─── Previous-snapshot columns (used by 増減連絡票) ──────────────────
  @Column({ name: 'zenkai_hanbaiten_id', type: 'bigint', nullable: true })
  zenkaiHanbaitenId: number | null;

  @Column({ name: 'zenkai_dokusya_busu', type: 'int', nullable: true })
  zenkaiDokusyaBusu: number | null;

  @Column({
    name: 'zenkai_yubin_no',
    type: 'varchar',
    length: 7,
    nullable: true,
  })
  zenkaiYubinNo: string | null;

  @Column({
    name: 'zenkai_todofuken_code',
    type: 'varchar',
    length: 2,
    nullable: true,
  })
  zenkaiTodofukenCode: string | null;

  @Column({
    name: 'zenkai_shikuchoson',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  zenkaiShikuchoson: string | null;

  @Column({
    name: 'zenkai_chome_banchi',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  zenkaiChomeBanchi: string | null;

  @Column({
    name: 'zenkai_tatemono_mei',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  zenkaiTatemonoMei: string | null;

  /** Approve/reject status snapshot at the moment of the history row. */
  @Column({ name: 'denshi_shonin_status', type: 'int', nullable: true })
  denshiShoninStatus: number | null;

  // 販売店適用日 (hanbaiten_tekiyo_date) は廃止（顧客要件 2026-07）。適用日は
  // 読者情報変更適用日 (joho_henko_tekiyo_date) に一本化した。

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Column({ name: 'created_by', type: 'varchar', length: 50, default: 'SYSTEM' })
  createdBy: string;
}
