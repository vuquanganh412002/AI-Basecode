import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, type ObjectLiteral } from 'typeorm';
import { FileUpload } from '@/database/entities/file-upload.entity';
import { FileDownload } from '@/database/entities/file-download.entity';
import { StorageService } from '@/modules/storage/storage.service';
import { todayIsoJst } from '@/common/utils/datetime';
import { AuditLogService } from '@/modules/audit-log/audit-log.service';
import { SystemActor } from '@/common/constants/system-actor.constant';
import { logBatchRun } from '../batch-run-audit';

/** t_log.gamen_name。実行体を追えるよう npm script 名を添える。 */
const BATCH_SCREEN = 'ファイル削除バッチ (file-cleanup)';
import type { BatchJob } from '@/batch/batch-job.interface';

/** 1回のクエリで処理する最大行数。keyset(id>cursor)でページングし対象が尽きるまでループ。 */
const CHUNK_SIZE = 500;

/** 1テーブル分の集計結果。 */
interface PurgeResult {
  /** 論理削除した行数 */
  softDeleted: number;
  /** S3から削除したオブジェクト数 */
  s3Deleted: number;
  /** S3削除に失敗し論理削除を見送った行数（次回実行で再試行） */
  s3Failed: number;
}

/** purge 対象テーブルの設定。 */
interface PurgeConfig {
  /** 主キーのエンティティプロパティ名（camelCase） */
  readonly pk: 'fileUploadId' | 'fileDownloadId';
  /** S3キーを保持するプロパティ名（空文字はスキップ） */
  readonly keyFields: readonly string[];
  /** 削除予定日の判定 SQL（エイリアス e） */
  readonly cutoffSql: string;
  /** cutoffSql のバインドパラメータ */
  readonly cutoffParams: ObjectLiteral;
}

/**
 * ファイル削除バッチ（顧客レビュー 2026-07・取込/ダウンロード画面のファイル退避）。
 *
 * 取込ファイル(t_file_upload)・ダウンロードファイル(t_file_download)のうち、
 * 削除予定日(scheduled_delete_date)を過ぎたものについて:
 *   1. S3(ストレージ)から実ファイルを物理削除（取込はエラーCSV
 *      error_file_path も対象）。
 *   2. DB行を論理削除（deleted_at 設定）。メタデータは監査目的で残す。
 *
 * 順序は「S3削除 → 成功したら論理削除」。S3削除に失敗した行は論理削除せず
 * 次回実行で再試行するため、DB上は削除済みなのに S3 に実体が残る“孤児”を作らない。
 * S3の removeObject / DeleteObject は存在しないキーでも成功する（冪等）ので
 * 再実行は安全。1件のS3失敗で全体を止めないよう per-row で catch する。
 *
 * 判定:
 *   - upload  : scheduled_delete_date(DATE)      <= 当日(JST)
 *   - download: scheduled_delete_date(timestamptz) <= NOW()（セッションTZ=Asia/Tokyo）
 *   共通で scheduled_delete_date IS NOT NULL（NULL=削除予定なし）かつ
 *   deleted_at IS NULL（未削除）のみ対象。冪等。
 *
 * スケジュール(深夜想定)は agrinews-terraform の EventBridge ルールが持つ。
 * エントリ: src/batch/file-cleanup.main.ts（`npm run file:cleanup:{dev,prod}`）。
 */
@Injectable()
export class FileCleanupService implements BatchJob {
  private readonly logger = new Logger(FileCleanupService.name);

  constructor(
    @InjectDataSource() private readonly db: DataSource,
    private readonly storage: StorageService,
    private readonly auditLog: AuditLogService,
  ) {}

  async run(): Promise<void> {
    const startedAt = Date.now();
    const today = todayIsoJst();

    const upload = await this.purge(FileUpload, {
      pk: 'fileUploadId',
      // 取込は本体ファイル + エラーCSV の2キーが対象。
      keyFields: ['filePath', 'errorFilePath'],
      cutoffSql: 'e.scheduledDeleteDate <= :cutoff',
      cutoffParams: { cutoff: today },
    });

    const download = await this.purge(FileDownload, {
      pk: 'fileDownloadId',
      keyFields: ['filePath'],
      // timestamptz なので現在時刻(JST)で判定。
      cutoffSql: 'e.scheduledDeleteDate <= NOW()',
      cutoffParams: {},
    });

    const durationMs = Date.now() - startedAt;
    this.logger.log({
      event: 'file_cleanup.done',
      today,
      upload,
      download,
      durationMs,
    });

    // 実行サマリを t_log へ 1 行（顧客要望 2026-08）。
    // S3 削除に失敗した行があれば WARNING にする（件数は summary で追える）。
    await logBatchRun(this.auditLog, {
      screen: BATCH_SCREEN,
      operation: 'ファイル削除',
      actor: SystemActor.BATCH_NIGHTLY,
      table: 't_file_upload',
      summary: { today, upload, download, durationMs },
      hasFailure: upload.s3Failed > 0 || download.s3Failed > 0,
    });
  }

  /**
   * 1テーブルを削除予定日超過分についてページング処理し、集計を返す。
   * keyset(id > cursor)で進めるため、S3削除に失敗して論理削除を見送った行が
   * 同一実行内で再取得され無限ループになることを防ぐ。
   */
  private async purge<T extends ObjectLiteral>(
    entity: new () => T,
    cfg: PurgeConfig,
  ): Promise<PurgeResult> {
    const repo = this.db.getRepository(entity);
    const result: PurgeResult = { softDeleted: 0, s3Deleted: 0, s3Failed: 0 };
    let cursor = 0;

    for (;;) {
      const rows = await repo
        .createQueryBuilder('e')
        .where('e.scheduledDeleteDate IS NOT NULL')
        .andWhere(cfg.cutoffSql, cfg.cutoffParams)
        .andWhere('e.deletedAt IS NULL')
        .andWhere(`e.${cfg.pk} > :cursor`, { cursor })
        .orderBy(`e.${cfg.pk}`, 'ASC')
        .take(CHUNK_SIZE)
        .getMany();

      if (rows.length === 0) break;

      const idsToSoftDelete: number[] = [];
      for (const row of rows) {
        const id = Number((row as ObjectLiteral)[cfg.pk]);
        cursor = id; // 成否に関わらずカーソルを進める（失敗行は次回実行で再試行）。
        const keys = cfg.keyFields
          .map((f) => (row as ObjectLiteral)[f] as unknown)
          .filter((k): k is string => typeof k === 'string' && k.trim() !== '');
        try {
          for (const key of keys) {
            await this.storage.delete(key);
            result.s3Deleted++;
          }
          idsToSoftDelete.push(id);
        } catch (err) {
          result.s3Failed++;
          this.logger.warn({
            event: 'file_cleanup.s3_delete_failed',
            table: repo.metadata.tableName,
            id,
            message: (err as Error).message,
          });
        }
      }

      if (idsToSoftDelete.length > 0) {
        await repo.softDelete(idsToSoftDelete);
        result.softDeleted += idsToSoftDelete.length;
      }

      if (rows.length < CHUNK_SIZE) break;
    }

    return result;
  }
}
