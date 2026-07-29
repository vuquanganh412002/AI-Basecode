const TRUE_VALUES = new Set(['1', 'true', 'yes', 'on']);

export function toBoolean(value: string | boolean | undefined): boolean {
  if (typeof value === 'boolean') return value;
  if (!value) return false;
  return TRUE_VALUES.has(value.trim().toLowerCase());
}

/**
 * 正規化済み `NODE_ENV`（trim + 小文字化。未設定時は ''）。
 *
 * `process.env.NODE_ENV` を読む唯一のブートストラップ時リーダー — ConfigModule
 * 生成前（app.module.ts の env ファイル選択）に必要。app.module.ts と
 * `isNodeEnv()` はここを経由し、他の `src/**` は `process.env` を直接触らない
 * （.claude/rules/nestjs.md §Configuration — env.ts は data-source.ts / scripts と
 * 並ぶ明示的例外）。
 */
export function nodeEnv(): string {
  return process.env.NODE_ENV?.trim().toLowerCase() ?? '';
}

export function isNodeEnv(target: string): boolean {
  return nodeEnv() === target.trim().toLowerCase();
}
