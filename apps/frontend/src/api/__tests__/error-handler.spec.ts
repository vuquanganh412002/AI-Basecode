// Drives src/api/error-handler.ts. The handler is the central axios
// response-rejection router (per vue.md §Error Handling Architecture
// Layer 1) — every UNAUTHORIZED / FORBIDDEN / VALIDATION_ERROR /
// network-error path must be locked in test so a regression here
// can't silently change toast behaviour project-wide.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { AxiosError } from 'axios';

import { handleApiError } from '@/api/error-handler';
import { ErrorCode, type ApiErrorResponse } from '@/constants/error-codes';

// ─── Mocks ───────────────────────────────────────────────────────────
//
// The handler reaches for `message.error`, `router.push`, and
// `useAuthStore().user = null` directly. Mock all three with simple
// spies so we can assert call shape without spinning up Vue / Pinia.

vi.mock('ant-design-vue', () => ({
  message: { error: vi.fn() },
}));

const pushMock = vi.fn().mockResolvedValue(undefined);
vi.mock('@/router', () => ({
  default: {
    push: (...args: unknown[]) => pushMock(...args),
    currentRoute: { value: { fullPath: '/dashboard/users' } },
  },
}));

const userRef = { value: null as unknown };
const clearSessionMock = vi.fn(() => {
  userRef.value = null;
});
vi.mock('@/stores/auth.store', () => ({
  useAuthStore: () => ({
    get user() {
      return userRef.value;
    },
    set user(v: unknown) {
      userRef.value = v;
    },
    clearSession: clearSessionMock,
  }),
}));

function makeError(opts: {
  status?: number;
  data?: ApiErrorResponse | undefined;
  url?: string;
}): AxiosError<ApiErrorResponse> {
  return {
    isAxiosError: true,
    name: 'AxiosError',
    message: 'mock',
    config: { url: opts.url ?? '/api/v1/something' },
    response:
      opts.status === undefined
        ? undefined
        : {
            status: opts.status,
            data: opts.data,
            statusText: '',
            headers: {},
            config: {} as never,
          },
  } as unknown as AxiosError<ApiErrorResponse>;
}

async function expectReject(p: Promise<unknown>) {
  await expect(p).rejects.toBeDefined();
}

beforeEach(async () => {
  const { message } = await import('ant-design-vue');
  vi.mocked(message.error).mockClear();
  pushMock.mockClear();
  clearSessionMock.mockClear();
  userRef.value = { account_id: 1 };
});

describe('handleApiError — network / non-JSON', () => {
  it('should toast the generic network error when response is undefined', async () => {
    const { message } = await import('ant-design-vue');
    await expectReject(handleApiError(makeError({ url: '/x' })));
    expect(message.error).toHaveBeenCalledWith(
      'ネットワークエラーが発生しました。接続をご確認ください。',
    );
    expect(pushMock).not.toHaveBeenCalled();
  });

  it('should toast the generic network error when response.data is missing', async () => {
    const { message } = await import('ant-design-vue');
    await expectReject(handleApiError(makeError({ status: 500 })));
    expect(message.error).toHaveBeenCalledWith(
      'ネットワークエラーが発生しました。接続をご確認ください。',
    );
  });

  it('should ALWAYS return a rejected promise even on the happy toast path', async () => {
    const err = makeError({
      status: 400,
      data: { error_code: ErrorCode.BAD_REQUEST, message: 'bad' },
    });
    await expectReject(handleApiError(err));
  });
});

describe('handleApiError — auth form endpoints (login / mfa/*)', () => {
  it('should toast and NOT redirect on UNAUTHORIZED from /auth/login', async () => {
    const { message } = await import('ant-design-vue');
    await expectReject(
      handleApiError(
        makeError({
          status: 401,
          url: '/api/v1/auth/login',
          data: { error_code: ErrorCode.UNAUTHORIZED, message: '認証情報が不正です' },
        }),
      ),
    );
    expect(message.error).toHaveBeenCalledWith('認証情報が不正です');
    expect(pushMock).not.toHaveBeenCalled();
  });

  it('should toast and NOT redirect on UNAUTHORIZED from /auth/mfa/verify', async () => {
    const { message } = await import('ant-design-vue');
    await expectReject(
      handleApiError(
        makeError({
          status: 401,
          url: '/api/v1/auth/mfa/verify',
          data: { error_code: ErrorCode.UNAUTHORIZED, message: 'OTP不正' },
        }),
      ),
    );
    expect(message.error).toHaveBeenCalledWith('OTP不正');
    expect(pushMock).not.toHaveBeenCalled();
  });
});

