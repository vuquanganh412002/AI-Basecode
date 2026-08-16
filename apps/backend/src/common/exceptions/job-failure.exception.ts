/**
 * バッチ処理・BullMQ ワーカーなど、HTTP レスポンスを介さない非同期処理が
 * 失敗したことを示す例外。
 *
 * `DomainException`（`HttpException` を継承）は使わない — この文脈には
 * HTTP ステータス／レスポンスボディという概念が存在しないため、`HttpException`
 * を継承すると意味論的に誤りになる（バックエンドレビュー指摘）。かといって素の
 * `throw new Error(...)` のままだと「意図的な失敗通知」なのか「未捕捉のバグ」
 * なのかコード上区別が付かない。専用クラスにすることでその意図を明示する。
 *
 * 用途:
 * - BullMQ job processor（`@Processor` の `process()`）内で throw すると
 *   BullMQ がジョブを失敗としてマークし、キュー設定の retry/backoff に従って
 *   再試行する（例: file-upload-notification.worker.ts）。
 * - 夜間バッチ（`BatchJob.run()`）内で throw すると `runBatch()` がキャッチして
 *   ログ出力後 `process.exit(1)` — EventBridge / ECS が失敗を検知する
 *   （例: dokusya-apply-due.service.ts）。
 *
 * DI 未配線などの「本番では絶対に到達しないはずのプログラマ側アサーション」
 * （例: `XxxService.yyyRepo is undefined`）には使わない — それは今までどおり
 * 素の `throw new Error(...)` のままでよい（このリポジトリ全体で確立された
 * 区別: ジョブ/バッチの実行結果としての失敗 vs. 到達しないはずの配線ミス）。
 */
export class JobFailureException extends Error {
  /**
   * @param jobName - ログでの識別用（BullMQ キュー名 or バッチ名、kebab-case）。
   * @param message - 失敗理由（日本語 or 英語、ログにそのまま出るため人間が読める文言にする）。
   */
  constructor(
    public readonly jobName: string,
    message: string,
  ) {
    super(`[${jobName}] ${message}`);
    this.name = 'JobFailureException';
  }
}
