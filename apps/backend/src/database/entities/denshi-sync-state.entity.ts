import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

/**
 * dokusya-sync が失敗のため skip した電子版 `users.id` の再試行キュー1件。
 * watermark とは別経路（id 直指定）で毎回再試行し、成功/対象外になったら取り除く。
 */
export interface FailedSyncRow {
  denshiKaiinId: number;
  firstFailedAt: string;
  lastFailedAt: string;
  attempts: number;
  lastError: string;
}

/**
 * 電子版 → クラウド版 同期バッチのチェックポイント（watermark）テーブル。
 *
 * バッチ（`dokusya-sync`）が「前回どこまで取り込んだか」を1行で保持し、毎回
 * 差分のみ取得できるようにする。ログではなく **1バッチ=1行の可変ステート**で、
 * 実行のたびに上書きする（実行履歴の蓄積は t_log / CloudWatch が担う）。
 *
 * - `last_source_id`         : 処理済み電子版 `users.id` の最大値。新規レコード
 *                              （`updated_at` 未設定でも id は単調増加）の検知に使う。
 * - `last_source_updated_at` : 処理済み `COALESCE(users.updated_at, users.created_at)`
 *                              の最大値。既存レコードの更新検知に使う。
 * 差分は「id が進んだ OR chg_ts が進んだ」の OR で取得する（docs/dokusya-sync-
 * implementation-plan.md §2）。
 * - `failed_rows`            : 取込失敗で skip した行の再試行キュー（{@link FailedSyncRow}[]）。
 */
@Entity('t_denshi_sync_state')
export class DenshiSyncState {
  @PrimaryColumn({ name: 'batch_name', type: 'varchar', length: 50 })
  batchName: string;

  // bigint は TypeORM/pg で string として往復する。比較時に数値化する。
  @Column({ name: 'last_source_id', type: 'bigint', nullable: true })
  lastSourceId: string | null;

  @Column({ name: 'last_source_updated_at', type: 'timestamptz', nullable: true })
  lastSourceUpdatedAt: Date | null;

  @Column({ name: 'last_run_at', type: 'timestamptz', nullable: true })
  lastRunAt: Date | null;

  @Column({ name: 'failed_rows', type: 'jsonb', default: () => "'[]'" })
  failedRows: FailedSyncRow[];

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
