// Drives src/composables/useApiForm.ts. This composable wraps the
// submit/error-mapping flow used by nearly every create/edit screen —
// see .claude/rules/vue.md §API + §Error Handling Architecture.
//
// Regression coverage: submit() must swallow (and map to fieldErrors)
// ONLY axios/HTTP errors — those have already been toasted by the
// global interceptor (src/api/error-handler.ts). A non-HTTP error
// (a bug in the caller's own post-success code) must NOT be silently
// discarded — it never went through the interceptor, so nothing has
// told the user anything went wrong. It must propagate so the app's
// error boundary (App.vue onErrorCaptured / main.ts errorHandler)
// can surface it.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useApiForm } from '@/composables/useApiForm';
import { ErrorCode } from '@/constants/error-codes';

beforeEach(() => {
  vi.restoreAllMocks();
});

function buildAxiosError(data: Record<string, unknown>, status = 400) {
  return {
    isAxiosError: true,
    response: { status, data },
  };
}

// Matches the plain-object shape used by test/fixtures/password-reset.fixture.ts's
// buildAxiosError() and equivalent mocks across the FE test suite — no
// `isAxiosError` marker, just `{ response: { status, data } }`.
function buildPlainHttpErrorMock(data: Record<string, unknown>, status = 400) {
  return { response: { status, data } };
}

