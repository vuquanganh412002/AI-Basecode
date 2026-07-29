import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * `t_dokusya`（購読者マスタ）エンティティ。
 * `docs/database/database-design.md §t_dokusya` に準拠。
 *
 * タイムスタンプ列は全て TIMESTAMPTZ（JST 運用 — `.claude/rules/nestjs.md
 * §Timestamp policy`）。
 *
 * 日付のみ列（`shoki_dokusya_kaishi_date`・`dokusya_kaishi_date`・
 * `dokusya_chushi_date`・`joho_henko_tekiyo_date`）は ISO `YYYY-MM-DD`
 * 文字列として扱う（spec・結合テストが Date でなく文字列で比較するため）。
 * `seikyu_kaishi_month` は `YYYYMM` トークンなので varchar(6)。
 *
 * `rireki_no` はマスタ行の現行履歴番号。UPDATE 時に `MAX(rireki_no)+1` へ
 * 更新し、新しい `t_dokusya_rireki` 行へも写すことで、マスタが常に最新の
 * 履歴スナップショットを指す。
 */
@Entity('t_dokusya')
@Index('IX_t_dokusya_ja_id', ['jaId'])
@Index('IX_t_dokusya_kanri_shiten_id', ['kanriShitenId'])
@Index('IX_t_dokusya_hanbaiten_id', ['hanbaitenId'])
@Index('IX_t_dokusya_email', ['jaId', 'email'])
@Index('IX_t_dokusya_deleted_at', ['deletedAt'])
// 電子版会員IDは全レコードで一意（NULL・削除済みは対象外の部分 UNIQUE）。
@Index('UQ_t_dokusya_denshi_kaiin_id', ['denshiKaiinId'], {
  unique: true,
  where: 'denshi_kaiin_id IS NOT NULL AND deleted_at IS NULL',
})
export class Dokusya {
  @PrimaryGeneratedColumn({ name: 'dokusya_id', type: 'bigint' })
  dokusyaId: number;

  @Column({ name: 'ja_id', type: 'bigint' })
  jaId: number;

  @Column({ name: 'kanri_shiten_id', type: 'bigint', nullable: true })
  kanriShitenId: number | null;

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

  // 日付のみ列 — pg-mem は DATE 経由で Date を正しく往復できない場合がある。
  // varchar(10) 保存で YYYY-MM-DD 契約を SQL 上で grep 可能にし、api.md の
  // レスポンス形状に完全一致させる（TIMESTAMP キャストによる TZ 混乱を回避）。
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

  @Column({ name: 'rireki_no', type: 'int', default: 1 })
  rirekiNo: number;

  @Column({ name: 'denshi_shonin_status', type: 'int', nullable: true })
  denshiShoninStatus: number | null;

  /**
   * 電子版会員ID — 外部（電子版読者管理）システムの会員ID。本システムでは
   * 直接入力せず、後続で開発する外部連携機能が設定する。NULL許容。
   * 全レコードで重複不可（外部会員IDと 1:1）— 部分 UNIQUE 制約は
   * UQ_t_dokusya_denshi_kaiin_id（denshi_kaiin_id IS NOT NULL かつ
   * 未削除行のみ）で担保する。
   */
  @Column({ name: 'denshi_kaiin_id', type: 'bigint', nullable: true })
  denshiKaiinId: number | null;

  /**
   * 本紙購読フラグ。電子版読者管理システムの `users.subscribe_flg`
   * (0:未購読, 1:購読) を連携（0→FALSE, 1→TRUE）。購読種別=電子版のときのみ
   * 画面に「紙版購読状況有り」と表示する。DEFAULT FALSE。
   */
  @Column({ name: 'honshi_kodoku_flg', type: 'boolean', default: false })
  honshiKodokuFlg: boolean;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Column({ name: 'created_by', type: 'varchar', length: 50, default: 'SYSTEM' })
  createdBy: string;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @Column({ name: 'updated_by', type: 'varchar', length: 50, default: 'SYSTEM' })
  updatedBy: string;
}
