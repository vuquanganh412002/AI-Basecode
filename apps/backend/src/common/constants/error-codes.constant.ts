/**
 * エラーコード定数 — API エラーレスポンスの単一情報源。コード追加時は
 * `apps/frontend/src/constants/error-codes.ts` と FE error-handler の switch を同期。
 */
export const ErrorCode = {
  // ─── 共通（全画面） ───────────────────────────────────────────────
  BAD_REQUEST: 'BAD_REQUEST',                     // 400
  VALIDATION_ERROR: 'VALIDATION_ERROR',           // 400 — フィールド単位、body に `errors[]`
  DUPLICATE_CODE: 'DUPLICATE_CODE',               // 400 — 一意制約
  UNAUTHORIZED: 'UNAUTHORIZED',                   // 401 — セッション切れ
  FORBIDDEN: 'FORBIDDEN',                         // 403 — 権限なし
  DATA_SCOPE_VIOLATION: 'DATA_SCOPE_VIOLATION',   // 403 — 権限はあるがデータ範囲外
  NOT_FOUND: 'NOT_FOUND',                         // 404
  CONFLICT: 'CONFLICT',                           // 409 — 状態競合（削除ブロック等）
  TOO_MANY_REQUESTS: 'TOO_MANY_REQUESTS',         // 429
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR', // 500

  // ─── SCR-019 — 販売店Excelデータ取込 ──────────────────────────────────
  IMPORT_VALIDATION_ERROR: 'IMPORT_VALIDATION_ERROR', // 400 — 行単位、errors[].row
  FILE_FORMAT_ERROR: 'FILE_FORMAT_ERROR',             // 400 — Excel パース/非対応（SCR-023 も）
  ROW_LIMIT_EXCEEDED: 'ROW_LIMIT_EXCEEDED',           // 400 — 500行超

  // ─── SCR-023 — ファイルアップロード画面 ────────────────────────────────
  FILE_SIZE_EXCEEDED: 'FILE_SIZE_EXCEEDED',           // 400 — ファイルサイズ上限超
  TARGET_JA_REQUIRED: 'TARGET_JA_REQUIRED',           // 400 — ja_ids[] 空

  // ─── SCR-011 — 購読者情報登録画面 ──────────────────────────────────────
  DUPLICATE_EMAIL: 'DUPLICATE_EMAIL',                 // 400 — JA 範囲内でメール重複
  INVALID_STATUS: 'INVALID_STATUS',                   // 400 — 承認待ち以外の行に承認/却下
  SHUBETSU_PERMISSION_DENIED: 'SHUBETSU_PERMISSION_DENIED', // 403 — 行の購読種別に対する paper_flg/denshi_flg 権限なし
  TORIKESHI_NOT_ALLOWED: 'TORIKESHI_NOT_ALLOWED',     // 400 — 取消不可（紙版・適用日未来・末尾のみ可。新規/取消済/中間/電子版/適用日到来済は不可）

  // ─── SCR-015 — 購読者販売店一括置換画面 ────────────────────────────────
  SAME_HANBAITEN: 'SAME_HANBAITEN',                   // 400 — 対象 = 候補の現販売店
  INELIGIBLE_DOKUSYA: 'INELIGIBLE_DOKUSYA',           // 400 — 電子版クレカ決済者・併読者不可（errors[] あり）
  DATE_RANGE_INVALID: 'DATE_RANGE_INVALID',           // 400 — date_from > date_to

  // ─── SCR-020 — 口座振替データ出力画面 ──────────────────────────────────
  INACTIVE_TANKA_REFERENCED: 'INACTIVE_TANKA_REFERENCED', // 409 — 失効単価(active_flg=false)参照購読者あり (errors[]: field=dokusya_id)
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

/** エラーコード別の既定日本語メッセージ。必要に応じて例外側で上書き。 */
export const ErrorMessage: Record<ErrorCode, string> = {
  BAD_REQUEST: 'リクエストパラメータが不正です。',
  VALIDATION_ERROR: '入力値が不正です。詳細はerrorsフィールドを確認してください。',
  DUPLICATE_CODE: '同一のコードが既に登録されています。',
  UNAUTHORIZED: 'セッションが切れました。再度ログインしてください。',
  FORBIDDEN: 'この画面へのアクセス権限がありません。',
  DATA_SCOPE_VIOLATION: 'このデータへのアクセス権限がありません。',
  NOT_FOUND: '指定されたデータが見つかりません。',
  CONFLICT: '関連データが存在するため処理を実行できません。',
  TOO_MANY_REQUESTS:
    'リクエスト回数が上限を超えました。しばらくしてから再度お試しください。',
  INTERNAL_SERVER_ERROR:
    'システムエラーが発生しました。しばらくしてから再度お試しください。',
  IMPORT_VALIDATION_ERROR:
    'Excel取込データにエラーがあります。詳細はerrorsフィールドを確認してください。',
  // SCR-019 既定。SCR-023 ファイルアップロードは明示メッセージ
  // （'許可されていないファイル形式です。'）で上書き — FileUploadFormatException 参照。
  FILE_FORMAT_ERROR:
    'Excelファイルの取り込みに失敗しました。ファイル形式を確認してください。',
  ROW_LIMIT_EXCEEDED: '取込データ行数の上限（500行）を超えています。',
  FILE_SIZE_EXCEEDED: 'ファイルサイズが30MBを超えています。',
  TARGET_JA_REQUIRED: '対象JAを1つ以上選択してください。',
  DUPLICATE_EMAIL: 'このメールアドレスは既に登録されています。',
  INVALID_STATUS: '承認待ちの読者ではありません。',
  SHUBETSU_PERMISSION_DENIED: 'この購読種別に対する操作権限がありません。',
  TORIKESHI_NOT_ALLOWED:
    '取消できないレコードです（紙版・適用日が未来の末尾レコードのみ取消可能。新規・取消済・中間レコード・電子版・適用日到来済みは取消できません）。',
  SAME_HANBAITEN: '現在の販売店と同じ販売店は選択できません。',
  INELIGIBLE_DOKUSYA: '電子版クレカ決済者・併読者は編集・削除できません。',
  DATE_RANGE_INVALID: '「開始日」は「終了日」以前の日付を入力してください。',
  INACTIVE_TANKA_REFERENCED:
    '失効した単価を参照している購読者が存在するため、口座振替データを出力できません。該当購読者の単価を変更してから再度実行してください。',
};