describe('useApiForm — submit()', () => {
  it('should return the resolved value when fn() succeeds', async () => {
    const { submit } = useApiForm();
    const result = await submit(async () => 'ok');
    expect(result).toBe('ok');
  });

  it('should set submitting to true while fn() is pending and false after it resolves', async () => {
    const { submit, submitting } = useApiForm();
    let resolveFn: (() => void) | undefined;
    const pending = new Promise<void>((resolve) => {
      resolveFn = resolve;
    });

    const promise = submit(async () => {
      await pending;
      return 'done';
    });
    expect(submitting.value).toBe(true);

    resolveFn?.();
    await promise;
    expect(submitting.value).toBe(false);
  });

  it('should ignore a re-entrant call while a submission is already in flight', async () => {
    const { submit, submitting } = useApiForm();
    const fn = vi.fn(async () => {
      await new Promise((r) => setTimeout(r, 0));
      return 'first';
    });

    const first = submit(fn);
    expect(submitting.value).toBe(true);
    const second = await submit(fn);
    expect(second).toBeUndefined();
    expect(fn).toHaveBeenCalledTimes(1);

    await first;
  });

  it('should map VALIDATION_ERROR errors[] into fieldErrors and return undefined', async () => {
    const { submit, fieldErrors } = useApiForm();
    const err = buildAxiosError({
      error_code: ErrorCode.VALIDATION_ERROR,
      message: '入力値が不正です',
      errors: [{ field: 'email', message: 'メールアドレスの形式が不正です' }],
    });

    const result = await submit(async () => {
      throw err;
    });

    expect(result).toBeUndefined();
    expect(fieldErrors.value).toEqual({ email: 'メールアドレスの形式が不正です' });
  });

  it('should map errors[] into fieldErrors for a non-VALIDATION_ERROR code too (e.g. DUPLICATE_CODE) — regression', async () => {
    // HanbaitenFormView / AccountFormView's actual BE contract: DUPLICATE_CODE
    // (hanbaiten_code / login_id collisions) also carries a field-targeted
    // errors[] array, not just VALIDATION_ERROR. useApiForm must map any
    // errors[] it finds regardless of the specific error_code, or screens
    // relying on that contract can't adopt this shared composable.
    const { submit, fieldErrors } = useApiForm();
    const err = buildAxiosError({
      error_code: ErrorCode.DUPLICATE_CODE,
      message: '販売店コード「H001」はすでに登録されています。',
      errors: [{ field: 'hanbaiten_code', message: '販売店コード「H001」はすでに登録されています。' }],
    });

    const result = await submit(async () => {
      throw err;
    });

    expect(result).toBeUndefined();
    expect(fieldErrors.value).toEqual({
      hanbaiten_code: '販売店コード「H001」はすでに登録されています。',
    });
  });

  it('should swallow a non-VALIDATION_ERROR axios error (already toasted by the interceptor) and return undefined', async () => {
    const { submit, fieldErrors } = useApiForm();
    const err = buildAxiosError(
      { error_code: ErrorCode.INTERNAL_SERVER_ERROR, message: 'システムエラーが発生しました' },
      500,
    );

    const result = await submit(async () => {
      throw err;
    });

    expect(result).toBeUndefined();
    expect(fieldErrors.value).toEqual({});
  });

  it('should swallow a plain-object HTTP error mock with no isAxiosError marker (matches project fixture convention)', async () => {
    // Regression guard: the fix for the "swallows everything" bug must not
    // start rethrowing the plain `{ response: { status, data } }` shape
    // used by test/fixtures/password-reset.fixture.ts's buildAxiosError()
    // and equivalent mocks across the FE spec suite.
    const { submit, fieldErrors } = useApiForm();
    const result = await submit(async () => {
      throw buildPlainHttpErrorMock({
        error_code: ErrorCode.INTERNAL_SERVER_ERROR,
        message: 'システムエラー',
      });
    });

    expect(result).toBeUndefined();
    expect(fieldErrors.value).toEqual({});
  });

  it('should map VALIDATION_ERROR from a plain-object mock (no isAxiosError marker) into fieldErrors', async () => {
    const { submit, fieldErrors } = useApiForm();
    await submit(async () => {
      throw buildPlainHttpErrorMock({
        error_code: ErrorCode.VALIDATION_ERROR,
        message: '入力値が不正です。',
        errors: [{ field: 'email', message: '有効なメールアドレスを入力してください。' }],
      });
    });

    expect(fieldErrors.value).toEqual({
      email: '有効なメールアドレスを入力してください。',
    });
  });

  it('should reset submitting to false even when the axios error is swallowed', async () => {
    const { submit, submitting } = useApiForm();
    await submit(async () => {
      throw buildAxiosError({ error_code: ErrorCode.NOT_FOUND, message: 'not found' }, 404);
    });
    expect(submitting.value).toBe(false);
  });

  it('should rethrow a non-HTTP error instead of silently swallowing it', async () => {
    const { submit } = useApiForm();
    const bug = new Error('post-success bug: router.push typo');

    await expect(
      submit(async () => {
        throw bug;
      }),
    ).rejects.toThrow('post-success bug: router.push typo');
  });

  it('should still reset submitting to false when a non-HTTP error is rethrown', async () => {
    const { submit, submitting } = useApiForm();
    await expect(
      submit(async () => {
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');
    expect(submitting.value).toBe(false);
  });

  it('should log a non-HTTP error via console.error before rethrowing', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { submit } = useApiForm();
    const bug = new Error('boom');

    await expect(
      submit(async () => {
        throw bug;
      }),
    ).rejects.toThrow('boom');

    expect(errorSpy).toHaveBeenCalledWith(
      'useApiForm: unexpected non-HTTP error in submit()',
      bug,
    );
  });
});

describe('useApiForm — clearErrors()', () => {
  it('should reset fieldErrors to an empty object', async () => {
    const { submit, fieldErrors, clearErrors } = useApiForm();
    await submit(async () => {
      throw buildAxiosError({
        error_code: ErrorCode.VALIDATION_ERROR,
        message: '入力値が不正です',
        errors: [{ field: 'name', message: '必須項目です。' }],
      });
    });
    expect(fieldErrors.value).not.toEqual({});

    clearErrors();
    expect(fieldErrors.value).toEqual({});
  });

  it('should clear stale fieldErrors at the start of each new submit()', async () => {
    const { submit, fieldErrors } = useApiForm();
    await submit(async () => {
      throw buildAxiosError({
        error_code: ErrorCode.VALIDATION_ERROR,
        message: '入力値が不正です',
        errors: [{ field: 'name', message: '必須項目です。' }],
      });
    });
    expect(fieldErrors.value).toEqual({ name: '必須項目です。' });

    await submit(async () => 'ok');
    expect(fieldErrors.value).toEqual({});
  });
});
