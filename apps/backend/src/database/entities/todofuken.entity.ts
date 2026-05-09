import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('m_todofuken')
export class Todofuken {
  @PrimaryColumn({ name: 'todofuken_code', type: 'varchar', length: 2 })
  todofukenCode: string;

  @Column({ name: 'todofuken_name', type: 'varchar', length: 10 })
  todofukenName: string;

  @Column({ name: 'todofuken_name_kana', type: 'varchar', length: 20 })
  todofukenNameKana: string;
}
