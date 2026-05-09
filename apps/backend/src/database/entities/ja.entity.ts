import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('m_ja')
@Index('UQ_m_ja_code', ['jaCode'], { unique: true })
@Index('IX_m_ja_todofuken_code', ['todofukenCode'])
@Index('IX_m_ja_deleted_at', ['deletedAt'])
export class Ja {
  @PrimaryGeneratedColumn({ name: 'ja_id', type: 'bigint' })
  jaId: number;

  @Column({ name: 'ja_code', type: 'varchar', length: 10 })
  jaCode: string;

  @Column({ name: 'ja_name', type: 'varchar', length: 200 })
  jaName: string;

  @Column({ name: 'ja_name_kana', type: 'varchar', length: 200 })
  jaNameKana: string;

  @Column({ name: 'todofuken_code', type: 'varchar', length: 2 })
  todofukenCode: string;

  @Column({ name: 'yubin_no', type: 'varchar', length: 7 })
  yubinNo: string;

  @Column({ name: 'address', type: 'varchar', length: 200 })
  address: string;

  @Column({ name: 'tel', type: 'varchar', length: 15 })
  tel: string;

  @Column({ name: 'fax', type: 'varchar', length: 15 })
  fax: string;

  @Column({ name: 'email', type: 'varchar', length: 100 })
  email: string;

  @Column({ name: 'tanto_busho', type: 'varchar', length: 100 })
  tantoBusho: string;

  @Column({ name: 'tanto_name', type: 'varchar', length: 50 })
  tantoName: string;

  @Column({ name: 'bank_code', type: 'varchar', length: 4 })
  bankCode: string;

  @Column({ name: 'bank_name', type: 'varchar', length: 100 })
  bankName: string;

  @Column({ name: 'jastem_itakusha_code', type: 'varchar', length: 10, nullable: true })
  jastemItakushaCode: string | null;

  @Column({ name: 'jastem_itakusha_name', type: 'varchar', length: 40, nullable: true })
  jastemItakushaName: string | null;

  @Column({ name: 'jastem_ja_code', type: 'varchar', length: 4, nullable: true })
  jastemJaCode: string | null;

  @Column({ name: 'jastem_ja_name', type: 'varchar', length: 15, nullable: true })
  jastemJaName: string | null;

  @Column({
    name: 'jastem_toriatsukai_tenpo_code',
    type: 'varchar',
    length: 3,
    nullable: true,
  })
  jastemToriatsukaiTenpoCode: string | null;

  @Column({ name: 'jastem_tenpo_name', type: 'varchar', length: 15, nullable: true })
  jastemTenpoName: string | null;

  @Column({ name: 'jastem_tyokin_shubetsu', type: 'varchar', length: 1, nullable: true })
  jastemTyokinShubetsu: string | null;

  @Column({ name: 'jastem_koza_no', type: 'varchar', length: 7, nullable: true })
  jastemKozaNo: string | null;

  @Column({ name: 'chuokai_flg', type: 'boolean', default: false })
  chuokaiFlg: boolean;

  @Column({ name: 'zei_kubun', type: 'int' })
  zeiKubun: number;

  @Column({ name: 'biko', type: 'text', default: '' })
  biko: string;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Column({ name: 'created_by', type: 'varchar', length: 50 })
  createdBy: string;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @Column({ name: 'updated_by', type: 'varchar', length: 50 })
  updatedBy: string;
}
