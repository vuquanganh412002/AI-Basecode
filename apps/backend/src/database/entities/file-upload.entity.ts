import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

/**
 * `t_file_upload`（アップロードファイルのメタデータ）。SCR-022（ファイル
 * ダウンロード一覧／プレビュー／ダウンロード）が参照。書き込みは SCR-021 /
 * 取込画面シリーズ。
 *
 * NULL許容（`docs/database/database-design.md`）:
 *   - ja_id              nullable  (NULL = 全 JA 向けファイル)
 *   - scheduled_delete_date nullable
 *   - file_size          nullable
 *   - record_count       nullable
 *   - success_count      nullable
 *   - error_count        nullable
 *   - error_file_path    NOT NULL  (空文字許容)
 *   - deleted_at         nullable
 *   - status, notification_status  NOT NULL
 *   - notified_at        nullable  (worker が 3:完了/4:一部失敗 へ更新時に記録)
 */
@Entity('t_file_upload')
@Index('IX_t_file_upload_ja_datetime', ['jaId', 'uploadDatetime'])
@Index('IX_t_file_upload_upload_datetime', ['uploadDatetime'])
export class FileUpload {
  @PrimaryGeneratedColumn({ name: 'file_upload_id', type: 'bigint' })
  fileUploadId: number;

  @Column({ name: 'ja_id', type: 'bigint', nullable: true })
  jaId: number | null;

  @Column({ name: 'upload_datetime', type: 'timestamptz' })
  uploadDatetime: Date;

  // 削除予定日は時刻・TZ を持たない純粋な暦日（screen-design 画面項目定義
  // No.7）。`date` 保存で 2026-06-30 が任意のクライアント/TZ で同一に見える。
  // JST 深夜の timestamptz は +07:00 クライアントで 2026-06-29 とずれた（off-by-one）。
  // TypeORM は `date` 列を 'YYYY-MM-DD' 文字列で返す。
  @Column({ name: 'scheduled_delete_date', type: 'date', nullable: true })
  scheduledDeleteDate: string | null;

  @Column({ name: 'file_name', type: 'varchar', length: 255 })
  fileName: string;

  @Column({ name: 'file_path', type: 'varchar', length: 500 })
  filePath: string;

  @Column({ name: 'file_size', type: 'int', nullable: true })
  fileSize: number | null;

  @Column({ name: 'record_count', type: 'int', nullable: true })
  recordCount: number | null;

  @Column({ name: 'success_count', type: 'int', nullable: true })
  successCount: number | null;

  @Column({ name: 'error_count', type: 'int', nullable: true })
  errorCount: number | null;

  @Column({ name: 'status', type: 'int' })
  status: number;

  @Column({ name: 'error_file_path', type: 'varchar', length: 500, default: '' })
  errorFilePath: string;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Column({ name: 'created_by', type: 'varchar', length: 50 })
  createdBy: string;

  @Column({ name: 'notification_status', type: 'int', default: 1 })
  notificationStatus: number;

  @Column({ name: 'notified_at', type: 'timestamptz', nullable: true })
  notifiedAt: Date | null;
}