describe('handleApiError — UNAUTHORIZED refresh probe', () => {
  it('should SILENTLY reject on UNAUTHORIZED from /auth/refresh (no toast, no redirect, no clearSession)', async () => {
    const { message } = await import('ant-design-vue');
    await expectReject(
      handleApiError(
        makeError({
          status: 401,
          url: '/api/v1/auth/refresh',
          data: { error_code: ErrorCode.UNAUTHORIZED, message: 'session dead' },
        }),
      ),
    );
    expect(message.error).not.toHaveBeenCalled();
    expect(pushMock).not.toHaveBeenCalled();
    // refresh probe must NOT clear user — that's the caller's job.
    expect(clearSessionMock).not.toHaveBeenCalled();
    expect(userRef.value).not.toBeNull();
  });
});

describe('handleApiError — UNAUTHORIZED outside auth endpoints', () => {
  it('should call authStore.clearSession + redirect to /login with `redirect` query', async () => {
    await expectReject(
      handleApiError(
        makeError({
          status: 401,
          url: '/api/v1/dokusya',
          data: { error_code: ErrorCode.UNAUTHORIZED, message: 'session expired' },
        }),
      ),
    );
    // clearSession is the action that drops both `user` AND the
    // codes-store cache — going through it (not direct mutation)
    // is the contract this test locks in.
    expect(clearSessionMock).toHaveBeenCalledTimes(1);
    expect(userRef.value).toBeNull();
    expect(pushMock).toHaveBeenCalledWith({
      name: 'Login',
      query: { redirect: '/dashboard/users' },
    });
  });
});

describe('handleApiError — FORBIDDEN', () => {
  it('should toast + push to Dashboard', async () => {
    const { message } = await import('ant-design-vue');
    await expectReject(
      handleApiError(
        makeError({
          status: 403,
          data: { error_code: ErrorCode.FORBIDDEN, message: 'no permission' },
        }),
      ),
    );
    expect(message.error).toHaveBeenCalledWith('no permission');
    expect(pushMock).toHaveBeenCalledWith({ name: 'Dashboard' });
  });
});

describe('handleApiError — DATA_SCOPE_VIOLATION', () => {
  it('should toast but NOT redirect', async () => {
    const { message } = await import('ant-design-vue');
    await expectReject(
      handleApiError(
        makeError({
          status: 403,
          data: { error_code: ErrorCode.DATA_SCOPE_VIOLATION, message: 'out of scope' },
        }),
      ),
    );
    expect(message.error).toHaveBeenCalledWith('out of scope');
    expect(pushMock).not.toHaveBeenCalled();
  });
});

describe('handleApiError — VALIDATION_ERROR', () => {
  it('should NOT toast (useApiForm consumes errors[])', async () => {
    const { message } = await import('ant-design-vue');
    await expectReject(
      handleApiError(
        makeError({
          status: 400,
          data: {
            error_code: ErrorCode.VALIDATION_ERROR,
            message: '入力値が不正です',
            errors: [{ field: 'email', message: 'メールアドレスの形式が不正です' }],
          },
        }),
      ),
    );
    expect(message.error).not.toHaveBeenCalled();
    expect(pushMock).not.toHaveBeenCalled();
  });
});

describe('handleApiError — login / OTP toast-only codes', () => {
  it.each([
    [ErrorCode.INVALID_CREDENTIALS],
    [ErrorCode.ACCOUNT_LOCKED],
    [ErrorCode.INVALID_OTP],
    [ErrorCode.OTP_RESEND_COOLDOWN],
  ])('should toast and NOT redirect for %s', async (code) => {
    const { message } = await import('ant-design-vue');
    await expectReject(
      handleApiError(
        makeError({
          status: 400,
          url: '/api/v1/auth/login',
          data: { error_code: code, message: `msg-${code}` },
        }),
      ),
    );
    expect(message.error).toHaveBeenCalledWith(`msg-${code}`);
    expect(pushMock).not.toHaveBeenCalled();
  });
});

