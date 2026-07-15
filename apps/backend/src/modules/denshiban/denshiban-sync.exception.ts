/**
 * 電子版 共通API `updateUserInfo` が返した **業務エラー**。
 *
 * ⚠️ このAPIは **HTTP を常に 200 で返す**。成否はボディの `statusCode` にしか
 * 現れない（`res.ok` で判定してはいけない）。`statusCode !== '0'` のとき
 * {@link DenshibanApiService.send} がこの例外を投げる。
 *
 * 再送可否は `statusCode` だけで決まる（HTTP ステータスでは決まらない）。
 * 契約は `docs/design-vi/Denshiban-mapper/outbound-field-matrix.md` §E。
 */
export class DenshibanSyncException extends Error {
  constructor(
    /** 電子版が返したステータスコード（`E05` / `V12` / `P03` …）。 */
    readonly statusCode: string,
    message: string,
  ) {
    super(message);
    this.name = 'DenshibanSyncException';
  }

  /** 同じペイロードを送り直して直る見込みがあるか。 */
  get retryable(): boolean {
    return isRetryableStatus(this.statusCode);
  }
}

/**
 * 再送して意味があるステータスコードだけを true にする。
 *
 * | コード | 意味 | 再送 |
 * | --- | --- | --- |
 * | `E05` | 処理時刻が 300 秒超過 | ✅ `timestamp` を打ち直せば通る |
 * | `P99` | その他エラー | ✅ 一時障害の可能性 |
 * | `E01`〜`E04` | body / base64 / 鍵 / JSON 不正 → **cloud 側のバグ** | ❌ 何度送っても同じ |
 * | `V01`〜`V35` | フィールド書式違反 | ❌ データを直さない限り同じ |
 * | `P01`〜`P07` | 業務ルール違反（メール重複・会員なし等） | ❌ 利用者への通知が必要 |
 *
 * 未知のコードは **再送しない**。「とりあえず再送」は、書き込み系APIでは
 * 重複登録という最悪の失敗を招きうる（`create` が実は成功していた場合）。
 * DLQ に落として人間に見せるほうが安全。
 */
export function isRetryableStatus(statusCode: string): boolean {
  const code = (statusCode ?? '').trim().toUpperCase();
  return code === 'E05' || code === 'P99';
}
