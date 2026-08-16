/**
 * 電子版 共通API `updateUserInfo` が返すエラーコード一覧。
 *
 * 出典: 顧客提供 `20260723_読者管理連携用API使用方法.xlsx` シート「エラーコード一覧」。
 * 先方仕様がそのまま入るため、内容の改変・意訳はしない（差分が出たら Excel を正とする）。
 *
 * 区分:
 *   E** — リクエストの受理段階（JSON パース / Base64 / 復号 / timestamp）
 *   V** — パラメータの必須・形式チェック
 *   P** — 業務ルール（重複・状態不整合など）。P99 はその他
 *
 * 用途は2つ:
 *   1. `isDenshibanErrorCode()` — 先方コードかどうかの判定。push 失敗時、
 *      cloud 起点の失敗と区別して `error_code` にそのまま載せる。
 *   2. 説明文の fallback — 先方が `message` を返さなかったときに表示する。
 */
export const DENSHIBAN_ERROR_DESCRIPTIONS: Readonly<Record<string, string>> = {
  E01: 'リクエストBodyのJSONのパースに失敗',
  E02: '「payload」の文字列のBase64デコードに失敗',
  E03: '「payload」の復号化に失敗',
  E04: '「payload」を復元したJSONのパース処理に失敗',
  E05: '「timestamp」と現在日時の差異が閾値を超えている',
  V01: '「timestamp」が不足している、または形式不正',
  V02: '「action_kbn」が不足している、または形式不正',
  V03: '「jacd_execute」が不足している、または形式不正',
  V04: '「id」が不足している、または形式不正',
  V05: '「first_name」が不足している、または形式不正',
  V06: '「last_name」が不足している、または形式不正',
  V07: '「first_kana」が不足している、または形式不正',
  V08: '「last_kana」が不足している、または形式不正',
  V09: '「zip」が不足している、または形式不正',
  V10: '「pref_id」が不足している、または形式不正',
  V11: '「addr」が不足している、または形式不正',
  V12: '「city」が不足している、または形式不正',
  V13: '「building」が不足している、または形式不正',
  V14: '「tel」が不足している、または形式不正',
  V15: '「email」が不足している、または形式不正',
  V16: '「subscribe_flg」が不足している、または形式不正',
  V17: '「jacd」が不足している、または形式不正',
  V18: '「branch」が不足している、または形式不正',
  V19: '「remarks1」が不足している、または形式不正',
  V20: '「remarks2」が不足している、または形式不正',
  V21: '「remarks3」が不足している、または形式不正',
  V22: '「remarks4」が不足している、または形式不正',
  V23: '「remarks5」が不足している、または形式不正',
  V24: '「melmaga」が不足している、または形式不正',
  V25: '「profession」が不足している、または形式不正',
  V26: '「profession_and_ja」が不足している、または形式不正',
  V27: '「profession_and_agri」が不足している、または形式不正',
  V28: '「others_profession」が不足している、または形式不正',
  V29: '「products」が不足している、または形式不正',
  V30: '「others_products」が不足している、または形式不正',
  V31: '「birthyear」が不足している、または形式不正',
  V32: '「sex」が不足している、または形式不正',
  V33: '「payment_start」が不足している、または形式不正',
  V34: '「notify_flg」が不足している、または形式不正',
  V35: '「cancel_ym」が不足している、または形式不正',
  P01: '【create】メールアドレスが重複している',
  P02: '【create以外】実行JAに「id」で設定された会員が存在しない',
  P03: '【reread】指定された会員が無料会員でない',
  P04: '【cancel】指定された会員が有料会員でない',
  P05: '【cancel】解約月に不正な値',
  P06: '【approve、unapprove】指定された会員が承認待ちの状態でない',
  P07: '【update】移動不可な「jacd」が指定されている',
  P99: 'その他のエラー',
} as const;

/** 電子版 `updateUserInfo` の成功ステータスコード。それ以外はエラーコード。 */
export const DENSHIBAN_STATUS_SUCCESS = '0';

/**
 * cloud 起点の失敗（電子版まで到達していない）で使う擬似ステータスコード
 * （例: `resolveJacd` で管理支店IDが解決できない等）。`isDenshibanErrorCode()`
 * は必ず false を返すため、`DenshibanPushException` の `error_code` は
 * {@link DENSHIBAN_ERROR_DESCRIPTIONS} を経由せず `DENSHIBAN_PUSH_FAILED`
 * （denshiban-push.service.ts）に潰れる。
 */
export const CLOUD_ORIGIN_STATUS_CODE = 'CLOUD';

/** 電子版のエラーコード書式（E/V/P + 2桁）。 */
const DENSHIBAN_ERROR_CODE_RE = /^[EVP]\d{2}$/;

/**
 * `statusCode` が電子版のエラーコード書式かどうか。cloud 起点の失敗で使う
 * 擬似コード（'CLOUD'）や想定外の値を弾き、先方コードだけを API の
 * `error_code` に載せるための判定。
 */
export function isDenshibanErrorCode(statusCode: string): boolean {
  return DENSHIBAN_ERROR_CODE_RE.test(statusCode);
}

/**
 * コードに対応する日本語説明。未知コード（先方が一覧を更新した場合など）は
 * undefined を返し、呼び出し側で汎用文言へフォールバックする。
 */
export function describeDenshibanError(statusCode: string): string | undefined {
  return DENSHIBAN_ERROR_DESCRIPTIONS[statusCode];
}