describe('handleApiError — OTP fatal codes force back to login', () => {
  it.each([
    [ErrorCode.OTP_EXPIRED],
    [ErrorCode.OTP_MAX_ATTEMPTS],
    [ErrorCode.OTP_RESEND_LIMIT],
    [ErrorCode.INVALID_MFA_TOKEN],
  ])('should toast + push to Login for %s', async (code) => {
    const { message } = await import('ant-design-vue');
    await expectReject(
      handleApiError(
        makeError({
          status: 400,
          url: '/api/v1/auth/mfa/verify',
          data: { error_code: code, message: `msg-${code}` },
        }),
      ),
    );
    expect(message.error).toHaveBeenCalledWith(`msg-${code}`);
    expect(pushMock).toHaveBeenCalledWith({ name: 'Login' });
  });
});

describe('handleApiError — generic toast codes', () => {
  it.each([
    [ErrorCode.DUPLICATE_CODE, 'JA already exists'],
    [ErrorCode.BAD_REQUEST, 'bad input'],
    [ErrorCode.NOT_FOUND, 'not found'],
    [ErrorCode.CONFLICT, 'has related data'],
    [ErrorCode.TOO_MANY_REQUESTS, 'slow down'],
  ])('should toast `data.message` for %s', async (code, msg) => {
    const { message } = await import('ant-design-vue');
    await expectReject(
      handleApiError(
        makeError({
          status: 400,
          data: { error_code: code, message: msg },
        }),
      ),
    );
    expect(message.error).toHaveBeenCalledWith(msg);
    expect(pushMock).not.toHaveBeenCalled();
  });
});

describe('handleApiError — INTERNAL_SERVER_ERROR + unknown codes', () => {
  it('should toast data.message when present (500)', async () => {
    const { message } = await import('ant-design-vue');
    await expectReject(
      handleApiError(
        makeError({
          status: 500,
          data: { error_code: ErrorCode.INTERNAL_SERVER_ERROR, message: 'server boom' },
        }),
      ),
    );
    expect(message.error).toHaveBeenCalledWith('server boom');
  });

  it('should fall back to the generic system-error wording when 500 has empty message', async () => {
    const { message } = await import('ant-design-vue');
    await expectReject(
      handleApiError(
        makeError({
          status: 500,
          data: { error_code: ErrorCode.INTERNAL_SERVER_ERROR, message: '' },
        }),
      ),
    );
    expect(message.error).toHaveBeenCalledWith(
      'システムエラーが発生しました。しばらくしてから再度お試しください。',
    );
  });

  it('should treat an UNKNOWN error_code via the default branch (toast)', async () => {
    const { message } = await import('ant-design-vue');
    await expectReject(
      handleApiError(
        makeError({
          status: 418,
          data: { error_code: 'TEAPOT' as never, message: 'I am a teapot' },
        }),
      ),
    );
    expect(message.error).toHaveBeenCalledWith('I am a teapot');
  });

  it.each(['DEADLINE_NOTICE_DUPLICATE', 'EXPORT_LIMIT_EXCEEDED'])(
    'should NOT toast view-handled custom error_code %s (view toasts instead)',
    async (code) => {
      const { message } = await import('ant-design-vue');
      await expectReject(
        handleApiError(
          makeError({
            status: 400,
            data: { error_code: code as never, message: 'screen-specific copy' },
          }),
        ),
      );
      expect(message.error).not.toHaveBeenCalled();
    },
  );
});

