/**
 * Integration test that fails CI if any Group-A enum drifts between
 * `apps/backend/src/common/enums/` and `apps/frontend/src/constants/enums/`.
 *
 * Why parse the FE source instead of importing it:
 *   - The backend Jest run can't `import` from `apps/frontend/...` directly
 *     without sharing tsconfig paths across packages, and we deliberately
 *     don't share types via a workspace package (each side defines its
 *     own enum to keep the dependency boundary clean).
 *   - The text parse is intentionally simple — only the integer-valued
 *     enum members are extracted, so renaming a key triggers the test
 *     even if the underlying numeric value happens to match.
 *
 * Drift modes caught:
 *   - Renamed enum key on one side (BE.LogType.UserOperation vs
 *     FE.LogType.UserOp)
 *   - Different number for the same key (BE.LogType.Error = 3 vs
 *     FE.LogType.Error = 4)
 *   - Missing enum member on one side
 *   - File missing on one side
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import * as backendEnums from '@/common/enums';

interface EnumPair {
  /** Enum class name as exported (e.g. 'LogType'). */
  name: string;
  /** Filename (without extension) inside both enums folders. */
  beFile: string;
  feFile: string;
  /** The runtime enum object on the BE side, used as the reference. */
  beEnum: Record<string, string | number>;
}

const REPO_ROOT = join(__dirname, '..', '..', '..', '..');
const FE_ENUMS_DIR = join(REPO_ROOT, 'apps/frontend/src/constants/enums');

const PAIRS: EnumPair[] = [
  { name: 'LogType', beFile: 'log-type.enum', feFile: 'log-type', beEnum: backendEnums.LogType },
  { name: 'ResultStatus', beFile: 'result-status.enum', feFile: 'result-status', beEnum: backendEnums.ResultStatus },
  { name: 'LoginResult', beFile: 'login-result.enum', feFile: 'login-result', beEnum: backendEnums.LoginResult },
  { name: 'OtpType', beFile: 'otp-type.enum', feFile: 'otp-type', beEnum: backendEnums.OtpType },
  { name: 'OshiraseStatus', beFile: 'oshirase-status.enum', feFile: 'oshirase-status', beEnum: backendEnums.OshiraseStatus },
  { name: 'OshiraseType', beFile: 'oshirase-type.enum', feFile: 'oshirase-type', beEnum: backendEnums.OshiraseType },
  { name: 'PublishLocation', beFile: 'publish-location.enum', feFile: 'publish-location', beEnum: backendEnums.PublishLocation },
];

/**
 * String-valued enums (key == value, both UPPER_SNAKE_CASE). Currently
 * just `RoleCode` — `role_code` is a varchar(50) in `m_roles`, not an
 * integer id, so the value type diverges from the integer-valued
 * categories handled by PAIRS / parseEnumFromSource above.
 *
 * Drift checked: same set of keys AND the value equals the key on
 * both sides. Detects rename / typo / missing member.
 */
interface StringEnumPair {
  name: string;
  beFile: string;
  feFile: string;
  beEnum: Record<string, string>;
}
const STRING_PAIRS: StringEnumPair[] = [
  { name: 'RoleCode', beFile: 'role-code.enum', feFile: 'role-code', beEnum: backendEnums.RoleCode },
];

function parseStringEnumFromSource(source: string): Record<string, string> {
  const result: Record<string, string> = {};
  // Accepts `KEY: 'VALUE',` and `KEY: "VALUE",`.
  const memberRe = /^\s*([A-Z_][A-Z0-9_]*)\s*:\s*['"]([A-Z_][A-Z0-9_]*)['"]\s*,?\s*$/gm;
  let match: RegExpExecArray | null;
  while ((match = memberRe.exec(source)) !== null) {
    result[match[1]] = match[2];
  }
  return result;
}

/**
 * Extract `{ MEMBER: value }` pairs from a TS source file by regex.
 *
 * The project standardised on `const X = { ... } as const` (Option B
 * naming: PascalCase identifier + UPPER_SNAKE_CASE members) for
 * Group A categories. The regex below also accepts the legacy
 * `enum X { Member = 1 }` syntax to keep migrations forgiving — a
 * member line is `KEY[:|=] number`, with or without trailing comma.
 *
 * Members without a numeric value (string enums) are skipped — Group A
 * categories are exclusively integer-valued.
 */
function parseEnumFromSource(source: string): Record<string, number> {
  const result: Record<string, number> = {};
  // Accept both `KEY: 1,` (const-as-const, current) and `KEY = 1,` (legacy enum).
  const memberRe = /^\s*([A-Za-z_]\w*)\s*[:=]\s*(-?\d+)\s*,?\s*$/gm;
  let match: RegExpExecArray | null;
  while ((match = memberRe.exec(source)) !== null) {
    result[match[1]] = Number(match[2]);
  }
  return result;
}

/**
 * Reduce a runtime TS enum object to `{ Member: number }` only —
 * TS reverse-mappings (numeric-key → name) are filtered out.
 */
function asNumericMap(e: Record<string, string | number>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(e)) {
    if (typeof v === 'number') out[k] = v;
  }
  return out;
}

// The FE enum folder is a sibling of the BE folder in the monorepo
// (`apps/frontend/src/constants/enums/`). It's not present inside the
// `backend` Docker container (which mounts only `apps/backend/`), so
// when this spec runs in that container we skip — the BE↔FE drift
// check is a dev/CI concern, not something the production-like
// backend image needs to assert. Host runs + monorepo CI runs still
// see the directory and execute the assertions.
const FE_ENUMS_AVAILABLE = existsSync(FE_ENUMS_DIR);

(FE_ENUMS_AVAILABLE ? describe : describe.skip)('Group A enum sync (BE ↔ FE)', () => {
  it.each(PAIRS)('$name matches between BE and FE', ({ feFile, beEnum }) => {
    const fePath = join(FE_ENUMS_DIR, `${feFile}.ts`);
    const feSource = readFileSync(fePath, 'utf-8');
    const feMap = parseEnumFromSource(feSource);
    const beMap = asNumericMap(beEnum);

    expect(feMap).toEqual(beMap);
  });

  it.each(STRING_PAIRS)('$name (string-valued) matches between BE and FE', ({ feFile, beEnum }) => {
    const fePath = join(FE_ENUMS_DIR, `${feFile}.ts`);
    const feSource = readFileSync(fePath, 'utf-8');
    const feMap = parseStringEnumFromSource(feSource);
    // BE runtime object is already string-keyed → string-valued; no
    // reverse-mapping noise (string enums don't generate one).
    const beMap: Record<string, string> = { ...beEnum };

    expect(feMap).toEqual(beMap);
    // Extra invariant: every key equals its value (project convention
    // for role/code string enums — keeps log greps + DB selects sane).
    for (const [k, v] of Object.entries(beMap)) expect(v).toBe(k);
  });
});
