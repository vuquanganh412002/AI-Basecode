import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

/**
 * `t_dokusya_rireki`（購読者履歴）エンティティ。
 * `docs/database/database-design.md §t_dokusya_rireki` に準拠。
 *
 * 購読者変更の正本（append-only）。有効時間 `joho_henko_tekiyo_date` と
 * トランザクション時間 `rireki_no` を持つバイテンポラル台帳で、`t_dokusya`
 * はこの表から再計算される派生スナップショット。
 *
 * 「現行（有効）」行（＝`t_dokusya` が写す `saishin_data_flg = TRUE` の行）は
 * 単純な最大 `rireki_no` ではない。`torikeshi_flg = false` の行のうち
 * `joho_henko_tekiyo_date <= today` で最大の日付（同着は最大 `rireki_no`）の行。
 * 未来日行は夜間バッチで有効化。中間挿入行（既存行の間・常に `>= today`）は
 * 直後行の `zenkai_*` 再計算が必要。
 * 詳細: `docs/dokusya-rireki-implementation-plan.md` §2, §2.1。
 *
 * `deleted_at` は持たない — 履歴行は挿入のみ。親の論理削除は履歴に波及させない
 * （監査証跡を残すため）。訂正は物理削除せず `torikeshi_flg`（赤伝）で行う。
 */
@Entity('t_dokusya_rireki')
@Index('IX_t_dokusya_rireki_dokusya_id', ['dokusyaId'])
@Index('IX_t_dokusya_rireki_ja_id', ['jaId'])
@Index('IX_t_dokusya_rireki_saishin', ['dokusyaId', 'saishinDataFlg'])
// バイテンポラル連鎖検索: dokusya 単位で (joho_henko_tekiyo_date, rireki_no)
// 順に findBefore / findNext / 現行読込を行う。
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

  /**
   * 購読者層分類（単一選択）。m_code.code_category='DOKUSYASO_BUNRUI'。
   * 0:農業者 1:JAグループ役職員 2:企業・団体 3:学生 999:その他。※空文字許容
   */
  @Column({ name: 'dokusyaso_bunrui', type: 'varchar', length: 50, default: '' })
  dokusyasoBunrui: string;

  /**
   * かつJAグループ役職員フラグ。購読者層分類＝農業者のときのみ TRUE を設定可。
   * 電子版読者管理システムの `users.profession_and_ja`（0/1）を連携。
   */
  @Column({ name: 'ja_yakushokuin_flg', type: 'boolean', default: false })
  jaYakushokuinFlg: boolean;

  /**
   * 農業関係フラグ。購読者層分類＝企業・団体のときのみ TRUE を設定可。
   * 電子版読者管理システムの `users.profession_and_agri`（0/1）を連携。
   */
  @Column({ name: 'nogyo_kankei_flg', type: 'boolean', default: false })
  nogyoKankeiFlg: boolean;

  /**
   * 購読者層分類その他（自由記述）。購読者層分類＝その他のときのみ入力可。
   * 電子版読者管理システムの `users.others_profession`（255文字以下）を連携。※空文字許容
   */
  @Column({ name: 'dokusyaso_bunrui_sonota', type: 'varchar', length: 255, default: '' })
  dokusyasoBunruiSonota: string;

  /**
   * 農業者分類（複数カンマ区切り）。m_code.code_category='NOGYOSYA_BUNRUI'。
   * 0:米 1:野菜 2:果実 3:花 4:畜産 5:酪農 999:その他。※空文字許容
   */
  @Column({ name: 'nogyosya_bunrui', type: 'varchar', length: 50, default: '' })
  nogyosyaBunrui: string;

  /**
   * 農業者分類その他（自由記述）。農業者分類に「その他」を含むときのみ入力可。
   * 電子版読者管理システムの `users.others_products`（255文字以下）を連携。※空文字許容
   */
  @Column({ name: 'nogyosya_bunrui_sonota', type: 'varchar', length: 255, default: '' })
  nogyosyaBunruiSonota: string;

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

  // ─── 履歴専用メタ列 ─────────────────────────────────────────────────
  /** この dokusya の現行スナップショット行で TRUE。 */
  @Column({ name: 'saishin_data_flg', type: 'boolean', default: false })
  saishinDataFlg: boolean;

  /** このスナップショットの増減連絡票を生成済みか。 */
  @Column({ name: 'zougen_hokoku_flg', type: 'boolean', default: true })
  zougenHokokuFlg: boolean;

  /** CREATE 時 tetsuzuki_shurui=1（新規）で TRUE。 */
  @Column({ name: 'shinki_flg', type: 'boolean', default: false })
  shinkiFlg: boolean;

  /** tetsuzuki_shurui=0（解約）で TRUE。 */
  @Column({ name: 'kaiyaku_flg', type: 'boolean', default: false })
  kaiyakuFlg: boolean;

  /**
   * 取消レコード（赤伝）。履歴情報画面の取消処理で無効化された行で TRUE
   * （誤り行と反転行の両方が持つ）。torikeshi_flg=true の行は取消時点の値で
   * 凍結され、全抽出（saishin/zenkai 再計算・カスケード・帳票[増減連絡票・
   * 増減通知・購読者名簿]・検索・現行表示）から除外される。監査証跡としてのみ
   * 保持し、物理削除しない。
   */
  @Column({ name: 'torikeshi_flg', type: 'boolean', default: false })
  torikeshiFlg: boolean;

  // ─── 前回スナップショット列（増減連絡票で使用） ────────────────────
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

  /** 履歴行時点の承認／却下ステータスのスナップショット。 */
  @Column({ name: 'denshi_shonin_status', type: 'int', nullable: true })
  denshiShoninStatus: number | null;

  /**
   * 本紙購読フラグのスナップショット。電子版読者管理システムの
   * `users.subscribe_flg` (0:未購読, 1:購読) を連携（0→FALSE, 1→TRUE）。
   * t_dokusya と同じ値を履歴行にも保持する。DEFAULT FALSE。
   */
  @Column({ name: 'honshi_kodoku_flg', type: 'boolean', default: false })
  honshiKodokuFlg: boolean;

  // 販売店適用日 (hanbaiten_tekiyo_date) は廃止（顧客要件 2026-07）。適用日は
  // 読者情報変更適用日 (joho_henko_tekiyo_date) に一本化した。

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Column({ name: 'created_by', type: 'varchar', length: 50, default: 'SYSTEM' })
  createdBy: string;
}