// ───────────────────────────────────────────────────────────────────────
// Regression: SCR-022 / SCR-023 file-upload / file-download endpoints must
// not double-toast alongside the view's own ACSMS-MSG-023-005 /
// ACSMS-MSG-022-003 copy (findings #13 / #14).
// ───────────────────────────────────────────────────────────────────────
describe('handleApiError — file-upload endpoint (POST /file-upload)', () => {
  function makePostError(opts: { status?: number; data?: ApiErrorResponse; url?: string }) {
    const err = makeError(opts);
    (err.config as { method?: string }).method = 'post';
    return err;
  }

  it.each([
    [ErrorCode.NOT_FOUND],
    [ErrorCode.CONFLICT],
    [ErrorCode.BAD_REQUEST],
    [ErrorCode.INTERNAL_SERVER_ERROR],
  ])('should NOT toast for %s — view re-toasts ACSMS-MSG-023-005', async (code) => {
    const { message } = await import('ant-design-vue');
    await expectReject(
      handleApiError(
        makePostError({
          status: 500,
          url: '/api/v1/file-upload',
          data: { error_code: code, message: 'be message' },
        }),
      ),
    );
    expect(message.error).not.toHaveBeenCalled();
  });

  it('should NOT toast the generic network-error message either (view re-toasts unconditionally)', async () => {
    const { message } = await import('ant-design-vue');
    await expectReject(handleApiError(makePostError({ url: '/api/v1/file-upload' })));
    expect(message.error).not.toHaveBeenCalled();
  });

  it('should STILL toast + redirect for UNAUTHORIZED even on this endpoint', async () => {
    const { message } = await import('ant-design-vue');
    await expectReject(
      handleApiError(
        makePostError({
          status: 401,
          url: '/api/v1/file-upload',
          data: { error_code: ErrorCode.UNAUTHORIZED, message: 'session expired' },
        }),
      ),
    );
    expect(clearSessionMock).toHaveBeenCalledTimes(1);
    expect(pushMock).toHaveBeenCalledWith({
      name: 'Login',
      query: { redirect: '/dashboard/users' },
    });
    expect(message.error).not.toHaveBeenCalled();
  });

  it('should STILL toast + redirect to Dashboard for FORBIDDEN even on this endpoint', async () => {
    const { message } = await import('ant-design-vue');
    await expectReject(
      handleApiError(
        makePostError({
          status: 403,
          url: '/api/v1/file-upload',
          data: { error_code: ErrorCode.FORBIDDEN, message: 'no permission' },
        }),
      ),
    );
    expect(message.error).toHaveBeenCalledWith('no permission');
    expect(pushMock).toHaveBeenCalledWith({ name: 'Dashboard' });
  });

  it('should NOT suppress toasts for unrelated GET /file-upload (list endpoint)', async () => {
    const { message } = await import('ant-design-vue');
    await expectReject(
      handleApiError(
        makeError({
          status: 500,
          url: '/api/v1/file-upload',
          data: { error_code: ErrorCode.INTERNAL_SERVER_ERROR, message: 'list failed' },
        }),
      ),
    );
    expect(message.error).toHaveBeenCalledWith('list failed');
  });
});

describe('handleApiError — file-download preview/download/zip endpoints', () => {
  it.each([
    ['/api/v1/file-download/101/preview', 'get'],
    ['/api/v1/file-download/101/download', 'get'],
    ['/api/v1/file-download/download-zip', 'post'],
  ])('should NOT toast NOT_FOUND for %s — view re-toasts ACSMS-MSG-022-003', async (url, method) => {
    const { message } = await import('ant-design-vue');
    const err = makeError({
      status: 404,
      url,
      data: { error_code: ErrorCode.NOT_FOUND, message: '指定されたファイルが見つかりません。' },
    });
    (err.config as { method?: string }).method = method;
    await expectReject(handleApiError(err));
    expect(message.error).not.toHaveBeenCalled();
  });

  it('should STILL toast for INTERNAL_SERVER_ERROR on the preview endpoint (view only handles NOT_FOUND)', async () => {
    const { message } = await import('ant-design-vue');
    const err = makeError({
      status: 500,
      url: '/api/v1/file-download/101/preview',
      data: { error_code: ErrorCode.INTERNAL_SERVER_ERROR, message: 'boom' },
    });
    (err.config as { method?: string }).method = 'get';
    await expectReject(handleApiError(err));
    expect(message.error).toHaveBeenCalledWith('boom');
  });

  it('should STILL toast the generic network-error message on the download endpoint (view only handles NOT_FOUND)', async () => {
    const { message } = await import('ant-design-vue');
    const err = makeError({ url: '/api/v1/file-download/101/download' });
    (err.config as { method?: string }).method = 'get';
    await expectReject(handleApiError(err));
    expect(message.error).toHaveBeenCalledWith(
      'ネットワークエラーが発生しました。接続をご確認ください。',
    );
  });

  it('should NOT suppress toasts for unrelated GET /file-download (list endpoint)', async () => {
    const { message } = await import('ant-design-vue');
    const err = makeError({
      status: 404,
      url: '/api/v1/file-download',
      data: { error_code: ErrorCode.NOT_FOUND, message: 'not found' },
    });
    (err.config as { method?: string }).method = 'get';
    await expectReject(handleApiError(err));
    expect(message.error).toHaveBeenCalledWith('not found');
  });
});
