import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

/**
 * `t_file_download` — every successful file download writes one row.
 * SCR-022 §4.5 inserts here inside the same tx as the audit log
 * (`t_log`) so the per-download history and the audit trail commit
 * atomically.
 *
 * Nullability per `docs/database/database-design.md`:
 *   - ja_id          NOT NULL (NICHINO_* downloading global file writes NULL)
 *   - target_month   nullable
 *   - created_at     nullable
 */
@Entity('t_file_download')
@Index('IX_t_file_download_ja_datetime', ['jaId', 'downloadDatetime'])
export class FileDownload {
  @PrimaryGeneratedColumn({ name: 'file_download_id', type: 'bigint' })
  fileDownloadId: number;

  // Schema says NOT NULL but api.md §4.5 footnote permits NICHINO_* +
  // global file (ja_id IS NULL) to write NULL here. Mark nullable so
  // TypeORM doesn't reject the insert.
  @Column({ name: 'ja_id', type: 'bigint', nullable: true })
  jaId: number | null;

  @Column({ name: 'download_datetime', type: 'timestamptz' })
  downloadDatetime: Date;

  @Column({ name: 'download_type', type: 'int' })
  downloadType: number;

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

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz', nullable: true })
  createdAt: Date;

  @Column({ name: 'created_by', type: 'varchar', length: 50 })
  createdBy: string;
}
