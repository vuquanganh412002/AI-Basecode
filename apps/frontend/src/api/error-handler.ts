import { message } from 'ant-design-vue';
import type { AxiosError } from 'axios';
import router from '@/router';
import { ErrorCode, type ApiErrorResponse } from '@/constants/error-codes';
import { useAuthStore } from '@/stores/auth.store';

/**
 * 呼び出し元 view がトーストを出す画面固有 error_code の一覧。
 * グローバルハンドラはこれらをトーストしない（二重表示防止）。
 * view に `if (error_code === 'X') message.error(...)` を追加したら
 * ここにも登録する。
 *
 *  - DEADLINE_NOTICE_DUPLICATE: ACSMS-SCR-031 お知らせ管理（メニュー画面 + 締め切り時間の重複）。
 *    view: OshiraseManagementView.applyServerErrors
 *  - EXPORT_LIMIT_EXCEEDED: ACSMS-SCR-030 ログ参照の出力上限超過。view: LogListView
 *  - IMPORT_VALIDATION_ERROR: ACSMS-SCR-016 / ACSMS-SCR-019 Excel取込の行別 errors[]。
 *    view 側で詳細表示（販売店: toast、購読者: 行パネル）するためグローバルは不要。
 */
const VIEW_HANDLED_CODES: ReadonlySet<string> = new Set([
  'DEADLINE_NOTICE_DUPLICATE',
  'EXPORT_LIMIT_EXCEEDED',
  'IMPORT_VALIDATION_ERROR',
  // NO_TARGET_DATA: ACSMS-SCR-020 口座振替データ出力で対象0件。
  //   wrapper が 404 Blob を `{ error_code }` に正規化し view が画面内表示。
  'NO_TARGET_DATA',
  // INACTIVE_TANKA_REFERENCED: ACSMS-SCR-020 で失効単価(active_flg=false)を参照する購読者あり。
  //   errors[]（該当購読者）を view がインラインリスト表示するためグローバルは不要。
  'INACTIVE_TANKA_REFERENCED',
]);

/**
 * ACSMS-SCR-022 / ACSMS-SCR-023 のファイルアップロード・ダウンロード実行系エンドポイント。
 * これらは screen-design.md の顧客承認済み固有文言（ACSMS-MSG-023-005
 * 「アップロードに失敗しました…」/ ACSMS-MSG-022-003「ファイルが存在していません。」）
 * を view 側（FileUploadView.doUpload / FileDownloadView.handleFileError）が
 * 表示する。VIEW_HANDLED_CODES は error_code 単位のみで、NOT_FOUND や
 * INTERNAL_SERVER_ERROR のような汎用コードをここで丸ごと登録するとアプリ全体の
 * 他画面の汎用トーストまで消えてしまうため、エンドポイント（method + url + code）
 * 単位で判定する。対象は一覧取得（GET 一覧）を含まない — 実行系のみ。
 *
 *  - file-upload（POST）: view が UNAUTHORIZED/FORBIDDEN 以外の全コード
 *    （ネットワークエラー含む）を再トーストするため `codes: undefined`＝無条件。
 *  - file-download の preview/download/zip: view は NOT_FOUND のみ再トースト
 *    するため、それ以外（ネットワークエラー含む）はグローバルトーストを残す。
 */
const VIEW_HANDLED_ENDPOINTS: readonly {
  method: string;
  pattern: RegExp;
  /** undefined = このエンドポイントの全コードを view に一任（UNAUTHORIZED/FORBIDDEN を除く）。 */
  codes?: ReadonlySet<string>;
}[] = [
  { method: 'post', pattern: /\/file-upload$/ },
  {
    method: 'get',
    pattern: /\/file-download\/\d+\/(preview|download)$/,
    codes: new Set([ErrorCode.NOT_FOUND]),
  },
  {
    method: 'post',
    pattern: /\/file-download\/download-zip$/,
    codes: new Set([ErrorCode.NOT_FOUND]),
  },
];

function isViewHandledEndpoint(
  url: string,
  method: string | undefined,
  code: string | undefined,
): boolean {
  const m = (method || '').toLowerCase();
  return VIEW_HANDLED_ENDPOINTS.some(
    (e) =>
      e.method === m &&
      e.pattern.test(url) &&
      (!e.codes || (code !== undefined && e.codes.has(code))),
  );
}

/**
 * Axios 共通エラーハンドラ。error_code ごとに振り分ける。
 *  - auth endpoint (login / mfa/*): /login へ遷移せずトースト。フォームが項目別エラー処理。
 *  - auth 以外の UNAUTHORIZED: セッション切れ（HTTP-only cookie、再取得トークンなし）
 *    → user state をクリアし /login へ redirect クエリ付きで遷移。
 *  - FORBIDDEN: トースト + /dashboard へ遷移（403専用ページを持たず行き止まりを避ける）。
 *  - VALIDATION_ERROR: トーストしない。呼び出し元フォームが errors[] をマップ。
 *  - VIEW_HANDLED_CODES: トーストしない。呼び出し元 view が表示。
 *  - その他共通コード: ユーザー向けトースト表示。
 */
