/**
 * アプリケーション起動時の設定検証エラー — 必須シークレット未設定・危険な
 * デフォルト値のまま等、このまま起動を続けると危険な状態を検知したときに
 * throw する（例: `configuration.ts` の `assertProductionSecrets()`）。
 *
 * `DomainException`（`HttpException` を継承）は使わない — この throw は
 * `ConfigModule.forRoot({ load: [configuration] })` のファクトリ関数内、
 * つまり NestJS の DI コンテナが組み上がる前に発生するため、HTTP
 * リクエスト/レスポンスという概念がまだ存在しない。
 *
 * `JobFailureException`（BullMQ ワーカー/夜間バッチの実行時失敗）とも区別する
 * — こちらは「起動そのものを拒否する」ための一度きりの致命的エラーで、
 * ジョブのリトライや個別実行の成否とは無関係。throw すると Nest の起動
 * (`NestFactory.create` / `createApplicationContext`) がそのまま失敗し
 * Node プロセスがクラッシュする（ECS タスクは起動失敗として扱われる —
 * 「大声でクラッシュする」ことが目的なので、ここで握り潰してはならない）。
 */
export class ConfigValidationException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigValidationException';
  }
}
