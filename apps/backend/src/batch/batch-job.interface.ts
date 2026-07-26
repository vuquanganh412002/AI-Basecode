/**
 * 単発実行バッチのドメインサービスが満たすべき最小インターフェース。
 *
 * `run()` を1回呼ばれるだけ。スケジュール（cron）は agrinews-terraform 側の
 * EventBridge ルール → ECS RunTask が持ち、アプリ内 `@nestjs/schedule` は使わない。
 * バッチ本体は `src/modules/batch/<name>/<name>.service.ts` の Nest サービスとして
 * 実装し、エントリ `src/batch/<name>.main.ts` が `runBatch()` 経由で解決・実行する。
 */
export interface BatchJob {
  run(): Promise<void>;
}