export async function handleApiError(
  error: AxiosError<ApiErrorResponse>,
): Promise<never> {
  const status = error.response?.status;
  // Blob responseType（CSV/Excel出力）はエラー body も Blob で届く。
  // `{ error_code, message }` にパースし直し、switch / VIEW_HANDLED_CODES
  // と下流 wrapper が error.response.data から読めるようにする。
  if (error.response && (error.response.data as unknown) instanceof Blob) {
    try {
      error.response.data = JSON.parse(
        await (error.response.data as unknown as Blob).text(),
      );
    } catch {
      // JSON でない Blob はそのまま。ネットワーク分岐へ落ちる。
    }
  }
  const data = error.response?.data;
  const code = data?.error_code;
  const url = error.config?.url || '';

  // view がトーストする画面固有コードは二重表示防止でグローバルはスキップ。
  if (code && VIEW_HANDLED_CODES.has(code)) {
    throw error;
  }
  // ファイルアップロード/ダウンロード実行系は view 側が固有文言を再トーストする
  // ため、同じくグローバルはスキップ（二重表示防止）。UNAUTHORIZED/FORBIDDEN は
  // clearSession・redirect を伴う専用フローのため対象外（常にグローバル側で処理）。
  if (
    code !== ErrorCode.UNAUTHORIZED &&
    code !== ErrorCode.FORBIDDEN &&
    isViewHandledEndpoint(url, error.config?.method, code)
  ) {
    throw error;
  }
  // フォーム送信での UNAUTHORIZED は意味を持つ（パスワード/OTP誤り）のでトースト対象。
  const isAuthFormEndpoint =
    url.includes('/auth/login') ||
    url.includes('/auth/mfa/');
  // main.ts が毎ロード時に cookie からセッション復元する背景プローブ。
  // ここでの 401 は「未ログイン」で毎回想定内。無音にして /login 初回表示で
  // 「セッションが切れました」を出さない。
  const isRefreshProbe = url.includes('/auth/refresh');

  // ネットワークエラー / 非JSON body は汎用トースト。
  if (!status || !data) {
    message.error('ネットワークエラーが発生しました。接続をご確認ください。');
    throw error;
  }

  switch (code) {
    // ─── ACSMS-SCR-001 固有 — 常にトースト、遷移しない ────────────────
    case ErrorCode.INVALID_CREDENTIALS:
    case ErrorCode.ACCOUNT_LOCKED:
    case ErrorCode.INVALID_OTP:
    case ErrorCode.OTP_RESEND_COOLDOWN:
      message.error(data.message);
      break;

    // OTP期限切れ / 試行上限 / 再送上限 / mfa_token無効
    // → login へ戻す（spec §11, §7.6, §8.3）。
    case ErrorCode.OTP_EXPIRED:
    case ErrorCode.OTP_MAX_ATTEMPTS:
    case ErrorCode.OTP_RESEND_LIMIT:
    case ErrorCode.INVALID_MFA_TOKEN:
      message.error(data.message);
      await router.push({ name: 'Login' });
      break;

    case ErrorCode.UNAUTHORIZED: {
      if (isRefreshProbe) {
        // 起動時プローブ。呼び出し元 auth.store.refreshSession が catch し state をクリア。
        // トーストなし（/login 初回訪問で驚かせない）、遷移なし（初回は router 未マウント）。
        break;
      }
      if (isAuthFormEndpoint) {
        message.error(data.message);
        break;
      }
      // HTTP-only cookie セッションでは 401 = Redis セッション消滅（期限切れ/失効）。
      // 差し替える refresh token はなく /auth/refresh 再試行も同じ死cookieで 401。
      // /login へ戻す前に client 側 state（user + codes cache）を破棄し次回ログインを初期化。
      useAuthStore().clearSession();
      await router.push({
        name: 'Login',
        query: { redirect: router.currentRoute.value.fullPath },
      });
      break;
    }

    case ErrorCode.FORBIDDEN:
      message.error(data.message);
      await router.push({ name: 'Dashboard' });
      break;

    case ErrorCode.DATA_SCOPE_VIOLATION:
      message.error(data.message);
      break;

    // ACSMS-SCR-011 — 対象行の購読種別に対し account に paper_flg/denshi_flg なし。
    // トーストのみ（/dashboard へ遷移せずフォームに留まる）。
    case ErrorCode.SHUBETSU_PERMISSION_DENIED:
      message.error(data.message);
      break;

    case ErrorCode.VALIDATION_ERROR:
      // 呼び出し元 useApiForm が errors[] をフォーム項目へマップ。
      break;

    case ErrorCode.DUPLICATE_CODE:
    case ErrorCode.BAD_REQUEST:
    case ErrorCode.NOT_FOUND:
    case ErrorCode.CONFLICT:
    case ErrorCode.TOO_MANY_REQUESTS:
    // 502 — 電子版連携(push)失敗。cloud 側もロールバック済み。message を表示。
    case ErrorCode.DENSHIBAN_PUSH_FAILED:
      message.error(data.message);
      break;

    case ErrorCode.INTERNAL_SERVER_ERROR:
    default:
      message.error(
        data.message ||
          'システムエラーが発生しました。しばらくしてから再度お試しください。',
      );
      break;
  }

  throw error;
}
