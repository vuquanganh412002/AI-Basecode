/**
 * `filterAllowedFields()` が返す緩い object（ロールが更新可のフィールド）用の
 * 型安全エクストラクタ。
 *
 * ```ts
 * const filtered = filterAllowedFields(dto, 'ja', session.role_code);
 * const next = manager.create(Ja, {
 *   ...before,
 *   jaName:    pickString(filtered, 'ja_name',    before.jaName),
 *   chuokaiFlg: pickBool(filtered, 'chuokai_flg', before.chuokaiFlg),
 *   zeiKubun:  pickNumber(filtered, 'zei_kubun',  before.zeiKubun),
 * });
 * ```
 *
 * snake_case DTO → camelCase entity のマッピングが要るためフィールド毎（一括 merge
 * ではない）。unknown を narrow し、キー不在（ロール編集不可）や型不正時は元値へ fallback。
 */
export function pickString(
  obj: Record<string, unknown>,
  key: string,
  fallback: string,
): string {
  // 1. string で存在 → 採用（"" = この NOT NULL 列をクリア含む）。
  // 2. undefined/null で存在 → クリア。`@Transform(blankToUndef)` 付き optional で
  //    FE が "" を送り undefined 化（@Matches スキップ）してもキーは残る。「存在するが
  //    undefined」と「真に不在」の区別が FE のクリア意図を汲む唯一の手段。
  // 3. 真に不在（filterAllowedFields がロール制限で除去、または PATCH 部分 body）→
  //    既存の entity 値を維持。
  if (Object.hasOwn(obj, key)) {
    const v = obj[key];
    if (typeof v === 'string') return v;
    if (v === undefined || v === null) return '';
  }
  return fallback;
}

export function pickBool(
  obj: Record<string, unknown>,
  key: string,
  fallback: boolean,
): boolean {
  return typeof obj[key] === 'boolean' ? obj[key] : fallback;
}

export function pickNumber(
  obj: Record<string, unknown>,
  key: string,
  fallback: number,
): number {
  return typeof obj[key] === 'number' ? obj[key] : fallback;
}
