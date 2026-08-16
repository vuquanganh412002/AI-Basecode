import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import type { BatchJob } from '@/batch/batch-job.interface';
import { JobFailureException } from '@/common/exceptions/job-failure.exception';
import { DokusyaKaiyakuService } from './dokusya-kaiyaku.service';
import { DokusyaRecomputeService } from './dokusya-recompute.service';

/** `src/batch/dokusya-apply-due.main.ts` の `runBatch(name, ...)` と同じ名前。 */
const BATCH_NAME = 'dokusya-apply-due';

/**
 * 多重起動防止の advisory lock キー。dokusya-sync (4210010) と衝突しない値。
 * pg_advisory_lock は DB 全体で 1 つの名前空間なので、新バッチを足すたびに
 * 未使用の値を選ぶこと。
 */
const APPLY_DUE_LOCK_KEY = 4210020;

/**
 * 購読者「到来日反映」バッチ（適用日到来 = due の予約を master へ適用）。
 * 顧客レビュー 2026-07 Batch 2+3 をまとめた 1 エントリ。
 *
 * 順序保証（解約 → 反映）のため 1 バッチにまとめ、内部で順に実行:
 *   ① kaiyaku   … 購読中止日が到来した購読者の解約を確定（履歴追加 + master反映）
 *   ② recompute … master が古い購読者を再計算（情報変更予約の反映 + saishin_data_flg）
 *
 * ①が新規の解約行を追加した後に②が走ることで、その晩のうちに解約・情報変更の両方が
 * 矛盾なく master へ反映される。両段とも idempotent。
 *
 * **本バッチは自社クラウド内で完結する**（顧客要件 2026-07）。電子版への push
 * （cancel / update）は行わない。外部呼び出しが無くなったため、同日に複数回
 * 実行しても履歴・master・外部システムのいずれにも副作用は生じない。
 *
 * スケジュール(5:00 JST)は agrinews-terraform の EventBridge ルールが持つ。
 * エントリ: src/batch/dokusya-apply-due.main.ts（`npm run dokusya:apply-due:{dev,prod}`）。
 */
@Injectable()
export class DokusyaApplyDueService implements BatchJob {
  private readonly logger = new Logger(DokusyaApplyDueService.name);

  constructor(
    @InjectDataSource() private readonly db: DataSource,
    private readonly kaiyaku: DokusyaKaiyakuService,
    private readonly recompute: DokusyaRecomputeService,
  ) {}

  /**
   * 多重起動を防いでから 2 段を順に実行し、失敗があればバッチ全体を失敗させる。
   *
   * ── なぜ advisory lock が要るか
   * 前回実行が長引いている最中に EventBridge のリトライや手動実行が重なると、同じ
   * 購読者を 2 本のトランザクションが同時に処理する。第1段は
   * `uq_t_dokusya_rireki (dokusya_id, rireki_no)` が二重挿入を弾くのでデータは
   * 壊れないが、片方が毎行エラーになり ng が跳ね上がって「本物の障害」と区別が
   * つかなくなる。同時実行そのものを止めるのが正しい（dokusya-sync と同じ方針）。
   *
   * ── なぜ段ごとに throw せず最後に集計するか
   * 第1段で 1 件失敗しただけで throw すると第2段が丸ごと走らず、その晩の情報変更
   * 予約が全件未反映になる。段は最後まで走らせ、ng を集計してから throw する。
   * これで「1件の失敗が他の全件を巻き添えにしない」と「失敗を成功として報告しない」
   * を両立できる。
   */
  async run(): Promise<void> {
    const startedAt = Date.now();

    const lockQr = this.db.createQueryRunner();
    await lockQr.connect();
    try {
      const [{ locked }] = (await lockQr.query(
        'SELECT pg_try_advisory_lock($1) AS locked',
        [APPLY_DUE_LOCK_KEY],
      )) as [{ locked: boolean }];
      if (!locked) {
        // skip は異常ではない（前回が動いている）ので exit(0)。warn で可視化する。
        this.logger.warn({
          event: 'dokusya_apply.skip',
          reason: 'previous run still in progress',
        });
        return;
      }

      try {
        const kaiyaku = await this.kaiyaku.run(); // ① 解約（到来日）
        const recompute = await this.recompute.run(); // ② 反映
        const ng = kaiyaku.ng + recompute.ng;

        this.logger.log({
          event: 'dokusya_apply.done',
          kaiyaku,
          recompute,
          durationMs: Date.now() - startedAt,
        });

        if (ng > 0) {
          // runBatch が catch して exit(1) → EventBridge / ECS が失敗を検知する。
          // 個々の原因は各段が既に error ログ + t_log(ERROR) に落としている。
          throw new JobFailureException(
            BATCH_NAME,
            `${ng} subscriber(s) failed (kaiyaku ng=${kaiyaku.ng}, recompute ng=${recompute.ng})`,
          );
        }
      } finally {
        await lockQr.query('SELECT pg_advisory_unlock($1)', [
          APPLY_DUE_LOCK_KEY,
        ]);
      }
    } finally {
      // 接続を返さないとプール枯渇 + advisory lock がセッションに残り続ける。
      await lockQr.release();
    }
  }
}
