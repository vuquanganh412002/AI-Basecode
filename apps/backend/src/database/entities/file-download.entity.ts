import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

/**
 * `t_file_download` — ダウンロード成功ごとに1行記録。ACSMS-SCR-022 §4.5 は監査ログ
 * （`t_log`）と同一トランザクションで INSERT し、ダウンロード履歴と監査証跡を
 * 原子的にコミットする。
 *
 * NULL許容（`docs/database/database-design.md`）:
 *   - ja_id                        NOT NULL (NICHINO_* + global file writes NULL)
 *   - target_month                 nullable
 *   - created_at                   nullable
 *   - scheduled_delete_date        nullable（削除予定日）
 *   - nichino_download_allowed_flg NOT NULL / DEFAULT FALSE（日農DL許可）
 *   - deleted_at                   nullable（論理削除）
 */
@Entity('t_file_download')
@Index('IX_t_file_download_ja_datetime', ['jaId', 'downloadDatetime'])
export class FileDownload {
  @PrimaryGeneratedColumn({ name: 'file_download_id', type: 'bigint' })
  fileDownloadId: number;

  // スキーマ上は NOT NULL だが、api.md §4.5 脚注により NICHINO_* + 全体向け
  // ファイル（ja_id IS NULL）は NULL 書き込みを許容。TypeORM が INSERT を
  // 拒否しないよう nullable にする。
  @Column({ name: 'ja_id', type: 'bigint', nullable: true })
  jaId: number | null;

  @Column({ name: 'download_datetime', type: 'timestamptz' })
  downloadDatetime: Date;

  @Column({ name: 'download_type', type: 'int' })
  downloadType: number;

  @Column({ name: 'scheduled_delete_date', type: 'timestamptz', nullable: true })
  scheduledDeleteDate: Date | null;

  // 日農（NICHINO_*）にダウンロードを許可するか。NOT NULL / DEFAULT FALSE。
  @Column({ name: 'nichino_download_allowed_flg', type: 'boolean', default: false })
  nichinoDownloadAllowedFlg: boolean;

  @Column({ name: 'file_name', type: 'varchar', length: 255 })
  fileName: string;

  @Column({ name: 'file_path', type: 'varchar', length: 500 })
  filePath: string;

  @Column({ name: 'file_size', type: 'int' })
  fileSize: number;

  @Column({ name: 'record_count', type: 'int' })
  recordCount: number;

  @Column({ name: 'target_month', type: 'varchar', length: 6, nullable: true, default: '' })
  targetMonth: string | null;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz', nullable: true })
  createdAt: Date;

  @Column({ name: 'created_by', type: 'varchar', length: 50 })
  createdBy: string;
}
