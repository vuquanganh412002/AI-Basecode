const TRUE_VALUES = new Set(['1', 'true', 'yes', 'on']);

export function toBoolean(value: string | boolean | undefined): boolean {
  if (typeof value === 'boolean') return value;
  if (!value) return false;
  return TRUE_VALUES.has(value.trim().toLowerCase());
}

/**
 * Normalized `NODE_ENV` (trimmed + lowercased; '' when unset).
 *
 * This is the SINGLE bootstrap-time reader of `process.env.NODE_ENV` for
 * the Nest app — `app.module.ts` (env-file selection) and `isNodeEnv()`
 * route through here so no other `src/**` file touches `process.env`
 * directly (see `.claude/rules/nestjs.md §Configuration` — env.ts is the
 * named config-path exception alongside data-source.ts / scripts).
 */
export function nodeEnv(): string {
  return process.env.NODE_ENV?.trim().toLowerCase() ?? '';
}

export function isNodeEnv(target: string): boolean {
  return nodeEnv() === target.trim().toLowerCase();
}
